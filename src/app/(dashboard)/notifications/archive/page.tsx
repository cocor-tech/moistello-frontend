"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BellOff, ArchiveRestore, CheckSquare, Square, Info, ArrowUp, ArrowDown, DollarSign, CircleDot, UserPlus, CheckCheck, AlertTriangle, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";
import { formatRelativeTime } from "@/lib/formatters";
import { useUIStore } from "@/stores/ui-store";

const iconMap: Record<string, React.ReactNode> = {
  contribution: <ArrowUp className="h-4 w-4" />,
  contribution_received: <ArrowDown className="h-4 w-4" />,
  payout: <ArrowDown className="h-4 w-4" />,
  payout_received: <DollarSign className="h-4 w-4" />,
  circle: <CircleDot className="h-4 w-4" />,
  circle_joined: <UserPlus className="h-4 w-4" />,
  circle_completed: <CheckCheck className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  penalty: <Shield className="h-4 w-4" />,
};

const PAGE_SIZE = 20;

export default function NotificationsArchivePage() {
  const { archivedNotifications, isLoading, unarchiveNotification, bulkUnarchive } = useNotifications();
  const { addToast } = useUIStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const availableIds = new Set(archivedNotifications.map((notification) => notification.id));
    setSelectedIds((previous) => {
      const next = previous.filter((id) => availableIds.has(id));
      return next.length === previous.length ? previous : next;
    });
  }, [archivedNotifications]);

  const totalPages = Math.max(1, Math.ceil(archivedNotifications.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = archivedNotifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const allSelected =
    pageItems.length > 0 && pageItems.every((n) => selectedIds.includes(n.id));
  const someSelected = pageItems.some((n) => selectedIds.includes(n.id));
  const pageSelectionState: boolean | "mixed" = allSelected
    ? true
    : someSelected
      ? "mixed"
      : false;

  const handleToggleSelectAll = () => {
    const pageIds = new Set(pageItems.map((n) => n.id));
    setSelectedIds((previous) => {
      if (allSelected) return previous.filter((id) => !pageIds.has(id));
      return Array.from(new Set([...previous, ...pageIds]));
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkUnarchive = async () => {
    if (selectedIds.length === 0) return;
    try {
      const result = await bulkUnarchive(selectedIds);
      if (result === false) throw new Error("unarchive failed");
      addToast({ type: "success", title: "Unarchived selected notifications" });
      setSelectedIds([]);
    } catch {
      addToast({ type: "error", title: "Failed to unarchive selected" });
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      const result = await unarchiveNotification(id);
      if (result === false) throw new Error("unarchive failed");
      addToast({ type: "success", title: "Notification unarchived" });
    } catch {
      addToast({ type: "error", title: "Failed to unarchive notification" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to notifications"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">
              Archive
            </h1>
            <p className="text-sm text-muted-foreground">
              Archived notifications
            </p>
          </div>
        </div>
        {selectedIds.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArchiveRestore className="h-4 w-4" />}
            onClick={handleBulkUnarchive}
          >
            Unarchive Selected
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" />}
          title="Archive empty"
          description="No archived notifications yet."
        />
      ) : (
        <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/[0.06]">
          <div className="flex items-center gap-3 px-5 py-3 bg-white/[0.02] border-b border-white/10">
            <button
              type="button"
              role="checkbox"
              aria-checked={pageSelectionState}
              aria-label={allSelected ? "Deselect archived notifications on this page" : "Select archived notifications on this page"}
              onClick={handleToggleSelectAll}
              className="shrink-0 rounded text-muted-foreground hover:text-foreground"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4 text-aurora-violet" />
              ) : (
                <Square className="h-4 w-4" />
              )}
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              {allSelected ? "Deselect all on this page" : "Select all on this page"}
            </span>
          </div>

          {pageItems.map((n) => {
            const icon = iconMap[n.type] ?? <Info className="h-4 w-4" />;
            const selected = selectedIds.includes(n.id);
            return (
              <div
                key={n.id}
                className="flex items-center justify-between px-5 py-4 hover:glass-whisper"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    aria-label={`${selected ? "Deselect" : "Select"} ${n.title}`}
                    onClick={() => handleToggleSelect(n.id)}
                    className="shrink-0 rounded text-muted-foreground hover:text-foreground"
                  >
                    {selected ? (
                      <CheckSquare className="h-4 w-4 text-aurora-violet" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-muted-foreground">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/40 mt-1">
                      {n.sentAt
                        ? formatRelativeTime(n.sentAt)
                        : formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleUnarchive(n.id)}
                  leftIcon={<ArchiveRestore className="h-4 w-4" />}
                >
                  Unarchive
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between border-t border-white/10 pt-4" aria-label="Archived notification pages">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((page) => Math.max(1, page - 1))}
            aria-label="Previous archived notifications page"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((page) => Math.min(totalPages, page + 1))}
            aria-label="Next archived notifications page"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
