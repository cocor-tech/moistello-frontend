import { describe, it, expect } from "vitest"

import type { Notification } from "@/types"
import {
  TYPE_GROUPS,
  TYPE_FILTERS,
  groupForType,
  filterNotifications,
  groupNotificationsByType,
} from "@/lib/notifications"

function makeNotification(overrides: Partial<Notification> & Pick<Notification, "id" | "type">): Notification {
  return {
    userId: "user-1",
    title: `Notification ${overrides.id}`,
    isRead: false,
    channel: "in_app",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

const fixtures: Notification[] = [
  makeNotification({ id: "n1", type: "contribution" }),
  makeNotification({ id: "n2", type: "contribution_received", isRead: true }),
  makeNotification({ id: "n3", type: "payout_received" }),
  makeNotification({ id: "n4", type: "circle_joined" }),
  makeNotification({ id: "n5", type: "penalty" }),
  makeNotification({ id: "n6", type: "system", isRead: true }),
  makeNotification({ id: "n7", type: "mystery_event" }),
]

const ids = (list: Notification[]) => list.map((n) => n.id)

describe("notification type grouping", () => {
  it("maps each known type to its display group", () => {
    expect(groupForType("contribution")).toBe("Contributions")
    expect(groupForType("payout")).toBe("Payouts")
    expect(groupForType("circle_completed")).toBe("Circles")
    expect(groupForType("system")).toBe("System")
    expect(groupForType("warning")).toBe("Alerts")
    expect(groupForType("penalty")).toBe("Alerts")
  })

  it("falls back to Other for unknown types", () => {
    expect(groupForType("mystery_event")).toBe("Other")
  })

  it("keeps every grouped type in TYPE_GROUPS", () => {
    for (const type of Object.keys(TYPE_GROUPS)) {
      expect(groupForType(type)).toBe(TYPE_GROUPS[type])
    }
  })

  it("lists All first in the filter options", () => {
    expect(TYPE_FILTERS[0]).toEqual({ value: "all", label: "All" })
  })
})

describe("filterNotifications", () => {
  it("returns everything when both filters are open", () => {
    expect(filterNotifications(fixtures, "all", "all")).toEqual(fixtures)
  })

  it("keeps only unread notifications when filter is unread", () => {
    const result = filterNotifications(fixtures, "unread", "all")

    expect(ids(result)).toEqual(["n1", "n3", "n4", "n5", "n7"])
    expect(result.every((n) => !n.isRead)).toBe(true)
  })

  it("matches a type filter by group name", () => {
    expect(ids(filterNotifications(fixtures, "all", "system"))).toEqual(["n6"])
  })

  it("matches a type filter by type prefix", () => {
    // "payout" is a prefix of "payout_received" even though the group is "Payouts"
    expect(ids(filterNotifications(fixtures, "all", "payout"))).toEqual(["n3"])
    expect(ids(filterNotifications(fixtures, "all", "contribution"))).toEqual(["n1", "n2"])
  })

  it("matches a warning-typed notification through the warning filter", () => {
    const alerts = [
      makeNotification({ id: "w1", type: "warning" }),
      makeNotification({ id: "s1", type: "system" }),
    ]

    expect(ids(filterNotifications(alerts, "all", "warning"))).toEqual(["w1"])
  })

  it("matches uncategorised types through the Other group", () => {
    expect(ids(filterNotifications(fixtures, "all", "other"))).toEqual(["n7"])
  })

  it("combines the unread filter with a type filter", () => {
    const result = filterNotifications(fixtures, "unread", "contribution")

    expect(ids(result)).toEqual(["n1"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(filterNotifications(fixtures, "all", "circle_missing")).toEqual([])
  })

  it("does not mutate the input array", () => {
    const copy = [...fixtures]

    filterNotifications(fixtures, "unread", "payout")

    expect(fixtures).toEqual(copy)
  })
})

describe("groupNotificationsByType", () => {
  it("returns an empty object for no notifications", () => {
    expect(groupNotificationsByType([])).toEqual({})
  })

  it("buckets notifications under their display group, preserving order", () => {
    const groups = groupNotificationsByType(fixtures)

    expect(Object.keys(groups).sort()).toEqual(
      ["Alerts", "Circles", "Contributions", "Other", "Payouts", "System"],
    )
    expect(ids(groups.Contributions)).toEqual(["n1", "n2"])
    expect(ids(groups.Payouts)).toEqual(["n3"])
    expect(ids(groups.Alerts)).toEqual(["n5"])
    expect(ids(groups.Other)).toEqual(["n7"])
  })
})
