"use client"

import Link from "next/link"
import { ArrowLeft, Sun, Moon, Monitor, Check } from "lucide-react"
import { useUIStore } from "@/stores/ui-store"
import { useTranslate } from "@/lib/locale/context"
import { cn } from "@/lib/cn"

type ThemeOption = "light" | "dark" | "system"

function getThemeOptions(t: (key: string) => string) {
  return [
    { value: "light" as ThemeOption, icon: <Sun className="h-5 w-5" />, label: t("theme.light"), desc: t("theme.lightDesc") },
    { value: "dark" as ThemeOption, icon: <Moon className="h-5 w-5" />, label: t("theme.dark"), desc: t("theme.darkDesc") },
    { value: "system" as ThemeOption, icon: <Monitor className="h-5 w-5" />, label: t("theme.system"), desc: t("theme.systemDesc") },
  ]
}

export default function ThemeSettingsPage() {
  const { t } = useTranslate()
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const density = useUIStore((s) => s.density);
  const setDensity = useUIStore((s) => s.setDensity);
  const fontSize = useUIStore((s) => s.fontSize);
  const setFontSize = useUIStore((s) => s.setFontSize);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("theme.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("theme.desc")}</p>
        </div>
      </div>

      {/* Theme */}
      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("theme.section")}</h3>
        <div className="grid grid-cols-3 gap-3">
          {getThemeOptions(t).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                theme === opt.value
                  ? "border-aurora-violet bg-aurora-violet/10"
                  : "border-white/[0.06] hover:border-white/20 bg-white/[0.02]",
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl",
                  theme === opt.value ? "text-aurora-violet" : "text-muted-foreground",
                )}
              >
                {opt.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-2xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
              {theme === opt.value && (
                <span className="absolute top-2 right-2">
                  <Check className="h-4 w-4 text-aurora-violet" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("theme.density")}</h3>
        <div className="space-y-2">
          {(["comfortable", "compact"] as const).map((d) => (
            <label
              key={d}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                density === d ? "glass-strong" : "hover:glass-whisper",
              )}
            >
              <input
                type="radio"
                name="density"
                value={d}
                checked={density === d}
                onChange={() => setDensity(d)}
                className="h-4 w-4 accent-aurora-violet"
              />
              <span className="text-sm font-medium text-foreground">{d === "comfortable" ? t("theme.densityComfortable") : t("theme.densityCompact")}</span>
              <span className="text-xs text-muted-foreground">
                {d === "comfortable" ? t("theme.densityComfortableDesc") : t("theme.densityCompactDesc")}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="glass-premium rounded-2xl p-6 space-y-4">
        <h3 className="font-heading text-sm font-semibold text-foreground">{t("theme.fontSize")}</h3>
        <div className="flex gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size)}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-medium border-2 transition-all",
                fontSize === size
                  ? "border-aurora-violet bg-aurora-violet/10 text-aurora-violet"
                  : "border-white/[0.06] text-muted-foreground hover:border-white/20",
              )}
            >
              <span className={cn(size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm")}>
                Aa
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
