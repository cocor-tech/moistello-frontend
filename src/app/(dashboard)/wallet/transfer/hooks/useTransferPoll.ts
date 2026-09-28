"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { STELLAR_RPC_URL } from "@/lib/constants"
import { SorobanRpcClient } from "@/lib/soroban/rpc-client"

export type TxStatus = "pending" | "finalized" | "failed" | "timeout"

export interface TransferPollResult {
  status: TxStatus
  /** Number of poll attempts made so far. */
  attempts: number
}

const POLL_INTERVAL_MS = 3_000
const MAX_ATTEMPTS = 20 // 60 s before timeout

/**
 * Polls the Soroban RPC until the given txnHash reaches a terminal status.
 * Returns "pending" until the transaction is confirmed or a terminal condition
 * is reached.
 *
 * @param txnHash - The Stellar transaction hash to watch. Pass null to skip.
 */
export function useTransferPoll(txnHash: string | null): TransferPollResult {
  const [status, setStatus] = useState<TxStatus>("pending")
  const [attempts, setAttempts] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptsRef = useRef(0)
  const activeRef = useRef(true)

  const poll = useCallback(async () => {
    if (!txnHash || !activeRef.current) return

    const client = new SorobanRpcClient({ rpcUrl: STELLAR_RPC_URL, maxRetries: 1 })

    try {
      const result = await client.getTransaction(txnHash)
      // SorobanRpcClient.getTransaction returns { status: "SUCCESS" | "FAILED" | "NOT_FOUND" | ... }
      const raw = result as Record<string, unknown>
      const txStatus = String(raw?.status ?? "").toUpperCase()

      if (txStatus === "SUCCESS") {
        setStatus("finalized")
        return
      }
      if (txStatus === "FAILED") {
        setStatus("failed")
        return
      }
    } catch {
      // NOT_FOUND or network hiccup — keep polling
    }

    attemptsRef.current += 1
    setAttempts(attemptsRef.current)

    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setStatus("timeout")
      return
    }

    if (activeRef.current) {
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
  }, [txnHash])

  useEffect(() => {
    if (!txnHash) return

    activeRef.current = true
    attemptsRef.current = 0
    setStatus("pending")
    setAttempts(0)

    // Start first poll after a short delay to let the network process the tx
    timerRef.current = setTimeout(poll, 1_500)

    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [txnHash, poll])

  return { status, attempts }
}
