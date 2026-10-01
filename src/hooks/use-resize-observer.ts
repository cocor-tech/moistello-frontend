"use client"

import { useEffect, useRef, useState } from "react"

export interface UseResizeObserverOptions {
  debounceMs?: number
}

/**
 * Custom hook providing debounced ResizeObserver updates to avoid main-thread layout thrashing / jank during continuous window or container resize.
 */
export function useResizeObserver<T extends HTMLElement>(
  options: UseResizeObserverOptions = {}
): { ref: React.RefObject<T>; width: number; height: number } {
  const { debounceMs = 100 } = options
  const ref = useRef<T>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const timeoutRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const target = ref.current
    if (!target || typeof window === "undefined" || !("ResizeObserver" in window)) return

    const handleResize = (entries: ResizeObserverEntry[]) => {
      const entry = entries[0]
      if (!entry) return

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = window.setTimeout(() => {
        if (frameRef.current) {
          window.cancelAnimationFrame(frameRef.current)
        }
        frameRef.current = window.requestAnimationFrame(() => {
          const { width, height } = entry.contentRect
          setDimensions({ width, height })
        })
      }, debounceMs)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(target)

    return () => {
      observer.disconnect()
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    }
  }, [debounceMs])

  return { ref, width: dimensions.width, height: dimensions.height }
}
