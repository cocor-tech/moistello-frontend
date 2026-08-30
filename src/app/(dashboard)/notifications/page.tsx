"client";

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
import { patch } from "@/lib/api-client";
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

const itemVariants = defaultItemVariants;

function NotificationItem({
  notification,
  onMarkRead,
  onClick,
  selected,
  onToggleSelect,
  largeList,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClick: (n: Notification) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  largeList: boolean;
}) {
  const { dateFnsLocale } = useDateLocale();
  const { t } = useTranslate();
  const handleClick = () => {
    if (!notification.isRead) onMarkRead(notification.id);
    onClick(notification);
  };

  const link =
    notification.data &&
    typeof notification.data === "object" &&
    "link" in notification.data
      ? String(notification.data.link)
      : null;

  const icon = iconMap[notification.type] ?? <Bell className="h-4 w-4" />;
  const grad = gradientMap[notification.type] ?? gradientMap.system;
  const icol = iconColorMap[notification.type] ?? iconColorMap.system;
  const isUnread = !notification.isRead;

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        "flex items-start gap-3 px-5 py-4 transition-colors hover:glass-whisper",
        isUnread && "glass-strong",
      )}
    >
      {/* Bulk select checkbox */}
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        aria-label={
          selected
            ? `${t("notifications.deselectNotification").replace("{title}", notification.title)}`
            : `${t("notifications.selectNotification").replace("{title}", notification.title)}`
        }
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(notification.id);
        }}
        className="mt-2 shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aurora-violet/50"
      >
        {selected ? (
          <CheckSquare className="h-4 w-4 text-aurora-violet" />
        ) : (
          <Square className="h-4 w-4" />
        )}
      </button>

      <button
        type="button"
        onClick={handleClick}
        className="flex items-start gap-4 flex-1 min-w-0 text-left"
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          {isUnread &&
            (!largeList ? (
              <motion.span
                layoutId="unread-dot"
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-aurora-cyan animate-pulse"
              />
            ) : (
              <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-aurora-cyan animate-pulse" />
            ))}
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm",
              grad,
            )}
          >
            <span className={icol}>{icon}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm truncate",
                isUnread
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {notification.title}
            </p>
          </div>
          {notification.body && (
            <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-muted-foreground/60 font-mono">
              {formatRelativeTimeLocalized(
                notification.sentAt ?? notification.createdAt,
                dateFnsLocale,
              )}
            </span>
            {link && (
              <span className="text-[11px] text-aurora-violet font-medium hover:underline">
                {t("common.viewDetails")} &rarr;
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useTranslate();
  const addToast = useUIStore((s) => s.addToast);
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const wsState = useWsState();

  const [activeTab, setActiveTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"none" | "type" | "day">("none");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let res = filterNotifications(notifications, typeFilter);
    if (activeTab === "unread") {
      res = res.filter((n) => !n.isRead);
    }
    return res;
  }, [notifications, typeFilter, activeTab]);

  const largeList = filtered.length > STAGGER_CHILDREN_LIMIT;
  const listMotion = useListMotion(largeList);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((n) => n.id));
    }
  }, [selectedIds.length, filtered]);

  const handleBulkMarkRead = useCallback(async () => {
    try {
      await Promise.all(selectedIds.map((id) => markAsRead(id)));
      setSelectedIds([]);
      addToast({ type: "success", title: "Marked selected as read" });
    } catch {
      addToast({ type: "error", title: "Failed to mark selected as read" });
    }
  }, [selectedIds, markAsRead, addToast]);

  const handleBulkArchive = useCallback(async () => {
    try {
      await Promise.all(selectedIds.map((id) => markAsRead(id)));
      setSelectedIds([]);
      addToast({ type: "success", title: "Archived selected notifications" });
    } catch {
      addToast({ type: "error", title: "Failed to archive selected" });
    }
  }, [selectedIds, markAsRead, addToast]);

  const grouped = useMemo(() => {
    if (groupBy === "type") {
      const map: Record<string, Notification[]> = {};
      for (const n of filtered) {
        const key = n.type || "system";
        if (!map[key]) map[key] = [];
        map[key].push(n);
      }
      return Object.entries(map).map(([key, items]) => ({
        key,
        label: key.replace(/_/g, " ").toUpperCase(),
        items,
      }));
    }
    if (groupBy === "day") {
      const map: Record<string, Notification[]> = {};
      for (const n of filtered) {
        const dateStr = (n.sentAt || n.createdAt).split("T")[0];
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(n);
      }
      return Object.entries(map).map(([key, items]) => ({
        key,
        label: key,
        items,
      }));
    }
    return [{ key: "all", label: "All", items: filtered }];
  }, [filtered, groupBy]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title={t("notifications.title")}
          description={t("notifications.description")}
        />
        <div className="flex items-center gap-3">
          <LiveIndicator isLive={wsState.isConnected} label={wsState.status} />
          <Link href="/notifications/archive">
            <Button variant="outline" size="sm" leftIcon={<Archive className="h-4 w-4" />}>
              {t("notifications.archive")}
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={unreadCount === 0}
          >
            {t("notifications.markAllAsRead")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
            <TabsTrigger value="unread">
              {t("notifications.unread")}
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-aurora-violet text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-aurora-violet"
          >
            <option value="all">{t("common.allTypes")}</option>
            {TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "none" | "type" | "day")}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-aurora-violet"
          >
            <option value="none">{t("notifications.noGrouping")}</option>
            <option value="type">{t("notifications.groupByType")}</option>
            <option value="day">{t("notifications.groupByDay")}</option>
          </select>
        </div>
      </div>

      {/* Bulk actions bar if selectedIds > 0 */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between bg-aurora-violet/15 border border-aurora-violet/30 px-4 py-3 rounded-xl"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-aurora-violet">
              {selectedIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleBulkMarkRead}>
              Mark Read
            </Button>
            <Button size="xs" variant="outline" onClick={handleBulkArchive}>
              Archive
            </Button>
          </div>
        </motion.div>
      )}

      {/* Select all header control */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected}
            aria-label={allSelected ? "Deselect all notifications" : "Select all notifications"}
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-foreground hover:text-aurora-violet transition-colors"
          >
            {allSelected ? <CheckSquare className="h-4 w-4 text-aurora-violet" /> : <Square className="h-4 w-4" />}
            <span>Select All</span>
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-6 w-6" />}
          title={t("notifications.emptyTitle")}
          description={t("notifications.emptyDescription")}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.key} className="space-y-3">
              {groupBy !== "none" && (
                <h3 className="font-heading text-xs font-semibold tracking-wider text-muted-foreground uppercase px-1">
                  {group.label} ({group.items.length})
                </h3>
              )}
              <motion.div
                {...listMotion}
                className="border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/[0.06] bg-white/[0.01]"
              >
                {group.items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={markAsRead}
                    onClick={(notif) => {
                      if (notif.data && typeof notif.data === "object" && "link" in notif.data) {
                        router.push(String(notif.data.link));
                      }
                    }}
                    selected={selectedIds.includes(n.id)}
                    onToggleSelect={handleToggleSelect}
                    largeList={largeList}
                  />
                ))}
              </motion.div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
