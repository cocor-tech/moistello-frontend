/**
 * Shared source of truth for upload file types and size limits.
 * Used by both client-side pre-upload validation and server-side route validation
 * to ensure limits always stay strictly in sync (#499).
 */

export const ALLOWED_UPLOAD_EXTENSIONS = [".md", ".html"] as const
export type AllowedUploadExtension = (typeof ALLOWED_UPLOAD_EXTENSIONS)[number]

export interface UploadTypeLimit {
  maxBytes: number
  label: string
  formattedLimit: string
}

export const UPLOAD_LIMITS_BY_TYPE: Record<AllowedUploadExtension, UploadTypeLimit> = {
  ".md": {
    maxBytes: 2 * 1024 * 1024, // 2MB
    label: "Markdown (.md)",
    formattedLimit: "2MB",
  },
  ".html": {
    maxBytes: 5 * 1024 * 1024, // 5MB
    label: "HTML (.html)",
    formattedLimit: "5MB",
  },
}

export const ALLOWED_TYPES_LIST = ALLOWED_UPLOAD_EXTENSIONS.join(", ")

export const SLUG_PATTERN = /^[a-zA-Z0-9\-_]+$/

export function isAllowedExtension(ext: string): ext is AllowedUploadExtension {
  return (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext.toLowerCase())
}

export function getLimitForExtension(ext: string): UploadTypeLimit | null {
  const normalized = ext.toLowerCase()
  return isAllowedExtension(normalized) ? UPLOAD_LIMITS_BY_TYPE[normalized] : null
}

export type UploadValidationResult =
  | { ok: true; slug: string; extension: AllowedUploadExtension }
  | { ok: false; error: string; status: number }

export function validateUploadFile(fileName: string, size: number): UploadValidationResult {
  const parts = fileName.split(".")
  const extension = parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : ""

  if (!isAllowedExtension(extension)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed types: ${ALLOWED_TYPES_LIST}`,
      status: 400,
    }
  }

  const limit = UPLOAD_LIMITS_BY_TYPE[extension]
  if (size > limit.maxBytes) {
    return {
      ok: false,
      error: `File too large for ${extension} (max ${limit.formattedLimit}). Allowed types: ${ALLOWED_TYPES_LIST}`,
      status: 400,
    }
  }

  const slug = fileName.slice(0, fileName.lastIndexOf("."))
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: "Filename must contain only letters, numbers, hyphens, or underscores",
      status: 400,
    }
  }

  return { ok: true, slug, extension }
}
