"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { CircleStatus } from "@/types";

const variantMap: Record<CircleStatus, "success" | "warning" | "info" | "destructive"> = {
  active: "success",
  pending: "warning",
  completed: "info",
  cancelled: "destructive",
  disputed: "destructive",
};

const labelMap: Record<CircleStatus, string> = {
  active: "Active",
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

interface CircleStatusBadgeProps {
  status: CircleStatus;
  className?: string;
}

export const CircleStatusBadge = memo(function CircleStatusBadge({
  status,
  className,
}: CircleStatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]} size="sm" className={cn(className)}>
      {labelMap[status]}
    </Badge>
  );
});

CircleStatusBadge.displayName = "CircleStatusBadge";
