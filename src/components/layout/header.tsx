"use client";

import { memo, useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Wallet,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/formatters";
import { Routes } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { useMultiWallet } from "@/hooks/use-multi-wallet";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface HeaderProps {
  onToggleMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

function HeaderComponent({ onToggleMobileMenu, isMobileMenuOpen }: HeaderProps) {
  const { isConnected, address } = useMultiWallet();
  const unreadCount = useUnreadCount();
  const [showConnectModal, setShowConnectModal] = useState(false);

  return (
    <>
      <header
        className={cn(
          "lg:hidden sticky top-3 mx-3 z-50 h-14",
          "rounded-2xl",
          "glass-strong backdrop-blur-2xl",
          "border border-white/[0.06] dark:border-white/[0.08]",
        )}
      >
        <div className="relative flex h-full items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 select-none">
              <span className="gradient-text-extended font-heading font-bold text-lg tracking-tight">
                Moistello
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LocaleSwitcher />

            <button
              type="button"
              onClick={onToggleMobileMenu}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-xl",
                "text-muted-foreground",
                "hover:text-foreground hover:glass-whisper",
                "lg:hidden",
              )}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-dashboard-menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div>
              {isConnected && address ? (
                <div
                  className={cn(
                    "flex items-center gap-2 glass-whisper px-3 py-1.5 rounded-full",
                  )}
                >
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs text-foreground tracking-tight">
                    {formatAddress(address)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-body",
                    "glass-whisper text-muted-foreground",
                    "hover:text-foreground",
                    "hidden sm:inline-flex",
                  )}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Connect</span>
                </button>
              )}
            </div>

            <div>
              <Link href={Routes.NOTIFICATIONS} className="relative inline-flex" aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}>
                <div
                  className={cn(
                    "relative inline-flex h-9 w-9 items-center justify-center rounded-full",
                    "glass-whisper text-muted-foreground",
                    "hover:text-foreground",
                  )}
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span
                      className={cn(
                        "absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full",
                        "bg-destructive text-[9px] font-bold flex items-center justify-center",
                        "text-white ring-2 ring-[rgb(var(--background))]",
                      )}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {showConnectModal && (
        <ConnectWalletModal onClose={() => setShowConnectModal(false)} />
      )}
    </>
  );
}

export const Header = memo(HeaderComponent);

function ConnectWalletModal({ onClose }: { onClose: () => void }) {
  const { isConnecting, error, setSelectorOpen } = useMultiWallet();
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  const handleConnect = () => {
    setSelectorOpen(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <button
        type="button"
        aria-label="Close connect wallet dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-sm rounded-2xl glass-premium p-6 depth-4"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-full glass-strong" aria-hidden="true">
            <Wallet className="h-6 w-6 text-aurora-violet" />
          </div>
          <button type="button" onClick={onClose} aria-label="Close connect wallet dialog" className="rounded-full p-2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <h3 id="connect-wallet-title" className="text-lg font-heading font-bold gradient-text-extended mb-1.5">
          Connect Wallet
        </h3>
        <p className="text-sm text-muted-foreground font-body mb-5">
          Connect your wallet to access Stellar features.
        </p>

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-red-400 font-body">
            {error}
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full rounded-xl font-heading"
          leftIcon={<Wallet className="h-5 w-5" />}
          isLoading={isConnecting}
          onClick={handleConnect}
        >
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground font-body">
          Need a wallet?{" "}
          <a
            href="https://stellar.org/wallets"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[rgb(var(--aurora-cyan))] hover:underline"
          >
            Find one here
          </a>
        </p>
      </div>
    </div>
  );
}
