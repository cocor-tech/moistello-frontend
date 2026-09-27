"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Monitor, Smartphone, Globe, Clock, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { get, del, patch } from "@/lib/api-client"
import { useTranslate } from "@/lib/locale/context"
import { useAuthStore } from "@/stores/auth-store"

interface SessionInfo {
  id: string
  deviceInfo: string
  lastActive: string
  isCurrent: boolean
}

function DeviceIcon({ deviceInfo }: { deviceInfo: string }) {
  const lower = deviceInfo.toLowerCase()
  if (lower.includes("iphone") || lower.includes("android") || lower.includes("mobile")) {
    return <Smartphone className="h-5 w-5" />
  }
  if (lower.includes("mac") || lower.includes("windows") || lower.includes("linux")) {
    return <Monitor className="h-5 w-5" />
  }
  return <Globe className="h-5 w-5" />
}

function parseDeviceInfo(info: string): { device: string; ip: string } {
  if (!info || info === "|" || info === "unknown|unknown") {
    return { device: "Login from this browser", ip: "" }
  }
  const parts = info.split("|")
  const ua = parts[0] || "Login from this browser"
  const ip = parts[1] || ""
  const uaShort = ua.length > 40 ? ua.slice(0, 40) + "…" : ua
  return { device: uaShort, ip }
}

export default function SessionsSettingsPage() {
  const { t } = useTranslate()
  const user = useAuthStore((s) => s.user)
  const [sessionTTL, setSessionTTL] = useState(user?.sessionTtlMinutes ?? 240)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  useEffect(() => {
    if (user?.sessionTtlMinutes) setSessionTTL(user.sessionTtlMinutes)
  }, [user])

  useEffect(() => {
    get<{ data?: { sessions?: SessionInfo[] } }>("/sessions").then((res) => {
      const body = (res as Record<string, unknown>)?.data as Record<string, unknown> ?? res
      setSessions((body?.sessions ?? []) as SessionInfo[])
      setLoadingSessions(false)
    }).catch((e) => { logger.warn("[sessions] Failed to load sessions:", e); setLoadingSessions(false) })
  }, [])

  const handleSaveTTL = useCallback(async () => {
    setSaving(true)
    try {
      await patch("/users/me", { sessionTtlMinutes: sessionTTL })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      logger.error("[sessions] Failed to save session TTL:", e)
    }
    setSaving(false)
  }, [sessionTTL])

  const handleRevoke = useCallback(async (sessionId: string) => {
    try {
      await del(`/sessions/${sessionId}`)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    } catch (e) {
      logger.error("[sessions] Failed to revoke session:", e)
    }
    setConfirmRevoke(null)
  }, [])

  const handleRevokeAll = useCallback(async () => {
    try {
      await del("/sessions")
      setSessions((prev) => prev.filter((s) => s.isCurrent))
    } catch (e) {
      logger.error("[sessions] Failed to revoke all sessions:", e)
    }
  }, [])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to settings">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("session.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("session.desc")}</p>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-aurora-violet" />
          <h3 className="font-heading text-sm font-semibold text-foreground">{t("session.duration")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("session.durationHint")}
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("session.oneHour")}</span>
            <span className="font-heading font-semibold text-foreground">{Math.round(sessionTTL / 60)}h {sessionTTL % 60}m</span>
            <span className="text-muted-foreground">{t("session.twentyFourHours")}</span>
          </div>
          <input aria-label="Session time-to-live" type="range" min={60} max={1440} step={30} value={sessionTTL}
            onChange={(e) => setSessionTTL(Number(e.target.value))}
            className="w-full accent-aurora-violet h-2 rounded-full appearance-none bg-white/10 cursor-pointer" />
          <div className="flex justify-between text-2xs text-muted-foreground">
            <button type="button" aria-pressed={sessionTTL === 60} onClick={() => setSessionTTL(60)} className="hover:text-foreground">1h</button>
            <button type="button" aria-pressed={sessionTTL === 240} onClick={() => setSessionTTL(240)} className="hover:text-foreground">4h</button>
            <button type="button" aria-pressed={sessionTTL === 480} onClick={() => setSessionTTL(480)} className="hover:text-foreground">8h</button>
            <button type="button" aria-pressed={sessionTTL === 720} onClick={() => setSessionTTL(720)} className="hover:text-foreground">12h</button>
            <button type="button" aria-pressed={sessionTTL === 1440} onClick={() => setSessionTTL(1440)} className="hover:text-foreground">24h</button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && <span className="text-xs text-emerald-400">{t("common.saved")}</span>}
          <Button variant="primary" size="sm" onClick={handleSaveTTL} isLoading={saving}>{t("session.saveDuration")}</Button>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-aurora-violet" />
            <h3 className="font-heading text-sm font-semibold text-foreground">{t("session.activeSessions")}</h3>
          </div>
          {sessions.length > 1 && (
            <Button variant="outline" size="xs" onClick={handleRevokeAll}
              className="text-red-400 border-red-500/20 hover:bg-red-500/10 text-xs h-7">
              {t("session.revokeAllOthers")}
            </Button>
          )}
        </div>

        {loadingSessions ? (
          <div className="space-y-3">
            {[1, 2].map((n) => <div key={n} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("session.noSessions")}</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const info = parseDeviceInfo(session.deviceInfo)
              return (
                <div key={session.id}
                  className={`rounded-xl p-4 transition-all ${session.isCurrent ? "glass-strong" : "glass-whisper"} ${confirmRevoke === session.id ? "ring-2 ring-red-500/30" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-violet/20 to-aurora-indigo/20 shrink-0">
                      <DeviceIcon deviceInfo={session.deviceInfo} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{info.device}</p>
                        {session.isCurrent && (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full shrink-0">{t("session.current")}</span>
                        )}
                      </div>
                      {info.ip && <p className="text-xs text-muted-foreground font-mono">{info.ip}</p>}
                      {session.lastActive && <p className="text-2xs text-muted-foreground mt-0.5">{session.lastActive}</p>}
                    </div>
                    <div className="shrink-0">
                      {session.isCurrent ? (
                        <span className="text-2xs text-muted-foreground px-2">{t("session.thisDevice")}</span>
                      ) : confirmRevoke === session.id ? (
                        <div className="flex gap-1">
                          <Button variant="destructive" size="xs" onClick={() => handleRevoke(session.id)} className="h-7 text-xs">{t("session.confirm")}</Button>
                          <Button variant="outline" size="xs" onClick={() => setConfirmRevoke(null)} className="h-7 text-xs">{t("session.keep")}</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="xs" onClick={() => setConfirmRevoke(session.id)} className="h-7 text-xs text-red-400">{t("session.revoke")}</Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
