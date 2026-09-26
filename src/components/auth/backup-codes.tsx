"use client"

import { useState } from "react"
import { TriangleAlert, Check, Copy, Download } from "lucide-react"
import { copyToClipboard } from "@/lib/clipboard"
import { Button } from "@/components/ui/button"

interface BackupCodesProps {
  codes: string[]
  onAcknowledged: () => void
}

export function BackupCodes({ codes, onAcknowledged }: BackupCodesProps) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleCopy = async () => {
    const success = await copyToClipboard(codes.join("\n"))
    if (success) {
      setCopied(true)
      setCopyError(false)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setCopyError(true)
      setTimeout(() => setCopyError(false), 2000)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([`Moistello Backup Codes\n${"=".repeat(40)}\n\n${codes.join("\n")}\n\nKeep these codes safe. Each can be used once.`], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "moistello-backup-codes.txt"
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
        <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-heading font-semibold text-amber-400">
            Save Your Backup Codes
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Each code can be used <strong>only once</strong> to access your account if you lose your authenticator device.
            These codes will <strong>never be shown again</strong>.
          </p>
        </div>
      </div>

      <div className="glass-premium rounded-xl p-4 space-y-2">
        {codes.map((code, i) => (
          <div key={i} className="font-mono text-sm text-foreground tracking-wider text-center py-1">
            {code}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" size="md" className="flex-1" onClick={handleCopy} leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>
          {copied ? "Copied!" : copyError ? "Failed to Copy" : "Copy"}
        </Button>
        <Button variant="outline" size="md" className="flex-1" onClick={handleDownload} leftIcon={<Download className="h-4 w-4" />}>
          {downloaded ? "Downloaded" : "Download"}
        </Button>
      </div>

      <Button variant="primary" size="lg" className="w-full" onClick={onAcknowledged}>
        I&apos;ve Saved My Codes — Continue
      </Button>
    </div>
  )
}
