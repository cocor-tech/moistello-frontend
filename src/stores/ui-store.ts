"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";
type Density = "comfortable" | "compact";
type FontSize = "small" | "medium" | "large";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface UIState {
  theme: Theme;
  density: Density;
  fontSize: FontSize;
  sidebarOpen: boolean;
  toasts: Toast[];
}

interface UIActions {
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setFontSize: (fontSize: FontSize) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

/*
 * Monotonic counter for toast ids: `Date.now()` alone can collide when two
 * toasts are added within the same millisecond (e.g. a batch of archive
 * results), so every id gets a strictly increasing sequence suffix.
 */
let toastIdCounter = 0;

/*
 * Hard cap on how many toasts can be stacked at once. Combined with the
 * column-reverse layout in ToastProvider this keeps the viewport corner from
 * ever overflowing: when the limit is hit the oldest toast is evicted so the
 * stack always fits on screen.
 */
const MAX_TOASTS = 5;

/*
 * Pending auto-dismiss timers keyed by toast id. Tracking them lets a manual
 * dismissal cancel its timer so a stale timeout can never fire for a toast
 * that was already removed (and, in tests, keeps fake timers leak-free).
 */
const toastDismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

/*
 * Recent toast signatures map to deduplicate parallel error toasts.
 * Keys are `${toast.type}:${toast.title}:${toast.description || ''}`.
 */
const recentToastSignatures = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 5000;

export function clearToastDeduplication(): void {
  recentToastSignatures.clear();
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: "system",
      density: "comfortable",
      fontSize: "medium",
      sidebarOpen: false,
      toasts: [],

      toggleTheme: () => {
        const { theme } = get();
        if (theme === "light") {
          set({ theme: "dark" });
        } else if (theme === "dark") {
          set({ theme: "system" });
        } else {
          set({ theme: "light" });
        }
      },

      setTheme: (theme: Theme) => set({ theme }),
      setDensity: (density: Density) => set({ density }),
      setFontSize: (fontSize: FontSize) => set({ fontSize }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      addToast: (toast: Omit<Toast, "id">) => {
        const now = Date.now();
        const signature = `${toast.type}:${toast.title}:${toast.description || ""}`;
        const lastSeen = recentToastSignatures.get(signature);

        if (lastSeen && now - lastSeen < DEDUPLICATION_WINDOW_MS) {
          // Ignore duplicate toast within the deduplication window (5s)
          return;
        }

        recentToastSignatures.set(signature, now);

        const id = `toast-${now}-${++toastIdCounter}`;
        const newToast: Toast = { ...toast, id };
        set((state) => {
          // Evict the oldest toast(s) once the stack would exceed the cap, so
          // overlapping toasts can never overflow the corner of the viewport.
          const overflow = state.toasts.length + 1 - MAX_TOASTS;
          if (overflow > 0) {
            for (const evicted of state.toasts.slice(0, overflow)) {
              const timer = toastDismissTimers.get(evicted.id);
              if (timer) {
                clearTimeout(timer);
                toastDismissTimers.delete(evicted.id);
              }
            }
          }
          const toasts =
            overflow > 0 ? state.toasts.slice(overflow) : state.toasts;
          return { toasts: [...toasts, newToast] };
        });

        const duration = toast.duration ?? 5000;
        const timer = setTimeout(() => {
          toastDismissTimers.delete(id);
          get().removeToast(id);
        }, duration);
        toastDismissTimers.set(id, timer);
      },

      removeToast: (id: string) => {
        const timer = toastDismissTimers.get(id);
        if (timer) {
          clearTimeout(timer);
          toastDismissTimers.delete(id);
        }
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },
    }),
    {
      name: "moistello_theme",
      partialize: (state) => ({ theme: state.theme, density: state.density, fontSize: state.fontSize }),
    }
  )
);
