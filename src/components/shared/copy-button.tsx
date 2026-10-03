"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Copy, Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { copyToClipboard } from "@/lib/clipboard";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  onError?: (err: Error) => void;
  /**
   * The untruncated value, when `label` is a shortened display form such as
   * `GABC…WXYZ`.
   *
   * Exposed three ways so the full value is actually reachable: as a native
   * `title` tooltip, as the accessible name, and — when copying fails — as the
   * contents of the fallback input. Previously the truncated label was the
   * only representation, so a screen-reader or long-press user had no way to
   * read the address they were about to copy.
   */
  fullText?: string;
  /** Called after a successful copy, so callers can raise their own toast. */
  onCopied?: (text: string) => void;
  /**
   * Render a read-only, auto-selecting input when the copy fails, so the value
   * can still be selected by hand. On by default: a failed copy with no
   * recourse is a dead end.
   */
  showFallbackOnError?: boolean;
}

export function CopyButton({
  text,
  label,
  className,
  onError,
  fullText,
  onCopied,
  showFallbackOnError = true,
}: CopyButtonProps) {
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
        onCopied?.(text);
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
  }, [text, onError, onCopied]);

  const button = (
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
      // The accessible name carries the full value when one is supplied, so the
      // address is not only reachable visually via the title attribute.
      title={fullText ?? text}
      aria-label={
        copied
          ? "Copied"
          : hasError
            ? `Failed to copy ${fullText ?? text}`
            : fullText
              ? `Copy ${fullText} to clipboard`
              : `Copy ${label ?? text} to clipboard`
      }
      aria-live="polite"
    >
      {copied ? (
        <span className="text-success animate-scale-in">
          <Check className="h-3.5 w-3.5" />
        </span>
      ) : hasError ? (
        <span className="text-red-400 animate-scale-in">
          <CircleAlert className="h-3.5 w-3.5" />
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

  // A failed copy is a dead end unless the value is still reachable. Rendered
  // below the button, read-only, and auto-selected so the user can immediately
  // press Ctrl+C — which is what they were trying to do in the first place.
  if (hasError && showFallbackOnError) {
    return (
      <span className="inline-flex flex-col items-start gap-1.5" data-testid="copy-fallback">
        {button}
        <input
          type="text"
          readOnly
          aria-label={`Copy failed. Select and copy this value manually: ${fullText ?? text}`}
          // Selects the contents on mount so the value is ready to copy.
          ref={(node) => {
            if (node && !node.dataset.autoSelected) {
              node.dataset.autoSelected = "true";
              node.select();
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          value={fullText ?? text}
          className="w-full rounded-lg border border-red-500/30 bg-red-500/5 px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:border-red-400"
        />
      </span>
    );
  }

  return button;
}
