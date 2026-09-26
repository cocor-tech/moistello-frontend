"use client";

import { memo, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsOverlay } from "@/components/shared/keyboard-shortcuts-overlay";
import { AutoBreadcrumbs } from "@/components/shared/auto-breadcrumbs";

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
          className={cn(
            "pt-10 pb-24 px-0 lg:pl-72 lg:pr-0 min-h-screen",
          )}
        >
          <div className="container-premium py-2.5">
            <AutoBreadcrumbs className="mb-4 lg:mb-6" maxVisible={5} />
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
      <KeyboardShortcutsOverlay isOpen={helpOpen} onClose={closeHelp} shortcuts={shortcuts} />
    </div>
  );
}

export const MemoizedDashboardLayout = memo(DashboardLayout);
