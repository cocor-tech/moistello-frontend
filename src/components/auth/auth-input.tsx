"use client"

import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | null
  autoCompleteType?: "name" | "country" | "one-time-code" | "off"
}

const autoCompleteMap: Record<string, string> = {
  name: "name",
  country: "country-name",
  "one-time-code": "one-time-code",
  off: "off",
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, autoCompleteType = "off", className, id, ...props }, ref) => {
    const inputId = id ?? `auth-input-${label.toLowerCase().replace(/\s+/g, "-")}`

    return (
      <div className="space-y-1.5">
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-muted-foreground"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          autoComplete={autoCompleteMap[autoCompleteType] ?? autoCompleteType}
          spellCheck={autoCompleteType === "name" ? false : undefined}
          className={cn(
            "w-full rounded-xl border bg-background/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent",
            "autofill:bg-background autofill:text-foreground",
            error
              ? "border-red-500/50 focus:ring-red-500/50"
              : "border-white/10 hover:border-white/20",
            className
          )}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

AuthInput.displayName = "AuthInput"
