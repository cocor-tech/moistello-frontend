export const AVATAR_SIZE = 256
export const AVATAR_MIME = "image/webp"
export const AVATAR_QUALITY = 0.9
export const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
/** Reject absurdly large sources before decoding them into memory. */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024

export interface CropRect {
  sx: number
  sy: number
  sWidth: number
  sHeight: number
}

/** Largest centered square that fits inside the source image ("cover" crop). */
export function computeCenterSquareCrop(width: number, height: number): CropRect {
  const side = Math.min(width, height)
  return {
    sx: Math.round((width - side) / 2),
    sy: Math.round((height - side) / 2),
    sWidth: side,
    sHeight: side,
  }
}

export function validateAvatarFile(file: File): string | null {
  if (!(ACCEPTED_AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return "Choose a JPEG, PNG, WebP or GIF image"
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "Image is too large (max 20 MB)"
  }
  return null
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read image"))
    }
    img.src = url
  })
}

/** Center-crop to a square and scale to AVATAR_SIZE x AVATAR_SIZE. */
export async function resizeAvatar(file: File, size = AVATAR_SIZE): Promise<Blob> {
  const img = await loadImage(file)
  const { sx, sy, sWidth, sHeight } = computeCenterSquareCrop(img.naturalWidth, img.naturalHeight)

  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not supported")

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      AVATAR_MIME,
      AVATAR_QUALITY,
    )
  })
}
