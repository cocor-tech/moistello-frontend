import { useEffect, useRef } from "react";

const FOCUSABLE_ELEMENTS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useFocusTrap<T extends HTMLElement>(
  isOpen: boolean,
  onClose: () => void,
) {
  const containerRef = useRef<T>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusableElements = () =>
      Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS) ?? [],
      );

    let containerFocused = false;
    const focusFirstElement = () => {
      const container = containerRef.current;
      if (!container) return false;
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
        containerFocused = false;
        return true;
      }
      if (!containerFocused) {
        container.focus();
        containerFocused = true;
      }
      return false;
    };

    let observer: MutationObserver | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const focusWhenReady = () => {
      if (focusFirstElement()) return;
      const root = document.documentElement
      if (typeof MutationObserver !== "undefined" && root) {
        observer = new MutationObserver(() => {
          if (focusFirstElement()) observer?.disconnect();
        });
        observer.observe(root, { childList: true, subtree: true });
        return;
      }
      retryTimer = setTimeout(focusWhenReady, 0);
    };
    focusWhenReady();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const container = containerRef.current;
      const elements = getFocusableElements();
      if (!container) return;
      if (elements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const activeElement = document.activeElement;
      const focusIsInside = activeElement instanceof HTMLElement && container.contains(activeElement);
      const activeIsFocusable = activeElement instanceof HTMLElement && elements.includes(activeElement);

      if (!focusIsInside || !activeIsFocusable) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      observer?.disconnect();
      if (retryTimer) clearTimeout(retryTimer);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  return containerRef;
}
