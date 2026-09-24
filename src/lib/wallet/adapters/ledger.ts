import { logger } from "@/lib/logger"
import { WalletAdapter, WalletMeta, SignOptions, NetworkType } from "../types"
import { detectAvailableTransport, LedgerTransportManager } from "./ledger-transport"
import type { ConnectionState } from "./ledger-transport"
import { LEDGER_BUFFER_SIZE_BYTES } from "@/lib/constants"

interface StellarApp {
  getPublicKey: (path: string, opts?: { display?: boolean; chainCode?: boolean }) => Promise<{ publicKey: string }>
  signTransaction: (path: string, xdr: string) => Promise<{ signature: string }>
  getAppConfiguration: () => Promise<{ version: string; flag?: string }>
}

const DERIVATION_PATH = "44'/148'/0'"
const MIN_FIRMWARE_MAJOR = 2
const MIN_STELLAR_APP_MAJOR = 3
const MIN_STELLAR_APP_MINOR = 3

function makeError(
  adapter: string,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return { adapter, code, message, ...extra }
}

function networkPassphrase(network: NetworkType): string {
  return network === "mainnet"
    ? "Public Global Stellar Network ; September 2015"
    : "Test SDF Network ; September 2015"
}

function validatePublicKey(pubkey: string): boolean {
  return !!pubkey && pubkey.length === 56 && pubkey.startsWith("G")
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

function parseLedgerError(err: unknown, context: string): Record<string, unknown> {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes("denied") || lower.includes("reject") || lower.includes("cancel")) {
    return makeError("ledger", "user_rejected", `${context} rejected on Ledger device.`)
  }
  if (lower.includes("lock") || lower.includes("0x6982")) {
    return makeError("ledger", "ledger_device_locked", "Please unlock your Ledger with your PIN.")
  }
  if (lower.includes("0x6511")) {
    return makeError("ledger", "ledger_device_locked", "Ledger is locked. Unlock it and open the Stellar app.")
  }
  if (lower.includes("app") || lower.includes("stellar") || lower.includes("not open")) {
    return makeError("ledger", "ledger_stellar_app_not_open", "Please open the Stellar app on your Ledger.")
  }
  if (lower.includes("not supported") || lower.includes("browser")) {
    return makeError("ledger", "ledger_unsupported_browser", "Ledger requires Chrome, Edge, or Brave browser.", { browser: navigator.userAgent })
  }
  return makeError("ledger", "ledger_sign_failed", `Failed to ${context.toLowerCase()} on Ledger.`, { cause: msg })
}

export function createLedgerAdapter(
  transportManager?: LedgerTransportManager,
  onStateChange?: (state: ConnectionState) => void,
): WalletAdapter {
  const manager = transportManager ?? new LedgerTransportManager(onStateChange)
  let stellarApp: StellarApp | null = null
  let currentPublicKey: string | null = null
  const currentNetwork: NetworkType = "testnet"
  let cachedFirmware: { firmware: string; stellarApp: string; warnings: string[] } | null = null

  const meta: WalletMeta = {
    id: "ledger",
    name: "Ledger",
    category: "hardware",
    icon: "ledger-icon",
    installUrl: "https://www.ledger.com/stellar-wallet",
    description: "Hardware wallet — maximum security for large amounts",
    priority: 20,
    isAvailable: () => {
      if (typeof window === "undefined") return false
      return detectAvailableTransport() !== "none"
    },
  }

  async function ensureStellarApp(): Promise<typeof stellarApp> {
    if (stellarApp && manager.getTransport()) return stellarApp
    const { transport } = await manager.detectAndCreateTransport()
    const { default: Str } = await import("@ledgerhq/hw-app-str")
    stellarApp = new (Str as unknown as new (transport: unknown) => typeof stellarApp)(transport)
    return stellarApp
  }

  async function checkFirmware(app: typeof stellarApp): Promise<{ firmware: string; stellarApp: string; warnings: string[] }> {
    const warnings: string[] = []
    let firmwareStr = "0.0.0"
    let appVersion = "0.0.0"

    try {
      const config = await app!.getAppConfiguration()
      const parts = (config.version || "0.0.0").split(".").map(Number)
      firmwareStr = `${parts[0] ?? 0}.${parts[1] ?? 0}.${parts[2] ?? 0}`
      appVersion = config.flag || config.version || "0.0.0"

      if ((parts[0] ?? 0) < MIN_FIRMWARE_MAJOR) {
        warnings.push(`Ledger firmware (v${firmwareStr}) is outdated. Update to v${MIN_FIRMWARE_MAJOR}.0+ via Ledger Live.`)
      }

      const appParts = appVersion.split(".").map(Number)
      if ((appParts[0] ?? 0) < MIN_STELLAR_APP_MAJOR || ((appParts[0] ?? 0) === MIN_STELLAR_APP_MAJOR && (appParts[1] ?? 0) < MIN_STELLAR_APP_MINOR)) {
        warnings.push(`Stellar app v${MIN_STELLAR_APP_MAJOR}.${MIN_STELLAR_APP_MINOR}.0+ recommended for full transaction detail display. Update via Ledger Live Manager.`)
      }
    } catch (e) {
      logger.warn("[ledger] Failed to read firmware version:", e)
    }

    cachedFirmware = { firmware: firmwareStr, stellarApp: appVersion, warnings }
    return cachedFirmware
  }

  async function closeConnection(): Promise<void> {
    stellarApp = null
    currentPublicKey = null
    cachedFirmware = null
    await manager.closeTransport()
  }

  return {
    meta,

    async connect() {
      if (typeof window === "undefined") {
        throw makeError("ledger", "ledger_unsupported_browser", "SSR: no browser APIs", { browser: "ssr" })
      }

      try {
        const app = await ensureStellarApp()
        await checkFirmware(app)
        const result = await app!.getPublicKey(DERIVATION_PATH, { display: true, chainCode: false })
        const pubKey = result.publicKey

        if (!validatePublicKey(pubKey)) {
          await closeConnection()
          throw makeError("ledger", "ledger_device_not_responding", "Invalid public key from Ledger.")
        }

        currentPublicKey = pubKey
        return { publicKey: pubKey }
      } catch (err: unknown) {
        await closeConnection()
        if (err && typeof err === "object" && "adapter" in err) throw err
        throw parseLedgerError(err, "Connection")
      }
    },

    async disconnect() {
      await closeConnection()
    },

    async isConnected() {
      if (!manager.getTransport() || !stellarApp) return false
      try {
        await stellarApp.getAppConfiguration()
        return true
      } catch {
        return false
      }
    },

    async getPublicKey() {
      if (currentPublicKey) return currentPublicKey
      const app = await ensureStellarApp()
      const result = await app!.getPublicKey(DERIVATION_PATH)
      currentPublicKey = result.publicKey
      if (!currentPublicKey) {
        throw makeError("ledger", "not_installed", "Not connected to Ledger.")
      }
      return currentPublicKey
    },

    async signMessage(message: string) {
      if (typeof window === "undefined") {
        throw makeError("ledger", "ledger_unsupported_browser", "SSR: no browser APIs", { browser: "ssr" })
      }

      const app = await ensureStellarApp()
      const pk = currentPublicKey || (await this.getPublicKey())

      if (!message || message.length === 0) {
        throw makeError("ledger", "ledger_xdr_invalid", "Message cannot be empty.")
      }
      if (message.length > LEDGER_BUFFER_SIZE_BYTES) {
        throw makeError("ledger", "ledger_xdr_invalid", `Message too long (max ${LEDGER_BUFFER_SIZE_BYTES} bytes).`)
      }

      try {
        const encoder = new TextEncoder()
        const data = encoder.encode(message)
        const valueToSign = message.length > 64
          ? new Uint8Array(await crypto.subtle.digest("SHA-256", data))
          : data

        const { TransactionBuilder, Networks, Operation, BASE_FEE, Memo } = await import("@stellar/stellar-base")
        const txBuilder = new TransactionBuilder(
          { accountId: () => pk, sequenceNumber: () => "0" } as never,
          { fee: BASE_FEE, networkPassphrase: Networks.TESTNET, memo: Memo.none() },
        )
        txBuilder.addOperation(
          Operation.manageData({ name: "Moistello Auth", value: Buffer.from(valueToSign) }),
        )
        const built = txBuilder.build()
        const xdr = built.toEnvelope().toXDR("base64")

        const result = await app!.signTransaction(DERIVATION_PATH, xdr)
        return { signature: result.signature, publicKey: pk }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "adapter" in err) throw err
        throw parseLedgerError(err, "Signature")
      }
    },

    async signTransaction(xdr: string, opts?: SignOptions) {
      if (typeof window === "undefined") {
        throw makeError("ledger", "ledger_unsupported_browser", "SSR: no browser APIs", { browser: "ssr" })
      }

      const app = await ensureStellarApp()
      const pk = currentPublicKey || (await this.getPublicKey())
      const network = opts?.network ?? "testnet"

      if (!xdr || xdr.length === 0) {
        throw makeError("ledger", "ledger_xdr_invalid", "Transaction XDR is empty.")
      }

      try {
        const { Transaction } = await import("@stellar/stellar-base")
        const nwPassphrase = networkPassphrase(network)
        const tx = new Transaction(xdr, nwPassphrase)

        if (tx.source !== pk) {
          throw makeError("ledger", "ledger_wrong_account",
            `Transaction is for account ${tx.source}. Ledger has account ${pk}.`,
            { expected: tx.source, actual: pk },
          )
        }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "adapter" in err) throw err
        throw makeError("ledger", "ledger_xdr_invalid", "Invalid or unparseable transaction XDR.")
      }

      if (network === "mainnet") {
        throw makeError("ledger", "ledger_mainnet_confirm_required",
          "You are about to sign a MAINNET transaction with real funds. Explicit confirmation required.",
        )
      }

      try {
        const result = await app!.signTransaction(DERIVATION_PATH, xdr)
        const { Transaction } = await import("@stellar/stellar-base")
        const nwPassphrase = networkPassphrase(network)
        const tx = new Transaction(xdr, nwPassphrase)
        const signatureBytes = hexToBytes(result.signature)
        const sigBase64 = btoa(String.fromCharCode(...Array.from(signatureBytes)))
        tx.addSignature(pk, sigBase64)
        const signedXdr = tx.toEnvelope().toXDR("base64")
        return { signedXdr }
      } catch (err: unknown) {
        if (err && typeof err === "object" && "adapter" in err) throw err
        await closeConnection()
        throw parseLedgerError(err, "Transaction signing")
      }
    },

    async getNetwork() {
      return currentNetwork
    },

    async getFirmwareVersion() {
      if (cachedFirmware) return cachedFirmware
      const app = await ensureStellarApp()
      return checkFirmware(app)
    },

    async pingDevice() {
      if (!manager.getTransport() || !stellarApp) return false
      try {
        await stellarApp.getAppConfiguration()
        return true
      } catch {
        return false
      }
    },
  } as WalletAdapter
}
