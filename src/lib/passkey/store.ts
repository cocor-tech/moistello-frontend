const CHALLENGE_TTL_MS = 5 * 60 * 1000
const CHALLENGE_TTL_SECONDS = Math.floor(CHALLENGE_TTL_MS / 1000)

export type CredentialRecord = {
  credentialId: string
  publicKey: Uint8Array
  counter: number
  transports?: string[]
  userId?: string
  deviceLabel?: string
  createdAt?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1100"

// ── Challenge store (Redis-backed for serverless compatibility) ──

import { getRedisClient } from "@/lib/redis/client"

const CHALLENGE_KEY_PREFIX = "passkey:challenge:"

const credentialStore = new Map<string, CredentialRecord>()

async function getRedis() {
  if (typeof window !== "undefined") {
    throw new Error("Challenge store should only be used server-side")
  }
  return getRedisClient()
}

export async function setChallenge(key: string, challenge: string): Promise<void> {
  const redis = await getRedis()
  const redisKey = `${CHALLENGE_KEY_PREFIX}${key}`
  await redis.set(redisKey, challenge, "EX", CHALLENGE_TTL_SECONDS)
}

export async function setTempChallenge(challenge: string): Promise<string> {
  const redis = await getRedis()
  const key = "tmp-" + crypto.randomUUID()
  const redisKey = `${CHALLENGE_KEY_PREFIX}${key}`
  await redis.set(redisKey, challenge, "EX", CHALLENGE_TTL_SECONDS)
  return key
}

export async function getAndVerifyTempChallenge(key: string, challenge: string): Promise<boolean> {
  const redis = await getRedis()
  const redisKey = `${CHALLENGE_KEY_PREFIX}${key}`
  const storedChallenge = await redis.get(redisKey)
  
  if (!storedChallenge) return false
  
  await redis.del(redisKey)
  
  return storedChallenge === challenge
}

export async function getAndVerifyChallenge(key: string, challenge: string): Promise<boolean> {
  const redis = await getRedis()
  const redisKey = `${CHALLENGE_KEY_PREFIX}${key}`
  const storedChallenge = await redis.get(redisKey)
  
  if (!storedChallenge) return false
  
  await redis.del(redisKey)
  
  return storedChallenge === challenge
}

// ── Credential store (persisted in PostgreSQL via Go backend) ──

function ensureUint8Array(value: Uint8Array | number[] | undefined): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (Array.isArray(value)) return Uint8Array.from(value)
  return new Uint8Array()
}

export async function storeCredential(credentialId: string, record: Omit<CredentialRecord, "credentialId">): Promise<void> {
  const normalized: CredentialRecord = {
    credentialId,
    publicKey: ensureUint8Array(record.publicKey),
    counter: record.counter ?? 0,
    transports: record.transports ?? [],
    userId: record.userId,
    deviceLabel: record.deviceLabel,
    createdAt: record.createdAt || new Date().toISOString(),
  }

  credentialStore.set(credentialId, normalized)

  const body: Record<string, unknown> = {
    credentialId,
    publicKey: Array.from(normalized.publicKey),
    counter: normalized.counter,
    transports: normalized.transports ?? [],
    userId: normalized.userId ?? null,
    deviceLabel: normalized.deviceLabel ?? null,
    createdAt: normalized.createdAt ?? null,
  }

  try {
    await fetch(`${API_BASE}/passkey/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  } catch {
    // Fall back to local in-memory storage in environments without the backend.
  }
}

export async function getCredential(credentialId: string): Promise<CredentialRecord | undefined> {
  const localCredential = credentialStore.get(credentialId)
  if (localCredential) {
    return {
      ...localCredential,
      publicKey: new Uint8Array(localCredential.publicKey),
    }
  }

  try {
    const res = await fetch(`${API_BASE}/passkey/credentials/${encodeURIComponent(credentialId)}`)
    if (!res.ok) return undefined
    const data = await res.json()
    if (!data?.data) return undefined
    return {
      credentialId: data.data.credentialId,
      publicKey: Uint8Array.from(atob(data.data.publicKey), (c) => c.charCodeAt(0)),
      counter: data.data.counter ?? 0,
      transports: data.data.transports,
      userId: data.data.userId,
    }
  } catch {
    return undefined
  }
}

export async function updateCredentialCounter(credentialId: string, counter: number): Promise<void> {
  const local = credentialStore.get(credentialId)
  if (local) {
    local.counter = counter
  }

  try {
    await fetch(`${API_BASE}/passkey/credentials/${encodeURIComponent(credentialId)}/counter`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counter }),
    })
  } catch {
    // Fall back to local in-memory storage in environments without the backend.
  }
}

export async function listCredentials(userId: string): Promise<CredentialRecord[]> {
  const local = Array.from(credentialStore.values()).filter(c => c.userId === userId)
  try {
    const res = await fetch(`${API_BASE}/passkey/credentials?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) return local
    const data = await res.json()
    if (!data?.data || !Array.isArray(data.data)) return local
    return data.data.map((c: any) => ({
      credentialId: c.credentialId,
      publicKey: Uint8Array.from(atob(c.publicKey), (x) => x.charCodeAt(0)),
      counter: c.counter ?? 0,
      transports: c.transports,
      userId: c.userId,
      deviceLabel: c.deviceLabel,
      createdAt: c.createdAt,
    }))
  } catch {
    return local
  }
}

export async function deleteCredential(credentialId: string): Promise<void> {
  credentialStore.delete(credentialId)
  try {
    await fetch(`${API_BASE}/passkey/credentials/${encodeURIComponent(credentialId)}`, {
      method: "DELETE"
    })
  } catch {
    // local fallback
  }
}

// Placeholder pepper used only for local development and tests. It was once
// committed to the repository, so it must be treated as public: production
// refuses to fall back to it and requires a real, rotated PASSKEY_SERVER_PEPPER.
const DEV_FALLBACK_PEPPER = "moistello-passkey-pepper-v1"

export function getPepper(): string {
  const pepper = process.env.PASSKEY_SERVER_PEPPER
  if (pepper) return pepper

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PASSKEY_SERVER_PEPPER is not set. This value seeds Stellar key derivation " +
        "and has no safe default — generate one with `openssl rand -hex 32` and " +
        "set it in the deployment environment."
    )
  }

  return DEV_FALLBACK_PEPPER
}

export function getRpId(): string {
  return process.env.NEXT_PUBLIC_PASSKEY_RP_ID || "localhost"
}

export function getExpectedOrigin(): string | string[] {
  const origin = process.env.PASSKEY_EXPECTED_ORIGIN || "http://localhost:1110"
  // Support both www and non-www
  if (origin.startsWith("https://") && !origin.includes("www")) {
    const withWww = origin.replace("https://", "https://www.")
    return [origin, withWww]
  }
  return origin
}
