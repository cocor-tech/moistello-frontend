"use client";

import React, { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const variantClasses = {
  primary:
    "gradient-bg-extended text-white holo-glow tracking-wide uppercase",
  secondary:
    "glass text-foreground dark:text-ink-900",
  outline:
    "glass text-foreground dark:text-ink-900",
  ghost:
    "text-muted-foreground",
  premium:
    "gradient-bg-premium text-white holo-glow font-heading tracking-wide uppercase shadow-[0_0_24px_rgb(var(--premium-gold)/0.2)]",
  destructive:
    "bg-destructive text-white holo-glow",
} as const;

const sizeClasses = {
  xs: "h-8 px-3 text-xs gap-1.5",
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-12 px-8 text-base gap-2.5",
  xl: "h-14 px-10 text-lg gap-3",
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-body font-medium transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.97]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100",
          "w-full md:w-auto",
          variant === "primary" && "font-heading",
          variant === "premium" && "rounded-2xl",
          variant === "ghost" && "hover:glass-whisper hover:text-foreground dark:hover:text-ink-900",
          variant === "outline" && "hover:holo-border",
          variant === "secondary" && "hover:glass-strong",
          variantClasses[variant],
          sizeClasses[size],
          isLoading && "animate-shimmer",
          className,
        )}
        {...props}
      >
        {isLoading && (
          <Loader2
            className={cn(
              "animate-spin gradient-text-extended shrink-0",
              size === "xs" ? "h-3 w-3" : size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : size === "xl" ? "h-6 w-6" : "h-4 w-4",
            )}
            aria-hidden="true"
          />
        )}
        {!isLoading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children}
        {!isLoading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
