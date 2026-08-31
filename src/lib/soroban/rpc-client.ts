export class SorobanError extends Error {
  constructor(message: string, public readonly code?: string | number) {
    super(message)
    this.name = "SorobanError"
  }
}

export class SorobanNetworkError extends SorobanError {
  constructor(message: string, public readonly cause?: unknown) {
    super(`Network error: ${message}`, "NETWORK_ERROR")
    this.name = "SorobanNetworkError"
  }
}

export class SorobanTimeoutError extends SorobanError {
  constructor(timeoutMs: number) {
    super(`Soroban RPC request timed out after ${timeoutMs}ms`, "TIMEOUT_ERROR")
    this.name = "SorobanTimeoutError"
  }
}

export class SorobanRPCError extends SorobanError {
  constructor(code: number, message: string, public readonly data?: unknown) {
    super(`RPC error [${code}]: ${message}`, code)
    this.name = "SorobanRPCError"
  }
}

export class SorobanContractError extends SorobanError {
  constructor(public readonly contractCode: number, message?: string) {
    super(message || `Contract execution failed with error code ${contractCode}`, contractCode)
    this.name = "SorobanContractError"
  }
}

export interface SorobanRpcClientConfig {
  rpcUrl: string
  timeoutMs?: number
  maxRetries?: number
  initialBackoffMs?: number
  maxBackoffMs?: number
  fetchFn?: typeof fetch
}

export interface RpcResponse<T = unknown> {
  jsonrpc: string
  id: string | number
  result?: T
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export class SorobanRpcClient {
  private readonly rpcUrl: string
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly initialBackoffMs: number
  private readonly maxBackoffMs: number
  private readonly fetchFn: typeof fetch

  constructor(config: SorobanRpcClientConfig) {
    this.rpcUrl = config.rpcUrl
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.maxRetries = config.maxRetries ?? 3
    this.initialBackoffMs = config.initialBackoffMs ?? 500
    this.maxBackoffMs = config.maxBackoffMs ?? 5_000
    this.fetchFn = config.fetchFn ?? globalThis.fetch
  }

  public classifyError(error: unknown): SorobanError {
    if (error instanceof SorobanError) {
      return error
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new SorobanTimeoutError(this.timeoutMs)
      }
      return new SorobanNetworkError(error.message, error)
    }

    return new SorobanError(String(error), "UNKNOWN_ERROR")
  }

  public async request<T = unknown>(method: string, params: unknown = {}): Promise<T> {
    let attempt = 0

    while (attempt <= this.maxRetries) {
      try {
        return await this.executeSingleRequest<T>(method, params)
      } catch (err) {
        const classified = this.classifyError(err)

        const isRetryable =
          classified instanceof SorobanNetworkError ||
          classified instanceof SorobanTimeoutError ||
          (classified instanceof SorobanRPCError && classified.code === -32603)

        if (!isRetryable || attempt >= this.maxRetries) {
          throw classified
        }

        const delay = this.calculateBackoff(attempt)
        await this.sleep(delay)
        attempt++
      }
    }

    throw new SorobanNetworkError("Max retries exceeded")
  }

  private async executeSingleRequest<T>(method: string, params: unknown): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchFn(this.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new SorobanNetworkError(`HTTP status ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as RpcResponse<T>

      if (data.error) {
        if (typeof data.error.code === "number" && data.error.code >= 1000) {
          throw new SorobanContractError(data.error.code, data.error.message)
        }
        throw new SorobanRPCError(data.error.code, data.error.message, data.error.data)
      }

      if (data.result === undefined) {
        throw new SorobanRPCError(-32603, "Empty result in RPC response")
      }

      return data.result
    } catch (err) {
      throw this.classifyError(err)
    } finally {
      clearTimeout(timer)
    }
  }

  public calculateBackoff(attempt: number): number {
    const exponential = this.initialBackoffMs * Math.pow(2, attempt)
    const jitter = Math.random() * 100
    return Math.min(this.maxBackoffMs, exponential + jitter)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Domain convenience methods
  public async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>("getHealth")
  }

  public async getAccount(address: string): Promise<{ id: string; sequence: string }> {
    return this.request<{ id: string; sequence: string }>("getAccount", { address })
  }

  public async getTransaction(hash: string): Promise<{ status: string; resultXdr?: string }> {
    return this.request<{ status: string; resultXdr?: string }>("getTransaction", { hash })
  }

  public async sendTransaction(txXdr: string): Promise<{ status: string; hash: string }> {
    return this.request<{ status: string; hash: string }>("sendTransaction", { tx: txXdr })
  }

  public async simulateTransaction(txXdr: string): Promise<{ minResourceFee: string; results?: unknown[] }> {
    return this.request<{ minResourceFee: string; results?: unknown[] }>("simulateTransaction", { tx: txXdr })
  }
}
