import fs from "fs";
import path from "path";

import { logger } from "@/lib/logger";
import { API_BASE_URL } from "@/lib/constants";
import {
  isValidHandle,
  toPublicProfile,
  type PublicProfile,
} from "@/lib/profile/public-profile";

/**
 * Server-side lookup for public profiles.
 *
 * Resolution order:
 *   1. The product API, when it is configured and reachable.
 *   2. A flat-file registry under `content/profiles/`, mirroring how uploaded
 *      pages are served from `content/pages/`. This keeps the share link
 *      resolvable in local and self-hosted deployments.
 *
 * Whatever the source, the result always passes through `toPublicProfile`. The
 * projection — not the transport — is the security boundary, so a backend that
 * starts returning `email` cannot leak it through this route.
 */

const PROFILES_DIR = path.join(process.cwd(), "content", "profiles");
const API_TIMEOUT_MS = 4_000;

function readRegistryEntry(handle: string): Record<string, unknown> | null {
  // `isValidHandle` is checked by the caller, and the filename is additionally
  // basenamed, so a crafted handle can never traverse out of PROFILES_DIR.
  const filePath = path.join(PROFILES_DIR, `${path.basename(handle)}.json`);
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  } catch (error) {
    logger.error("[public-profile] Failed to read registry entry:", error);
    return null;
  }
}

async function readFromApi(handle: string): Promise<Record<string, unknown> | null> {
  if (!API_BASE_URL) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(handle)}/public`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = (await response.json()) as Record<string, unknown>;
    const data = (payload.data ?? payload) as Record<string, unknown>;
    return typeof data === "object" && data !== null ? data : null;
  } catch {
    // Expected in local dev, where no API server is running.
    return null;
  }
}

export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  if (!isValidHandle(handle)) return null;

  const source = (await readFromApi(handle)) ?? readRegistryEntry(handle);
  return toPublicProfile(source, handle);
}

/** Publish the caller's own public projection so the share link resolves. */
export function writeRegistryEntry(profile: PublicProfile): void {
  if (!isValidHandle(profile.handle)) return;
  if (!fs.existsSync(PROFILES_DIR)) {
    fs.mkdirSync(PROFILES_DIR, { recursive: true });
  }
  const filePath = path.join(PROFILES_DIR, `${path.basename(profile.handle)}.json`);
  fs.writeFileSync(filePath, JSON.stringify(profile, null, 2), "utf-8");
}
