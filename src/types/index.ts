/* ───── Enums / Literal Unions ───── */

export type CircleStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled"
  | "disputed"

export type CircleType = "public" | "private" | "community" | "premium"

export type PayoutType = "random" | "fixed" | "auction" | "vote"

export type Frequency = "daily" | "weekly" | "biweekly" | "monthly"

export type Currency = "USDC" | "XLM"

export type MemberStatus =
  | "invited"
  | "pending"
  | "active"
  | "defaulter"
  | "left"
  | "removed"

export type NotificationChannel = "email" | "push" | "in_app" | "sms" | string

export type PenaltyType = "late_fee" | "strike" | "collateral_loss" | "suspension"

export type ContributionStatus = "confirmed" | "pending" | "failed" | "late"

/* ───── Domain Models ───── */

export interface User {
  id: string
  walletAddress: string
  email?: string | null
  phone?: string | null
  displayName?: string | null
  avatarIpfsHash?: string | null
  countryCode?: string | null
  preferredLanguage: string
  moiScore: number
  sessionTtlMinutes?: number
  createdAt: string
}

export interface Circle {
  id: string
  contractId?: string | null
  name: string
  description?: string | null
  circleType: CircleType
  payoutType: PayoutType
  contributionAmount: number
  currency: Currency
  frequency: Frequency
  maxMembers: number
  minMoiScore?: number | null
  collateralPercent: number
  lateFeePercent: number
  gracePeriodHours: number
  maxStrikes: number
  startDate?: string | null
  endDate?: string | null
  status: CircleStatus
  currentRound: number
  totalContributions: number
  organizerId: string
  organizerName?: string | null
  memberCount?: number | null
  createdAt: string
}

export interface CircleMember {
  id: string
  circleId: string
  userId: string
  position: number
  status: MemberStatus
  userName?: string | null
  userAddress?: string | null
  joinedAt: string
}

export interface Contribution {
  id: string
  circleId: string
  userId: string
  roundNumber: number
  amount: number
  txnHash?: string | null
  status: ContributionStatus
  onTime: boolean
  createdAt: string
}

export interface Payout {
  id: string
  circleId: string
  recipientId: string
  roundNumber: number
  amount: number
  feeAmount?: number | null
  txnHash?: string | null
  payoutType: PayoutType
  createdAt: string
}

export interface CircleRound {
  roundNumber: number
  contributions: Contribution[]
  payout?: Payout
}

export interface Penalty {
  id: string
  circleId: string
  userId: string
  roundNumber: number
  penaltyType: PenaltyType
  amount: number
  strikesApplied?: number | null
  reason?: string | null
  createdAt: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body?: string | null
  data?: Record<string, unknown> | null
  isRead: boolean
  isArchived?: boolean
  channel: NotificationChannel
  sentAt?: string | null
  createdAt: string
}

export interface Invite {
  id: string
  circleId: string
  code: string
  createdBy: string
  maxUses: number
  useCount: number
  expiresAt?: string | null
  createdAt: string
}

/* ───── Moi Score ───── */

export interface MoiScoreBreakdown {
  streaks: number
  completions: number
  volume: number
  recency: number
}

export interface MoiScoreHistoryEntry {
  date: string
  score: number
  reason?: string
}

export interface MoiScore {
  score: number
  breakdown: MoiScoreBreakdown
  history: MoiScoreHistoryEntry[]
}

/* ───── API Response ───── */

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  meta?: PaginationMeta
  [key: string]: unknown
}

/* ───── Form Data ───── */

export interface CircleFormData {
  name: string
  description?: string
  circleType: CircleType
  payoutType: PayoutType
  contributionAmount: number
  currency: Currency
  frequency: Frequency
  maxMembers: number
  minMoiScore?: number
  collateralPercent?: number
  lateFeePercent: number
  gracePeriodHours: number
  maxStrikes: number
  startDate: string
  requiresInvite?: boolean
}

/* ───── State ───── */

export interface AuthState {
  isAuthenticated: boolean
  user?: User | null
  token?: string | null
  refreshToken?: string | null
  isLoading: boolean
}

export interface WalletState {
  isConnected: boolean
  address?: string | null
  balance?: {
    xlm: string
    usdc: string
  } | null
  network?: string | null
}
