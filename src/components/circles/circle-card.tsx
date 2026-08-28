"use client";

import { memo } from "react";
import { Users, Shield, Dices, ListOrdered, Gavel, Vote } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { CircleStatusBadge } from "@/components/circles/circle-status-badge";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import type { Circle, CircleType, PayoutType } from "@/types";

const payoutIcons: Record<PayoutType, React.ReactNode> = {
  random: <Dices className="h-4 w-4" />,
  fixed: <ListOrdered className="h-4 w-4" />,
  auction: <Gavel className="h-4 w-4" />,
  vote: <Vote className="h-4 w-4" />,
};

const payoutLabels: Record<PayoutType, string> = {
  random: "Random",
  fixed: "Fixed Order",
  auction: "Auction",
  vote: "Vote",
};

const typeVariantMap: Record<CircleType, "default" | "success" | "warning" | "info"> = {
  public: "success",
  private: "default",
  community: "warning",
  premium: "info",
};

interface CircleCardProps {
  circle: Circle;
  onClick?: () => void;
  className?: string;
}

export const CircleCard = memo(function CircleCard({ circle, onClick, className }: CircleCardProps) {
  const freqLabel = circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1);
  const memberCount = circle.memberCount ?? 0;
  const totalRounds = circle.maxMembers;

  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              fallback={circle.name.slice(0, 2).toUpperCase()}
              size="md"
            />
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {circle.name}
              </CardTitle>
            </div>
          </div>
          <Badge variant={typeVariantMap[circle.circleType]} size="sm">
            {circle.circleType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-3 pt-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1">
            {formatCurrency(circle.contributionAmount, circle.currency)}
          </span>
          <span className="inline-flex items-center gap-1 text-gray-300">|</span>
          <span>{freqLabel}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {memberCount}/{circle.maxMembers} members
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CircleStatusBadge status={circle.status} />
          <Badge variant="default" size="sm" className="inline-flex items-center gap-1">
            {payoutIcons[circle.payoutType]}
            {payoutLabels[circle.payoutType]}
          </Badge>
          {circle.minMoiScore != null && circle.minMoiScore > 0 && (
            <Badge variant="warning" size="sm" className="inline-flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {circle.minMoiScore}+
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Round progress</span>
            <span>
              {circle.currentRound}/{totalRounds}
            </span>
          </div>
          <Progress
            value={(circle.currentRound / totalRounds) * 100}
            size="sm"
            variant="primary"
          />
        </div>
      </CardContent>
    </Card>
  );
});

CircleCard.displayName = "CircleCard";
