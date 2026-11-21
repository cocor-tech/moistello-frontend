import { describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"

const motion = vi.hoisted(() => ({
  useReducedMotion: vi.fn(() => false),
}))

vi.mock("framer-motion", () => ({
  useReducedMotion: motion.useReducedMotion,
}))

import {
  STAGGER_CHILDREN_LIMIT,
  defaultItemVariants,
  getContainerVariants,
  useListMotion,
} from "./list"

function staggerOf(count: number): number | undefined {
  const variants = getContainerVariants(count) as {
    show: { transition: { staggerChildren: number } }
  }
  return variants.show.transition.staggerChildren
}

describe("STAGGER_CHILDREN_LIMIT", () => {
  it("is 50", () => {
    expect(STAGGER_CHILDREN_LIMIT).toBe(50)
  })
})

describe("getContainerVariants", () => {
  it("staggers children by 0.03s for a short list", () => {
    expect(staggerOf(1)).toBe(0.03)
  })

  it("staggers children by 0.03s at exactly the limit", () => {
    expect(staggerOf(STAGGER_CHILDREN_LIMIT)).toBe(0.03)
  })

  it("disables stagger once the list exceeds the limit", () => {
    expect(staggerOf(STAGGER_CHILDREN_LIMIT + 1)).toBe(0)
  })

  it("starts hidden and reveals with the show variant", () => {
    const variants = getContainerVariants(3)

    expect(variants.hidden).toEqual({})
    expect(variants.show).toHaveProperty("transition")
  })

  it("handles an empty list", () => {
    expect(staggerOf(0)).toBe(0.03)
  })
})

describe("defaultItemVariants", () => {
  it("fades in while sliding up from y = -6", () => {
    expect(defaultItemVariants.hidden).toEqual({ opacity: 0, y: -6 })
    expect(defaultItemVariants.show).toEqual({ opacity: 1, y: 0 })
  })
})

describe("useListMotion", () => {
  it("returns the reduced-motion flag and container variants", () => {
    motion.useReducedMotion.mockReturnValue(true)

    const { result } = renderHook(() => useListMotion(10))

    expect(result.current.shouldReduce).toBe(true)
    expect(result.current.variants).toEqual(getContainerVariants(10))
  })

  it("uses the no-stagger variants for a list over the limit", () => {
    motion.useReducedMotion.mockReturnValue(false)

    const { result } = renderHook(() =>
      useListMotion(STAGGER_CHILDREN_LIMIT + 5),
    )

    expect(result.current.shouldReduce).toBe(false)
    expect(result.current.variants).toEqual(
      getContainerVariants(STAGGER_CHILDREN_LIMIT + 5),
    )
  })
})
