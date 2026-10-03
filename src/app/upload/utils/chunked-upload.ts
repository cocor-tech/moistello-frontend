/**
 * Chunked upload for large files: splits a file into fixed-size chunks,
 * uploads them sequentially, and can resume after an interruption without
 * re-sending chunks the server already has (issue #493).
 */

export const CHUNK_SIZE = 256 * 1024 // 256 KB

/** Splits `file` into CHUNK_SIZE blobs. The last chunk may be smaller. */
export function splitIntoChunks(file: File, chunkSize: number = CHUNK_SIZE): Blob[] {
  const chunks: Blob[] = []
  let offset = 0
  while (offset < file.size) {
    chunks.push(file.slice(offset, offset + chunkSize))
    offset += chunkSize
  }
  // A zero-byte file still gets one (empty) chunk, so callers always have
  // something to send rather than special-casing "no chunks".
  if (chunks.length === 0) chunks.push(file.slice(0, 0))
  return chunks
}

export interface ResumeState {
  uploadId: string
  receivedChunks: number[]
}

function resumeKey(fileName: string, fileSize: number): string {
  return `chunked-upload:${fileName}:${fileSize}`
}

export function loadResumeState(file: File): ResumeState | null {
  try {
    const raw = sessionStorage.getItem(resumeKey(file.name, file.size))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ResumeState
    if (typeof parsed.uploadId !== "string" || !Array.isArray(parsed.receivedChunks)) return null
    return parsed
  } catch {
    return null
  }
}

export function saveResumeState(file: File, state: ResumeState): void {
  try {
    sessionStorage.setItem(resumeKey(file.name, file.size), JSON.stringify(state))
  } catch {
    // Resume is a convenience, not a correctness requirement — a full
    // re-upload from chunk 0 is still correct if this fails to persist.
  }
}

export function clearResumeState(file: File): void {
  try {
    sessionStorage.removeItem(resumeKey(file.name, file.size))
  } catch {
    // Nothing to do — worst case a stale key lingers until it stops matching.
  }
}

/**
 * Chunk indices still needing to be sent, given what the server has already
 * acknowledged. Always derived from the server's `receivedChunks` (not a
 * local send-attempt counter), so a lost acknowledgement is safe: resending
 * an already-received chunk index is a harmless no-op overwrite, and a chunk
 * the server never actually got simply reappears in this list on the next
 * check rather than being skipped.
 */
export function pendingChunkIndices(totalChunks: number, receivedChunks: number[]): number[] {
  const received = new Set(receivedChunks)
  return Array.from({ length: totalChunks }, (_, i) => i).filter((i) => !received.has(i))
}
