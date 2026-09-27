"use client";

import { logger } from "@/lib/logger"
import { useState, useEffect, useCallback } from "react";
import { Clock, Users, Link2, AlertCircle, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/shared/copy-button";
import { DEFAULT_MAX_INVITE_USES, MAX_INVITE_USES_LIMIT, Routes } from "@/lib/constants";

interface InviteCode {
  id: string;
  code: string;
  maxUses: number;
  useCount: number;
  expiresAt?: string | null;
  createdAt: string;
}

interface CircleInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
}

export function CircleInviteModal({
  isOpen,
  onClose,
  circleId,
}: CircleInviteModalProps) {
  const [inviteCode, setInviteCode] = useState<string>("");
  const [maxUses, setMaxUses] = useState(DEFAULT_MAX_INVITE_USES);
  const [expiration, setExpiration] = useState<string>("");
  const [existingInvites, setExistingInvites] = useState<InviteCode[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${Routes.INVITE(inviteCode)}`
      : Routes.INVITE(inviteCode);

  const fetchInvites = useCallback(async () => {
    if (!circleId) return;
    setIsLoadingInvites(true);
    setFetchError(null);
    try {
      const { get } = await import("@/lib/api-client");
      const response = await get<{ data: InviteCode[] }>(
        `/api/circles/${circleId}/invites`,
      );
      setExistingInvites(response.data ?? []);
    } catch (e) {
      logger.error("[circle-invite] Failed to load invites:", e)
      setFetchError("Failed to load existing invites. Please try again.");
      setExistingInvites([]);
    } finally {
      setIsLoadingInvites(false);
    }
  }, [circleId]);

  useEffect(() => {
    if (isOpen && circleId) {
      fetchInvites();
    }
  }, [isOpen, circleId, fetchInvites]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { post } = await import("@/lib/api-client");
      const payload = {
        circleId,
        maxUses,
        expiresAt: expiration || null,
      };
      const response = await post<{ data: InviteCode }>(
        `/api/circles/${circleId}/invites`,
        payload,
      );

      const newInvite = response.data;
      if (newInvite) {
        setInviteCode(newInvite.code);
        setExistingInvites((prev) => [newInvite, ...prev]);
      }
    } catch (e) {
      logger.error("[circle-invite] Failed to generate invite:", e)
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (invite: InviteCode) => {
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return <Badge variant="destructive" size="sm">Expired</Badge>;
    }
    if (invite.useCount >= invite.maxUses) {
      return <Badge variant="default" size="sm">Used Up</Badge>;
    }
    return <Badge variant="success" size="sm">Active</Badge>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Members"
      description="Generate invite codes to share with people you want to join this circle."
      size="lg"
    >
      <div className="space-y-6">
        {inviteCode && (
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label htmlFor="invite-code" className="block text-sm font-medium text-gray-900">
              Invite Code
            </label>
            <div className="flex items-center gap-2">
              <Input
                id="invite-code"
                aria-label="Invite code"
                 value={inviteCode}
                readOnly
                className="font-mono text-sm"
                endAction={<CopyButton text={inviteCode} label="Copy code" />}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="invite-share-link" className="block text-sm font-medium text-gray-900">
                Share Link
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="invite-share-link"
                  aria-label="Invite share link"
                   value={inviteUrl}
                  readOnly
                  className="text-sm text-gray-600"
                  leftIcon={<Link2 className="h-4 w-4" />}
                  endAction={<CopyButton text={inviteUrl} label="Copy Link" />}
                />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 p-4 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Invite Settings</h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Max Uses"
              type="number"
              min={1}
              max={MAX_INVITE_USES_LIMIT}
              value={String(maxUses)}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              leftIcon={<Users className="h-4 w-4" />}
            />
            <Input
              label="Expiration (optional)"
              type="date"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              leftIcon={<Clock className="h-4 w-4" />}
              hint="Leave empty for no expiration"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleGenerate}
            isLoading={isGenerating}
          >
            Generate New Invite
          </Button>
        </div>

        {/* Existing Invites Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900">
            Existing Invites {!isLoadingInvites && `(${existingInvites.length})`}
          </h4>

          {isLoadingInvites ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : fetchError ? (
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{fetchError}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={fetchInvites} className="text-xs text-red-700 hover:text-red-900">
                <RefreshCw className="mr-1 h-3 w-3" />
                Retry
              </Button>
            </div>
          ) : existingInvites.length > 0 ? (
            <div className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {existingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {invite.code}
                      </span>
                      <CopyButton text={invite.code} />
                    </div>
                    <p className="text-xs text-gray-500">
                      {invite.useCount}/{invite.maxUses} uses
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(invite)}
                  </div>
                </div>
              ))}
            </div>
          ) : !inviteCode ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No invites yet. Generate one above to get started.
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
