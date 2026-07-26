import { WalletAdapter, WalletMeta, SignOptions, NetworkType } from "../types"
import { STELLAR_NETWORK } from "@/lib/constants"
import {
  deriveStellarKeypair,
  publicKeyToStellarAddress,
  secureZeroMemory,
  hexEncode,
} from "@/lib/crypto/key-derivation"

const CREDENTIAL_STORAGE_KEY = "moistello_passkey_credential"

interface StoredCredential {
  credentialId: string
  publicKeyRaw: string
}

// Stored as plain JSON — credentialId is a public identifier, not a secret.
// The wallet seed is derived from credentialId + server pepper (server-side only).
// Do NOT encrypt this value — it must be readable across tabs and browser sessions.

interface PasskeySession {
  credentialId: string
  publicKey: Uint8Array
  secretKey: Uint8Array
  stellarAddress: string
  pepper: string
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
      secureZeroMemory(session.secretKey)
    }
    session = null
  }

  async function apiPost<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw { adapter: "passkey" as const, code: "internal" as const, message: (data as Record<string, unknown>).error as string || "Request failed" }
    }
    return res.json()
  }

  return {
    meta,

    async connect() {
      if (typeof window === "undefined") {
        throw { adapter: "passkey", code: "not_supported" as const, message: "Not available server-side" }
      }

      if (session) {
        return { publicKey: hexEncode(session.publicKey) }
      }

      const { startRegistration, startAuthentication } = await import("@simplewebauthn/browser")
      const stored = getStoredCredential()

      // Stored credential path — existing user logging in
      if (stored) {
        const { options } = await apiPost<{ options: Record<string, unknown> }>(
          "/api/auth/passkey/generate-options",
          { credentialId: stored.credentialId, mode: "authenticate" }
        )

        let assertion: unknown
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          assertion = await startAuthentication({ optionsJSON: options as any })
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            throw { adapter: "passkey", code: "user_rejected" as const, message: "Authentication cancelled" }
          }
          const cause = err instanceof Error ? err.message : String(err)
          throw { adapter: "passkey", code: "internal" as const, message: cause, cause: String(err) }
        }

        const verifyResult = await apiPost<{ verified: boolean; credentialId: string; pepper: string }>(
          "/api/auth/passkey/auth-verify",
          { credentialId: stored.credentialId, assertion }
        )

        const keypair = await deriveStellarKeypair(stored.credentialId, verifyResult.pepper)
        const publicKeyHex = hexEncode(keypair.publicKey)
        session = {
          credentialId: stored.credentialId,
          publicKey: keypair.publicKey,
          secretKey: keypair.secretKey,
          stellarAddress: publicKeyToStellarAddress(keypair.publicKey),
          pepper: verifyResult.pepper,
        }
        return { publicKey: publicKeyHex }
      }

      // No stored credential — first-time registration
      // GUARD: If there's already a credential in localStorage but we failed to read it,
      // do NOT silently overwrite. The user must explicitly clear credentials first.
      const existingRaw = localStorage.getItem(CREDENTIAL_STORAGE_KEY)
      if (existingRaw) {
        throw {
          adapter: "passkey",
          code: "credential_unreadable" as const,
          message: "Existing passkey credential is corrupted or unreadable. Clear browser data for this site and try again.",
        }
      }

      const { options } = await apiPost<{ options: Record<string, unknown> }>(
        "/api/auth/passkey/generate-options",
        { mode: "register" }
      )

      let attestation: unknown
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attestation = await startRegistration({ optionsJSON: options as any })
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "NotAllowedError") {
          throw { adapter: "passkey", code: "user_rejected" as const, message: "Registration cancelled" }
        }
        const cause = err instanceof Error ? err.message : String(err)
        throw { adapter: "passkey", code: "internal" as const, message: `Passkey creation failed: ${cause}`, cause: String(err) }
      }

      const attestationRecord = attestation as { rawId?: string; id?: string }
      const credentialId = attestationRecord.rawId || attestationRecord.id || ""

      const registerResult = await apiPost<{ verified: boolean; credentialId: string; pepper: string }>(
        "/api/auth/passkey/register",
        { attestation }
      )

      const keypair = await deriveStellarKeypair(credentialId, registerResult.pepper)
      const publicKeyHex = hexEncode(keypair.publicKey)

      storeCredential({
        credentialId,
        publicKeyRaw: publicKeyHex,
      })

      session = {
        credentialId,
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey,
        stellarAddress: publicKeyToStellarAddress(keypair.publicKey),
        pepper: registerResult.pepper,
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
      return session !== null
    },

    async getPublicKey() {
      if (!session) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }
      return hexEncode(session.publicKey)
    },

    async signMessage(message: string) {
      if (!session) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }

      try {
        const { sign } = await import("@noble/ed25519") as unknown as { sign: (m: Uint8Array, k: Uint8Array) => Uint8Array }
        const { sha256 } = await import("@noble/hashes/sha2.js")
        const msgBytes = new TextEncoder().encode(message)
        const hashBytes = sha256(msgBytes)
        const signature = sign(hashBytes, session.secretKey)
        return {
          signature: hexEncode(signature),
          publicKey: hexEncode(session.publicKey),
        }
      } catch (err: unknown) {
        throw {
          adapter: "passkey",
          code: "internal" as const,
          message: "Failed to sign message",
          cause: err instanceof Error ? err.message : String(err),
        }
      }
    },

    async signTransaction(xdr: string, opts?: SignOptions) {
      if (!session) {
        throw { adapter: "passkey", code: "not_installed" as const, message: "Not authenticated" }
      }

      try {
        const { Keypair, Transaction, xdr: stellarXdr } = await import("@stellar/stellar-base")
        const networkPassphrase = resolveNetworkPassphrase(opts?.network, opts?.networkPassphrase)

        let envelope
        try {
          envelope = stellarXdr.TransactionEnvelope.fromXDR(xdr, "base64")
        } catch (parseErr: unknown) {
          throw {
            adapter: "passkey",
            code: "internal" as const,
            message: "Invalid transaction XDR format",
            cause: parseErr instanceof Error ? parseErr.message : String(parseErr),
          }
        }

        let tx
        try {
          tx = new Transaction(envelope, networkPassphrase)
        } catch (txErr: unknown) {
          throw {
            adapter: "passkey",
            code: "internal" as const,
            message: "Failed to create transaction from envelope",
            cause: txErr instanceof Error ? txErr.message : String(txErr),
          }
        }

        let kp
        try {
          const secretKeyBytes = new Uint8Array(session.secretKey)
          kp = Keypair.fromRawEd25519Seed(Buffer.from(secretKeyBytes))
        } catch (kpErr: unknown) {
          throw {
            adapter: "passkey",
            code: "internal" as const,
            message: "Failed to create keypair from session key",
            cause: kpErr instanceof Error ? kpErr.message : String(kpErr),
          }
        }

        try {
          tx.sign(kp)
        } catch (signErr: unknown) {
          throw {
            adapter: "passkey",
            code: "internal" as const,
            message: "Failed to apply signature to transaction",
            cause: signErr instanceof Error ? signErr.message : String(signErr),
          }
        }

        const signedXdr = tx.toEnvelope().toXDR("base64")
        return { signedXdr }
      } catch (err: unknown) {
        // Re-throw already-formatted errors from granular try/catch blocks
        if (err && typeof err === "object" && "adapter" in err) {
          throw err
        }
        throw {
          adapter: "passkey",
          code: "internal" as const,
          message: "Failed to sign transaction",
          cause: err instanceof Error ? err.message : String(err),
        }
      }
    },

    async getNetwork() {
      return STELLAR_NETWORK as NetworkType
    },
  }
}
