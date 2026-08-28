"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

export function Dialog({
  isOpen,
  onClose,
  children,
  className,
  backdropClassName,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: DialogProps) {
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={
          backdropClassName ?? "absolute inset-0 bg-black/40 backdrop-blur-sm"
        }
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={className}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default Dialog;
