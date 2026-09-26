"use client";

import React, { forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const variantClasses = {
  primary:
    "gradient-bg-extended text-white holo-glow tracking-wide uppercase",
  secondary:
    "bg-secondary text-secondary-foreground",
  outline:
    "border border-border bg-transparent text-foreground",
  ghost:
    "text-foreground hover:bg-secondary",
  premium:
    "gradient-bg-premium text-white holo-glow font-heading tracking-wide uppercase shadow-[0_0_24px_rgb(var(--premium-gold)/0.2)]",
  destructive:
    "bg-destructive text-destructive-foreground holo-glow",
} as const;

const sizeClasses = {
  xs: "h-8 px-3 text-xs gap-1.5",
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-sm gap-2",
  lg: "h-12 px-8 text-base gap-2.5",
  xl: "h-14 px-10 text-lg gap-3",
} as const;

type ButtonVariant = keyof typeof variantClasses;
type ButtonSize = keyof typeof sizeClasses;

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
  isLoading = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  isLoading?: boolean;
}): string {
  return cn(
    "inline-flex items-center justify-center rounded-xl font-body font-medium transition-all duration-300",
    "hover:scale-[1.02] active:scale-[0.97]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100",
    "w-full md:w-auto",
    variant === "primary" && "font-heading",
    variant === "premium" && "rounded-xl",
    variant === "ghost" && "hover:bg-secondary",
    variant === "outline" && "hover:bg-secondary",
    variant === "secondary" && "hover:bg-secondary/80",
    variantClasses[variant],
    sizeClasses[size],
    isLoading && "animate-shimmer",
    className,
  )
}

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonStyles({ variant, size, className })}>
      {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
      {children}
      {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </Link>
  )
}

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
      type = "button",
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
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={buttonStyles({ variant, size, className, isLoading })}
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
