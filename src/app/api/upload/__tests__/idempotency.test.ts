// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";

import { POST as stageRoute } from "../route";
import { POST as finalizeRoute } from "../finalize/route";
import { STAGING_DIR } from "../staging";
import { PAGES_DIR } from "../publish";
import { IDEMPOTENCY_KEY_HEADER } from "@/app/upload/utils/upload-idempotency";

/**
 * In-memory stand-in for the flat-file store the upload routes use.
 *
 * Idempotency is only observable in the *records on disk* — two writes where
 * one was expected — so these tests need a filesystem they can count, not a
 * stub that records nothing. Every path stays inside the repo's real
 * directories, so the routes' own path handling is exercised unchanged.
 */
class FakeFs {
  readonly files = new Map<string, string | Buffer>();
  readonly dirs = new Set<string>();

  constructor(dirs: string[]) {
    for (const dir of dirs) this.dirs.add(dir);
  }

  /** Pre-populate a file, the way a previous test's run would have left one. */
  seed(target: string, data: string | Buffer): void {
    this.files.set(target, data);
  }

  install(): void {
    vi.spyOn(fs, "existsSync").mockImplementation(((target: unknown) => {
      const p = String(target);
      return this.files.has(p) || this.dirs.has(p);
    }) as typeof fs.existsSync);
    vi.spyOn(fs, "mkdirSync").mockImplementation(((target: unknown) => {
      this.dirs.add(String(target));
      return undefined as never;
    }) as typeof fs.mkdirSync);
    vi.spyOn(fs, "writeFileSync").mockImplementation(((target: unknown, data: unknown) => {
      this.files.set(String(target), data as string | Buffer);
    }) as typeof fs.writeFileSync);
    vi.spyOn(fs, "readFileSync").mockImplementation(((target: unknown) => {
      const data = this.files.get(String(target));
      if (data === undefined) throw new Error(`ENOENT: ${String(target)}`);
      return data;
    }) as typeof fs.readFileSync);
    vi.spyOn(fs, "readdirSync").mockImplementation(((target: unknown) => {
      const dir = String(target);
      const prefix = `${dir}${path.sep}`;
      const entries = new Set<string>();
      for (const p of this.files.keys()) {
        if (p.startsWith(prefix)) entries.add(p.slice(prefix.length));
      }
      return [...entries];
    }) as typeof fs.readdirSync);
    // Everything is fresh, so the opportunistic sweep never removes a record
    // these tests are about to replay.
    vi.spyOn(fs, "statSync").mockImplementation((() => ({
      mtimeMs: Date.now(),
    })) as unknown as typeof fs.statSync);
    vi.spyOn(fs, "rmSync").mockImplementation(((target: unknown) => {
      this.files.delete(String(target));
    }) as unknown as typeof fs.rmSync);
  }

  /** Staged records, i.e. what a duplicate upload would double. */
  stagedRecords(): string[] {
    return [...this.files.keys()].filter((p) => p.endsWith(".meta.json")).map((p) =>
      path.basename(p, ".meta.json"),
    );
  }

  pageExists(slug: string): boolean {
    return this.files.has(path.join(PAGES_DIR, `${slug}.md`));
  }
}

const SESSION_COOKIE = "moistello_session=valid-token";
const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json");
const KEY_ONE = "1111111111111111aaaaaaaaaaaa1111";
const KEY_TWO = "2222222222222222bbbbbbbbbbbb2222";

const fakeFs = new FakeFs([STAGING_DIR, PAGES_DIR, path.join(process.cwd(), "content")]);

function stageRequest(idempotencyKey: string, fileName = "about.md") {
  const form = new FormData();
  form.append("file", new File(["# About"], fileName, { type: "text/markdown" }));
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: form,
    headers: { cookie: SESSION_COOKIE, [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
  });
}

function finalizeRequest(uploadId: string) {
  return new NextRequest("http://localhost/api/upload/finalize", {
    method: "POST",
    body: JSON.stringify({ uploadId }),
    headers: { cookie: SESSION_COOKIE, "content-type": "application/json" },
  });
}

describe("upload retries are idempotent per client key (#469)", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    fakeFs.files.clear();
    fakeFs.seed(
      SESSIONS_FILE,
      JSON.stringify([{ token: "valid-token", createdAt: Date.now() }]),
    );
    fakeFs.install();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("collapses repeated retries of one upload onto a single record", async () => {
    const first = await stageRoute(stageRequest(KEY_ONE));
    const firstBody = await first.json();

    expect(first.status).toBe(200);
    expect(firstBody.replayed).toBe(false);
    expect(fakeFs.stagedRecords()).toHaveLength(1);

    // The failure the client cannot see: the bytes arrived, the response did
    // not. Every retry re-sends the file under the same key.
    const second = await stageRoute(stageRequest(KEY_ONE));
    const secondBody = await second.json();
    const third = await stageRoute(stageRequest(KEY_ONE));
    const thirdBody = await third.json();

    expect(secondBody).toMatchObject({
      replayed: true,
      alreadyPublished: false,
      uploadId: firstBody.uploadId,
    });
    expect(thirdBody.uploadId).toBe(firstBody.uploadId);
    // One upload, one record — no matter how many attempts it took.
    expect(fakeFs.stagedRecords()).toEqual([firstBody.uploadId]);
  });

  it("collapses overlapping retries of one upload onto a single record", async () => {
    // Two attempts in flight at once — a double-click, or a retry that starts
    // before the first response is read. Both pass the pre-flight lookup, so
    // the de-duplication has to hold when the bytes are written.
    const [first, second] = await Promise.all([
      stageRoute(stageRequest(KEY_ONE)),
      stageRoute(stageRequest(KEY_ONE)),
    ]);
    const bodies = await Promise.all([first.json(), second.json()]);

    expect(bodies[0].uploadId).toBe(bodies[1].uploadId);
    expect(bodies.filter((body) => body.replayed)).toHaveLength(1);
    expect(fakeFs.stagedRecords()).toEqual([bodies[0].uploadId]);
  });

  it("replays the record a key already published instead of staging it again", async () => {
    const staged = await (await stageRoute(stageRequest(KEY_ONE))).json();
    const published = await finalizeRoute(finalizeRequest(staged.uploadId));
    expect(published.status).toBe(200);
    expect(fakeFs.pageExists("about")).toBe(true);

    // A retry that arrives after the publish: the page is already live, so the
    // answer is that — not a second record and a slug conflict.
    const retry = await stageRoute(stageRequest(KEY_ONE));
    const body = await retry.json();

    expect(retry.status).toBe(200);
    expect(body).toMatchObject({
      replayed: true,
      alreadyPublished: true,
      uploadId: staged.uploadId,
      slug: "about",
      url: "/p/about",
    });
    expect(fakeFs.stagedRecords()).toHaveLength(0);
  });

  it("staging again after a publish is still one page, not a second write", async () => {
    const staged = await (await stageRoute(stageRequest(KEY_ONE))).json();
    await finalizeRoute(finalizeRequest(staged.uploadId));
    const pageAfterFirst = fakeFs.files.get(path.join(PAGES_DIR, "about.md"));

    // Retry both phases, as a client whose first attempt timed out would.
    const replay = await (await stageRoute(stageRequest(KEY_ONE))).json();
    const finalizeAgain = await finalizeRoute(finalizeRequest(replay.uploadId));
    const body = await finalizeAgain.json();

    expect(body).toMatchObject({ alreadyPublished: true, url: "/p/about" });
    expect(fakeFs.files.get(path.join(PAGES_DIR, "about.md"))).toBe(pageAfterFirst);
  });

  it("gives a genuinely new upload its own record", async () => {
    const first = await (await stageRoute(stageRequest(KEY_ONE))).json();
    const second = await (await stageRoute(stageRequest(KEY_TWO, "pricing.md"))).json();

    expect(second.replayed).toBe(false);
    expect(second.uploadId).not.toBe(first.uploadId);
    expect(fakeFs.stagedRecords().sort()).toEqual([first.uploadId, second.uploadId].sort());
  });

  it("does not replay a record that has aged out of staging", async () => {
    const first = await (await stageRoute(stageRequest(KEY_ONE))).json();
    const metaPath = path.join(STAGING_DIR, `${first.uploadId}.meta.json`);
    const meta = JSON.parse(String(fakeFs.files.get(metaPath))) as { stagedAt: number };
    fakeFs.files.set(
      metaPath,
      JSON.stringify({ ...meta, stagedAt: meta.stagedAt - 2 * 60 * 60 * 1000 }),
    );

    const again = await stageRoute(stageRequest(KEY_ONE));
    const body = await again.json();

    expect(body.replayed).toBe(false);
    expect(body.uploadId).not.toBe(first.uploadId);
  });

  it("refuses a request that cannot be de-duplicated", async () => {
    const missing = await stageRoute(stageRequest(""));
    const malformed = await stageRoute(stageRequest("../../escape"));

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(String((await missing.json()).error)).toMatch(/idempotency-key/i);
    // Nothing was buffered or written for a request with no key to dedupe on.
    expect(fakeFs.stagedRecords()).toHaveLength(0);
  });
});
