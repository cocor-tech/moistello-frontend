"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, AlertCircle } from "lucide-react";
import { useTranslate } from "@/lib/locale/context";

export default function ContributionsPage() {
  const { t } = useTranslate();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="contributions-loading">
        <Skeleton variant="heading" width="40%" height={40} />
        <div className="space-y-3">
          <Skeleton variant="rectangular" height={80} />
          <Skeleton variant="rectangular" height={80} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title={t("contributions.errorTitle", "Failed to load contributions")}
        description={t("contributions.errorDesc", "Something went wrong while fetching your contributions. Please try again later.")}
        action={{
          label: t("error.tryAgain", "Retry"),
          onClick: () => setIsError(false),
        }}
        className="border border-red-400/27"
      />
    );
  }

  if (contributions.length === 0) {
    return (
      <div className="space-y-8" data-testid="contributions-page">
        <PageHeader
          title={t("contributions.title", "Contributions")}
          description={t("contributions.desc", "Track your regular circle contributions and payment history.")}
        />
        <EmptyState
          icon={<DollarSign />}
          title={t("contributions.emptyTitle", "No contributions yet")}
          description={t("contributions.emptyDesc", "Join a savings circle and make your first contribution to start building your on-chain financial record.")}
          action={{
            label: t("contributions.browseCircles", "Browse Circles"),
            onClick: () => (window.location.href = "/circles"),
          }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="contributions-page">
      <PageHeader
        title={t("contributions.title", "Contributions")}
        description={t("contributions.desc", "Track your regular circle contributions and payment history.")}
      />
      <div>{t("contributions.list", "Contributions list")}</div>
    </div>
  );
}

