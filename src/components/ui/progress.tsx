"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
} as const;

const variantClasses = {
  primary: "gradient-bg-extended shadow-[0_0_8px_rgb(var(--aurora-violet)/0.3)]",
  success: "bg-success shadow-[0_0_8px_rgb(var(--success)/0.3)]",
  warning: "bg-warning shadow-[0_0_8px_rgb(var(--warning)/0.3)]",
  premium: "gradient-bg-premium shadow-[0_0_8px_rgb(var(--premium-gold)/0.3)]",
} as const;

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  size?: keyof typeof sizeClasses;
  variant?: keyof typeof variantClasses;
  showLabel?: boolean;
}

export function Progress({
  value,
  size = "md",
  variant = "primary",
  showLabel = false,
  className,
  ...props
}: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("w-full", className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
        )}
        aria-hidden="true"
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            variantClasses[variant],
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-2xs font-heading text-muted-foreground text-right">
          {Math.round(clampedValue)}%
        </p>
      )}
    </div>
  );
}
