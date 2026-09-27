"use client";

import React, { forwardRef, useId, useState, useCallback } from "react";
import { cn } from "@/lib/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  endAction?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, leftIcon, rightIcon, endAction, className, id, placeholder, "aria-label": ariaLabel, onFocus, onBlur, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint && !error ? `${inputId}-hint` : undefined;
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    return (
      <div className="w-full scroll-mt-[40vh]" data-field-error={Boolean(error)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-2 block font-heading text-xs tracking-wider uppercase text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span
              className={cn(
                "pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 transition-colors duration-300",
                isFocused ? "text-aurora-cyan" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            placeholder={placeholder}
            aria-label={ariaLabel ?? (!label ? placeholder : undefined)}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId || hintId || undefined}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "block w-full h-11 scroll-mt-[40vh] bg-transparent px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground/50",
              "border-b-2 border-border",
              "transition-all duration-300 rounded-none",
              "focus:outline-none",
              isFocused && !error && "border-b-aurora-violet shadow-[0_0_12px_rgb(var(--aurora-violet)/0.1)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
               endAction && "pr-24",
              error && "border-b-red-500 shadow-[0_0_12px_rgb(239_68_68/0.1)]",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <span
              className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
          {endAction && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              {endAction}
            </span>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 min-h-5 text-xs leading-5 text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1 text-2xs text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
