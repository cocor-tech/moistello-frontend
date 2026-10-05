"use client";

import { memo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";
import dynamic from "next/dynamic";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AutoBreadcrumbs } from "@/components/shared/auto-breadcrumbs";

const CommandPalette = dynamic(
  () => import("@/components/command-palette/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false }
);

const KeyboardShortcutsOverlay = dynamic(
  () => import("@/components/shared/keyboard-shortcuts-overlay").then((m) => m.KeyboardShortcutsOverlay),
  { ssr: false }
);

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuPath, setMobileMenuPath] = useState<string | null>(null);
  const mobileMenuOpen = mobileMenuPath === pathname;
  const { shortcuts, helpOpen, closeHelp } = useKeyboardShortcuts();

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuPath((openPath) => openPath === pathname ? null : pathname);
  }, [pathname]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuPath(null);
  }, []);

  return (
    <div className="relative min-h-screen bg-[rgb(var(--background))]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-foreground"
      >
        Skip to main content
      </a>
      <div className="relative z-10">
        <Sidebar />
        <Header
          onToggleMobileMenu={toggleMobileMenu}
          isMobileMenuOpen={mobileMenuOpen}
        />
        <MobileMenu isOpen={mobileMenuOpen} onClose={closeMobileMenu} />
        <main
          id="main-content"
          tabIndex={-1}
          data-print-content
          className={cn(
            // `pb-nav-safe` replaces `pb-24`: the 4rem that clears the floating
            // nav pill plus the home-indicator inset, so the last card on the
            // page is never trapped under either.
            "pt-10 pb-nav-safe px-0 lg:pl-72 lg:pr-0 min-h-screen",
          )}
        >
          <div className="container-premium py-2.5">
            <AutoBreadcrumbs className="mb-4 lg:mb-6" maxVisible={5} />
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
      {/* `data-print-hide` is belt-and-braces: the print rules also target
          `nav`/`header`/`aside` by role and tag. Marking them explicitly
          keeps the intent legible at the call site and survives a markup
          change that drops the semantic element. */}
      <KeyboardShortcutsOverlay isOpen={helpOpen} onClose={closeHelp} shortcuts={shortcuts} />
      <CommandPalette />
    </div>
  );
}

export const MemoizedDashboardLayout = memo(DashboardLayout);
