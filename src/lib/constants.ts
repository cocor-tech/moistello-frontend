export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:1100/v1"

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1100/ws"

/** Stellar network — set NEXT_PUBLIC_STELLAR_NETWORK=mainnet for production. Defaults to "testnet". */
export const STELLAR_NETWORK: "testnet" | "mainnet" =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "testnet" | "mainnet") ?? "testnet"

export const STELLAR_HORIZON_URL =
  STELLAR_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org"

export const STELLAR_RPC_URL =
  STELLAR_NETWORK === "mainnet"
    ? "https://soroban.stellar.org"
    : "https://soroban-testnet.stellar.org"

export const USDC_CONTRACT_ID =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ||
  "CAWQBY6LQ6TUKH4H6RDRSFPSZZMEQH7HURB5X4AFTYLA3T4R7SCAORR6"

export const APP_NAME = "Moistello"

export const SUPPORTED_CURRENCIES = [
  {
    code: "USDC",
    name: "USD Coin",
    icon: "/icons/usdc.svg",
    decimals: 7,
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  },
  {
    code: "XLM",
    name: "Stellar Lumens",
    icon: "/icons/xlm.svg",
    decimals: 7,
    isNative: true,
  },
] as const

export const CIRCLE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
] as const

export const PAYOUT_TYPES = [
  { value: "random", label: "Random" },
  { value: "fixed", label: "Fixed" },
  { value: "auction", label: "Auction" },
  { value: "vote", label: "Vote" },
] as const

export const CIRCLE_TYPES = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "community", label: "Community" },
  { value: "premium", label: "Premium" },
] as const

export const MOI_SCORE_MAX = 1000

/** High score threshold for MOI reputation badges */
export const MOI_SCORE_HIGH_THRESHOLD = 600

export const MAX_PENDING_APPLICATIONS = 10

/** Expiration duration for WalletConnect QR codes in milliseconds (2 minutes) */
export const WC2_QR_EXPIRATION_MS = 120_000

/** Timeout duration for Passkey assertion / WebAuthn options in milliseconds (2 minutes) */
export const PASSKEY_TIMEOUT_MS = 120_000

/** Maximum buffer size for Ledger transport frame payloads in bytes (8KB) */
export const LEDGER_BUFFER_SIZE_BYTES = 8192

/** Inactivity warning countdown threshold before session timeout in seconds (5 minutes) */
export const SESSION_TIMEOUT_WARN_SECONDS = 300

/** Default usage limit for newly generated circle invite codes */
export const DEFAULT_MAX_INVITE_USES = 5

/** Maximum allowed usages for a single invite code */
export const MAX_INVITE_USES_LIMIT = 100

/** Default delay for UI feedback animations and toasts in milliseconds */
export const UI_FEEDBACK_DELAY_MS = 300

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const Routes = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/",
  CIRCLES: "/circles",
  CIRCLE_DETAIL: (id: string) => `/circles/${id}`,
  CREATE_CIRCLE: "/circles/create",
  CIRCLE_EXPORT: (id: string) => `/circles/${id}/export`,
  CIRCLE_SETTINGS: (id: string) => `/circles/${id}/settings`,
  CIRCLE_COMMENTS: (id: string) => `/circles/${id}/comments`,
  SAVINGS: "/savings",
  CONTRIBUTIONS: "/contributions",
  PAYOUTS: "/payouts",
  PEOPLE: "/people",
  PROFILE: "/profile",
  COMMUNITIES: "/communities",
  CREATE_COMMUNITY: "/communities/create",
  COMMUNITY_DETAIL: (id: string) => `/communities/${id}`,
  COMMUNITY_CIRCLES: (id: string) => `/communities/${id}/circles`,
  PROFILE_SETTINGS: "/settings",
  SETTINGS_SAVINGS: "/settings/savings",
  SETTINGS_NOTIFICATIONS: "/settings/notifications",
  SETTINGS_ACCOUNT: "/settings/account",
  SETTINGS_PRIVACY: "/settings/privacy",
  SETTINGS_SESSIONS: "/settings/sessions",
  WALLET: "/wallet",
  WALLET_DEPOSIT: "/wallet/deposit",
  WALLET_WITHDRAW: "/wallet/withdraw",
  WALLET_TRANSFER: "/wallet/transfer",
  WALLET_TRANSACTIONS: "/wallet/transactions",
  WALLET_TRANSACTION_DETAIL: (id: string) => `/wallet/transactions/${id}`,
  WALLET_ADDRESSES: "/wallet/addresses",
  WALLET_SETTINGS: "/wallet/settings",
  NOTIFICATIONS: "/notifications",
  INVITE: (code: string) => `/invite/${code}`,
  TERMS: "/terms",
  PRIVACY: "/privacy",
  ABOUT: "/about",
  HOW_IT_WORKS: "/how-it-works",
  FAQ: "/faq",
  DOCS: "/docs",
  SUPPORT: "/support",
  BECOME_CONTRIBUTOR: "/become-a-contributor",
  DEVELOPERS: "/developers",
  STATUS: "/status",
  ACCESS_DENIED: "/access-denied",
  AUTH_REQUIRED: "/auth-required",
  BAD_REQUEST: "/bad-request",
  INTERNAL_ERROR: "/internal-error",
} as const
