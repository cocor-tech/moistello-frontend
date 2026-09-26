/**
 * OptimizedImage — thin next/image wrapper with sensible defaults.
 *
 * - Defaults to `loading="lazy"` unless `priority` is set (LCP images should
 *   use `priority` instead of explicit `loading="eager"`).
 * - Defaults `sizes` to `"100vw"` to prevent layout-shift warnings when no
 *   explicit value is supplied.
 * - Supports `blurPlaceholder` for a CSS blur effect while loading (prevents
 *   CLS by requiring explicit width/height).
 * - All other next/image props are forwarded unchanged.
 */
import NextImage, { type ImageProps } from "next/image"

type OptimizedImageProps = ImageProps & {
  /** Show a CSS blur placeholder while the image loads. Requires width + height to prevent CLS. */
  blurPlaceholder?: boolean
}

export function OptimizedImage({
  priority,
  sizes,
  loading,
  blurPlaceholder,
  placeholder,
  ...props
}: OptimizedImageProps) {
  const useBlur = blurPlaceholder && !priority

  return (
    <NextImage
      priority={priority}
      loading={priority ? undefined : (loading ?? "lazy")}
      sizes={sizes ?? "100vw"}
      placeholder={useBlur ? "blur" : placeholder}
      blurDataURL={useBlur ? TRANSPARENT_BLUR : undefined}
      {...props}
    />
  )
}

/** 1x1 semi-transparent PNG base64 — used as a tiny blurDataURL that Next.js
 *  scales up with CSS blur to produce a soft placeholder. */
const TRANSPARENT_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=="
