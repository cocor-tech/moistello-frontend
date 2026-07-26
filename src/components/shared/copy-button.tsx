"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Copy, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  onError?: (err: Error) => void;
}

export function CopyButton({ text, label, className, onError }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    try {
      const success = await copyToClipboard(text);
      if (success) {
        setCopied(true);
        setHasError(false);
        timerRef.current = setTimeout(() => setCopied(false), 2000);
      } else {
        setHasError(true);
        onError?.(new Error("Failed to copy text to clipboard"));
        timerRef.current = setTimeout(() => setHasError(false), 2000);
      }
    } catch (err) {
      setHasError(true);
      onError?.(err instanceof Error ? err : new Error("Failed to copy"));
      timerRef.current = setTimeout(() => setHasError(false), 2000);
    }
  }, [text, onError]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3 py-1.5",
        "text-xs font-mono font-medium tracking-tight",
        "transition-all duration-300",
        "hover:scale-[1.04] active:scale-[0.94]",
        copied
          ? "glass-strong bg-success/10 text-success border border-success/20 shadow-[0_0_24px_rgba(16,185,129,0.15)]"
          : hasError
          ? "glass-strong bg-red-500/10 text-red-400 border border-red-500/20"
          : "glass-whisper text-muted-foreground hover:text-foreground hover:glass-strong",
        className,
      )}
      aria-label={copied ? "Copied" : hasError ? "Failed to copy" : label ?? "Copy to clipboard"}
    >
      {copied ? (
        <span className="text-success animate-scale-in">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : hasError ? (
        <span className="text-red-400 animate-scale-in">
          <AlertCircle className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span className="animate-scale-in">
          <Copy className="h-3.5 w-3.5" />
        </span>
      )}
      <span className={cn(copied && "text-success", hasError && "text-red-400")}>
        {hasError
          ? "Failed"
          : label
          ? copied
            ? "Copied!"
            : label
          : copied
          ? "Copied!"
          : text}
      </span>
    </button>
  );
}
