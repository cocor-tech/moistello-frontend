import type { ChangeEvent, RefObject } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { FileDropzone } from "./FileDropzone"
import { SampleTemplates } from "./SampleTemplates"
import { UploadFeedback } from "./UploadFeedback"
import { UploadHeader } from "./UploadHeader"
import type { UploadStatus } from "../utils/upload"

interface UploadManagerProps {
  file: File | null
  fileRef: RefObject<HTMLInputElement>
  status: UploadStatus
  message: string
  uploadedUrl: string
  progress: number
  showSamples: boolean
  onToggleSamples: () => void
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onClearFile: () => void
  onUpload: () => void
  onLogout: () => void
}

export function UploadManager({
  file,
  fileRef,
  status,
  message,
  uploadedUrl,
  progress,
  showSamples,
  onToggleSamples,
  onFileSelect,
  onClearFile,
  onUpload,
  onLogout,
}: UploadManagerProps) {
  return (
    <div className="min-h-screen bg-void auroral-mesh">
      <UploadHeader onLogout={onLogout} />
      <main className="pt-24 px-4 max-w-xl mx-auto pb-24">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card/80 border border-white/10 rounded-xl p-8 holo-border"
          aria-labelledby="upload-page-title"
        >
          <h1 id="upload-page-title" className="font-heading text-2xl gradient-text mb-2">Upload Page</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Drop a .md or .html file. The filename becomes the route.
            <br />
            Example: <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono text-xs">about.md</code> → <code className="text-aurora-cyan text-xs">/p/about</code>
          </p>
          <SampleTemplates showSamples={showSamples} onToggle={onToggleSamples} />
          <FileDropzone file={file} fileRef={fileRef} onFileSelect={onFileSelect} onClear={onClearFile} />
          <UploadFeedback status={status} message={message} uploadedUrl={uploadedUrl} progress={progress} />
          <Button
            variant="premium"
            size="lg"
            className="w-full mt-6 rounded-xl"
            disabled={!file || status === "uploading"}
            isLoading={status === "uploading"}
            onClick={onUpload}
          >
            {status === "uploading" ? "Uploading..." : "Upload & Publish"}
          </Button>
        </motion.div>
      </main>
    </div>
  )
}
