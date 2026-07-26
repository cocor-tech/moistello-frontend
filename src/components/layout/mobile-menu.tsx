"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  PiggyBank,
  CircleDot,
  ArrowUpCircle,
  ArrowDownCircle,
  Award,
  Bell,
  Settings,
  Wallet,
  LogOut,
  Sun,
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
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isDark = theme === "dark";
  const { t } = useTranslate();
  const menuRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  const navLinks = [
    { label: t("nav.dashboard"), href: Routes.DASHBOARD, icon: <Home className="h-4 w-4" /> },
    { label: t("nav.savings"), href: Routes.SAVINGS, icon: <PiggyBank className="h-4 w-4" /> },
    { label: t("nav.circles"), href: Routes.CIRCLES, icon: <CircleDot className="h-4 w-4" /> },
    { label: t("nav.contributions"), href: Routes.CONTRIBUTIONS, icon: <ArrowUpCircle className="h-4 w-4" /> },
    { label: t("nav.payouts"), href: Routes.PAYOUTS, icon: <ArrowDownCircle className="h-4 w-4" /> },
    { label: t("nav.communities"), href: Routes.COMMUNITIES, icon: <Award className="h-4 w-4" /> },
  ];

  const accountLinks = [
    { label: t("nav.notifications"), href: Routes.NOTIFICATIONS, icon: <Bell className="h-4 w-4" /> },
    { label: t("nav.settings"), href: Routes.PROFILE_SETTINGS, icon: <Settings className="h-4 w-4" /> },
    { label: t("nav.wallet"), href: Routes.WALLET, icon: <Wallet className="h-4 w-4" /> },
  ];

  const isActive = (href: string) => {
    if (href === Routes.DASHBOARD) return pathname === Routes.DASHBOARD;
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    onClose();
    router.push(Routes.LOGIN);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.navigation")}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 bottom-0 w-80 max-w-[85vw]",
          "glass-premium backdrop-blur-2xl",
          "border-l border-white/[0.08] dark:border-white/[0.06]",
          "flex flex-col",
        )}
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="flex h-16 items-center px-5 border-b border-white/[0.05]">
          <span className="gradient-text-extended font-heading font-bold text-lg">Moistello</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-1 mb-6">
            <p className="px-3 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground/70 mb-2">
              {t("nav.navigation")}
            </p>
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    active
                      ? "glass-strong bg-gradient-to-r from-aurora-violet/10 to-transparent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:glass-whisper",
                  )}
                >
                  {link.icon}
                  <span className="flex-1">{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground/70 mb-2">
              {t("nav.account")}
            </p>
            {accountLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    active
                      ? "glass-strong bg-gradient-to-r from-aurora-violet/10 to-transparent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:glass-whisper",
                  )}
                >
                  {link.icon}
                  <span className="flex-1">{link.label}</span>
                  {link.label === "Notifications" && unreadCount > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1.5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="space-y-1 mt-6">
            <p className="px-3 text-[10px] font-heading tracking-[0.2em] uppercase text-muted-foreground/70 mb-2">
              {t("nav.docs")}
            </p>
            {[
              { label: t("nav.documentation"), href: Routes.DOCS, icon: <BookOpen className="h-4 w-4" /> },
              { label: t("nav.faqs"), href: Routes.FAQ, icon: <HelpCircle className="h-4 w-4" /> },
              { label: t("nav.support"), href: Routes.SUPPORT, icon: <LifeBuoy className="h-4 w-4" /> },
            ].map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                    active
                      ? "glass-strong bg-gradient-to-r from-aurora-violet/10 to-transparent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:glass-whisper",
                  )}
                >
                  {link.icon}
                  <span className="flex-1">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/[0.05] px-4 py-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:glass-whisper"
          >
            <Sun className="h-4 w-4" />
            <span>{isDark ? t("common.darkMode") : t("common.lightMode")}</span>
          </button>

          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              <span>{t("common.logout")}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
