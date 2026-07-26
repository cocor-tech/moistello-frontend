"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sun,
  Moon,
  ShieldQuestion,
  Scale,
  Lock,
  Code,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslate } from "@/lib/locale/context";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [menuOpen, setMenuOpen] = useState(false);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const { t } = useTranslate();
  const isDark = theme === "dark";

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);

  // Authenticated users see public pages inside the dashboard layout
  if (isAuthenticated) {
    return <DashboardLayout>{children}</DashboardLayout>;
  }

  const navItems = [
    { label: t("nav.howItWorks"), href: "/how-it-works" },
    { label: t("nav.developers"), href: "/developers" },
    { label: t("nav.docs"), href: "/docs" },
    { label: t("nav.support"), href: "/support" },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      {/* ════════════════ FLOATING HEADER ════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 px-3 pt-3"
      >
        <div
          className={cn(
            "flex items-center justify-between h-14 px-4 rounded-2xl",
            "glass-strong backdrop-blur-2xl",
            "border border-white/[0.06] dark:border-white/[0.08]",
            "depth-3",
            "max-w-6xl mx-auto",
          )}
        >
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2 select-none shrink-0">
            <span className="gradient-text-extended font-heading font-bold text-lg tracking-tight">
              Moistello
            </span>
          </Link>

          {/* Center: Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper rounded-lg transition-all duration-300"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right: Theme Toggle + Hamburger */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                "glass-whisper text-muted-foreground",
                "transition-all duration-300 hover:text-foreground",
                "hover:shadow-[0_0_18px_rgb(var(--aurora-violet)/0.2)]",
              )}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-400" />
              )}
            </button>

            <button
              onClick={toggleMenu}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl shrink-0 md:hidden",
                "text-muted-foreground transition-all duration-300",
                "hover:text-foreground hover:glass-whisper",
              )}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ════════════════ MOBILE MENU ════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-lg"
              onClick={closeMenu}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[85vw] max-w-[340px] will-change-transform"
            >
              <div
                className={cn(
                  "flex flex-col h-full rounded-l-2xl overflow-hidden",
                  "glass-flagship backdrop-blur-xl",
                  "border-l border-white/[0.08]",
                  "shadow-[_-12px_0_60px_rgba(0,0,0,0.3)]",
                )}
              >
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-aurora-violet/40 to-transparent" />
                <div className="flex h-16 items-center justify-between px-5 shrink-0">
                  <span className="gradient-text-extended font-heading font-bold text-xl">
                    Moistello
                  </span>
                  <button
                    onClick={closeMenu}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:glass-whisper transition-all duration-300"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                  <p className="px-3 pt-2 pb-2 font-heading text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60">
                    Navigate
                  </p>
                  {[
                    { label: t("nav.howItWorks"), href: "/how-it-works", icon: <ShieldQuestion className="h-[18px] w-[18px]" /> },
                    { label: t("nav.developers"), href: "/developers", icon: <Code className="h-[18px] w-[18px]" /> },
                    { label: t("nav.docs"), href: "/docs", icon: <BookOpen className="h-[18px] w-[18px]" /> },
                    { label: t("nav.support"), href: "/support", icon: <HelpCircle className="h-[18px] w-[18px]" /> },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper transition-all duration-300"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <p className="px-3 pt-6 pb-2 font-heading text-[10px] tracking-[0.25em] uppercase text-muted-foreground/60">
                    Legal
                  </p>
                  {[
                    { label: t("nav.terms"), href: "/terms", icon: <Scale className="h-[18px] w-[18px]" /> },
                    { label: t("nav.privacy"), href: "/privacy", icon: <Lock className="h-[18px] w-[18px]" /> },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:glass-whisper transition-all duration-300"
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
                <div className="shrink-0 border-t border-white/[0.06] px-4 py-4">
                  <button
                    onClick={toggleTheme}
                    className={cn(
                      "flex items-center gap-3 w-full rounded-xl px-4 py-2.5",
                      "text-sm font-body transition-all duration-300",
                      "glass-whisper hover:glass-strong",
                      "hover:shadow-[0_0_20px_rgb(var(--aurora-violet)/0.15)]",
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full glass-strong",
                    )}>
                      {isDark ? (
                        <Sun className="h-4 w-4 text-amber-400" />
                      ) : (
                        <Moon className="h-4 w-4 text-indigo-400" />
                      )}
                    </span>
                    <span className="flex-1 text-left text-foreground">
                      {isDark ? "Light Mode" : "Dark Mode"}
                    </span>
                  </button>
                </div>
                <div className="shrink-0 border-t border-white/[0.04] px-5 py-3">
                  <p className="text-[10px] text-muted-foreground/40">
                    &copy; {new Date().getFullYear()} Moistello
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════ PAGE CONTENT ════════════════ */}
      <div className="pt-20">{children}</div>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="glass mt-20 py-8 border-t border-border">
        <div className="container-premium flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} Moistello</span>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="/about" className="hover:text-foreground transition-colors">{t("nav.about")}</Link>
            <Link href="/how-it-works" className="hover:text-foreground transition-colors">{t("nav.howItWorks")}</Link>
            <Link href="/developers" className="hover:text-foreground transition-colors">{t("nav.developers")}</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">{t("nav.docs")}</Link>
            <Link href="/faq" className="hover:text-foreground transition-colors">{t("nav.faq")}</Link>
            <Link href="/become-a-contributor" className="hover:text-foreground transition-colors">{t("common.create")}</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">{t("nav.support")}</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">{t("nav.terms")}</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">{t("nav.privacy")}</Link>
          </nav>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan animate-pulse-glow" />{t("nav.builtOnStellar")}</span>
        </div>
      </footer>
    </div>
  );
}
