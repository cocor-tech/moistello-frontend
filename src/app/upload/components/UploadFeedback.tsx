import { AlertCircle, CheckCircle, Eye } from "lucide-react"
import type { UploadStatus } from "../utils/upload"

interface UploadFeedbackProps {
  status: UploadStatus
  message: string
  uploadedUrl: string
}

export function UploadFeedback({ status, message, uploadedUrl }: UploadFeedbackProps) {
  if (status === "idle") return null

  if (status === "uploading") {
    return (
      <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm" role="status" aria-live="polite">
        <div className="animate-spin h-4 w-4 border-2 border-aurora-violet border-t-transparent rounded-full" aria-hidden="true" />
        Uploading...
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm text-red-400" role="alert" aria-live="assertive">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        {message}
      </div>
    )
  }

  return (
    <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-400" role="status" aria-live="polite">
      <CheckCircle className="h-4 w-4" aria-hidden="true" />
      {message}
      {uploadedUrl && (
        <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" className="ml-auto bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs hover:text-white flex items-center gap-1" aria-label="Open the published page in a new tab">
          <Eye className="h-3 w-3" aria-hidden="true" /> View
        </a>
      )}
    </div>
  )
}
