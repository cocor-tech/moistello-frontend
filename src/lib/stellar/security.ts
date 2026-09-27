import { logger } from "@/lib/logger"
const SPENDING_KEY = "moistello_spending"
const KNOWN_ADDR_KEY = "moistello_known_addresses"

interface DailySpending {
  date: string // YYYY-MM-DD
  totalUsdc: number
  totalXlm: number
}

export function getDailySpending(): DailySpending {
  try {
    const raw = localStorage.getItem(SPENDING_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    logger.warn("[security] Failed to read spending data:", e)
  }
  return { date: new Date().toISOString().slice(0, 10), totalUsdc: 0, totalXlm: 0 }
}

export function recordSpending(amount: number, asset: string): void {
  const spending = getDailySpending()
  const today = new Date().toISOString().slice(0, 10)
  if (spending.date !== today) {
    spending.date = today
    spending.totalUsdc = 0
    spending.totalXlm = 0
  }
  if (asset === "USDC") spending.totalUsdc += amount
  else spending.totalXlm += amount
  localStorage.setItem(SPENDING_KEY, JSON.stringify(spending))
}

export function isKnownAddress(addr: string): boolean {
  try {
    const raw = localStorage.getItem(KNOWN_ADDR_KEY)
    if (raw) {
      const list: string[] = JSON.parse(raw)
      return list.includes(addr)
    }
  } catch (e) {
    logger.warn("[security] Failed to read known addresses:", e)
  }
  return false
}

export function markAddressKnown(addr: string): void {
  try {
    const raw = localStorage.getItem(KNOWN_ADDR_KEY)
    const list: string[] = raw ? JSON.parse(raw) : []
    if (!list.includes(addr)) {
      list.push(addr)
      localStorage.setItem(KNOWN_ADDR_KEY, JSON.stringify(list))
    }
  } catch (e) {
    logger.warn("[security] Failed to persist known address:", e)
  }
}

/**
 * Scans for suspicious patterns: all same chars, known scam prefixes, self-send
 */
export function detectSuspiciousAddress(addr: string, ownAddress: string): string | null {
  if (addr === ownAddress) return "You cannot send to your own wallet address."

  // All same characters after prefix
  const body = addr.slice(1)
  if (new Set(body).size === 1) return "This appears to be a placeholder or invalid address."

  // Known scam patterns
  const lower = addr.toLowerCase()
  const scamPatterns = ["test", "fake", "scam", "hack", "phish", "free", "bonus", "refund"]
  for (const p of scamPatterns) {
    if (lower.includes(p)) return `This address contains a suspicious pattern ("${p}"). Verify carefully.`
  }

  return null
}

export const DAILY_LIMIT_USDC = 1000
