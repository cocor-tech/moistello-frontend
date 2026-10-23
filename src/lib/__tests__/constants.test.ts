import { describe, it, expect } from "vitest"
import {
  API_BASE_URL,
  WS_URL,
  STELLAR_NETWORK,
  STELLAR_HORIZON_URL,
  STELLAR_RPC_URL,
  USDC_CONTRACT_ID,
  APP_NAME,
  SUPPORTED_CURRENCIES,
  CIRCLE_FREQUENCIES,
  PAYOUT_TYPES,
  CIRCLE_TYPES,
  MOI_SCORE_MAX,
  MOI_SCORE_HIGH_THRESHOLD,
  MAX_PENDING_APPLICATIONS,
  WC2_QR_EXPIRATION_MS,
  PASSKEY_TIMEOUT_MS,
  LEDGER_BUFFER_SIZE_BYTES,
  SESSION_TIMEOUT_WARN_SECONDS,
  DEFAULT_MAX_INVITE_USES,
  MAX_INVITE_USES_LIMIT,
  UI_FEEDBACK_DELAY_MS,
  PAGINATION,
  Routes,
  NGN_FALLBACK_RATE,
} from "../constants"

describe("constants module", () => {
  describe("Routes", () => {
    it("defines static route paths correctly", () => {
      expect(Routes.HOME).toBe("/")
      expect(Routes.LOGIN).toBe("/login")
      expect(Routes.REGISTER).toBe("/register")
      expect(Routes.DASHBOARD).toBe("/")
      expect(Routes.CIRCLES).toBe("/circles")
      expect(Routes.CIRCLES_SAVED).toBe("/circles/saved")
      expect(Routes.CIRCLES_ORGANIZING).toBe("/circles/organizing")
      expect(Routes.CIRCLES_COMPARE).toBe("/circles/compare")
      expect(Routes.CREATE_CIRCLE).toBe("/circles/create")
      expect(Routes.SAVINGS).toBe("/savings")
      expect(Routes.CONTRIBUTIONS).toBe("/contributions")
      expect(Routes.PAYOUTS).toBe("/payouts")
      expect(Routes.PEOPLE).toBe("/people")
      expect(Routes.PROFILE).toBe("/profile")
      expect(Routes.REPUTATION).toBe("/reputation")
      expect(Routes.COMMUNITIES).toBe("/communities")
      expect(Routes.CREATE_COMMUNITY).toBe("/communities/create")
      expect(Routes.WALLET).toBe("/wallet")
      expect(Routes.WALLET_DEPOSIT).toBe("/wallet/deposit")
      expect(Routes.WALLET_WITHDRAW).toBe("/wallet/withdraw")
      expect(Routes.WALLET_TRANSFER).toBe("/wallet/transfer")
      expect(Routes.WALLET_TRANSACTIONS).toBe("/wallet/transactions")
      expect(Routes.WALLET_ADDRESSES).toBe("/wallet/addresses")
      expect(Routes.WALLET_SETTINGS).toBe("/wallet/settings")
      expect(Routes.NOTIFICATIONS).toBe("/notifications")
      expect(Routes.GOVERNANCE).toBe("/governance")
      expect(Routes.REFERRALS).toBe("/referrals")
      expect(Routes.TERMS).toBe("/terms")
      expect(Routes.PRIVACY).toBe("/privacy")
      expect(Routes.SUPPORT).toBe("/support")
    })

    it("generates dynamic route URLs with route helpers", () => {
      expect(Routes.CIRCLE_DETAIL("circle-123")).toBe("/circles/circle-123")
      expect(Routes.CIRCLE_EXPORT("circle-123")).toBe("/circles/circle-123/export")
      expect(Routes.CIRCLE_SETTINGS("circle-123")).toBe(
        "/circles/circle-123/settings",
      )
      expect(Routes.CIRCLE_COMMENTS("circle-123")).toBe(
        "/circles/circle-123/comments",
      )
      expect(Routes.PUBLIC_PROFILE("johndoe")).toBe("/u/johndoe")
      expect(Routes.COMMUNITY_DETAIL("comm-456")).toBe("/communities/comm-456")
      expect(Routes.COMMUNITY_CIRCLES("comm-456")).toBe(
        "/communities/comm-456/circles",
      )
      expect(Routes.WALLET_TRANSACTION_DETAIL("tx-789")).toBe(
        "/wallet/transactions/tx-789",
      )
      expect(Routes.INVITE("INVITE-ABC")).toBe("/invite/INVITE-ABC")
    })
  })

  describe("currency configurations", () => {
    it("contains USDC and XLM currencies with valid properties", () => {
      expect(SUPPORTED_CURRENCIES).toHaveLength(2)

      const usdc = SUPPORTED_CURRENCIES.find((c) => c.code === "USDC")
      expect(usdc).toBeDefined()
      expect(usdc?.name).toBe("USD Coin")
      expect(usdc?.decimals).toBe(7)
      expect(usdc?.issuer).toBe(
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      )

      const xlm = SUPPORTED_CURRENCIES.find((c) => c.code === "XLM")
      expect(xlm).toBeDefined()
      expect(xlm?.name).toBe("Stellar Lumens")
      expect(xlm?.decimals).toBe(7)
      expect(xlm?.isNative).toBe(true)
    })
  })

  describe("circle options and frequencies", () => {
    it("exports valid frequencies", () => {
      const values = CIRCLE_FREQUENCIES.map((f) => f.value)
      expect(values).toEqual(["daily", "weekly", "biweekly", "monthly"])
    })

    it("exports valid payout types", () => {
      const values = PAYOUT_TYPES.map((p) => p.value)
      expect(values).toEqual(["random", "fixed", "auction", "vote"])
    })

    it("exports valid circle types", () => {
      const values = CIRCLE_TYPES.map((c) => c.value)
      expect(values).toEqual(["public", "private", "community", "premium"])
    })
  })

  describe("scoring, timeouts, and limits", () => {
    it("defines MOI reputation score boundaries", () => {
      expect(MOI_SCORE_MAX).toBe(1000)
      expect(MOI_SCORE_HIGH_THRESHOLD).toBe(600)
      expect(MOI_SCORE_HIGH_THRESHOLD).toBeLessThan(MOI_SCORE_MAX)
    })

    it("defines timeouts and buffer limits", () => {
      expect(WC2_QR_EXPIRATION_MS).toBe(120_000)
      expect(PASSKEY_TIMEOUT_MS).toBe(120_000)
      expect(LEDGER_BUFFER_SIZE_BYTES).toBe(8192)
      expect(SESSION_TIMEOUT_WARN_SECONDS).toBe(300)
      expect(UI_FEEDBACK_DELAY_MS).toBe(300)
    })

    it("defines invite application limits", () => {
      expect(MAX_PENDING_APPLICATIONS).toBe(10)
      expect(DEFAULT_MAX_INVITE_USES).toBe(5)
      expect(MAX_INVITE_USES_LIMIT).toBe(100)
      expect(DEFAULT_MAX_INVITE_USES).toBeLessThan(MAX_INVITE_USES_LIMIT)
    })

    it("defines pagination constants", () => {
      expect(PAGINATION.DEFAULT_PAGE).toBe(1)
      expect(PAGINATION.DEFAULT_LIMIT).toBe(20)
      expect(PAGINATION.MAX_LIMIT).toBe(100)
      expect(PAGINATION.DEFAULT_LIMIT).toBeLessThanOrEqual(PAGINATION.MAX_LIMIT)
    })

    it("defines positive exchange rate fallback", () => {
      expect(typeof NGN_FALLBACK_RATE).toBe("number")
      expect(NGN_FALLBACK_RATE).toBeGreaterThan(0)
    })
  })

  describe("Stellar and network constants", () => {
    it("defines basic app branding and URLs", () => {
      expect(APP_NAME).toBe("Moistello")
      expect(typeof API_BASE_URL).toBe("string")
      expect(API_BASE_URL.length).toBeGreaterThan(0)
      expect(typeof WS_URL).toBe("string")
      expect(WS_URL.length).toBeGreaterThan(0)
      expect(typeof USDC_CONTRACT_ID).toBe("string")
      expect(USDC_CONTRACT_ID.length).toBeGreaterThan(0)
    })

    it("configures Stellar horizon and rpc URLs based on network", () => {
      expect(["testnet", "mainnet"]).toContain(STELLAR_NETWORK)
      if (STELLAR_NETWORK === "mainnet") {
        expect(STELLAR_HORIZON_URL).toBe("https://horizon.stellar.org")
        expect(STELLAR_RPC_URL).toBe("https://soroban.stellar.org")
      } else {
        expect(STELLAR_HORIZON_URL).toBe("https://horizon-testnet.stellar.org")
        expect(STELLAR_RPC_URL).toBe("https://soroban-testnet.stellar.org")
      }
    })
  })
})
