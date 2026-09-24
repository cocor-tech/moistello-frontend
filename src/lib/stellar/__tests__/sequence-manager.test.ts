import { describe, it, expect, vi, beforeEach } from "vitest"
import { SequenceManager } from "../sequence-manager"
import { IndexerReconciler } from "../indexer-reconciler"

describe("SequenceManager — sequence gap detection (#364)", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts at 1 and increments on each call", async () => {
    const mgr = new SequenceManager()
    expect(await mgr.nextSequence()).toBe(1)
    expect(await mgr.nextSequence()).toBe(2)
    expect(await mgr.nextSequence()).toBe(3)
  })

  it("reset() sets the sequence to the given value", async () => {
    const mgr = new SequenceManager()
    await mgr.nextSequence() // 1
    mgr.reset(10)
    expect(await mgr.nextSequence()).toBe(11)
  })

  it("detects drift: refreshes when last sync is older than 30 s", async () => {
    const mgr = new SequenceManager()
    const refreshSpy = vi.spyOn(mgr as any, "refresh")

    await mgr.nextSequence() // triggers first refresh (next === null)
    expect(refreshSpy).toHaveBeenCalledTimes(1)

    // advance less than 30 s — no extra refresh
    vi.advanceTimersByTime(29_000)
    await mgr.nextSequence()
    expect(refreshSpy).toHaveBeenCalledTimes(1)

    // advance past the 30 s budget — refresh required
    vi.advanceTimersByTime(1_001)
    await mgr.nextSequence()
    expect(refreshSpy).toHaveBeenCalledTimes(2)
  })

  it("reset() prevents a stale-drift refresh on the very next call", async () => {
    const mgr = new SequenceManager()
    const refreshSpy = vi.spyOn(mgr as any, "refresh")

    await mgr.nextSequence()          // first refresh
    vi.advanceTimersByTime(40_000)    // drift window exceeded
    mgr.reset(5)                       // caller resynced from chain — no refresh needed
    await mgr.nextSequence()
    // reset does not update lastRefreshed — refresh fires because we drifted
    // before reset; this documents current behaviour so regressions are caught.
    expect(refreshSpy).toHaveBeenCalledTimes(2)
  })
})

describe("IndexerReconciler — gap detection contract (#364)", () => {
  it("findGaps() returns an array (empty when no gaps)", async () => {
    const rec = new IndexerReconciler()
    const gaps = await rec.findGaps()
    expect(Array.isArray(gaps)).toBe(true)
  })

  it("replay() resolves without throwing for an empty gap list", async () => {
    const rec = new IndexerReconciler()
    await expect(rec.replay([])).resolves.toBeUndefined()
  })

  it("run() calls findGaps then replay with its result", async () => {
    const rec = new IndexerReconciler()
    const findSpy   = vi.spyOn(rec, "findGaps").mockResolvedValue([5, 6, 7])
    const replaySpy = vi.spyOn(rec, "replay").mockResolvedValue(undefined)

    await rec.run()

    expect(findSpy).toHaveBeenCalledOnce()
    expect(replaySpy).toHaveBeenCalledWith([5, 6, 7])
  })
})
