import { AlertCircle, CheckCircle, Eye } from "lucide-react"
import type { UploadStatus } from "../utils/upload"

interface UploadFeedbackProps {
  status: UploadStatus
  message: string
  uploadedUrl: string
  /** 0–100 upload progress. Only shown while status is "uploading". */
  progress?: number
}

export function UploadFeedback({ status, message, uploadedUrl, progress = 0 }: UploadFeedbackProps) {
  if (status === "idle") return null

  if (status === "uploading") {
    return (
      <div
        className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2"
        role="status"
        aria-live="polite"
        aria-label={`Upload progress ${progress}%`}
      >
        <div className="flex items-center gap-2 text-sm">
          <div
            className="animate-spin h-4 w-4 border-2 border-aurora-violet border-t-transparent rounded-full"
            aria-hidden="true"
          />
          <span>
            {progress > 0 && progress < 100
              ? `Uploading… ${progress}%`
              : "Uploading..."}
          </span>
        </div>

        {/* Progress bar — only rendered once we have a non-trivial value */}
        {progress > 0 && (
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full rounded-full bg-aurora-violet transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    )
  }

  if (status === "error") {
    return (
      <div
        className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400"
        role="alert"
        aria-live="assertive"
      >
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        {message}
      </div>
    )
  }

  return (
    <div
      className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-400"
      role="status"
      aria-live="polite"
    >
      <CheckCircle className="h-4 w-4" aria-hidden="true" />
      {message}
      {uploadedUrl && (
        <a
          href={uploadedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs hover:text-white flex items-center gap-1"
          aria-label="Open the published page in a new tab"
        >
          <Eye className="h-3 w-3" aria-hidden="true" /> View
        </a>
      )}
    </div>
  )
}
