"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, AlertCircle } from "lucide-react";

export default function PayoutsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [payouts, setPayouts] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="payouts-loading">
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
        title="Failed to load payouts"
        description="Something went wrong while retrieving your payouts. Please try again."
        action={{
          label: "Retry",
          onClick: () => setIsError(false),
        }}
        className="border border-red-400/20"
      />
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="space-y-8" data-testid="payouts-page">
        <PageHeader
          title="Payouts"
          description="View all circle payouts distributed to your wallet."
        />
        <EmptyState
          icon={<Award />}
          title="No payouts received yet"
          description="Active round disbursements and completed circle payouts will appear here once distributed."
          action={{
            label: "View Circles",
            onClick: () => (window.location.href = "/circles"),
          }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="payouts-page">
      <PageHeader
        title="Payouts"
        description="View all circle payouts distributed to your wallet."
      />
      <div>Payouts list</div>
    </div>
  );
}
