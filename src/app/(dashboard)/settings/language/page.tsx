"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useTranslate } from "@/lib/locale/context"

export default function LanguageSettingsPage() {
  const { t, locale, setLocale } = useTranslate()

  const LANGUAGES = [
    { value: "en", label: "English" },
    { value: "fr", label: "Français" },
    { value: "es", label: "Español" },
    { value: "pt", label: "Português" },
    { value: "de", label: "Deutsch" },
    { value: "it", label: "Italiano" },
    { value: "ja", label: "日本語" },
    { value: "ko", label: "한국어" },
    { value: "zh", label: "中文" },
    { value: "ar", label: "العربية" },
    { value: "ru", label: "Русский" },
    { value: "sw", label: "Kiswahili" },
    { value: "ha", label: "Hausa" },
    { value: "yo", label: "Yoruba" },
    { value: "ig", label: "Igbo" },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to settings">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">{t("lang.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("lang.desc")}</p>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 space-y-1">
        <p className="text-2xs font-heading tracking-wider uppercase text-muted-foreground mb-3 px-2">
          {t("lang.current")}: <strong className="text-foreground">{locale}</strong>
        </p>
        {LANGUAGES.map((lang) => (
          <button
            key={lang.value}
            type="button"
            aria-pressed={locale === lang.value}
            onClick={() => setLocale(lang.value)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
              locale === lang.value
                ? "gradient-bg-extended text-white"
                : "text-muted-foreground hover:text-foreground hover:glass-whisper"
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
