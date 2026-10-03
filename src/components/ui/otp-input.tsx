"use client"

import React, { forwardRef, useId, useState } from "react"
import { cn } from "@/lib/cn"

export interface OTPInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "maxLength"> {
  value: string
  onChange: (value: string) => void
  length?: number
  label: string
  error?: string
}

export const OTPInput = forwardRef<HTMLInputElement, OTPInputProps>(function OTPInput(
  { value, onChange, length = 6, label, error, id, className, disabled, onFocus, onBlur, ...props },
  forwardedRef,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined
  const [focused, setFocused] = useState(false)
  const code = value.replace(/\D/g, "").slice(0, length)

  const setRefs = (node: HTMLInputElement | null) => {
    if (typeof forwardedRef === "function") forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  return (
    <div className={cn("w-full", className)} data-field-error={Boolean(error)}>
      <label htmlFor={inputId} className="mb-2 block font-heading text-xs tracking-wider uppercase text-muted-foreground">
        {label}
      </label>
      <div className="relative flex items-center justify-center gap-2 sm:gap-3">
        <input
          {...props}
          ref={setRefs}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          value={code}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          aria-label={label}
          data-otp-input=""
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, length))}
          onFocus={(event) => { setFocused(true); onFocus?.(event) }}
          onBlur={(event) => { setFocused(false); onBlur?.(event) }}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
        />
        {Array.from({ length }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            data-otp-slot={index}
            className={cn(
              "flex h-12 w-10 items-center justify-center rounded-xl border bg-white/5 font-heading text-xl font-bold text-foreground transition-all sm:h-14 sm:w-12",
              code[index] ? "border-aurora-violet/50" : "border-white/10",
              focused && index === Math.min(code.length, length - 1) && "border-foreground ring-1 ring-foreground",
              error && "border-red-500/70",
              disabled && "opacity-40",
            )}
          >
            {code[index] ?? ""}
          </span>
        ))}
      </div>
      {error && <p id={errorId} role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
})

OTPInput.displayName = "OTPInput"
