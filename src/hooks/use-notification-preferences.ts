"use client"

import { useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { get, put } from "@/lib/api-client"
import { logger } from "@/lib/logger"

export type NotificationFrequency = "instant" | "daily" | "off"

export interface NotificationPreferences {
  /** Per-event-type toggles */
  categories: {
    payout: boolean
    dispute: boolean
    governance: boolean
    security: boolean
    contributions: boolean
    invitations: boolean
    announcements: boolean
    circleActivity: boolean
    marketing: boolean
  }
  /** Digest / batching frequency */
  frequency: NotificationFrequency
}

const QUERY_KEY = ["notification-preferences"] as const

const DEFAULT_PREFS: NotificationPreferences = {
  categories: {
    payout: true,
    dispute: true,
    governance: true,
    security: true,
    contributions: true,
    invitations: true,
    announcements: true,
    circleActivity: false,
    marketing: false,
  },
  frequency: "instant",
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

function parsePreferences(raw: unknown): NotificationPreferences {
  if (!isRecord(raw)) return DEFAULT_PREFS

  const data = isRecord(raw.data) ? raw.data : raw
  const cats = isRecord(data.categories) ? data.categories : {}
  const freq = (data.frequency as NotificationFrequency) ?? DEFAULT_PREFS.frequency

  return {
    categories: {
      payout: (cats.payout as boolean) ?? DEFAULT_PREFS.categories.payout,
      dispute: (cats.dispute as boolean) ?? DEFAULT_PREFS.categories.dispute,
      governance: (cats.governance as boolean) ?? DEFAULT_PREFS.categories.governance,
      security: (cats.security as boolean) ?? DEFAULT_PREFS.categories.security,
      contributions: (cats.contributions as boolean) ?? DEFAULT_PREFS.categories.contributions,
      invitations: (cats.invitations as boolean) ?? DEFAULT_PREFS.categories.invitations,
      announcements: (cats.announcements as boolean) ?? DEFAULT_PREFS.categories.announcements,
      circleActivity: (cats.circleActivity as boolean) ?? DEFAULT_PREFS.categories.circleActivity,
      marketing: (cats.marketing as boolean) ?? DEFAULT_PREFS.categories.marketing,
    },
    frequency: freq,
  }
}

/** Fetch and cache per-event-type notification preferences from the server. */
export function useNotificationPreferences() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const raw = await get<unknown>("/notifications/preferences")
        return parsePreferences(raw)
      } catch (error) {
        logger.warn("[notification-prefs] Failed to load preferences, using defaults", { error })
        return DEFAULT_PREFS
      }
    },
    // Never consider preferences "stale" mid-session — only invalidate after a
    // successful save so we don't re-fetch on every tab focus.
    staleTime: Infinity,
    // Fall back to the compiled defaults so the UI renders immediately even
    // before the first network response.
    placeholderData: DEFAULT_PREFS,
  })
}

/** Persist notification preferences to the server with optimistic updates. */
export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (prefs: NotificationPreferences) =>
      put("/notifications/preferences", {
        categories: prefs.categories,
        frequency: prefs.frequency,
      }),

    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY, exact: true })
      const previous = queryClient.getQueryData<NotificationPreferences>(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, prefs)
      return { previous }
    },

    onError: (error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous)
      }
      logger.error("[notification-prefs] Failed to save preferences", { error })
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY, exact: true })
    },
  })
}

/**
 * Composite hook used by the settings page.
 *
 * Returns typed preferences, a toggle helper, a frequency setter, and a save
 * function that persists the current state server-side.
 */
export function useNotificationPreferencesForm() {
  const queryClient = useQueryClient()
  const { data: prefs = DEFAULT_PREFS, isLoading } = useNotificationPreferences()
  const saveMutation = useSaveNotificationPreferences()

  const toggleCategory = useCallback(
    (key: keyof NotificationPreferences["categories"]) => {
      queryClient.setQueryData<NotificationPreferences>(QUERY_KEY, (old = DEFAULT_PREFS) => ({
        ...old,
        categories: { ...old.categories, [key]: !old.categories[key] },
      }))
    },
    [queryClient],
  )

  const setFrequency = useCallback(
    (frequency: NotificationFrequency) => {
      queryClient.setQueryData<NotificationPreferences>(QUERY_KEY, (old = DEFAULT_PREFS) => ({
        ...old,
        frequency,
      }))
    },
    [queryClient],
  )

  const save = useCallback(async () => {
    const current = queryClient.getQueryData<NotificationPreferences>(QUERY_KEY) ?? DEFAULT_PREFS
    await saveMutation.mutateAsync(current)
  }, [queryClient, saveMutation])

  return {
    prefs,
    isLoading,
    isSaving: saveMutation.isPending,
    isSaved: saveMutation.isSuccess,
    toggleCategory,
    setFrequency,
    save,
  }
}
