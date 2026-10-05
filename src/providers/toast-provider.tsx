"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, CircleCheck, CircleAlert, TriangleAlert, Info, Copy } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/cn";

interface ToastProviderProps {
  children: ReactNode;
}

const typeIcons: Record<string, ReactNode> = {
  success: <CircleCheck className="h-5 w-5" />,
  error: <CircleAlert className="h-5 w-5" />,
  warning: <TriangleAlert className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
};

// The app renders dark by default, so every surface colour here needs a `dark:`
// counterpart. The light tints are near-white and leave a toast all but
// invisible against a dark page; the dark tints are deep, low-luminance
// versions of the same hue so the type still reads at a glance.
const typeStyles: Record<string, string> = {
  success: "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-950/70",
  error: "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-950/70",
  warning: "border-yellow-300 bg-yellow-50 dark:border-yellow-500/40 dark:bg-yellow-950/70",
  info: "border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-950/70",
};

const typeIconColors: Record<string, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  info: "text-blue-600 dark:text-blue-400",
};

/**
 * ToastHost renders the actual toast stack via a portal onto document.body.
 *
 * It deliberately accepts NO children and holds NO page content — it is a
 * pure leaf component. This is the key architectural choice: because nothing
 * in the page tree is a descendant of ToastHost, route changes (which cause
 * React to unmount/remount the page subtree) never touch this component.
 * It mounts once when the app boots and lives for the entire session.
 *
 * Placement in the tree: ToastHost is a sibling of {children} inside
 * ToastProvider, so the provider wrapper still satisfies the layout contract
 * (wrapping children) while the host remains isolated from route churn.
 */
export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      data-testid="toast-host"
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          data-toast-id={t.id}
          className={cn(
            "flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
            // The dark tints are translucent, so the blur keeps text
            // legible over whatever the toast happens to overlap.
            "dark:shadow-black/40 dark:backdrop-blur-sm",
            typeStyles[t.type] ?? typeStyles.info,
            "translate-x-0 opacity-100"
          )}
        >
          <span
            className={cn(
              "shrink-0",
              typeIconColors[t.type] ?? typeIconColors.info
            )}
            aria-hidden="true"
          >
            {typeIcons[t.type] ?? typeIcons.info}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t.title}
            </p>
            {t.description && (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                {t.description}
              </p>
            )}
            {t.requestId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  ID: {t.requestId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(t.requestId!);
                  }}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  aria-label="Copy request ID"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

/**
 * ToastProvider wraps page content and mounts one ToastHost sibling.
 * The host is a sibling — not a descendant — of {children}, so it is
 * unaffected by any re-renders or unmounts within the page subtree.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}
