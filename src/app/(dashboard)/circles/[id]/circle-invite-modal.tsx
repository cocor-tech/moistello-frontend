"use client"

import React, { useState } from "react"
import { Check, Copy, Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { STELLAR_ADDRESS_REGEX } from "@/lib/formatters"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isStellarAddress(val: string): boolean {
  return STELLAR_ADDRESS_REGEX ? STELLAR_ADDRESS_REGEX.test(val) : /^G[A-Z2-7]{55}$/.test(val)
}

export interface MemberEntryValidation {
  raw: string
  clean: string
  isValid: boolean
  type?: "email" | "stellar"
}

export function validateMemberEntry(raw: string): MemberEntryValidation {
  const clean = raw.trim()
  if (!clean) {
    return { raw, clean: "", isValid: false }
  }
  if (EMAIL_REGEX.test(clean)) {
    return { raw, clean, isValid: true, type: "email" }
  }
  if (/^G[A-Z2-7]{55}$/.test(clean)) {
    return { raw, clean, isValid: true, type: "stellar" }
  }
  return { raw, clean, isValid: false }
}

export function parseCSVInput(text: string): MemberEntryValidation[] {
  const lines = text.split(/[\r\n,]+/)
  const results: MemberEntryValidation[] = []
  const seen = new Set<string>()

  for (const line of lines) {
    const clean = line.trim()
    if (!clean) continue
    // Skip header line if present
    if (clean.toLowerCase() === "email" || clean.toLowerCase() === "address" || clean.toLowerCase() === "member") {
      continue
    }
    const val = validateMemberEntry(clean)
    if (val.clean && !seen.has(val.clean)) {
      seen.add(val.clean)
      results.push(val)
    }
  }

  return results
}

interface CircleInviteModalProps {
  isOpen: boolean
  onClose: () => void
  code: string
  copied: boolean
  isError: boolean
  error: string
  onCopy: () => void
  onBulkImport?: (members: string[]) => void
}

export function CircleInviteModal({
  isOpen,
  onClose,
  code,
  copied,
  isError,
  error,
  onCopy,
  onBulkImport,
}: CircleInviteModalProps) {
  const [activeTab, setActiveTab] = useState<"code" | "csv">("code")
  const [csvText, setCsvText] = useState("")

  const parsedEntries = parseCSVInput(csvText)
  const validEntries = parsedEntries.filter((e) => e.isValid)
  const invalidEntries = parsedEntries.filter((e) => !e.isValid)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setCsvText(content)
      }
    }
    reader.readAsText(file)
  }

  const handleImportSubmit = () => {
    if (validEntries.length === 0 || !onBulkImport) return
    onBulkImport(validEntries.map((e) => e.clean))
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Members"
      description="Share an invite code or bulk import members via CSV."
      size="sm"
    >
      <div className="space-y-4">
        {/* Tab navigation */}
        <div className="flex rounded-xl bg-slate-900/60 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "code"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Invite Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("csv")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "csv"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bulk Import (CSV)
          </button>
        </div>

        {activeTab === "code" ? (
          <>
            <div className="glass-whisper rounded-xl p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-widest gradient-text">
                {code || (
                  <span className="inline-flex gap-1">
                    Generating
                    <span className="animate-bounce [animation-delay:0ms]">.</span>
                    <span className="animate-bounce [animation-delay:200ms]">.</span>
                    <span className="animate-bounce [animation-delay:400ms]">.</span>
                  </span>
                )}
              </p>
            </div>
            {code && !isError && (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                onClick={onCopy}
              >
                {copied ? "Copied!" : "Copy Code"}
              </Button>
            )}
            {isError && (
              <p className="text-sm text-red-400 text-center">
                {error || "Failed to generate invite code. Try again."}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            {/* File upload trigger */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground">
                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                <span>Upload CSV File</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {csvText && (
                <button
                  type="button"
                  onClick={() => setCsvText("")}
                  className="text-2xs text-red-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            {/* CSV input text area */}
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Enter member emails or Stellar addresses (G...), comma or newline separated..."
              rows={4}
              className="w-full p-3 text-xs font-mono rounded-xl bg-slate-950/60 border border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-emerald-500/50"
            />

            {/* Summary & Validation Feedback */}
            {parsedEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-2xs" data-testid="summary-text">
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> {validEntries.length} valid entries
                  </span>
                  {invalidEntries.length > 0 && (
                    <span className="text-red-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-3 w-3" /> {invalidEntries.length} invalid
                    </span>
                  )}
                </div>

                {/* Entry List Preview */}
                <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-lg bg-slate-950/40 border border-white/[0.06]">
                  {parsedEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                        entry.isValid ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      <span className="font-mono truncate max-w-[200px]">{entry.raw}</span>
                      <span className="text-[10px] uppercase font-semibold">
                        {entry.isValid ? entry.type : "invalid"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={validEntries.length === 0}
              onClick={handleImportSubmit}
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Import {validEntries.length > 0 ? `${validEntries.length} Members` : "Members"}
            </Button>
          </div>
        )}

        <Button variant="outline" size="md" className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
