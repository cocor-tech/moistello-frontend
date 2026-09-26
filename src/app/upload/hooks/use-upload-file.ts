"use client"

import { useCallback, useRef, useState, type ChangeEvent } from "react"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import { logger } from "@/lib/logger"
import {
  getUploadPath,
  getUploadSlug,
  isAllowedUpload,
  type UploadStatus,
} from "../utils/upload"

// Chunk size: 256 KB. Small enough to recover quickly from drops, large enough
// to keep the chunk count reasonable for files up to the 5 MB limit.
const CHUNK_SIZE = 256 * 1024

interface UploadResponse {
  slug?: string
  error?: string
}

interface ChunkAckResponse {
  uploadId: string
  receivedChunks: number[]
  complete?: boolean
  slug?: string
  error?: string
}

/** Persisted resume state keyed by file identity (name + size). */
interface ResumeRecord {
  uploadId: string
  receivedChunks: number[]
}

function makeFileKey(file: File): string {
  return `chunked-upload:${file.name}:${file.size}`
}

function loadResumeRecord(file: File): ResumeRecord | null {
  try {
    const raw = sessionStorage.getItem(makeFileKey(file))
    if (!raw) return null
    return JSON.parse(raw) as ResumeRecord
  } catch {
    return null
  }
}

function saveResumeRecord(file: File, record: ResumeRecord): void {
  try {
    sessionStorage.setItem(makeFileKey(file), JSON.stringify(record))
  } catch {
    // sessionStorage may be unavailable in some contexts — swallow the error.
  }
}

function clearResumeRecord(file: File): void {
  try {
    sessionStorage.removeItem(makeFileKey(file))
  } catch {
    // ignore
  }
}

/** Split a file into an array of Blob chunks. */
function sliceFile(file: File, chunkSize: number): Blob[] {
  const chunks: Blob[] = []
  let offset = 0
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  return chunks
}

/**
 * Upload a single chunk to /api/upload/chunk.
 *
 * Returns the updated ack from the server (list of received chunk indices).
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunk: Blob,
  fileName: string,
  overwrite: boolean,
): Promise<ChunkAckResponse> {
  const body = new FormData()
  body.append("uploadId", uploadId)
  body.append("chunkIndex", String(chunkIndex))
  body.append("totalChunks", String(totalChunks))
  body.append("fileName", fileName)
  body.append("overwrite", overwrite ? "true" : "false")
  body.append("chunk", chunk, `${fileName}.part${chunkIndex}`)

  const response = await fetch("/api/upload/chunk", {
    method: "POST",
    headers: getCsrfHeaders(),
    body,
  })

  const data = (await response.json()) as ChunkAckResponse
  if (!response.ok) {
    throw new Error(data.error ?? "Chunk upload failed")
  }
  return data
}

/**
 * Single-request fallback for small files (under CHUNK_SIZE).
 *
 * Falls back to the original /api/upload endpoint so the feature is backward-
 * compatible if the chunk endpoint is not yet deployed.
 */
async function uploadSmall(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append("file", file)
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: getCsrfHeaders(),
    body: formData,
  })
  return response.json() as Promise<UploadResponse>
}

export function useUploadFile() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [message, setMessage] = useState("")
  const [uploadedUrl, setUploadedUrl] = useState("")
  /** 0–100 upload progress for the progress bar. */
  const [progress, setProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    if (!isAllowedUpload(selectedFile)) {
      setStatus("error")
      setMessage("Only .md and .html files are allowed")
      return
    }
    setFile(selectedFile)
    setStatus("idle")
    setMessage("")
    setProgress(0)
  }, [])

  const clearFile = useCallback(() => {
    setFile(null)
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const resetUpload = useCallback(() => {
    setFile(null)
    setStatus("idle")
    setMessage("")
    setUploadedUrl("")
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const upload = useCallback(async () => {
    if (!file) return
    setStatus("uploading")
    setMessage("")

    // Small files (≤ CHUNK_SIZE): use the simple single-request path.
    if (file.size <= CHUNK_SIZE) {
      try {
        const response = await uploadSmall(file)
        if (!response.slug && !("success" in response)) {
          setStatus("error")
          setMessage(response.error ?? "Upload failed")
          return
        }
        const slug = response.slug ?? getUploadSlug(file.name)
        setProgress(100)
        setStatus("success")
        setMessage(`Published as ${getUploadPath(slug)}`)
        setUploadedUrl(getUploadPath(slug))
        setFile(null)
        if (fileRef.current) fileRef.current.value = ""
      } catch (error: unknown) {
        logger.error("Page upload failed", { error, fileName: file.name })
        setStatus("error")
        setMessage("Network error — try again")
      }
      return
    }

    // Chunked upload path for larger files.
    const chunks = sliceFile(file, CHUNK_SIZE)
    const totalChunks = chunks.length

    // Check for an existing resume record from a previous interrupted upload.
    let resume = loadResumeRecord(file)
    let uploadId = resume?.uploadId ?? crypto.randomUUID()
    const alreadyReceived = new Set<number>(resume?.receivedChunks ?? [])

    // Restore progress bar to the already-received position.
    if (alreadyReceived.size > 0) {
      setProgress(Math.round((alreadyReceived.size / totalChunks) * 100))
    }

    try {
      for (let i = 0; i < totalChunks; i++) {
        // Skip chunks the server already acknowledged.
        if (alreadyReceived.has(i)) continue

        const ack = await uploadChunk(
          uploadId,
          i,
          totalChunks,
          chunks[i],
          file.name,
          false,
        )

        // Server may reassign the uploadId on the first chunk.
        if (ack.uploadId) uploadId = ack.uploadId

        alreadyReceived.add(i)
        saveResumeRecord(file, { uploadId, receivedChunks: [...alreadyReceived] })

        setProgress(Math.round((alreadyReceived.size / totalChunks) * 100))

        if (ack.complete) {
          const slug = ack.slug ?? getUploadSlug(file.name)
          clearResumeRecord(file)
          setProgress(100)
          setStatus("success")
          setMessage(`Published as ${getUploadPath(slug)}`)
          setUploadedUrl(getUploadPath(slug))
          setFile(null)
          if (fileRef.current) fileRef.current.value = ""
          return
        }
      }

      // All chunks sent but server hasn't emitted `complete: true` — request
      // explicit assembly via a finalise call.
      const finaliseBody = new FormData()
      finaliseBody.append("uploadId", uploadId)
      finaliseBody.append("fileName", file.name)
      const finaliseRes = await fetch("/api/upload/finalise", {
        method: "POST",
        headers: getCsrfHeaders(),
        body: finaliseBody,
      })
      const finalData = (await finaliseRes.json()) as ChunkAckResponse & { slug?: string }
      if (!finaliseRes.ok) {
        setStatus("error")
        setMessage(finalData.error ?? "Failed to finalise upload")
        return
      }
      const slug = finalData.slug ?? getUploadSlug(file.name)
      clearResumeRecord(file)
      setProgress(100)
      setStatus("success")
      setMessage(`Published as ${getUploadPath(slug)}`)
      setUploadedUrl(getUploadPath(slug))
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
    } catch (error: unknown) {
      logger.error("Chunked page upload failed", { error, fileName: file.name, uploadId })
      setStatus("error")
      setMessage("Network error — your progress is saved, click Upload to resume")
      // Resume record is kept so the next attempt can pick up where it left off.
    }
  }, [file])

  return {
    file,
    status,
    message,
    uploadedUrl,
    progress,
    fileRef,
    selectFile,
    clearFile,
    resetUpload,
    upload,
  }
}
