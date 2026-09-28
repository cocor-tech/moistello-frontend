"use client"

import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { useTranslate } from "@/lib/locale/context"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings, Bell, EyeOff, Sun, CreditCard, PiggyBank, Monitor, Globe, Wallet, DatabaseBackup } from "lucide-react"
import { formatAddress } from "@/lib/formatters"

const SETTINGS_SECTIONS = [
  { titleKey: "settings.account", href: "/settings/account", icon: Settings, descKey: "settings.accountDesc" },
  { titleKey: "settings.notifications", href: "/settings/notifications", icon: Bell, descKey: "settings.notificationsDesc" },
  { titleKey: "settings.privacy", href: "/settings/privacy", icon: EyeOff, descKey: "settings.privacyDesc" },
  { titleKey: "settings.data", href: "/settings/data", icon: DatabaseBackup, descKey: "settings.dataDesc" },
  { titleKey: "settings.theme", href: "/settings/theme", icon: Sun, descKey: "settings.themeDesc" },
  { titleKey: "settings.language", href: "/settings/language", icon: Globe, descKey: "settings.languageDesc" },
  { titleKey: "settings.payment", href: "/settings/payment", icon: CreditCard, descKey: "settings.paymentDesc" },
  { titleKey: "settings.savings", href: "/settings/savings", icon: PiggyBank, descKey: "settings.savingsDesc" },
  { titleKey: "settings.sessions", href: "/settings/sessions", icon: Monitor, descKey: "settings.sessionsDesc" },
  { titleKey: "settings.wallets", href: "/wallet", icon: Wallet, descKey: "settings.walletsDesc" },
]

export default function SettingsHubPage() {
  const { user, isLoading } = useAuth()
  const { t } = useTranslate()

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton variant="card" className="h-36 rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <Skeleton key={n} variant="card" className="h-28 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Summary */}
      <div className="glass-premium rounded-2xl p-6 holo-border">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-bg text-white font-mono text-lg font-bold shrink-0">
            {user?.displayName?.charAt(0)?.toUpperCase() ?? user?.walletAddress?.slice(0, 2)?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading text-lg font-semibold text-foreground truncate">
              {user?.displayName ?? "User"}
            </p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {user?.walletAddress ? formatAddress(user.walletAddress) : "No wallet"}
            </p>
            <Link href="/profile" className="text-xs text-aurora-violet hover:underline mt-1 inline-block">
              {t("settings.viewProfile")}
            </Link>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">MoiScore</p>
            <p className="font-heading text-lg font-bold gradient-text">{user?.moiScore ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <div className="glass-whisper rounded-2xl p-5 hover:glass-strong transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet/20 to-aurora-cyan/20">
                    <Icon className="h-4 w-4 gradient-text" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-foreground">
                    {t(section.titleKey)}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground ml-12">
                  {t(section.descKey)}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
