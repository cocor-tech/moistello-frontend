import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { getPublicProfile } from "@/lib/profile/public-profile-source";
import { isValidHandle } from "@/lib/profile/public-profile";
import { APP_NAME } from "@/lib/constants";

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
  if (!profile) return { title: `Profile not found — ${APP_NAME}` };

  return {
    title: `${profile.displayName} — ${APP_NAME}`,
    description: profile.bio || `${profile.displayName}'s public savings-circle profile.`,
    openGraph: {
      title: profile.displayName,
      description: profile.bio || `Public profile on ${APP_NAME}.`,
      type: "profile",
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
