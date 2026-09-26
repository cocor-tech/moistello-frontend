import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { blockInProduction } from "@/lib/security/dev-only-route";
// Pure helper, already the single source of truth for the `/p/<slug>` shape.
import { getUploadPath } from "@/app/upload/utils/upload";
import { isSlugTaken, removePage, renderPageContent, writePage } from "../publish";
import {
  discardStagedBytes,
  hasStagedBytes,
  isValidUploadId,
  readReceipt,
  readStagedBytes,
  readStagedMeta,
  writeReceipt,
} from "../staging";

const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json");

function isAuthorized(request: NextRequest): boolean {
  const cookie = request.cookies.get("moistello_session");
  if (!cookie) return false;
  if (!fs.existsSync(SESSIONS_FILE)) return false;

  try {
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = sessions.find((s: any) => s.token === cookie.value);
    if (!session) return false;
    return Date.now() - session.createdAt < 7 * 24 * 60 * 60 * 1000;
  } catch (e) {
    logger.error("[api:upload/finalize] Session check failed:", e);
    return false;
  }
}

/**
 * Phase 2 of the two-phase upload: publish what phase 1 staged.
 *
 * Kept separate from the transfer so the client can hold "finished" until the
 * server has actually written the page, and so a finalize that times out can be
 * retried against the same staged bytes without re-uploading the file.
 *
 * The call is idempotent: a publish that already completed leaves a receipt,
 * and a repeat request for the same `uploadId` returns that receipt instead of
 * failing or double-writing.
 */
export async function POST(request: NextRequest) {
  const blocked = blockInProduction();
  if (blocked) return blocked;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uploadId: unknown;
  let overwrite = false;
  try {
    const body = (await request.json()) as { uploadId?: unknown; overwrite?: unknown };
    uploadId = body.uploadId;
    overwrite = body.overwrite === true;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidUploadId(uploadId)) {
    return NextResponse.json({ error: "A valid uploadId is required" }, { status: 400 });
  }

  // Already published (typically: a retry after a client-side timeout).
  const receipt = readReceipt(uploadId);
  if (receipt) {
    return NextResponse.json({
      published: true,
      slug: receipt.slug,
      url: receipt.url,
      alreadyPublished: true,
    });
  }

  const meta = readStagedMeta(uploadId);
  if (!meta) {
    return NextResponse.json(
      {
        error: hasStagedBytes(uploadId)
          ? "Staged upload expired. Please upload the file again."
          : "Staged upload not found. Please upload the file again.",
      },
      { status: 410 },
    );
  }

  if (isSlugTaken(meta.slug) && !overwrite) {
    return NextResponse.json(
      {
        error: `A page with slug "${meta.slug}" already exists. Retry with overwrite to confirm.`,
        slug: meta.slug,
      },
      { status: 409 },
    );
  }

  const buffer = readStagedBytes(uploadId);
  if (!buffer) {
    return NextResponse.json(
      { error: "Staged upload not found. Please upload the file again." },
      { status: 410 },
    );
  }

  const content = renderPageContent(buffer, meta.extension, meta.slug);

  try {
    writePage(meta.slug, content);
  } catch (error) {
    logger.error("[api:upload/finalize] Failed to write page:", error);
    removePage(meta.slug);
    return NextResponse.json({ error: "Failed to write file" }, { status: 500 });
  }

  // The bytes have served their purpose; only the receipt survives, so a late
  // retry still resolves instead of looking like a lost upload.
  discardStagedBytes(uploadId);
  writeReceipt(uploadId, {
    slug: meta.slug,
    url: getUploadPath(meta.slug),
    publishedAt: Date.now(),
  });

  return NextResponse.json({
    published: true,
    slug: meta.slug,
    url: getUploadPath(meta.slug),
    alreadyPublished: false,
  });
}
