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

/**
 * Extracts EXIF orientation tag from image bytes (JPEG).
 * Returns 1 (normal) if not found or not JPEG.
 */
export async function getExifOrientation(file: File | ArrayBuffer): Promise<number> {
  const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const view = new DataView(buffer)

  // Check for JPEG SOI marker (0xFFD8)
  if (view.byteLength < 2 || view.getUint16(0, false) !== 0xffd8) {
    return 1
  }

  let offset = 2
  const length = view.byteLength

  while (offset < length - 2) {
    const marker = view.getUint16(offset, false)
    offset += 2

    // APP1 marker (EXIF)
    if (marker === 0xffe1) {
      const segmentLength = view.getUint16(offset, false)
      offset += 2

      // Check for 'Exif\0\0'
      if (
        view.getUint32(offset, false) === 0x45786966 &&
        view.getUint16(offset + 4, false) === 0x0000
      ) {
        const tiffHeaderOffset = offset + 6
        const isLittleEndian = view.getUint16(tiffHeaderOffset, false) === 0x4949

        const firstIFDOffset = view.getUint32(tiffHeaderOffset + 4, isLittleEndian)
        let ifdOffset = tiffHeaderOffset + firstIFDOffset

        if (ifdOffset + 2 > length) return 1
        const tagCount = view.getUint16(ifdOffset, isLittleEndian)
        ifdOffset += 2

        for (let i = 0; i < tagCount; i++) {
          if (ifdOffset + 12 > length) break
          const tag = view.getUint16(ifdOffset, isLittleEndian)
          if (tag === 0x0112) {
            // Orientation tag
            return view.getUint16(ifdOffset + 8, isLittleEndian)
          }
          ifdOffset += 12
        }
      }
      break
    } else if ((marker & 0xff00) !== 0xff00 || marker === 0xffda || marker === 0xffd9) {
      break
    } else {
      offset += view.getUint16(offset, false)
    }
  }

  return 1
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

/**
 * Normalizes EXIF orientation and center-crops avatar to a square AVATAR_SIZE x AVATAR_SIZE.
 */
export async function resizeAvatar(file: File, size = AVATAR_SIZE): Promise<Blob> {
  const [img, orientation] = await Promise.all([
    loadImage(file),
    getExifOrientation(file),
  ])

  const srcWidth = img.naturalWidth
  const srcHeight = img.naturalHeight

  // Create intermediate canvas to normalize orientation
  const normCanvas = document.createElement("canvas")
  const isRotated = orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8

  normCanvas.width = isRotated ? srcHeight : srcWidth
  normCanvas.height = isRotated ? srcWidth : srcHeight

  const normCtx = normCanvas.getContext("2d")
  if (!normCtx) throw new Error("Canvas is not supported")

  // Apply EXIF transforms
  switch (orientation) {
    case 2:
      normCtx.translate(srcWidth, 0)
      normCtx.scale(-1, 1)
      break
    case 3:
      normCtx.translate(srcWidth, srcHeight)
      normCtx.rotate(Math.PI)
      break
    case 4:
      normCtx.translate(0, srcHeight)
      normCtx.scale(1, -1)
      break
    case 5:
      normCtx.rotate(0.5 * Math.PI)
      normCtx.scale(1, -1)
      break
    case 6:
      normCtx.rotate(0.5 * Math.PI)
      normCtx.translate(0, -srcHeight)
      break
    case 7:
      normCtx.rotate(0.5 * Math.PI)
      normCtx.translate(srcWidth, -srcHeight)
      normCtx.scale(-1, 1)
      break
    case 8:
      normCtx.rotate(-0.5 * Math.PI)
      normCtx.translate(-srcWidth, 0)
      break
    default:
      break
  }

  normCtx.drawImage(img, 0, 0)

  // Compute square crop on normalized dimensions
  const { sx, sy, sWidth, sHeight } = computeCenterSquareCrop(normCanvas.width, normCanvas.height)

  const finalCanvas = document.createElement("canvas")
  finalCanvas.width = size
  finalCanvas.height = size
  const finalCtx = finalCanvas.getContext("2d")
  if (!finalCtx) throw new Error("Canvas is not supported")

  finalCtx.imageSmoothingEnabled = true
  finalCtx.imageSmoothingQuality = "high"
  finalCtx.drawImage(normCanvas, sx, sy, sWidth, sHeight, 0, 0, size, size)

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
      AVATAR_MIME,
      AVATAR_QUALITY,
    )
  })
}
