import React from "react"
import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import * as skeletons from "../index"
import { CircleCardSkeleton } from "../circle-card-skeleton"
import { ContributionListSkeleton } from "../contribution-list-skeleton"
import { DashboardSkeleton, SkeletonDetailPage } from "../dashboard-skeleton"
import { MarketingSkeleton } from "../marketing-skeleton"
import { ProfileHeaderSkeleton } from "../profile-header-skeleton"
import * as primitives from "../skeleton-primitives"

const expected = {
  CircleCardSkeleton,
  ProfileHeaderSkeleton,
  ContributionListSkeleton,
  SkeletonScreen: primitives.SkeletonScreen,
  SkeletonText: primitives.SkeletonText,
  SkeletonHeading: primitives.SkeletonHeading,
  SkeletonHero: primitives.SkeletonHero,
  SkeletonStatCards: primitives.SkeletonStatCards,
  SkeletonCardGrid: primitives.SkeletonCardGrid,
  SkeletonListRows: primitives.SkeletonListRows,
  SkeletonTable: primitives.SkeletonTable,
  DashboardSkeleton,
  SkeletonDetailPage,
  MarketingSkeleton,
}

describe("skeletons barrel", () => {
  it("re-exports exactly the public skeleton components", () => {
    expect(Object.keys(skeletons).sort()).toEqual(Object.keys(expected).sort())
  })

  it.each(Object.entries(expected))("re-exports %s from its source module", (name, component) => {
    expect(typeof component).toBe("function")
    expect(skeletons[name as keyof typeof skeletons]).toBe(component)
  })

  it("renders the page-level skeletons through the barrel without readable text", () => {
    const pageSkeletons = [
      skeletons.DashboardSkeleton,
      skeletons.SkeletonDetailPage,
      skeletons.MarketingSkeleton,
    ]
    pageSkeletons.forEach((Skeleton) => {
      const { container, unmount } = render(<Skeleton />)
      expect(container.firstElementChild).toHaveAttribute("aria-busy", "true")
      expect(container.textContent).toBe("")
      unmount()
    })
  })
})
