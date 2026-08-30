"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle } from "lucide-react";

export default function ReferralsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="referrals-loading">
        <Skeleton variant="heading" width="40%" height={40} />
        <Skeleton variant="rectangular" height={180} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="Failed to load referrals"
        description="Unable to load your referral statistics and invited users."
        action={{
          label: "Retry",
          onClick: () => setIsError(false),
        }}
        className="border border-red-400/20"
      />
    );
  }

  if (referrals.length === 0) {
    return (
      <div className="space-y-8" data-testid="referrals-page">
        <PageHeader
          title="Referrals & Rewards"
          description="Invite friends to Moistello and earn protocol rewards."
        />
        <EmptyState
          icon={<Users />}
          title="No referrals yet"
          description="Share your unique invite link with friends and community members to earn bonuses when they join circles."
          action={{
            label: "Copy Invite Link",
            onClick: () => {},
          }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="referrals-page">
      <PageHeader
        title="Referrals & Rewards"
        description="Invite friends to Moistello and earn protocol rewards."
      />
      <div>Referrals list</div>
    </div>
  );
}
