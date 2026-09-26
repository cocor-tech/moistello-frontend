"use client";

import { useQuery } from "@tanstack/react-query";

import { get } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * Circle summaries for the command palette.
 *
 * This deliberately does *not* reuse `useCircles`: the palette is mounted in
 * the dashboard shell, so the shared hook would fire a list request on every
 * page. Here the query stays disabled until the palette opens, and the
 * projection is trimmed to the three fields the palette actually renders.
 */

export interface CircleSummary {
  id: string;
  name: string;
  status?: string;
}

const PALETTE_CIRCLE_LIMIT = 50;

/** Unwrap the Go/Rust `{Valid, String}` / `{Valid, Time}` envelope. */
function unwrap(value: unknown): unknown {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("Valid" in record) {
      if (typeof record.String === "string") return record.String || null;
      if (typeof record.Time === "string") return record.Time || null;
    }
  }
  return value;
}

function toSummary(raw: unknown): CircleSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = unwrap(record.id);
  const name = unwrap(record.name);
  if (typeof id !== "string" || !id) return null;
  return {
    id,
    name: typeof name === "string" && name ? name : "Untitled circle",
    status: typeof unwrap(record.status) === "string" ? (unwrap(record.status) as string) : undefined,
  };
}

export function useCommandCircles(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.circles.palette(),
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<CircleSummary[]> => {
      const response = await get<unknown>(
        `/circles?limit=${PALETTE_CIRCLE_LIMIT}&sort=createdAt&sortOrder=desc`,
      );

      const data = (response as { data?: unknown } | null)?.data;
      const circles =
        data && typeof data === "object" && "circles" in data
          ? (data as { circles: unknown }).circles
          : null;

      if (!Array.isArray(circles)) return [];
      return circles
        .map(toSummary)
        .filter((circle): circle is CircleSummary => circle !== null);
    },
  });
}
