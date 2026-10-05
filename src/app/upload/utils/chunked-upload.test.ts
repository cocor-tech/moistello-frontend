import { describe, it, expect, beforeEach } from "vitest"
import { CHUNK_SIZE, splitIntoChunks, pendingChunkIndices, saveResumeState, loadResumeState, clearResumeState } from "./chunked-upload"

function makeFile(size: number): File {
  return new File([new Uint8Array(size)], "big.md")
}

describe("chunked upload (issue #493)", () => {
  beforeEach(() => sessionStorage.clear())

  it("splits at exact multiples of CHUNK_SIZE with no trailing empty chunk", () => {
    const chunks = splitIntoChunks(makeFile(CHUNK_SIZE * 3))
    expect(chunks.length).toBe(3)
    expect(chunks.every((c) => c.size === CHUNK_SIZE)).toBe(true)
  })

  it("gives a smaller last-partial chunk when size isn't a multiple", () => {
    const chunks = splitIntoChunks(makeFile(CHUNK_SIZE * 2 + 100))
    expect(chunks.length).toBe(3)
    expect(chunks[2].size).toBe(100)
  })

  it("resumes from a mid-chunk offset using only server-acked indices", () => {
    const file = makeFile(CHUNK_SIZE * 5)
    saveResumeState(file, { uploadId: "abc", receivedChunks: [0, 1, 2] })
    const state = loadResumeState(file)
    expect(pendingChunkIndices(5, state?.receivedChunks ?? [])).toEqual([3, 4])
  })

  it("treats a duplicate/already-acked chunk as a safe no-op (ack loss)", () => {
    // Server reports [0,1] received twice in a row (e.g. a resend after a
    // lost ack) — pending set is identical either time, nothing is skipped.
    expect(pendingChunkIndices(4, [0, 1])).toEqual([2, 3])
    expect(pendingChunkIndices(4, [0, 1])).toEqual([2, 3])
  })

  it("clears resume state after completion", () => {
    const file = makeFile(CHUNK_SIZE)
    saveResumeState(file, { uploadId: "abc", receivedChunks: [0] })
    clearResumeState(file)
    expect(loadResumeState(file)).toBeNull()
  })
})
