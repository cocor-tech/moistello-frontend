import type { ChangeEvent, RefObject } from "react"
import { FileText, Upload, X } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatFileSize, getUploadPath, getUploadSlug } from "../utils/upload"

interface FileDropzoneProps {
  file: File | null
  fileRef: RefObject<HTMLInputElement>
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}

export function FileDropzone({ file, fileRef, onFileSelect, onClear }: FileDropzoneProps) {
  return (
    <div className="relative">
      <label
        htmlFor="upload-file"
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 block focus-within:ring-2 focus-within:ring-aurora-violet/50",
          file ? "border-aurora-violet/40 bg-aurora-violet/5" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]",
        )}
      >
        <input
          ref={fileRef}
          id="upload-file"
          name="file"
          type="file"
          accept=".md,.html"
          onChange={onFileSelect}
          className="sr-only"
          aria-label="Choose a Markdown or HTML file"
          aria-describedby={!file ? "upload-file-help" : undefined}
        />
        {file ? (
          <div className="flex items-center gap-3 justify-center">
            <FileText className="h-8 w-8 text-aurora-cyan" aria-hidden="true" />
            <div className="text-left">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} → {getUploadPath(getUploadSlug(file.name))}
              </p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">Click to select a file</p>
            <p id="upload-file-help" className="text-muted-foreground/50 text-xs mt-1">.md or .html only</p>
          </>
        )}
      </label>
      {file && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-3 bg-white/5 border border-white/10 rounded-full p-1.5 hover:text-red-400"
          aria-label={`Remove selected file ${file.name}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
