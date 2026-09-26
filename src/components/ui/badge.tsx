"use client";

import React from "react";
import { cn } from "@/lib/cn";

const variantClasses = {
  default: "glass-strong text-foreground",
  primary: "bg-aurora-violet/20 text-aurora-violet border border-aurora-violet/30",
  success: "bg-success/20 text-success border border-success/30",
  warning: "bg-warning/20 text-warning border border-warning/30",
  destructive: "bg-destructive/20 text-destructive border border-destructive/30",
  info: "bg-info/20 text-info border border-info/30",
  outline: "border border-border text-foreground",
  premium: "bg-premium-gold/20 text-premium-gold border border-premium-gold/30",
} as const;

const dotColors = {
  default: "bg-muted-foreground",
  primary: "bg-aurora-violet",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  outline: "bg-muted-foreground",
  premium: "bg-premium-gold",
} as const;

const sizeClasses = {
  sm: "px-2 py-0 text-[10px] gap-1",
  md: "px-2.5 py-0.5 text-xs gap-1.5",
} as const;

const dotSizes = {
  sm: "w-1 h-1",
  md: "w-1.5 h-1.5",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
}

export function Badge({
  variant = "default",
  size = "md",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-body font-medium tracking-wide uppercase text-2xs",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "rounded-full shrink-0 mr-1.5",
          dotColors[variant],
          dotSizes[size],
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
