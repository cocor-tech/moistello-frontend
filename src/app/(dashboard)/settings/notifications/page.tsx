"use client"

import Link from "next/link"
import { ArrowLeft, Bell, Check, Shield, Vote, DollarSign, Users, Mail, Megaphone, Loader2 } from "lucide-react"
import { Button, ButtonLink } from "@/components/ui/button"
import { useTranslate } from "@/lib/locale/context"
import {
  useNotificationPreferencesForm,
  type NotificationFrequency,
} from "@/hooks/use-notification-preferences"
import type { NotificationPreferences } from "@/hooks/use-notification-preferences"

const CATEGORY_META: {
  key: keyof NotificationPreferences["categories"]
  labelKey: string
  hintKey: string
  icon: React.ElementType
  fallbackLabel: string
  fallbackHint: string
}[] = [
  {
    key: "payout",
    labelKey: "notif.categoryPayouts",
    hintKey: "notif.payoutsHint",
    icon: DollarSign,
    fallbackLabel: "Payouts",
    fallbackHint: "When you receive or miss a payout",
  },
  {
    key: "dispute",
    labelKey: "notif.categoryDisputes",
    hintKey: "notif.disputesHint",
    icon: Shield,
    fallbackLabel: "Disputes",
    fallbackHint: "Circle disputes and resolution updates",
  },
  {
    key: "governance",
    labelKey: "notif.categoryGovernance",
    hintKey: "notif.governanceHint",
    icon: Vote,
    fallbackLabel: "Governance",
    fallbackHint: "Proposals, votes, and DAO decisions",
  },
  {
    key: "security",
    labelKey: "notif.categorySecurity",
    hintKey: "notif.securityHint",
    icon: Shield,
    fallbackLabel: "Security",
    fallbackHint: "Login alerts, passkey changes, and account activity",
  },
  {
    key: "contributions",
    labelKey: "notif.circleUpdates",
    hintKey: "notif.contributionsHint",
    icon: Users,
    fallbackLabel: "Circle updates",
    fallbackHint: "Contributions and circle activity",
  },
  {
    key: "invitations",
    labelKey: "nav.invitations",
    hintKey: "notif.invitationsHint",
    icon: Mail,
    fallbackLabel: "Invitations",
    fallbackHint: "When someone invites you to a circle",
  },
  {
    key: "announcements",
    labelKey: "notif.categoryAnnouncements",
    hintKey: "notif.announcementsHint",
    icon: Megaphone,
    fallbackLabel: "Announcements",
    fallbackHint: "Platform news and feature updates",
  },
  {
    key: "circleActivity",
    labelKey: "notif.categoryCircleActivity",
    hintKey: "notif.circleActivityHint",
    icon: Users,
    fallbackLabel: "Circle activity",
    fallbackHint: "Member joins, comments, and status changes",
  },
  {
    key: "marketing",
    labelKey: "notif.marketing",
    hintKey: "notif.marketingHint",
    icon: Megaphone,
    fallbackLabel: "Marketing",
    fallbackHint: "Tips, promotions, and offers",
  },
]

const FREQUENCIES: { value: NotificationFrequency; labelKey: string; fallback: string }[] = [
  { value: "instant", labelKey: "notif.instant", fallback: "Instant" },
  { value: "daily", labelKey: "notif.daily", fallback: "Daily digest" },
  { value: "off", labelKey: "notif.off", fallback: "Off" },
]

export default function NotificationsSettingsPage() {
  const { t } = useTranslate()
  const { prefs, isLoading, isSaving, isSaved, toggleCategory, setFrequency, save } =
    useNotificationPreferencesForm()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">
            {t("notif.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("notif.desc")}</p>
        </div>
      </div>

      {/* ── Per-event toggles ── */}
      <section
        aria-labelledby="notification-categories-heading"
        className="border border-white/[0.08] rounded-xl overflow-hidden"
      >
        {/* accent bar at top */}
        <div className="h-px w-full bg-gradient-to-r from-aurora-violet/60 via-aurora-violet/30 to-transparent" />

        <div className="p-6 space-y-5">
          <h3
            id="notification-categories-heading"
            className="font-heading text-sm font-semibold text-foreground flex items-center gap-2"
          >
            <Bell className="h-4 w-4 text-aurora-violet" aria-hidden="true" />
            {t("notif.notificationCategories")}
          </h3>

          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading preferences…
            </div>
          ) : (
            <div className="space-y-0" role="group" aria-label="Notification categories">
              {CATEGORY_META.map(({ key, labelKey, hintKey, icon: Icon, fallbackLabel, fallbackHint }) => {
                const enabled = prefs.categories[key]
                const label = t(labelKey) || fallbackLabel
                const hint = t(hintKey) || fallbackHint
                const switchId = `notif-toggle-${key}`

                return (
                  <div
                    key={key}
                    className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0"
                  >
                    <span
                      className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.05]"
                      aria-hidden="true"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <label htmlFor={switchId} className="flex-1 cursor-pointer select-none">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </label>
                    <button
                      id={switchId}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={label}
                      onClick={() => toggleCategory(key)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        enabled ? "bg-aurora-violet" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                          enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Digest / frequency ── */}
      <section
        aria-labelledby="notification-frequency-heading"
        className="border border-white/[0.08] rounded-xl p-6 space-y-4"
      >
        <h3
          id="notification-frequency-heading"
          className="font-heading text-sm font-semibold text-foreground"
        >
          {t("notif.frequency")}
        </h3>
        <div className="space-y-2" role="radiogroup" aria-labelledby="notification-frequency-heading">
          {FREQUENCIES.map((f) => (
            <label key={f.value} className="flex items-center gap-3 cursor-pointer py-1">
              <input
                type="radio"
                name="frequency"
                value={f.value}
                checked={prefs.frequency === f.value}
                onChange={() => setFrequency(f.value)}
                className="h-4 w-4 accent-aurora-violet"
              />
              <span className="text-sm text-foreground">{t(f.labelKey) || f.fallback}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3">
        <ButtonLink href="/settings" variant="outline" size="md">
          {t("common.cancel")}
        </ButtonLink>

        {isSaved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-400" role="status">
            <Check className="h-4 w-4" aria-hidden="true" /> {t("common.saved")}
          </span>
        )}

        <Button variant="primary" size="md" onClick={save} isLoading={isSaving} disabled={isLoading}>
          {t("notif.savePreferences")}
        </Button>
      </div>
    </div>
  )
}
