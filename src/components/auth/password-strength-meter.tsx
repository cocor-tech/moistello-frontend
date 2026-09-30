"use client"

import { useMemo } from "react"
import { evaluatePasswordStrength } from "@/lib/auth/password-strength"
import { AlertCircle } from "lucide-react"

interface PasswordStrengthMeterProps {
  password: string
}

const SCORE_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"]
const SCORE_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-emerald-500",
]

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const result = useMemo(() => evaluatePasswordStrength(password), [password])

  if (!password) return null

  return (
    <div className="mt-2 space-y-2 text-xs" data-testid="password-strength-meter">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground font-medium">Password strength</span>
        <span
          className={`font-semibold ${
            result.score < 2
              ? "text-red-400"
              : result.score === 2
              ? "text-amber-400"
              : "text-emerald-400"
          }`}
        >
          {SCORE_LABELS[result.score]}
        </span>
      </div>

      {/* Meter Bars */}
      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-300 ${
              step <= result.score ? SCORE_COLORS[result.score] : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Warnings & Suggestions */}
      {result.warning && (
        <div className="flex items-start gap-1.5 text-red-400 text-2xs mt-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{result.warning}</span>
        </div>
      )}

      {result.suggestions.length > 0 && (
        <ul className="space-y-0.5 text-muted-foreground/80 text-2xs pl-1">
          {result.suggestions.map((hint, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-aurora-violet shrink-0" />
              <span>{hint}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
