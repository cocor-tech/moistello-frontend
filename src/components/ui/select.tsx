"use client";

import React, { forwardRef, useId, useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder,
      label,
      error,
      hint,
      disabled,
      className,
      id,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint && !error ? `${selectId}-hint` : undefined;
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLSelectElement>) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: React.FocusEvent<HTMLSelectElement>) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-2 block font-heading text-xs tracking-wider uppercase text-muted-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            onFocus={handleFocus}
            onBlur={handleBlur}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId || hintId || undefined}
            className={cn(
              "block w-full h-11 appearance-none bg-transparent px-3 py-2 pr-10 text-base md:text-sm text-foreground",
              "border-b-2 border-border",
              "transition-all duration-300 rounded-none",
              "focus:outline-none",
              isFocused && !error && "border-b-aurora-violet shadow-[0_0_12px_rgb(var(--aurora-violet)/0.1)]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              error && "border-b-red-500 shadow-[0_0_12px_rgb(239_68_68/0.1)]",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-muted-foreground">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-foreground bg-background">
                {option.label}
              </option>
            ))}
          </select>
          <span
            className={cn(
              "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform duration-200",
              isFocused && "animate-rotate-180"
            )}
            aria-hidden="true"
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-red-400" role="alert">
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

Select.displayName = "Select";
