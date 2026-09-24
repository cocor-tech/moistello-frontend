"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, AlertCircle } from "lucide-react";
import { useTranslate } from "@/lib/locale/context";

export default function SavingsPage() {
  const { t } = useTranslate();
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
        title={t("savings.errorTitle", "Failed to load savings")}
        description={t("savings.errorDesc", "Could not retrieve your savings goals and vaults.")}
        action={{
          label: t("error.tryAgain", "Retry"),
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
          title={t("savings.title", "Savings & Vaults")}
          description={t("savings.desc", "Manage your personal decentralized savings goals and secure vaults.")}
        />
        <EmptyState
          icon={<Wallet />}
          title={t("savings.noGoals", "No savings vaults created")}
          description={t("savings.noGoalsHint", "Start a dedicated savings vault to lock USDC or XLM towards personal financial milestones.")}
          action={{
            label: t("savings.createGoal", "Create Vault"),
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
        title={t("savings.title", "Savings & Vaults")}
        description={t("savings.desc", "Manage your personal decentralized savings goals and secure vaults.")}
      />
      <div>{t("savings.list", "Vaults list")}</div>
    </div>
  );
}

