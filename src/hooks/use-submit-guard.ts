"use client"

import { useCallback, useRef, useState } from "react"

/**
 * Creates an idempotency key using crypto.randomUUID or fallback.
 */
export function createSubmitIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

export interface UseSubmitGuardOptions<TInput, TOutput> {
  onSuccess?: (result: TOutput) => void
  onError?: (error: unknown) => void
}

/**
 * Shared submit guard that prevents duplicate form submissions on slow connections
 * or rapid clicks, provides visible pending state, and manages submission idempotency.
 */
export function useSubmitGuard<TInput = void, TOutput = unknown>(
  submitFn?: (data: TInput, idempotencyKey: string) => Promise<TOutput> | TOutput,
  options?: UseSubmitGuardOptions<TInput, TOutput>,
) {
  const [isPending, setIsPending] = useState(false)
  const isPendingRef = useRef(false)
  const idempotencyKeyRef = useRef(createSubmitIdempotencyKey())

  const reset = useCallback(() => {
    isPendingRef.current = false
    setIsPending(false)
    idempotencyKeyRef.current = createSubmitIdempotencyKey()
  }, [])

  /**
   * Guards an arbitrary async submit function against concurrent/rapid execution.
   */
  const guard = useCallback(
    <TArgs extends unknown[], TResult>(
      fn: (...args: TArgs) => Promise<TResult> | TResult,
    ) => {
      return async (...args: TArgs): Promise<TResult | undefined> => {
        if (isPendingRef.current) {
          return undefined
        }
        isPendingRef.current = true
        setIsPending(true)

        try {
          const result = await fn(...args)
          return result
        } finally {
          isPendingRef.current = false
          setIsPending(false)
        }
      }
    },
    [],
  )

  /**
   * Primary executor when submitFn was provided to the hook.
   */
  const execute = useCallback(
    async (data?: TInput): Promise<TOutput | undefined> => {
      if (isPendingRef.current || !submitFn) {
        return undefined
      }
      isPendingRef.current = true
      setIsPending(true)

      try {
        const result = await submitFn(data as TInput, idempotencyKeyRef.current)
        options?.onSuccess?.(result)
        // Refresh idempotency key after successful submission
        idempotencyKeyRef.current = createSubmitIdempotencyKey()
        return result
      } catch (err: unknown) {
        options?.onError?.(err)
        throw err
      } finally {
        isPendingRef.current = false
        setIsPending(false)
      }
    },
    [submitFn, options],
  )

  return {
    isPending,
    idempotencyKey: idempotencyKeyRef.current,
    guard,
    execute,
    reset,
  }
}
