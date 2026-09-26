import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

/**
 * Staging area for the two-phase page upload.
 *
 * Phase 1 (`POST /api/upload`) streams the bytes here and returns an
 * `uploadId`. Phase 2 (`POST /api/upload/finalize`) reads them back, runs the
 * HTML -> markdown conversion, and publishes the page. Splitting the two means
 * the client can report honest progress: bytes-in-flight is a different state
 * from "the server has published it", and a stalled finalize is retryable
 * without re-sending the file.
 *
 * The directory deliberately lives outside `public/` so nothing staged is ever
 * reachable over HTTP.
 */

export const STAGING_DIR = path.join(process.cwd(), ".upload-staging");

/** Abandoned uploads are swept after this long. */
export const STAGING_TTL_MS = 60 * 60 * 1000;

/**
 * Server-generated ids only. Validating the shape before it reaches `path.join`
 * is what stops `../../etc/passwd`-style traversal via a crafted `uploadId`.
 */
const UPLOAD_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface StagedFileMeta {
  uploadId: string;
  originalName: string;
  slug: string;
  extension: string;
  bytes: number;
  stagedAt: number;
}

export interface PublishReceipt {
  slug: string;
  url: string;
  publishedAt: number;
}

export function isValidUploadId(uploadId: unknown): uploadId is string {
  return typeof uploadId === "string" && UPLOAD_ID_PATTERN.test(uploadId);
}

function ensureStagingDir(): void {
  if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true, mode: 0o700 });
  }
}

/** Defense in depth: even with a validated id, never let `path` see a separator. */
function resolveStaged(uploadId: string, suffix: string): string {
  return path.join(STAGING_DIR, `${path.basename(uploadId)}${suffix}`);
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/** Persist the bytes plus a sidecar describing how to publish them. */
export function stageUpload(
  buffer: Buffer,
  meta: Omit<StagedFileMeta, "uploadId" | "bytes" | "stagedAt">,
): StagedFileMeta {
  ensureStagingDir();
  const uploadId = randomUUID();
  const full: StagedFileMeta = {
    ...meta,
    uploadId,
    bytes: buffer.byteLength,
    stagedAt: Date.now(),
  };

  fs.writeFileSync(resolveStaged(uploadId, ".bin"), buffer, { mode: 0o600 });
  fs.writeFileSync(
    resolveStaged(uploadId, ".meta.json"),
    JSON.stringify(full),
    { encoding: "utf-8", mode: 0o600 },
  );

  return full;
}

export function readStagedMeta(uploadId: string): StagedFileMeta | null {
  if (!isValidUploadId(uploadId)) return null;
  const meta = readJson<StagedFileMeta>(resolveStaged(uploadId, ".meta.json"));
  if (!meta) return null;
  // A staged file older than the TTL is treated as abandoned.
  if (Date.now() - meta.stagedAt > STAGING_TTL_MS) return null;
  return meta;
}

export function readStagedBytes(uploadId: string): Buffer | null {
  if (!isValidUploadId(uploadId)) return null;
  const filePath = resolveStaged(uploadId, ".bin");
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath);
  } catch {
    return null;
  }
}

/**
 * Idempotency receipt.
 *
 * Finalize can time out client-side after the server has already published.
 * Without a receipt the retry would report "not found" for a page that is
 * demonstrably live, so a successful publish leaves behind a small record that
 * a repeat finalize returns verbatim.
 */
export function readReceipt(uploadId: string): PublishReceipt | null {
  if (!isValidUploadId(uploadId)) return null;
  return readJson<PublishReceipt>(resolveStaged(uploadId, ".receipt.json"));
}

export function writeReceipt(uploadId: string, receipt: PublishReceipt): void {
  ensureStagingDir();
  fs.writeFileSync(
    resolveStaged(uploadId, ".receipt.json"),
    JSON.stringify(receipt),
    { encoding: "utf-8", mode: 0o600 },
  );
}

export function hasStagedBytes(uploadId: string): boolean {
  if (!isValidUploadId(uploadId)) return false;
  return fs.existsSync(resolveStaged(uploadId, ".bin"));
}

/** Drop the staged bytes and metadata, keeping any receipt for idempotent retries. */
export function discardStagedBytes(uploadId: string): void {
  if (!isValidUploadId(uploadId)) return;
  fs.rmSync(resolveStaged(uploadId, ".bin"), { force: true });
  fs.rmSync(resolveStaged(uploadId, ".meta.json"), { force: true });
}

/** Full cleanup, used when an upload is cancelled or its receipt expires. */
export function purgeUpload(uploadId: string): void {
  if (!isValidUploadId(uploadId)) return;
  discardStagedBytes(uploadId);
  fs.rmSync(resolveStaged(uploadId, ".receipt.json"), { force: true });
}

/** Best-effort removal of anything left over from a crashed or abandoned run. */
export function sweepStaging(now = Date.now()): number {
  if (!fs.existsSync(STAGING_DIR)) return 0;
  let removed = 0;

  for (const entry of fs.readdirSync(STAGING_DIR)) {
    const filePath = path.join(STAGING_DIR, entry);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs <= STAGING_TTL_MS) continue;
      fs.rmSync(filePath, { force: true });
      removed += 1;
    } catch {
      // A concurrent request may have removed it already.
    }
  }

  return removed;
}
