"use client";

import { useMemo, useState } from "react";
import { Eye, Link2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { handleFromDisplayName, toPublicProfile } from "@/lib/profile/public-profile";
import { PublicProfileView } from "./PublicProfileView";

export interface ProfilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The signed-in user's full record. */
  user: unknown;
}

/**
 * "See what others see" preview.
 *
 * Renders `PublicProfileView` from the same projection the public route uses,
 * so anything hidden here is hidden there. The share link is derived from the
 * same handle, which means the URL in the copy field is the URL that will
 * actually render.
 */
export function ProfilePreviewModal({ isOpen, onClose, user }: ProfilePreviewModalProps) {
  const toast = useToast();
  const [copiedFallback, setCopiedFallback] = useState(false);

  const handle = useMemo(() => {
    const record = (user ?? {}) as Record<string, unknown>;
    const existing = typeof record.handle === "string" ? record.handle : "";
    if (existing) return existing;
    return handleFromDisplayName(
      typeof record.displayName === "string" ? record.displayName : "",
      typeof record.id === "string" ? record.id : undefined,
    );
  }, [user]);

  const profile = useMemo(() => toPublicProfile(user, handle), [user, handle]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return `/u/${handle}`;
    return `${window.location.origin}/u/${handle}`;
  }, [handle]);

  const handleCopy = () => setCopiedFallback(true);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Public profile preview" size="lg">
      <div className="space-y-6">
        <div className="flex items-start gap-3 border-l-4 border-l-emerald-400 bg-white/[0.02] py-3 pl-4">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            This is exactly what an unauthenticated visitor sees. Your email, phone,
            language preference, and full wallet address are never included.
          </p>
        </div>

        {profile ? (
          <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-white/10 p-4">
            <PublicProfileView profile={profile} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            There is no profile data to preview yet.
          </p>
        )}

        <div className="space-y-3">
          <label
            htmlFor="profile-share-link"
            className="flex items-center gap-2 font-heading text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            Share link
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="profile-share-link"
              readOnly
              value={shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-foreground"
            />
            <CopyButton
              text={shareUrl}
              label="Copy link"
              className="justify-center"
              onError={() => {
                toast.error("Could not copy the link");
                handleCopy();
              }}
            />
          </div>

          <p className="text-2xs text-muted-foreground">
            {copiedFallback
              ? "Copy it from the field above if your browser blocked clipboard access."
              : `Anyone with this link can view /u/${handle} without signing in.`}
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            size="md"
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={() => {
              onClose();
              window.open(`/u/${handle}`, "_blank", "noopener,noreferrer");
            }}
          >
            Open public page
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Convenience wrapper so the profile page does not need its own state. */
export function useProfilePreview() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const open = () => setIsPreviewOpen(true);
  const close = () => setIsPreviewOpen(false);
  return { isPreviewOpen, open, close };
}
