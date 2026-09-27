"use client"

import { Camera, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAvatarUpload } from "../hooks/use-avatar-upload"
import { ACCEPTED_AVATAR_TYPES, AVATAR_SIZE } from "../utils/resize-image"

interface AvatarUploaderProps {
  initial: string
  avatarUrl?: string
}

export function AvatarUploader({ initial, avatarUrl }: AvatarUploaderProps) {
  const { inputRef, preview, processing, uploading, selectFile, cancel, confirm } = useAvatarUpload()

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Your avatar"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover shadow-lg"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full gradient-bg text-white font-mono text-3xl font-bold shrink-0 shadow-lg">
            {initial}
          </div>
        )}
        <label
          htmlFor="avatar-file"
          className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-background border border-aurora-violet/60 text-aurora-violet hover:bg-aurora-violet/10 focus-within:ring-2 focus-within:ring-aurora-violet/50"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4" aria-hidden="true" />
          )}
          <input
            ref={inputRef}
            id="avatar-file"
            type="file"
            accept={ACCEPTED_AVATAR_TYPES.join(",")}
            onChange={selectFile}
            disabled={processing || uploading}
            className="sr-only"
            aria-label="Change avatar"
          />
        </label>
      </div>

      {preview && (
        <div
          role="region"
          aria-label="Avatar preview"
          className="w-full max-w-sm border-l-4 border-l-aurora-violet pl-4 flex items-center gap-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt="New avatar preview"
            width={AVATAR_SIZE / 2}
            height={AVATAR_SIZE / 2}
            className="h-32 w-32 rounded-full object-cover holo-border"
          />
          <div className="flex-1 space-y-3">
            <p className="text-xs text-muted-foreground">
              Cropped to {AVATAR_SIZE}×{AVATAR_SIZE} · {(preview.blob.size / 1024).toFixed(1)} KB
            </p>
            <div className="flex gap-2">
              <Button
                variant="premium"
                size="sm"
                onClick={confirm}
                isLoading={uploading}
                leftIcon={uploading ? undefined : <Check className="h-4 w-4" />}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancel}
                disabled={uploading}
                leftIcon={<X className="h-4 w-4" />}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
