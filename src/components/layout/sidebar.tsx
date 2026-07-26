"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PiggyBank,
  CircleDot,
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
  Bell,
  Settings,
  Wallet,
  Sun,
  Moon,
  BookOpen,
  HelpCircle,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Routes } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useTranslate } from "@/lib/locale/context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const { t } = useTranslate();

  const isDark = theme === "dark";

  const isActive = (href: string) => {
    if (href === Routes.DASHBOARD) return pathname === Routes.DASHBOARD;
    return pathname.startsWith(href);
  };

  const navGroups: NavGroup[] = [
    {
      title: t("nav.platform"),
      items: [
        { label: t("nav.dashboard"), href: Routes.DASHBOARD, icon: <LayoutDashboard className="h-[18px] w-[18px]" /> },
        { label: t("nav.savings"), href: Routes.SAVINGS, icon: <PiggyBank className="h-[18px] w-[18px]" /> },
        { label: t("nav.circles"), href: Routes.CIRCLES, icon: <CircleDot className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      title: t("nav.community"),
      items: [
        { label: t("nav.communities"), href: Routes.COMMUNITIES, icon: <Users className="h-[18px] w-[18px]" /> },
        { label: t("nav.contributions"), href: Routes.CONTRIBUTIONS, icon: <ArrowUpCircle className="h-[18px] w-[18px]" /> },
        { label: t("nav.payouts"), href: Routes.PAYOUTS, icon: <ArrowDownCircle className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      title: t("nav.account"),
      items: [
        { label: t("nav.notifications"), href: Routes.NOTIFICATIONS, icon: <Bell className="h-[18px] w-[18px]" />, badge: unreadCount },
        { label: t("nav.settings"), href: Routes.PROFILE_SETTINGS, icon: <Settings className="h-[18px] w-[18px]" /> },
        { label: t("nav.wallet"), href: Routes.WALLET, icon: <Wallet className="h-[18px] w-[18px]" /> },
      ],
    },
    {
      title: t("nav.docs"),
      items: [
        { label: t("nav.documentation"), href: Routes.DOCS, icon: <BookOpen className="h-[18px] w-[18px]" /> },
        { label: t("nav.faqs"), href: Routes.FAQ, icon: <HelpCircle className="h-[18px] w-[18px]" /> },
        { label: t("nav.support"), href: Routes.SUPPORT, icon: <LifeBuoy className="h-[18px] w-[18px]" /> },
      ],
    },
  ];

  const userFallback = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="hidden lg:block fixed left-3 top-20 bottom-3 w-64 z-30">
      <aside
        className={cn(
          "flex flex-col h-full rounded-3xl overflow-hidden",
          "glass-strong backdrop-blur-2xl",
          "border border-white/[0.06] dark:border-white/[0.08]",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 pt-2">
          <Link href="/" className="flex items-center gap-2 select-none">
            <span className="gradient-text font-heading font-bold text-xl tracking-tight">
              Moistello
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-xl",
              "glass-whisper text-muted-foreground",
            )}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-none">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <h3
                className={cn(
                  "px-3 pt-6 pb-2 font-heading text-[10px] tracking-[0.25em] uppercase",
                  "text-muted-foreground/70",
                )}
              >
                {group.title}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-3 rounded-xl mx-2 px-3 py-2.5",
                          "text-sm font-body",
                          active
                            ? "glass-strong bg-gradient-to-r from-aurora-violet/10 to-transparent text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:glass-whisper",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-aurora-indigo via-aurora-violet to-aurora-cyan" />
                        )}
                        <span
                          className={cn(
                            "shrink-0",
                            active ? "text-aurora-violet" : "text-muted-foreground",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span
                            className={cn(
                              "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full",
                              "bg-destructive text-[10px] font-bold text-white px-1.5 leading-none",
                            )}
                          >
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {isAuthenticated && user && (
          <div className="shrink-0 p-2">
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-2xl",
                "glass-whisper border border-white/[0.05]",
              )}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-bg text-white font-mono text-xs font-bold">
                {userFallback}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body font-medium text-foreground truncate">
                  {user.displayName ?? "User"}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono truncate">
                  Moi Score: {user.moiScore}
                </p>
              </div>
              <div className="flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-white/[0.04] px-5 py-3">
          <p className="text-[10px] text-muted-foreground/50 font-body tracking-wider">
            &copy; {new Date().getFullYear()} Moistello
          </p>
        </div>
      </aside>
    </div>
  );
}
