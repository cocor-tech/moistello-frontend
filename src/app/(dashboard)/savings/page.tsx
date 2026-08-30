"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, AlertCircle } from "lucide-react";

export default function SavingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="savings-loading">
        <Skeleton variant="heading" width="40%" height={40} />
        <Skeleton variant="rectangular" height={200} />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertCircle />}
        title="Failed to load savings"
        description="Could not retrieve your savings goals and vaults."
        action={{
          label: "Retry",
          onClick: () => setIsError(false),
        }}
        className="border border-red-400/20"
      />
    );
  }

  if (goals.length === 0) {
    return (
      <div className="space-y-8" data-testid="savings-page">
        <PageHeader
          title="Savings & Vaults"
          description="Manage your personal decentralized savings goals and secure vaults."
        />
        <EmptyState
          icon={<Wallet />}
          title="No savings vaults created"
          description="Start a dedicated savings vault to lock USDC or XLM towards personal financial milestones."
          action={{
            label: "Create Vault",
            onClick: () => {},
          }}
          className="border border-dashed border-aurora-violet/30"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="savings-page">
      <PageHeader
        title="Savings & Vaults"
        description="Manage your personal decentralized savings goals and secure vaults."
      />
      <div>Vaults list</div>
    </div>
  );
}
