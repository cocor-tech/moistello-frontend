import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  SorobanRpcClient,
  SorobanNetworkError,
  SorobanTimeoutError,
  SorobanRPCError,
  SorobanContractError,
  SorobanError,
} from "../rpc-client"

describe("SorobanRpcClient", () => {
  const rpcUrl = "https://soroban-testnet.stellar.org"

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("successfully performs an RPC request", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        result: { status: "healthy" },
      }),
    })

    const client = new SorobanRpcClient({ rpcUrl, fetchFn: mockFetch })
    const health = await client.getHealth()

    expect(health).toEqual({ status: "healthy" })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it("classifies network errors properly", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"))

    const client = new SorobanRpcClient({
      rpcUrl,
      maxRetries: 0,
      fetchFn: mockFetch,
    })

    await expect(client.getHealth()).rejects.toThrow(SorobanNetworkError)
  })

  it("classifies RPC error responses properly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32601, message: "Method not found" },
      }),
    })

    const client = new SorobanRpcClient({
      rpcUrl,
      maxRetries: 0,
      fetchFn: mockFetch,
    })

    await expect(client.getHealth()).rejects.toThrow(SorobanRPCError)
  })

  it("classifies contract execution errors properly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: 1004, message: "Contract failure code 1004" },
      }),
    })

    const client = new SorobanRpcClient({
      rpcUrl,
      maxRetries: 0,
      fetchFn: mockFetch,
    })

    await expect(client.getHealth()).rejects.toThrow(SorobanContractError)
  })

  it("retries transient network failures with exponential backoff", async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network glitch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: { status: "healthy" },
        }),
      })

    const client = new SorobanRpcClient({
      rpcUrl,
      maxRetries: 2,
      initialBackoffMs: 10,
      fetchFn: mockFetch,
    })

    const health = await client.getHealth()
    expect(health).toEqual({ status: "healthy" })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("handles request timeouts gracefully", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted")
            err.name = "AbortError"
            reject(err)
          })
        }
      })
    })

    const client = new SorobanRpcClient({
      rpcUrl,
      timeoutMs: 50,
      maxRetries: 0,
      fetchFn: mockFetch,
    })

    await expect(client.getHealth()).rejects.toThrow(SorobanTimeoutError)
  })
})
