"use client";

import { logger } from "@/lib/logger"
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    if (loading) return;
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (e) {
      logger.error("[confirm-dialog] Action failed:", e)
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={message}
      size="sm"
      className={cn(
        variant === "danger" &&
          "shadow-[0_0_40px_rgba(239,68,68,0.1)] ring-1 ring-destructive/10",
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        {variant === "danger" && (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 ring-1 ring-destructive/15">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
        )}

        {/* Warning for danger variant */}
        {variant === "danger" && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/15 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <span className="text-sm text-destructive font-body">
              This action cannot be undone. Please proceed with caution.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl font-body"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "destructive" : "primary"}
            size="md"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl font-body",
              variant === "danger" &&
                "shadow-[0_0_28px_rgba(239,68,68,0.25)] gradient-bg",
            )}
          >
            {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {confirmLabel || (variant === "danger" ? "Delete" : "Confirm")}
          </Button>
        </div>
      </motion.div>
    </Modal>
  );
}
