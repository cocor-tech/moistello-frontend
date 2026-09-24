export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const

export type LogLevel = (typeof LOG_LEVELS)[number]
export type LogContext = Record<string, unknown>

export interface LogEvent {
  level: LogLevel
  message: string
  timestamp: number
  context?: LogContext
  /** Number of identical browser events represented by this record. */
  occurrences?: number
  /** Internal grouping key; omitted from server output after aggregation. */
  fingerprint?: string
  firstTimestamp?: number
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const DEFAULT_BROWSER_ENDPOINT = "/api/logs"
const FLUSH_INTERVAL_MS = 5_000
const MAX_QUEUE_SIZE = 100
const MAX_BATCH_SIZE = 25
const MAX_BATCH_BYTES = 60 * 1024
const MAX_CONTEXT_BYTES = 2_048
const MAX_REDACTED_STRING_LENGTH = 2_000
const MAX_CONTEXT_DEPTH = 4
const REDACTED = "[redacted]"

let configuredLevel: LogLevel | null = null
let browserQueue: LogEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushInFlight = false
let flushGeneration = 0
let unloadListenersAttached = false

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value)
}

function readEnvironment(name: string): string | undefined {
  if (typeof process === "undefined") return undefined
  // Keep public variable lookups explicit so Next can inline them in browser
  // bundles; dynamic `process.env[name]` access is not reliably replaced.
  if (name === "NODE_ENV") return process.env.NODE_ENV
  if (name === "NEXT_PUBLIC_LOG_LEVEL") return process.env.NEXT_PUBLIC_LOG_LEVEL
  if (name === "NEXT_PUBLIC_LOGS_ENDPOINT") return process.env.NEXT_PUBLIC_LOGS_ENDPOINT
  if (name === "LOG_LEVEL") return process.env.LOG_LEVEL
  return process.env[name]
}

function isProduction(): boolean {
  return readEnvironment("NODE_ENV") === "production"
}

export function getConfiguredLogLevel(): LogLevel {
  if (configuredLevel) {
    return isProduction() && configuredLevel === "debug" ? "info" : configuredLevel
  }
  const configured = (readEnvironment("NEXT_PUBLIC_LOG_LEVEL") || readEnvironment("LOG_LEVEL") || "").trim().toLowerCase()
  if (isLogLevel(configured)) {
    return isProduction() && configured === "debug" ? "info" : configured
  }
  return isProduction() ? "info" : "debug"
}

export function setLogLevel(level: LogLevel | null): void {
  configuredLevel = level
}

export function isLogLevelEnabled(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getConfiguredLogLevel()]
}

function redactString(value: string): string {
  return value
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, "[email]")
    .replace(/G[A-Za-z0-9]{55}/g, "[stellar-address]")
    .replace(/0x[a-fA-F0-9]{40}/g, "[evm-address]")
    .replace(/\b\d{6}\b/g, "[otp]")
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]")
    .slice(0, MAX_REDACTED_STRING_LENGTH)
}

const SENSITIVE_KEY = /password|passcode|token|secret|authorization|cookie|private|credential|mnemonic|seed|otp|verification.?code|challenge|nonce|signature|xdr|session|user|wallet|address|email|file(name)?/i

function redactValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_CONTEXT_DEPTH) return "[truncated]"
  if (typeof value === "string") return redactString(value)
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "function") return "[function]"
  if (typeof value === "symbol") return "[symbol]"
  if (value === null || typeof value !== "object") return value
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    }
  }
  if (seen.has(value)) return "[circular]"
  seen.add(value)

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(item, depth + 1, seen))
  }

  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value).slice(0, 50)) {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(item, depth + 1, seen)
  }
  return result
}

function safeStringify(value: unknown): string | undefined {
  try {
    return JSON.stringify(value)
  } catch {
    return undefined
  }
}

function stableStringify(value: unknown): string | undefined {
  try {
    const seen = new WeakSet<object>()
    const normalize = (item: unknown): unknown => {
      if (Array.isArray(item)) return item.map(normalize)
      if (item === null || typeof item !== "object") return item
      if (seen.has(item)) return "[circular]"
      seen.add(item)
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(item).sort()) {
        result[key] = normalize((item as Record<string, unknown>)[key])
      }
      return result
    }
    return JSON.stringify(normalize(value))
  } catch {
    return undefined
  }
}

function cappedContext(context: LogContext): LogContext {
  const serialized = safeStringify(context)
  if (!serialized) return { truncated: "[unserializable context]" }
  if (new TextEncoder().encode(serialized).byteLength <= MAX_CONTEXT_BYTES) return context
  return { truncated: "[context too large]" }
}

export function sanitizeLogContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined
  try {
    return cappedContext(redactValue(context) as LogContext)
  } catch {
    return { truncated: "[unserializable context]" }
  }
}

function fingerprintFor(level: LogLevel, message: string, context?: LogContext): string {
  const contextFingerprint = context ? stableStringify(context) || Object.keys(context).sort().join(",") : ""
  const source = `${level}|${message}|${contextFingerprint}`
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

function createEvent(level: LogLevel, message: string, context?: LogContext): LogEvent {
  let safeMessage: string
  try {
    safeMessage = redactString(String(message).slice(0, 2_000))
  } catch {
    safeMessage = "[unserializable message]"
  }
  const safeContext = sanitizeLogContext(context)
  const timestamp = Date.now()
  return {
    level,
    message: safeMessage,
    timestamp,
    occurrences: 1,
    firstTimestamp: timestamp,
    fingerprint: fingerprintFor(level, safeMessage, safeContext),
    ...(safeContext && Object.keys(safeContext).length > 0 ? { context: safeContext } : {}),
  }
}

function writeServerEvent(event: LogEvent): void {
  if (typeof process === "undefined") return
  const serializableEvent = { ...event }
  delete serializableEvent.fingerprint
  const serialized = safeStringify(serializableEvent) || JSON.stringify({
    level: event.level,
    message: event.message,
    timestamp: event.timestamp,
    occurrences: event.occurrences,
    context: "[unserializable context]",
  })
  const line = `${serialized}\n`
  const stream = event.level === "error" ? process.stderr : process.stdout
  if (typeof stream?.write === "function") stream.write(line)
}

function getBrowserEndpoint(): string {
  return readEnvironment("NEXT_PUBLIC_LOGS_ENDPOINT") || DEFAULT_BROWSER_ENDPOINT
}

function mergeEvent(target: LogEvent, incoming: LogEvent): void {
  target.occurrences = (target.occurrences || 1) + (incoming.occurrences || 1)
  target.timestamp = incoming.timestamp
}

function scheduleFlush(): void {
  if (flushTimer || flushInFlight || browserQueue.length === 0) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushLogs()
  }, FLUSH_INTERVAL_MS)
}

function serializedSize(value: unknown): number {
  const serialized = safeStringify(value)
  return serialized ? new TextEncoder().encode(serialized).byteLength + 1 : MAX_BATCH_BYTES + 1
}

function takeBrowserBatch(): LogEvent[] {
  const batch: LogEvent[] = []
  let bytes = 2

  while (browserQueue.length > 0 && batch.length < MAX_BATCH_SIZE) {
    const event = browserQueue[0]
    let nextEvent = event
    let eventSize = serializedSize(event)
    if (eventSize > MAX_BATCH_BYTES && event.context) {
      const reducedEvent = { ...event, context: { truncated: "[context too large]" } }
      const reducedSize = serializedSize(reducedEvent)
      if (reducedSize <= MAX_BATCH_BYTES) {
        nextEvent = reducedEvent
        eventSize = reducedSize
      }
    }
    if (eventSize > MAX_BATCH_BYTES) {
      browserQueue.shift()
      continue
    }
    if (bytes + eventSize > MAX_BATCH_BYTES) break
    browserQueue.shift()
    batch.push(nextEvent)
    bytes += eventSize
  }

  return batch
}

function requeue(batch: LogEvent[]): void {
  for (const event of batch) {
    const existing = browserQueue.find((item) => item.fingerprint === event.fingerprint)
    if (existing) {
      mergeEvent(existing, event)
    } else {
      browserQueue.push(event)
    }
  }
  browserQueue = browserQueue.slice(-MAX_QUEUE_SIZE)
}

export function flushLogs(useBeacon = false): void {
  if (typeof window === "undefined" || browserQueue.length === 0 || flushInFlight) return
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  const batch = takeBrowserBatch()
  if (batch.length === 0) return
  flushInFlight = true
  const generation = flushGeneration

  let payload: string
  try {
    payload = JSON.stringify(batch)
    if (new TextEncoder().encode(payload).byteLength > MAX_BATCH_BYTES) {
      requeue(batch)
      flushInFlight = false
      scheduleFlush()
      return
    }
  } catch {
    requeue(batch)
    flushInFlight = false
    scheduleFlush()
    return
  }

  const isCurrent = () => generation === flushGeneration
  const requeueIfCurrent = () => {
    if (isCurrent()) requeue(batch)
  }
  const finish = () => {
    if (!isCurrent()) return
    flushInFlight = false
    scheduleFlush()
  }

  try {
    // sendBeacon cannot report an HTTP rejection, so reserve it for unload
    // delivery. Normal timer flushes use fetch and can requeue failed batches.
    if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        getBrowserEndpoint(),
        new Blob([payload], { type: "application/json" }),
      )
      if (sent) {
        finish()
        return
      }
    }

    void fetch(getBrowserEndpoint(), {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).then((response) => {
      if (!response.ok) requeueIfCurrent()
    }).catch(() => requeueIfCurrent()).finally(finish)
  } catch {
    requeueIfCurrent()
    finish()
  }
}

function enqueue(event: LogEvent): void {
  const existing = browserQueue.find((item) => item.fingerprint === event.fingerprint)
  if (existing) {
    mergeEvent(existing, event)
  } else {
    browserQueue.push(event)
  }
  if (browserQueue.length > MAX_QUEUE_SIZE) {
    browserQueue = browserQueue.slice(-MAX_QUEUE_SIZE)
  }
  const occurrences = browserQueue.reduce((total, item) => total + (item.occurrences || 1), 0)
  if (occurrences >= MAX_BATCH_SIZE) {
    flushLogs()
    return
  }
  scheduleFlush()
}

export function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!isLogLevelEnabled(level)) return
  const event = createEvent(level, message, context)
  if (typeof window === "undefined") {
    writeServerEvent(event)
  } else {
    enqueue(event)
  }
}

function detailsToContext(details: unknown[]): LogContext | undefined {
  if (details.length === 0) return undefined
  if (details.length === 1) {
    const [detail] = details
    if (typeof detail === "object" && detail !== null && !Array.isArray(detail) && !(detail instanceof Error)) {
      return detail as LogContext
    }
    return { error: detail }
  }
  if (details.length === 2 && details[0] instanceof Error && typeof details[1] === "object" && details[1] !== null) {
    return { error: details[0], ...(details[1] as LogContext) }
  }
  return { details }
}

export const logger = {
  debug: (message: string, ...details: unknown[]) => log("debug", message, detailsToContext(details)),
  info: (message: string, ...details: unknown[]) => log("info", message, detailsToContext(details)),
  warn: (message: string, ...details: unknown[]) => log("warn", message, detailsToContext(details)),
  error: (message: string, ...details: unknown[]) => log("error", message, detailsToContext(details)),
}

function flushOnUnload(): void {
  flushLogs(true)
}

export function attachLogFlushListeners(): void {
  if (typeof window === "undefined" || unloadListenersAttached) return
  unloadListenersAttached = true
  window.addEventListener("pagehide", flushOnUnload)
  window.addEventListener("beforeunload", flushOnUnload)
}

export function getBufferedLogCount(): number {
  return browserQueue.length
}

export function resetLogger(): void {
  browserQueue = []
  configuredLevel = null
  flushGeneration += 1
  flushInFlight = false
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("pagehide", flushOnUnload)
    window.removeEventListener("beforeunload", flushOnUnload)
  }
  unloadListenersAttached = false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseLogEvents(payload: unknown): LogEvent[] {
  const values = Array.isArray(payload) ? payload : [payload]
  if (values.length > MAX_BATCH_SIZE) return []

  const events: LogEvent[] = []
  for (const value of values) {
    if (!isRecord(value) || !isLogLevel(value.level) || typeof value.message !== "string") continue
    if (value.message.length > 2_000) continue
    const context = isRecord(value.context) ? sanitizeLogContext(value.context) : undefined
    const timestamp = typeof value.timestamp === "number" && Number.isFinite(value.timestamp) ? value.timestamp : Date.now()
    const occurrences = typeof value.occurrences === "number" && Number.isInteger(value.occurrences) && value.occurrences > 0
      ? Math.min(value.occurrences, 100_000)
      : 1
    events.push({
      level: value.level,
      message: redactString(value.message),
      timestamp,
      occurrences,
      ...(typeof value.firstTimestamp === "number" && Number.isFinite(value.firstTimestamp) ? { firstTimestamp: value.firstTimestamp } : {}),
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    })
  }
  return events
}

export function writeServerLog(event: LogEvent): void {
  if (isLogLevelEnabled(event.level)) writeServerEvent(event)
}
