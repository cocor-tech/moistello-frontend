"use client"

import React, { useState, useRef, useEffect, useCallback, useId } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/cn"

export interface DatePickerProps {
  /** Selected date in YYYY-MM-DD string format or null. */
  value: string | null
  /** Callback invoked with new date string (YYYY-MM-DD) or empty string when cleared. */
  onChange: (date: string) => void
  /** Optional placeholder text. */
  placeholder?: string
  /** Optional visible field label. */
  label?: string
  /** Optional assistive hint text. */
  hint?: string
  /** Optional error message. */
  error?: string
  /** Minimum selectable date (YYYY-MM-DD). */
  min?: string
  /** Maximum selectable date (YYYY-MM-DD). */
  max?: string
  /** Whether the field is disabled. */
  disabled?: boolean
  /** Whether date is required. */
  required?: boolean
  /** Optional className for the root container. */
  className?: string
  /** Optional aria-label for accessibility. */
  "aria-label"?: string
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function parseDateString(str: string | null): Date | null {
  if (!str) return null
  const [year, month, day] = str.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  label,
  hint,
  error,
  min,
  max,
  disabled = false,
  required = false,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const selectedDate = parseDateString(value)
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || new Date())

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate)
    }
  }, [value])

  // Close on click outside
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
      return
    }

    const current = new Date(viewDate)
    let handled = true

    switch (e.key) {
      case "ArrowLeft":
        current.setDate(current.getDate() - 1)
        break
      case "ArrowRight":
        current.setDate(current.getDate() + 1)
        break
      case "ArrowUp":
        current.setDate(current.getDate() - 7)
        break
      case "ArrowDown":
        current.setDate(current.getDate() + 7)
        break
      case "PageUp":
        current.setMonth(current.getMonth() - (e.shiftKey ? 12 : 1))
        break
      case "PageDown":
        current.setMonth(current.getMonth() + (e.shiftKey ? 12 : 1))
        break
      case "Home":
        current.setDate(current.getDate() - current.getDay())
        break
      case "End":
        current.setDate(current.getDate() + (6 - current.getDay()))
        break
      case "Enter":
      case " ":
        e.preventDefault()
        if (!isDateDisabled(viewDate)) {
          onChange(formatDateString(viewDate))
          setOpen(false)
          buttonRef.current?.focus()
        }
        return
      default:
        handled = false
    }

    if (handled) {
      e.preventDefault()
      setViewDate(current)
    }
  }, [open, viewDate, onChange])

  const isDateDisabled = useCallback((date: Date) => {
    const dateStr = formatDateString(date)
    if (min && dateStr < min) return true
    if (max && dateStr > max) return true
    return false
  }, [min, max])

  const selectDate = useCallback((date: Date) => {
    if (isDateDisabled(date)) return
    onChange(formatDateString(date))
    setOpen(false)
    buttonRef.current?.focus()
  }, [isDateDisabled, onChange])

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  // Days matrix for current month
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const calendarDays: Date[] = []
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(new Date(year, month, 1 - (firstDayIndex - i)))
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(new Date(year, month, i))
  }
  const remaining = 42 - calendarDays.length
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push(new Date(year, month + 1, i))
  }

  const todayStr = formatDateString(new Date())

  return (
    <div ref={containerRef} className={cn("relative flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          onKeyDown={handleKeyDown}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel || label || placeholder}
          className={cn(
            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-left transition-colors",
            "border border-white/10 bg-white/5 hover:bg-white/10 text-foreground",
            "focus:outline-none focus:ring-2 focus:ring-aurora-violet/50",
            !value && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-red-500/50 focus:ring-red-500/50"
          )}
        >
          <span className="flex items-center gap-2 truncate">
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation()
                onChange("")
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  onChange("")
                }
              }}
              className="p-0.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>

        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Calendar date picker"
            className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl glass-premium border border-white/10 p-3 shadow-xl backdrop-blur-xl bg-card"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-foreground">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((name) => (
                <span key={name} className="text-2xs font-medium text-muted-foreground py-1">
                  {name}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1" role="grid">
              {calendarDays.map((day, idx) => {
                const dayStr = formatDateString(day)
                const isCurrentMonth = day.getMonth() === month
                const isSelected = value === dayStr
                const isToday = todayStr === dayStr
                const isDisabled = isDateDisabled(day)

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => selectDate(day)}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    tabIndex={isSelected ? 0 : -1}
                    className={cn(
                      "h-8 w-8 rounded-lg text-xs font-medium flex items-center justify-center transition-colors",
                      !isCurrentMonth && "text-muted-foreground/40",
                      isCurrentMonth && !isSelected && "text-foreground hover:bg-white/10",
                      isSelected && "bg-aurora-violet text-white font-bold shadow-md",
                      isToday && !isSelected && "border border-aurora-violet/60 text-aurora-violet",
                      isDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {hint && !error && <p className="text-2xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-2xs text-red-400">{error}</p>}
    </div>
  )
}
