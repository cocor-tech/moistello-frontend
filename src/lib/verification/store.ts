import { logger } from "@/lib/logger"
const CODE_TTL_MS = 10 * 60 * 1000
const MAX_SENDS_PER_WINDOW = 3
const SEND_WINDOW_MS = 10 * 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5

interface VerificationEntry {
  code: string
  email: string
  createdAt: number
  expiresAt: number
  verifyAttempts: number
}

interface SendRecord {
  sentAt: number
}

const store = new Map<string, VerificationEntry>()
const sendHistory = new Map<string, SendRecord[]>()

function generateCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 10).toString()).join("")
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function getSendHistory(email: string): SendRecord[] {
  const now = Date.now()
  const records = sendHistory.get(email) ?? []
  const recent = records.filter((r) => now - r.sentAt < SEND_WINDOW_MS)
  sendHistory.set(email, recent)
  return recent
}

function canSend(email: string): { allowed: boolean; retryAfterMs?: number } {
  const recent = getSendHistory(email)
  if (recent.length < MAX_SENDS_PER_WINDOW) {
    return { allowed: true }
  }
  const oldest = recent[0]
  const retryAfterMs = SEND_WINDOW_MS - (Date.now() - oldest.sentAt)
  return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) }
}

export function sendCode(email: string): { verificationId: string; expiresIn: number; remainingAttempts: number } | { error: string; status: number; retryAfterMs?: number } {
  const normalized = normalizeEmail(email)
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Invalid email address.", status: 400 }
  }

  const rateCheck = canSend(normalized)
  if (!rateCheck.allowed) {
    return { error: "Too many code requests. Please wait before trying again.", status: 429, retryAfterMs: rateCheck.retryAfterMs }
  }

  const code = generateCode()
  const now = Date.now()
  const verificationId = "vid-" + crypto.randomUUID()

  store.set(verificationId, {
    code,
    email: normalized,
    createdAt: now,
    expiresAt: now + CODE_TTL_MS,
    verifyAttempts: 0,
  })

  const history = getSendHistory(normalized)
  history.push({ sentAt: now })
  sendHistory.set(normalized, history)

  logger.debug("Verification code generated")

  return { verificationId, expiresIn: Math.floor(CODE_TTL_MS / 1000), remainingAttempts: MAX_VERIFY_ATTEMPTS }
}

export function verifyCode(verificationId: string, code: string): { verified: true } | { error: string; status: number; remainingAttempts?: number } {
  const entry = store.get(verificationId)
  if (!entry) {
    return { error: "Verification session not found.", status: 404 }
  }

  if (Date.now() > entry.expiresAt) {
    store.delete(verificationId)
    return { error: "expired", status: 410 }
  }

  entry.verifyAttempts++

  if (entry.verifyAttempts > MAX_VERIFY_ATTEMPTS) {
    store.delete(verificationId)
    return { error: "Too many verification attempts. Please request a new code.", status: 429 }
  }

  if (entry.code !== code) {
    const remaining = MAX_VERIFY_ATTEMPTS - entry.verifyAttempts
    return { error: `Invalid code. ${remaining} attempt(s) remaining.`, status: 400, remainingAttempts: remaining }
  }

  store.delete(verificationId)
  return { verified: true }
}

export function resendCode(verificationId: string): { expiresIn: number } | { error: string; status: number; retryAfterMs?: number } {
  const entry = store.get(verificationId)
  if (!entry) {
    return { error: "Verification session not found. Please start over.", status: 404 }
  }

  const rateCheck = canSend(entry.email)
  if (!rateCheck.allowed) {
    return { error: "Too many code requests. Please wait before trying again.", status: 429, retryAfterMs: rateCheck.retryAfterMs }
  }

  const newCode = generateCode()
  const now = Date.now()

  entry.code = newCode
  entry.createdAt = now
  entry.expiresAt = now + CODE_TTL_MS
  entry.verifyAttempts = 0

  const history = getSendHistory(entry.email)
  history.push({ sentAt: now })
  sendHistory.set(entry.email, history)

  logger.debug("Verification code resent")

  return { expiresIn: Math.floor(CODE_TTL_MS / 1000) }
}

const CODE_SWEEP_INTERVAL = 60_000

function sweepExpired(): void {
  const now = Date.now()
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.expiresAt) {
      store.delete(key)
    }
  })
}

sweepExpired()
setInterval(sweepExpired, CODE_SWEEP_INTERVAL)
