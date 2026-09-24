"use client"

import { useCallback } from "react"
import { useUIStore, type ToastType } from "@/stores/ui-store"

export interface ToastApi {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  dismiss: (id: string) => void
}

/**
 * Thin, ergonomic wrapper around the toast store. Prefer this over reaching
 * into `useUIStore` directly so callers get a stable, terse API:
 *
 *   const toast = useToast()
 *   toast.success("Circle created!")
 *   toast.error("Withdrawal failed", "Insufficient balance")
 */
export function useToast(): ToastApi {
  const addToast = useUIStore((s) => s.addToast)
  const removeToast = useUIStore((s) => s.removeToast)

  const show = useCallback(
    (type: ToastType, title: string, description?: string) => {
      addToast({ type, title, description })
    },
    [addToast],
  )

  return {
    success: useCallback(
      (title: string, description?: string) => show("success", title, description),
      [show],
    ),
    error: useCallback(
      (title: string, description?: string) => show("error", title, description),
      [show],
    ),
    warning: useCallback(
      (title: string, description?: string) => show("warning", title, description),
      [show],
    ),
    info: useCallback(
      (title: string, description?: string) => show("info", title, description),
      [show],
    ),
    dismiss: useCallback((id: string) => removeToast(id), [removeToast]),
  }
}