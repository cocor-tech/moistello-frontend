import { WalletAdapter, WalletMeta, SignOptions, NetworkType } from "../types"
import { STELLAR_NETWORK } from "@/lib/constants"
import { getCsrfHeaders } from "@/lib/auth/csrf"
import {
  publicKeyToStellarAddress,
  hexEncode,
  secureZeroMemory,
} from "@/lib/crypto/key-derivation"
import { hexToBytes } from "@noble/hashes/utils.js"

const CREDENTIAL_STORAGE_KEY = "moistello_passkey_credential"

export interface StoredCredential {
  credentialId: string
  publicKeyRaw: string
  email?: string
}

// Stored as plain JSON — credentialId is a public identifier, not a secret.
// The wallet seed is derived from credentialId + server pepper (server-side only).
// Do NOT encrypt this value — it must be readable across tabs and browser sessions.

interface PasskeySession {
  credentialId: string
  publicKey: Uint8Array
  stellarAddress: string
  expiresAt: number
}

function resolveNetworkPassphrase(network?: NetworkType, networkPassphrase?: string): string {
  if (networkPassphrase) return networkPassphrase
  if (network === "mainnet") return "Public Global Stellar Network ; September 2015"
  return "Test SDF Network ; September 2015"
}

export function createPasskeyAdapter(): WalletAdapter {
  const meta: WalletMeta = {
    id: "passkey",
    name: "Passkey",
    category: "passkey",
    icon: "passkey-icon",
    installUrl: "",
    description: "Sign in with biometrics. No password needed.",
    priority: 30,
    isAvailable: () => {
      if (typeof window === "undefined") return false
      return typeof PublicKeyCredential !== "undefined"
    },
  }

  let session: PasskeySession | null = null

  function getStoredCredential(): StoredCredential | null {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as StoredCredential
    } catch {
      return null
    }
  }

  function storeCredential(cred: StoredCredential): void {
    if (typeof window === "undefined") return
    localStorage.setItem(CREDENTIAL_STORAGE_KEY, JSON.stringify(cred))
  }

  function removeStoredCredential(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(CREDENTIAL_STORAGE_KEY)
  }

  function zeroSession(): void {
    if (session) {
      secureZeroMemory(session.publicKey)
      session = null
    }
  }

  async function apiPost<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw {
        adapter: "passkey" as const,
        code: "internal" as const,
        message: ((data as Record<string, unknown>).error as string) || "Request failed",
      }
    }
    return res.json()
  }

  return {
    meta,

    async connect(email?: string) {
      if (typeof window === "undefined") {
        throw { adapter: "passkey", code: "not_supported" as const, message: "Not available server-side" }
      }

      if (session && Date.now() < session.expiresAt) {
        return { publicKey: hexEncode(session.publicKey) }
      }

      const { startRegistration, startAuthentication } = await import("@simplewebauthn/browser")
      const stored = getStoredCredential()

      // Stored credential path — existing user logging in (unless email is explicitly provided for re-registration)
      if (stored && !email) {
        const { options, tempKey } = await apiPost<{ options: Record<string, unknown>; tempKey: string }>(
          "/api/auth/passkey/generate-options",
          { credentialId: stored.credentialId, mode: "authenticate" }
        )

        let assertion: unknown
        try {
          assertion = await startAuthentication({
            optionsJSON: options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
            useBrowserAutofill: true,
          })
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            throw { adapter: "passkey", code: "user_rejected" as const, message: "Authentication cancelled" }
          }
          const cause = err instanceof Error ? err.message : String(err)
          throw { adapter: "passkey", code: "internal" as const, message: cause, cause: String(err) }
        }

        const verifyResult = await apiPost<{ verified: boolean; credentialId: string; publicKey: string }>(
          "/api/auth/passkey/auth-verify",
          { credentialId: stored.credentialId, assertion, tempKey }
        )

        const publicKey = hexToBytes(verifyResult.publicKey)
        const publicKeyHex = verifyResult.publicKey
        session = {
          credentialId: stored.credentialId,
          publicKey,
          stellarAddress: publicKeyToStellarAddress(publicKey),
          expiresAt: Date.now() + 3600000,
        }
        return { publicKey: publicKeyHex }
      }

      // No stored credential or explicit registration flow requested
      const existingRaw = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
      if (existingRaw && !email) {
        throw {
          adapter: "passkey",
          code: "credential_unreadable" as const,
          message: "Existing passkey credential is corrupted or unreadable. Clear browser data for this site and try again.",
        }
      }

      const { options, tempKey } = await apiPost<{ options: Record<string, unknown>; tempKey: string }>(
        "/api/auth/passkey/generate-options",
        { mode: "register", email }
      )

      let attestation: unknown
      try {
        attestation = await startRegistration({
          optionsJSON: options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
        })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "NotAllowedError") {
          throw { adapter: "passkey", code: "user_rejected" as const, message: "Registration cancelled" }
        }
        const cause = err instanceof Error ? err.message : String(err)
        throw { adapter: "passkey", code: "internal" as const, message: `Passkey creation failed: ${cause}`, cause: String(err) }
      }

      const attestationRecord = attestation as { rawId?: string; id?: string }
      const credentialId = attestationRecord.rawId || attestationRecord.id || ""

      const registerResult = await apiPost<{ verified: boolean; credentialId: string; publicKey: string }>(
        "/api/auth/passkey/register",
        { attestation, tempKey, email }
      )

      const publicKey = hexToBytes(registerResult.publicKey)
      const publicKeyHex = registerResult.publicKey

      storeCredential({
        credentialId,
        publicKeyRaw: publicKeyHex,
        email,
      })

      session = {
        credentialId,
        publicKey,
        stellarAddress: publicKeyToStellarAddress(publicKey),
        expiresAt: Date.now() + 3600000,
      }

      return { publicKey: publicKeyHex }
    },

    reset() {
      removeStoredCredential()
      zeroSession()
    },

    async disconnect() {
      zeroSession()
    },

    async isConnected() {
      return session !== null && Date.now() < session.expiresAt
    },

    async getPublicKey() {
      if (!session || Date.now() >= session.expiresAt) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }
      return hexEncode(session.publicKey)
    },

    async signMessage(message: string) {
      if (!session || Date.now() >= session.expiresAt) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }

      const result = await apiPost<{ signature: string; publicKey: string }>(
        "/api/auth/passkey/sign-message",
        { credentialId: session.credentialId, message }
      )

      return { signature: result.signature, publicKey: result.publicKey }
    },

    async signTransaction(xdr: string, opts?: SignOptions) {
      if (!session || Date.now() >= session.expiresAt) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }

      const networkPassphrase = resolveNetworkPassphrase(opts?.network, opts?.networkPassphrase)
      const result = await apiPost<{ signedXdr: string }>(
        "/api/auth/passkey/sign-transaction",
        { credentialId: session.credentialId, xdr, networkPassphrase }
      )

      return { signedXdr: result.signedXdr }
    },

    async getNetwork() {
      return STELLAR_NETWORK as NetworkType
    },
  }
}
