"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PiggyBank, CircleDot, Users, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { Routes } from "@/lib/constants";
import { isRouteActive } from "@/lib/navigation";
import { useTranslate } from "@/lib/locale/context";

interface MobileNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function MobileNavComponent() {
  const pathname = usePathname();
  const { t } = useTranslate();

  const navItems: MobileNavItem[] = useMemo(() => [
    { label: t("nav.dashboard"), href: Routes.DASHBOARD, icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: t("nav.savings"), href: Routes.SAVINGS, icon: <PiggyBank className="h-5 w-5" /> },
    { label: t("nav.circles"), href: Routes.CIRCLES, icon: <CircleDot className="h-5 w-5" /> },
    { label: t("nav.communities"), href: Routes.COMMUNITIES, icon: <Users className="h-5 w-5" /> },
    { label: t("nav.profile"), href: Routes.PROFILE, icon: <User className="h-5 w-5" /> },
  ], [t]);

  const isActive = (href: string) => isRouteActive(pathname, href);

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md",
        "lg:hidden",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-evenly h-16 rounded-full px-1",
          "glass-flagship backdrop-blur-3xl",
          "border border-white/[0.08] dark:border-white/[0.06]",
        )}
      >
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
               aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1",
                "h-full min-w-[64px] px-4 py-2",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-6 rounded-full bg-gradient-to-r from-aurora-indigo via-aurora-violet to-aurora-cyan" />
              )}
              <span
                className={cn(
                  "shrink-0",
                  active
                    ? "text-aurora-violet"
                    : "text-muted-foreground",
                )}
              >
                {item.icon}
              </span>
              <span
                className={cn(
                  "font-body font-medium leading-none",
                  active
                    ? "gradient-text-extended text-xs"
                    : "text-[10px] text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const MobileNav = memo(MobileNavComponent);
