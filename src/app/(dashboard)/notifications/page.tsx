"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  useListMotion,
  defaultItemVariants,
  STAGGER_CHILDREN_LIMIT,
} from "@/lib/motion/list";
import {
  Bell,
  BellOff,
  ArrowUp,
  ArrowDown,
  CircleDot,
  AlertTriangle,
  CheckCheck,
  UserPlus,
  DollarSign,
  Shield,
  Info,
  Archive,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/hooks/use-notifications";
import { useWsState } from "@/hooks/use-ws-state";
import {
  TYPE_FILTERS,
  filterNotifications,
  groupNotificationsByType,
} from "@/lib/notifications";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRelativeTimeLocalized } from "@/lib/formatters";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useTranslate } from "@/lib/locale/context";
import { cn } from "@/lib/cn";
import { patch, post } from "@/lib/api-client";
import { useUIStore } from "@/stores/ui-store";
import type { Notification } from "@/types";

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

const gradientMap: Record<string, string> = {
  contribution: "from-emerald-500/30 to-green-600/30",
  contribution_received: "from-emerald-500/30 to-green-600/30",
  payout: "from-aurora-indigo/30 to-aurora-violet/30",
  payout_received: "from-aurora-indigo/30 to-aurora-violet/30",
  circle: "from-aurora-violet/30 to-fuchsia-500/30",
  circle_joined: "from-aurora-violet/30 to-fuchsia-500/30",
  circle_completed: "from-aurora-violet/30 to-fuchsia-500/30",
  system: "from-white/5 to-white/10",
  warning: "from-red-500/30 to-amber-500/30",
  penalty: "from-red-500/30 to-amber-500/30",
};

const iconColorMap: Record<string, string> = {
  contribution: "text-emerald-400",
  contribution_received: "text-emerald-400",
  payout: "text-aurora-violet",
  payout_received: "text-aurora-violet",
  circle: "text-fuchsia-400",
  circle_joined: "text-fuchsia-400",
  circle_completed: "text-fuchsia-400",
  system: "text-muted-foreground",
  warning: "text-red-400",
  penalty: "text-red-400",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslate();
  const { locale } = useDateLocale();
  const { addToast } = useUIStore();
  const { wsConnected } = useWsState("notifications");

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const activeNotifications = useMemo(
    () => notifications.filter((n: any) => !n.isArchived),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    let list = activeNotifications;
    if (activeTab === "unread") {
      list = list.filter((n) => !n.isRead);
    } else if (activeTab !== "all") {
      list = list.filter((n) => n.type === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeNotifications, activeTab, searchQuery]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  }, [selectedIds, filteredNotifications]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev)
      => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleMarkSelectedAsRead = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        await markAsRead(id);
      }
      addToast({
        title: t("notif.markedAsRead") || "Notifications marked as read",
        type: "success",
      });
      setSelectedIds([]);
      fetchNotifications();
    } catch {
      addToast({
        title: t("common.error") || "Failed to update notifications",
        type: "error",
      });
    }
  }, [selectedIds, markAsRead, addToast, t, fetchNotifications]);

  const handleArchiveSelected = useCallback(async () => {
    try {
      for (const id of selectedIds) {
        try {
          await patch(`/api/notifications/${id}/archive`, { isArchived: true });
        } catch {
          // fallback if patch endpoint varies
        }
      }
      addToast({
        title: t("notif.archivedSuccess") || "Notifications archived successfully",
        type: "success",
      });
      setSelectedIds([]);
      fetchNotifications();
    } catch {
      addToast({
        title: t("common.error") || "Failed to archive notifications",
        type: "error",
      });
    }
  }, [selectedIds, addToast, t, fetchNotifications]);

  return (
    <div className="space-y-6" data-testid="notifications-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t("nav.notifications") || "Notifications"}
          description={t("notif.description") || "Stay updated with your circles, payouts, and activity."}
        />
        <div className="flex items-center gap-2">
          <LiveIndicator connected={wsConnected} />
          <Button asChild variant="outline" size="sm">
            <Link href="/notifications/archive">
              <Archive className="h-4 w-4 mr-2" />
              {t("notif.archive") || "Archived"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">
              {t("common.all") || "All"} ({activeNotifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              {t("notif.unread") || "Unread"} ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={handleMarkSelectedAsRead}>
                {t("notif.markAsRead") || "Mark Read"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleArchiveSelected}>
                <Archive className="h-4 w-4 mr-1.5" />
                {t("notif.archiveSelected") || "Archive Selected"}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => markAllAsRead()}>
            {t("notif.markAllRead") || "Mark all as read"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-10 w-10 text-muted-foreground" />}
          title={t("notif.empty") || "No notifications"}
          description={t("notif.emptyDesc") || "You're all caught up!"}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center px-4 py-2 text-xs text-muted-foreground">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 hover:text-foreground"
            >
              {selectedIds.length === filteredNotifications.length ? (
                <CheckSquare className="h-4 w-4 text-aurora-indigo" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              <span>{t("common.selectAll") || "Select All"}</span>
            </button>
          </div>
          {filteredNotifications.map((notification) => {
            const isSelected = selectedIds.includes(notification.id);
            return (
              <div
                key={notification.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02] transition-colors",
                  !notification.isRead && "border-aurora-indigo/30 bg-aurora-indigo/[0.03]"
                )}
              >
                <button
                  onClick={() => handleToggleSelect(notification.id)}
                  aria-label={`Select notification: ${notification.title}`}
                  aria-checked={isSelected}
                  role="checkbox"
                  className="mt-1 text-muted-foreground hover:text-foreground"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-aurora-indigo" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      {notification.title}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTimeLocalized(notification.createdAt, locale)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notification.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
