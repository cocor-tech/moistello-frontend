import { afterEach, describe, expect, it, vi } from "vitest"
import { IndexerReconciler } from "../indexer-reconciler"

class GapfulReconciler extends IndexerReconciler {
  constructor(private readonly gaps: number[]) {
    super()
  }

  override async findGaps(): Promise<number[]> {
    return this.gaps
  }
}

describe("IndexerReconciler", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("findGaps", () => {
    it("reports no gaps by default", async () => {
      const reconciler = new IndexerReconciler()
      await expect(reconciler.findGaps()).resolves.toEqual([])
    })
  })

  describe("replay", () => {
    it("resolves without throwing for an empty gap list", async () => {
      const reconciler = new IndexerReconciler()
      await expect(reconciler.replay([])).resolves.toBeUndefined()
    })

    it("resolves without throwing for a non-empty gap list", async () => {
      const reconciler = new IndexerReconciler()
      await expect(reconciler.replay([101, 102, 103])).resolves.toBeUndefined()
    })
  })

  describe("run", () => {
    it("replays the gaps it finds", async () => {
      const reconciler = new GapfulReconciler([5, 6, 9])
      const replaySpy = vi.spyOn(reconciler, "replay")

      await reconciler.run()

      expect(replaySpy).toHaveBeenCalledTimes(1)
      expect(replaySpy).toHaveBeenCalledWith([5, 6, 9])
    })

    it("still calls replay with an empty list when there are no gaps", async () => {
      const reconciler = new IndexerReconciler()
      const replaySpy = vi.spyOn(reconciler, "replay")

      await reconciler.run()

      expect(replaySpy).toHaveBeenCalledWith([])
    })

    it("resolves once the replay finishes", async () => {
      const reconciler = new GapfulReconciler([1])
      const order: string[] = []
      vi.spyOn(reconciler, "replay").mockImplementation(async () => {
        await Promise.resolve()
        order.push("replayed")
      })

      await reconciler.run()
      order.push("run-resolved")

      expect(order).toEqual(["replayed", "run-resolved"])
    })
  })
})
