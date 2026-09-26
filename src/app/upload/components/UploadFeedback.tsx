"use client"

import { CircleAlert, CircleCheck, Eye, RefreshCw, Upload, X } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/cn"
import type { UploadErrorKind, UploadProgress, UploadStatus } from "../utils/upload"

export interface UploadFeedbackProps {
  status: UploadStatus
  message: string
  uploadedUrl: string
  progress: UploadProgress
  errorKind: UploadErrorKind | null
  canRetry: boolean
  onRetry: () => void
}

const BANNER =
  "mt-4 border border-white/10 bg-white/5 p-3 text-sm"

/**
 * Renders the upload as two labelled phases.
 *
 * Neither phase's bar is allowed to read 100% until the server has confirmed
 * that phase: transfer stops at 99% while the request is in flight, and
 * finalize only completes on a 200 from `/api/upload/finalize`. That is what
 * makes the previous "stuck at 99%" state impossible to reach.
 */
export function UploadFeedback({
  status,
  message,
  uploadedUrl,
  progress,
  errorKind,
  canRetry,
  onRetry,
}: UploadFeedbackProps) {
  if (status === "idle") return null

  if (status === "uploading" || status === "finalizing") {
    const isTransfer = status === "uploading"
    return (
      <div className={cn(BANNER, "space-y-3")} role="status" aria-live="polite">
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-aurora-violet border-t-transparent"
            aria-hidden="true"
          />
          <span className="font-heading text-xs uppercase tracking-wider">
            {isTransfer ? "Uploading file" : "Finalizing"}
          </span>
        </div>

        <PhaseRow
          label="Upload"
          detail={isTransfer ? `${progress.transfer}%` : "Complete"}
          value={isTransfer ? progress.transfer : 100}
          done={!isTransfer}
          active={isTransfer}
        />
        <PhaseRow
          label="Publish"
          detail={isTransfer ? "Waiting" : "Confirming with server"}
          value={isTransfer ? 0 : progress.finalize}
          done={false}
          active={!isTransfer}
        />
      </div>
    )
  }

  if (status === "error") {
    const timedOut = errorKind === "timeout"
    return (
      <div className={cn(BANNER, "text-red-400")} role="alert" aria-live="assertive">
        <div className="flex items-start gap-2">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-heading text-xs uppercase tracking-wider">
              {timedOut ? "Timed out" : errorKind === "conflict" ? "Name already taken" : "Upload failed"}
            </p>
            <p className="text-sm text-foreground/80">{message}</p>
            {timedOut && (
              <p className="text-2xs text-muted-foreground">
                Your file was received — retrying only re-publishes it, so you will not
                upload it twice.
              </p>
            )}
            {canRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-aurora-violet/50 hover:text-aurora-violet"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                {timedOut ? "Retry publishing" : "Try again"}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(BANNER, "text-emerald-400")} role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{message}</span>
        {uploadedUrl && (
          <a
            href={uploadedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1 border border-white/10 bg-white/5 px-3 py-1 text-xs text-foreground hover:text-white"
            aria-label="Open the published page in a new tab"
          >
            <Eye className="h-3 w-3" aria-hidden="true" /> View
          </a>
        )}
      </div>
    </div>
  )
}

interface PhaseRowProps {
  label: string
  detail: string
  value: number
  done: boolean
  active: boolean
}

/** One labelled phase of the upload. `done` is the only path to a full bar. */
function PhaseRow({ label, detail, value, done, active }: PhaseRowProps) {
  const Icon = done ? CircleCheck : active ? Upload : X
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wider text-muted-foreground">
          <Icon
            className={cn("h-3 w-3", done && "text-emerald-400", active && "text-aurora-violet")}
            aria-hidden="true"
          />
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-2xs",
            done ? "text-emerald-400" : active ? "text-aurora-violet" : "text-muted-foreground",
          )}
        >
          {detail}
        </span>
      </div>
      <Progress
        value={done ? 100 : value}
        size="sm"
        variant={done ? "success" : "primary"}
        className={cn(!done && !active && "opacity-40")}
      />
    </div>
  )
}
