import { Calendar, Globe, Link as LinkIcon, Sparkles, User } from "lucide-react";

import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/formatters";
import type { PublicProfile } from "@/lib/profile/public-profile";

/**
 * The one and only renderer for a public profile.
 *
 * The public route (`/u/[handle]`) and the owner's preview both mount this
 * component with a `PublicProfile` value, so there is no second code path that
 * could accidentally reveal a field the other hides.
 *
 * Styling fingerprint (per AGENTS.md): full-bleed gradient banner, oversized
 * display name, pill/tag metadata row, and a directional left border on the
 * bio block — deliberately unlike the dashboard's card-based pages.
 */
export interface PublicProfileViewProps {
  profile: PublicProfile;
  className?: string;
}

export function PublicProfileView({ profile, className }: PublicProfileViewProps) {
  const initial = profile.displayName.charAt(0).toUpperCase() || "M";
  const socialLinks = [
    { href: profile.twitterUrl, label: "Twitter" },
    { href: profile.githubUrl, label: "GitHub" },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href));

  return (
    <article
      data-testid="public-profile"
      data-handle={profile.handle}
      className={cn("mx-auto w-full max-w-2xl space-y-8", className)}
    >
      <header className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-aurora-violet/20 via-transparent to-emerald-500/10 px-6 py-10 text-center">
        <span
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-aurora-violet/20 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-16 -left-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-aurora-violet to-aurora-cyan font-heading text-3xl font-bold text-white">
          {initial}
        </div>

        <h1 className="relative mt-5 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {profile.displayName}
        </h1>
        <p className="relative mt-1 font-mono text-sm text-muted-foreground">@{profile.handle}</p>

        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-aurora-violet/30 bg-aurora-violet/10 px-3 py-1 text-xs text-aurora-violet">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            MoiScore {profile.moiScore}
          </span>

          {profile.walletAddressPreview && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-muted-foreground">
              {profile.walletAddressPreview}
            </span>
          )}

          {profile.countryCode && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" aria-hidden="true" />
              {profile.countryCode}
            </span>
          )}

          {profile.createdAt && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Joined {formatDate(profile.createdAt)}
            </span>
          )}
        </div>
      </header>

      <section className="border-l-4 border-l-aurora-violet pl-5" aria-labelledby="public-profile-bio">
        <h2
          id="public-profile-bio"
          className="flex items-center gap-2 font-heading text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          About
        </h2>
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            profile.bio ? "text-foreground" : "italic text-muted-foreground",
          )}
        >
          {profile.bio || "This member has not added a bio yet."}
        </p>
      </section>

      {socialLinks.length > 0 && (
        <section className="space-y-3" aria-labelledby="public-profile-links">
          <h2
            id="public-profile-links"
            className="flex items-center gap-2 font-heading text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Elsewhere
          </h2>
          <ul className="flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-aurora-violet transition-colors hover:border-aurora-violet/50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
