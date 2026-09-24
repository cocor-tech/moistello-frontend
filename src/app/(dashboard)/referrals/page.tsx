"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertCircle } from "lucide-react";
import { useTranslate } from "@/lib/locale/context";

export default function ReferralsPage() {
  const { t } = useTranslate();
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
        title={t("referrals.title", "Failed to load referrals")}
        description={t("referrals.errorLoad", "Unable to load your referral statistics and invited users.")}
        action={{
          label: t("error.tryAgain", "Retry"),
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
          title={t("referrals.title", "Referrals & Rewards")}
          description={t("referrals.subtitle", "Invite friends to Moistello and earn protocol rewards.")}
        />
        <EmptyState
          icon={<Users />}
          title={t("referrals.noBonuses", "No referrals yet")}
          description={t("referrals.noData", "Share your unique invite link with friends and community members to earn bonuses when they join circles.")}
          action={{
            label: t("referrals.copyLink", "Copy Invite Link"),
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
        title={t("referrals.title", "Referrals & Rewards")}
        description={t("referrals.subtitle", "Invite friends to Moistello and earn protocol rewards.")}
      />
      <div>{t("referrals.list", "Referrals list")}</div>
    </div>
  );
}

