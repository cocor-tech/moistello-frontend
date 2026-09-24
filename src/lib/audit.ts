"use client"

import { logger } from "@/lib/logger"
export interface AuditEntry {
  id: string
  actor: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, unknown>
  timestamp: number
  ipHash?: string
}

const AUDIT_STORAGE_KEY = "moistello_audit_trail"
const MAX_ENTRIES = 1000

export function logAuditEvent(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return
  try {
    const trail = getAuditTrail()
    const full: AuditEntry = {
      ...entry,
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }
    trail.unshift(full)
    if (trail.length > MAX_ENTRIES) trail.length = MAX_ENTRIES
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trail))
  } catch (e) {
    logger.warn("[audit] Failed to persist audit event:", e)
  }
}

export function getAuditTrail(): AuditEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function clearAuditTrail(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY)
  } catch (e) {
    logger.warn("[audit] Failed to clear audit trail:", e)
  }
}

export function getAuditTrailByResource(resource: string): AuditEntry[] {
  return getAuditTrail().filter((e) => e.resource === resource)
}

export function getAuditTrailByActor(actor: string): AuditEntry[] {
  return getAuditTrail().filter((e) => e.actor === actor)
}
