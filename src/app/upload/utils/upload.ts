export const ALLOWED_UPLOAD_EXTENSIONS = [".md", ".html"] as const

export type UploadStatus = "idle" | "uploading" | "success" | "error"

export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".")
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : ""
}

export function isAllowedUpload(file: File): boolean {
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(getFileExtension(file.name))
}

export function getUploadSlug(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "")
}

export function getUploadPath(slug: string): string {
  return `/p/${slug}`
}

export function formatFileSize(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}
