"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Calendar, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/cn"

export type DatePreset = "7d" | "30d" | "90d" | "all"

export interface DateRange {
  preset: DatePreset | "custom"
  from: string | null
  to: string | null
}

const PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

function getPresetRange(preset: DatePreset): { from: string | null; to: string | null } {
  if (preset === "all") return { from: null, to: null }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from ?? "")
  const [customTo, setCustomTo] = useState(value.to ?? "")
  const [validationError, setValidationError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [open])

  const selectPreset = useCallback((preset: DatePreset) => {
    const range = getPresetRange(preset)
    onChange({ preset, ...range })
    setOpen(false)
  }, [onChange])

  const applyCustomRange = useCallback(() => {
    if (!customFrom || !customTo) {
      setValidationError("Both dates are required")
      return
    }
    if (customFrom > customTo) {
      setValidationError("Start date must be before end date")
      return
    }
    setValidationError(null)
    onChange({ preset: "custom", from: customFrom, to: customTo })
    setOpen(false)
  }, [customFrom, customTo, onChange])

  const displayLabel = value.preset === "custom"
    ? `${value.from} – ${value.to}`
    : PRESET_LABELS[value.preset]

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
          "glass-whisper text-muted-foreground hover:text-foreground transition-colors",
          "border border-white/10",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{displayLabel}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-40 w-full sm:w-72 rounded-xl glass-premium border border-white/10 p-3 shadow-lg">
          <div className="space-y-1 mb-3">
            {(Object.keys(PRESET_LABELS) as DatePreset[]).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => selectPreset(preset)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  value.preset === preset
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <span>{PRESET_LABELS[preset]}</span>
                {value.preset === preset && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 pt-3">
            <p className="text-2xs font-heading text-muted-foreground uppercase tracking-wider mb-2">Custom range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => { setCustomFrom(e.target.value); setValidationError(null) }}
                max={customTo || undefined}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-white/30"
                aria-label="Start date"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => { setCustomTo(e.target.value); setValidationError(null) }}
                min={customFrom || undefined}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-white/30"
                aria-label="End date"
              />
            </div>
            {validationError && (
              <p className="text-xs text-red-400 mt-1">{validationError}</p>
            )}
            <button
              type="button"
              onClick={applyCustomRange}
              className="mt-2 w-full rounded-lg bg-white/10 py-1.5 text-xs font-medium text-foreground hover:bg-white/15 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function dateRangeToParams(range: DateRange): Record<string, string> {
  const params: Record<string, string> = {}
  params.range = range.preset
  if (range.preset === "custom") {
    if (range.from) params.from = range.from
    if (range.to) params.to = range.to
  }
  return params
}

export function paramsToDateRange(searchParams: URLSearchParams): DateRange {
  const preset = searchParams.get("range")
  if (preset === "custom") {
    return {
      preset: "custom",
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    }
  }
  if (preset && preset in PRESET_LABELS) {
    const range = getPresetRange(preset as DatePreset)
    return { preset: preset as DatePreset, ...range }
  }
  return { preset: "30d", ...getPresetRange("30d") }
}

export function filterByDateRange<T>(
  items: T[],
  range: DateRange,
  getDate: (item: T) => string | Date | undefined,
): T[] {
  if (range.preset === "all" || (!range.from && !range.to)) return items
  const fromTs = range.from ? new Date(range.from).getTime() : -Infinity
  const toTs = range.to ? new Date(range.to + "T23:59:59").getTime() : Infinity
  return items.filter((item) => {
    const d = getDate(item)
    if (!d) return true
    const ts = new Date(d).getTime()
    return ts >= fromTs && ts <= toTs
  })
}
