"use client"

import { useCallback, useMemo, useState } from "react"
import { Routes } from "@/lib/constants"

/** Default lifetime of a newly generated invite, in hours. */
export const DEFAULT_INVITE_TTL_HOURS = 24

/** Options the creator can pick from, in hours. */
export const INVITE_TTL_OPTIONS = [1, 24, 72, 168] as const

const ERROR_CODE = "error-generating-code"

export interface UseInviteGenerationOptions {
  /** How long the invite stays valid, in hours. */
  ttlHours?: number
  /** Maximum number of times the invite may be used. */
  maxUses?: number
}

/**
 * Generates a circle invite, tracking its own loading/error/copy state.
 *
 * Previously the TTL was hardcoded to 24 hours and discarded — the response's
 * `expiresAt` was never read, so the creator had no way to see or communicate
 * when a link stopped working. The expiry is now returned and drives a countdown
 * in the modal.
 */
export function useInviteGeneration(
  circleId: string,
  options: UseInviteGenerationOptions = {},
) {
  const { ttlHours = DEFAULT_INVITE_TTL_HOURS, maxUses = 10 } = options

  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState("")
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const generate = useCallback(async () => {
    setIsLoading(true)
    setIsOpen(true)
    try {
      const { post } = await import("@/lib/api-client")
      const res = await post<Record<string, unknown>>(`/circles/${circleId}/invites`, {
        maxUses,
        ttlHours,
      })
      const body = (res?.data as Record<string, unknown>) ?? res
      const inv = (body?.invite as Record<string, unknown>) ?? body
      setCode(String(inv?.code ?? ""))
      // Keep the server's value when it sends one; fall back to the requested TTL
      // so the countdown still shows something meaningful if it does not.
      const rawExpiry = inv?.expiresAt
      setExpiresAt(
        typeof rawExpiry === "string"
          ? rawExpiry
          : new Date(Date.now() + ttlHours * 3_600_000).toISOString(),
      )
      setError("")
    } catch (err) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? (err instanceof Error ? err.message : "Failed to generate invite code")
      setError(msg)
      setCode(ERROR_CODE)
      setExpiresAt(null)
    } finally {
      setIsLoading(false)
    }
  }, [circleId, ttlHours, maxUses])

  /**
   * The shareable join URL.
   *
   * Built from `Routes.INVITE`, which was already defined but resolved to
   * nothing: there was no `/invite/[code]` route, so the constant pointed at a
   * 404. The route is created alongside this.
   */
  const inviteUrl = useMemo(() => {
    if (!code || code === ERROR_CODE) return ""
    const path = Routes.INVITE(code)
    if (typeof window === "undefined") return path
    return `${window.location.origin}${path}`
  }, [code])

  const close = useCallback(() => {
    setIsOpen(false)
    setCode("")
    setExpiresAt(null)
  }, [])

  return {
    isOpen,
    code,
    inviteUrl,
    expiresAt,
    ttlHours,
    isLoading,
    error,
    isError: code === ERROR_CODE,
    generate,
    close,
  }
}
