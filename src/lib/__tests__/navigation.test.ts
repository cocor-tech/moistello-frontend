import { describe, it, expect } from "vitest";
import { isRouteActive } from "../navigation";
import { Routes } from "../constants";

describe("isRouteActive", () => {
  describe("Dashboard / Root route", () => {
    it("matches exact root '/'", () => {
      expect(isRouteActive("/", Routes.DASHBOARD)).toBe(true);
      expect(isRouteActive("/", "/")).toBe(true);
    });

    it("does not match nested routes for root '/'", () => {
      expect(isRouteActive("/circles", Routes.DASHBOARD)).toBe(false);
      expect(isRouteActive("/savings", Routes.DASHBOARD)).toBe(false);
      expect(isRouteActive("/circles/123/settings", Routes.DASHBOARD)).toBe(false);
    });
  });

  describe("Nested routes matching (issue #401)", () => {
    it("highlights parent route for deeply nested routes", () => {
      expect(isRouteActive("/circles/circle-123/settings", Routes.CIRCLES)).toBe(true);
      expect(isRouteActive("/circles/circle-123/export", Routes.CIRCLES)).toBe(true);
      expect(isRouteActive("/circles/create", Routes.CIRCLES)).toBe(true);
      expect(isRouteActive("/circles/456", Routes.CIRCLES)).toBe(true);
    });

    it("highlights parent route for savings nested routes", () => {
      expect(isRouteActive("/savings/new", Routes.SAVINGS)).toBe(true);
      expect(isRouteActive("/savings/plan-1", Routes.SAVINGS)).toBe(true);
    });

    it("highlights parent route for communities nested routes", () => {
      expect(isRouteActive("/communities/comm-123", Routes.COMMUNITIES)).toBe(true);
      expect(isRouteActive("/communities/comm-123/circles", Routes.COMMUNITIES)).toBe(true);
      expect(isRouteActive("/communities/create", Routes.COMMUNITIES)).toBe(true);
    });

    it("highlights parent route for settings nested routes", () => {
      expect(isRouteActive("/settings/notifications", Routes.PROFILE_SETTINGS)).toBe(true);
      expect(isRouteActive("/settings/account", Routes.PROFILE_SETTINGS)).toBe(true);
      expect(isRouteActive("/settings/privacy", Routes.PROFILE_SETTINGS)).toBe(true);
      expect(isRouteActive("/settings/sessions", Routes.PROFILE_SETTINGS)).toBe(true);
    });
  });

  describe("Sibling prefix collision prevention (acceptance criteria)", () => {
    it("does not match sibling routes with the same prefix without slash boundary", () => {
      expect(isRouteActive("/circles-archive", Routes.CIRCLES)).toBe(false);
      expect(isRouteActive("/circles-archive/123", Routes.CIRCLES)).toBe(false);
      expect(isRouteActive("/savings-history", Routes.SAVINGS)).toBe(false);
      expect(isRouteActive("/communities-list", Routes.COMMUNITIES)).toBe(false);
    });

    it("does not match unrelated routes that share substring prefixes", () => {
      expect(isRouteActive("/circ", Routes.CIRCLES)).toBe(false);
      expect(isRouteActive("/sav", Routes.SAVINGS)).toBe(false);
    });
  });

  describe("Edge cases and normalization", () => {
    it("handles trailing slashes on pathname or href", () => {
      expect(isRouteActive("/circles/", Routes.CIRCLES)).toBe(true);
      expect(isRouteActive("/circles", "/circles/")).toBe(true);
      expect(isRouteActive("/circles/123/", Routes.CIRCLES)).toBe(true);
    });

    it("returns false for null, undefined, or empty strings", () => {
      expect(isRouteActive(null, Routes.CIRCLES)).toBe(false);
      expect(isRouteActive(undefined, Routes.CIRCLES)).toBe(false);
      expect(isRouteActive("", Routes.CIRCLES)).toBe(false);
      expect(isRouteActive("/circles", "")).toBe(false);
    });

    it("handles exact match correctly", () => {
      expect(isRouteActive("/circles", Routes.CIRCLES)).toBe(true);
      expect(isRouteActive("/governance", Routes.GOVERNANCE)).toBe(true);
      expect(isRouteActive("/referrals", Routes.REFERRALS)).toBe(true);
    });
  });
});
