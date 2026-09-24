"use client"

import { useCallback, useRef, useState, type ChangeEvent } from "react"
import { logger } from "@/lib/logger"
import {
  getUploadPath,
  getUploadSlug,
  isAllowedUpload,
  type UploadStatus,
} from "../utils/upload"

interface UploadResponse {
  slug?: string
  error?: string
}

function getCsrfHeaders(): Record<string, string> {
  if (typeof document === "undefined") return {}
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")
  return token ? { "X-CSRF-Token": token } : {}
}

export function useUploadFile() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [message, setMessage] = useState("")
  const [uploadedUrl, setUploadedUrl] = useState("")
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
  }, [])

  const clearFile = useCallback(() => {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const resetUpload = useCallback(() => {
    setFile(null)
    setStatus("idle")
    setMessage("")
    setUploadedUrl("")
    if (fileRef.current) fileRef.current.value = ""
  }, [])

  const upload = useCallback(async () => {
    if (!file) return
    setStatus("uploading")
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)
    try {
      const response = await fetch("/api/upload", { method: "POST", headers: getCsrfHeaders(), body: formData })
      const data = (await response.json()) as UploadResponse
      if (!response.ok) {
        setStatus("error")
        setMessage(data.error || "Upload failed")
        return
      }

      const slug = data.slug || getUploadSlug(file.name)
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
  }, [file])

  return {
    file,
    status,
    message,
    uploadedUrl,
    fileRef,
    selectFile,
    clearFile,
    resetUpload,
    upload,
  }
}
