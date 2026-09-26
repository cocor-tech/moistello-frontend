"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Recently-used command memory for the command palette.
 *
 * Only command *ids* are persisted (not labels or callbacks) so the stored
 * list stays valid when a command is renamed or its handler is re-created on
 * the next render. Reads are defensive: a corrupt or absent entry degrades to
 * "no recents" rather than breaking the palette.
 */

const STORAGE_KEY = "moistello_recent_commands";
export const MAX_RECENT_COMMANDS = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readRecentCommands(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (isRecord(entry) && typeof entry.id === "string") return entry.id;
        return null;
      })
      .filter((id): id is string => id !== null)
      .slice(0, MAX_RECENT_COMMANDS);
  } catch {
    return [];
  }
}

function writeRecentCommands(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Private-mode / quota failures must never break the palette.
  }
}

export function useRecentCommands() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Hydrate after mount so server and first client render agree.
  useEffect(() => {
    setRecentIds(readRecentCommands());
  }, []);

  const recordUse = useCallback((id: string) => {
    setRecentIds((previous) => {
      const next = [id, ...previous.filter((existing) => existing !== id)].slice(
        0,
        MAX_RECENT_COMMANDS,
      );
      writeRecentCommands(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecentIds([]);
    writeRecentCommands([]);
  }, []);

  return { recentIds, recordUse, clear };
}
