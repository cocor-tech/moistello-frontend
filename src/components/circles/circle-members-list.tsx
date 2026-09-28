"use client";

import { Hash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/shared/copy-button";
import { formatAddress } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import type { CircleMember, MemberStatus } from "@/types";
import { memo, useMemo } from "react";

const statusVariantMap: Record<MemberStatus, "success" | "warning" | "destructive" | "default"> = {
  active: "success",
  pending: "warning",
  invited: "info" as "default",
  defaulter: "destructive",
  left: "default",
  removed: "destructive",
};

const statusLabelMap: Record<MemberStatus, string> = {
  active: "Active",
  pending: "Pending",
  invited: "Invited",
  defaulter: "Defaulter",
  left: "Left",
  removed: "Removed",
};

interface MemberRowProps {
  member: CircleMember;
  isCurrentUser: boolean;
}

const MemberRow = memo(function MemberRow({ member, isCurrentUser }: MemberRowProps) {
  const displayName = member.userName || "Anonymous";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card
      className={cn(
        "transition-colors",
        isCurrentUser && "bg-primary/5 border-primary/20",
      )}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar
          fallback={initials}
          size="md"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold text-gray-900 truncate",
              )}
            >
              {displayName}
            </span>
            {isCurrentUser && (
              <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
                You
              </span>
            )}
          </div>
          {member.userAddress && (
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <span>{formatAddress(member.userAddress)}</span>
              <CopyButton text={member.userAddress} />
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="default"
            size="sm"
            className="inline-flex items-center gap-1"
          >
            <Hash className="h-3 w-3" />
            #{member.position}
          </Badge>
          <Badge
            variant={statusVariantMap[member.status] || "default"}
            size="sm"
          >
            {statusLabelMap[member.status] || member.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
});

interface CircleMembersListProps {
  members: CircleMember[];
  currentUserId?: string;
  className?: string;
}

export function CircleMembersList({
  members,
  currentUserId,
  className,
}: CircleMembersListProps) {
  if (members.length === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-gray-500", className)}>
        No members found.
      </div>
    );
  }

  // Memoize the rows to prevent re-renders when parent state changes
  const memberRows = useMemo(
    () =>
      members.map((member) => {
        const isCurrentUser = currentUserId != null && member.userId === currentUserId;
        return (
          <MemberRow key={member.id} member={member} isCurrentUser={isCurrentUser} />
        );
      }),
    [members, currentUserId]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {memberRows}
    </div>
  );
}
