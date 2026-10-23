"use client";

import Link from "next/link";
import { useTranslate } from "@/lib/locale/context";
import { cn } from "@/lib/cn";

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const { t } = useTranslate();
  const currentYear = new Date().getFullYear();

  const getLabel = (key: string, fallback: string) => {
    const val = t(key);
    return !val || val === key ? fallback : val;
  };

  const navLinks = [
    { label: getLabel("nav.about", "About"), href: "/about" },
    { label: getLabel("nav.howItWorks", "How It Works"), href: "/how-it-works" },
    { label: getLabel("nav.developers", "Developers"), href: "/developers" },
    { label: getLabel("nav.docs", "Docs"), href: "/docs" },
    { label: getLabel("nav.faq", "FAQ"), href: "/faq" },
    { label: getLabel("nav.support", "Support"), href: "/support" },
    { label: getLabel("nav.terms", "Terms"), href: "/terms" },
    { label: getLabel("nav.privacy", "Privacy"), href: "/privacy" },
  ];

  const socialLinks = [
    {
      name: "GitHub",
      href: "https://github.com/cocor-tech/moistello-frontend",
      icon: (
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      href: "https://x.com/nekwasar",
      icon: (
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Discord",
      href: "https://discord.gg/moistello",
      icon: (
        <svg
          className="h-4 w-4"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
  ];

  return (
    <footer
      role="contentinfo"
      className={cn(
        "glass mt-12 w-full border-t border-border py-8 text-sm text-muted-foreground",
        className
      )}
    >
      <div className="container-premium mx-auto px-4 lg:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          {/* Logo and Tagline */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link href="/" className="flex items-center gap-2 select-none">
              <span className="gradient-text-extended font-heading font-bold text-lg tracking-tight">
                Moistello
              </span>
            </Link>
            <p className="text-xs text-muted-foreground/80 max-w-xs text-center md:text-left">
              Decentralized rotating savings and credit circles on Stellar.
            </p>
          </div>

          {/* Navigation Links */}
          <nav
            className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm"
            aria-label="Footer navigation"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social Links */}
          <div className="flex items-center justify-center gap-4" aria-label="Social links">
            {socialLinks.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:glass-whisper"
                aria-label={s.name}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Bottom bar: Copyright & Built on Stellar */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70">
          <span>&copy; {currentYear} Moistello. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-cyan animate-pulse-glow" />
            {getLabel("nav.builtOnStellar", "Built on Stellar")}
          </span>
        </div>
      </div>
    </footer>
  );
}
