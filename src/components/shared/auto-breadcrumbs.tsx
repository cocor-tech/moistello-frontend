"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

const routeLabels: Record<string, string> = {
  circles: "Circles",
  communities: "Communities",
  wallet: "Wallet",
  transactions: "Transactions",
  analytics: "Analytics",
  settings: "Settings",
  members: "Members",
  rounds: "Rounds",
  schedule: "Schedule",
  activity: "Activity",
  comments: "Comments",
  export: "Export",
  compare: "Compare",
  organizing: "Organizing",
  saved: "Saved",
  create: "Create",
  profile: "Profile",
  dashboard: "Dashboard",
  payouts: "Payouts",
  contributions: "Contributions",
  invites: "Invites",
  notifications: "Notifications",
  security: "Security",
};

const routeParents: Record<string, string> = {
  circles: "/circles",
  communities: "/communities",
  wallet: "/wallet",
  transactions: "/wallet/transactions",
  analytics: "/circles/[id]/analytics",
  settings: "/circles/[id]/settings",
  members: "/circles/[id]/members",
  rounds: "/circles/[id]/rounds",
  schedule: "/circles/[id]/schedule",
  activity: "/circles/[id]/activity",
  comments: "/circles/[id]/comments",
  export: "/circles/[id]/export",
  compare: "/circles/compare",
  organizing: "/circles/organizing",
  saved: "/circles/saved",
  create: "/circles/create",
  profile: "/profile",
  dashboard: "/",
  payouts: "/wallet/payouts",
  contributions: "/wallet/contributions",
  invites: "/circles/[id]/invites",
  notifications: "/notifications",
  security: "/security",
};

function getRouteLabel(segment: string): string {
  return routeLabels[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/", isCurrent: true }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
  ];

  let currentPath = "";
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    const isLast = i === segments.length - 1;
    const isDynamic = segment.startsWith("[") && segment.endsWith("]");
    
    if (isDynamic) {
      continue;
    }

    const label = getRouteLabel(segment);
    const parentPath = routeParents[segment];
    
    if (isLast) {
      breadcrumbs.push({ label, isCurrent: true });
    } else {
      const href = parentPath ?? currentPath;
      breadcrumbs.push({ label, href });
    }
  }

  return breadcrumbs;
}

function collapseBreadcrumbs(
  breadcrumbs: BreadcrumbItem[],
  maxVisible: number = 5
): BreadcrumbItem[] {
  if (breadcrumbs.length <= maxVisible) {
    return breadcrumbs;
  }

  const first = breadcrumbs[0];
  const last = breadcrumbs[breadcrumbs.length - 1];
  const middle = breadcrumbs.slice(1, -1);
  
  const visibleMiddle = middle.slice(-(maxVisible - 2));
  
  return [
    first,
    { label: "...", isCurrent: false },
    ...visibleMiddle,
    last,
  ];
}

export function AutoBreadcrumbs({ maxVisible = 5, className }: { maxVisible?: number; className?: string }) {
  const pathname = usePathname();
  
  const breadcrumbs = useMemo(() => {
    const built = buildBreadcrumbs(pathname);
    return collapseBreadcrumbs(built, maxVisible);
  }, [pathname, maxVisible]);

  return (
    <nav className={cn("flex items-center gap-1.5", className)} aria-label="Breadcrumb">
      <Link
        href="/"
        aria-label="Home"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors duration-300"
      >
        <Home className="h-3 w-3" aria-hidden="true" />
      </Link>
      
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        
        if (crumb.label === "...") {
          return (
            <span key={index} className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </span>
          );
        }
        
        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 truncate max-w-[140px]"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "text-xs truncate max-w-[180px]",
                  isLast
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}