"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, Check } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { patch } from "@/lib/api-client"
import { useTranslate } from "@/lib/locale/context"

export default function PrivacySettingsPage() {
  const { t } = useTranslate()
  const [profileVisibility, setProfileVisibility] = useState("public")
  const [showLeaderboard, setShowLeaderboard] = useState(true)
  const [allowFriendRequests, setAllowFriendRequests] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await patch("/users/me", {
        profileVisibility,
        showOnLeaderboard: showLeaderboard,
        allowFriendRequests,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      logger.error("[privacy] Failed to save privacy settings:", e)
    } finally {
      setSaving(false)
    }
  }, [profileVisibility, showLeaderboard, allowFriendRequests])

  const VISIBILITY_OPTIONS = [
    { value: "public", label: t("privacy.public"), desc: t("privacy.publicDesc") },
    { value: "members", label: t("privacy.members"), desc: t("privacy.membersDesc") },
    { value: "private", label: t("privacy.private"), desc: t("privacy.privateDesc") },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to settings">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("privacy.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("privacy.desc")}</p>
        </div>
      </div>

      {/* Profile Visibility */}
      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-aurora-violet" />
          {t("privacy.profileVisibility")}
        </h3>
        <div className="space-y-3">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              htmlFor={`visibility-${opt.value}`}
              aria-label={`Visibility option: ${opt.label}`}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                profileVisibility === opt.value ? "glass-strong" : "hover:glass-whisper"
              }`}
            >
              <input
                id={`visibility-${opt.value}`}
                type="radio"
                name="visibility"
                value={opt.value}
                checked={profileVisibility === opt.value}
                onChange={(e) => setProfileVisibility(e.target.value)}
                className="h-4 w-4 mt-0.5 accent-aurora-violet"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="glass-premium rounded-2xl p-6 space-y-5">
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("privacy.preferences")}</h3>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">{t("privacy.showLeaderboard")}</p>
            <p className="text-xs text-muted-foreground">{t("privacy.leaderboardHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showLeaderboard}
            aria-label={t("privacy.showLeaderboard")}
            onClick={() => setShowLeaderboard((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              showLeaderboard ? "bg-aurora-violet" : "bg-white/10"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                showLeaderboard ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-foreground">{t("privacy.allowFriendRequests")}</p>
            <p className="text-xs text-muted-foreground">{t("privacy.friendRequestsHint")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={allowFriendRequests}
            aria-label={t("privacy.allowFriendRequests")}
            onClick={() => setAllowFriendRequests((v) => !v)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              allowFriendRequests ? "bg-aurora-violet" : "bg-white/10"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                allowFriendRequests ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <ButtonLink href="/settings"  variant="outline" size="md">{t("common.cancel")}</ButtonLink>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
            <Check className="h-4 w-4" /> {t("common.saved")}
          </span>
        )}
        <Button variant="primary" size="md" onClick={handleSave} isLoading={saving}>
          {t("privacy.savePreferences")}
        </Button>
      </div>
    </div>
  )
}
