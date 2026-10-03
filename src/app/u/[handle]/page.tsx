import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getPublicProfile } from "@/lib/profile/public-profile-source";
import { isValidHandle } from "@/lib/profile/public-profile";
import { APP_NAME } from "@/lib/constants";
import { OG_IMAGE, TWITTER_SITE, absoluteUrl } from "@/lib/seo/site";

/**
 * Unauthenticated public profile.
 *
 * Deliberately outside the `(dashboard)` route group so it does not inherit
 * `useRequireAuth` from `client-layout.tsx` — a share link must resolve for a
 * logged-out visitor. It is also absent from `PROTECTED_PATHS` in the
 * middleware, so no token is required at the edge either.
 */

interface PageProps {
  params: { handle: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const profile = await getPublicProfile(params.handle);
  if (!profile) {
    return {
      title: `Profile not found — ${APP_NAME}`,
      description: `No public ${APP_NAME} profile exists for @${params.handle}.`,
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/u/${params.handle}`;
  // A profile is a person, not a page: say so in the preview so a shared link
  // reads as "Ada joined Moistello" rather than as generic site marketing.
  const description =
    profile.bio ||
    `${profile.displayName} saves in ${APP_NAME} savings circles on Stellar.`;

  return {
    title: `${profile.displayName} (${params.handle}) — ${APP_NAME}`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "profile",
      locale: "en_US",
      url: absoluteUrl(canonical),
      siteName: APP_NAME,
      title: `${profile.displayName} on ${APP_NAME}`,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_SITE,
      title: `${profile.displayName} on ${APP_NAME}`,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  if (!isValidHandle(params.handle)) notFound();

  const profile = await getPublicProfile(params.handle);
  if (!profile) notFound();

  return (
    <main className="relative min-h-screen bg-[rgb(var(--background))] px-4 py-16">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-aurora-violet/10 to-transparent"
        aria-hidden="true"
      />
      <div className="relative">
        <PublicProfileView profile={profile} />
      </div>
    </main>
  );
}
