import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { blockInProduction } from "@/lib/security/dev-only-route";
import { isSlugTaken, validateUpload } from "./publish";
import { purgeUpload, stageUpload, sweepStaging } from "./staging";

const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json");

// Session-based auth (checks httpOnly cookie set by /api/auth/login)
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
    logger.error("[api:upload] Session check failed:", e);
    return false;
  }
}

/**
 * Phase 1 of the two-phase upload: accept the bytes and stage them.
 *
 * This request deliberately does **not** publish. It validates, stores the
 * payload under a server-generated id, and hands that id back so the client
 * can drive phase 2 (`POST /api/upload/finalize`) as a separate, retryable
 * step. Reserving the slug here means the collision check happens once, before
 * the user waits on the publish call.
 */
export async function POST(request: NextRequest) {
  // Local-development scaffolding — writes files via fs and authenticates
  // against a flat JSON session store.
  const blocked = blockInProduction();
  if (blocked) return blocked;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Opportunistic cleanup of uploads that were staged but never finalized.
  sweepStaging();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const validation = validateUpload(file.name, file.size);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.failure.error },
      { status: validation.failure.status },
    );
  }

  if (isSlugTaken(validation.slug)) {
    const overwrite = request.nextUrl.searchParams.get("overwrite");
    if (overwrite !== "true") {
      return NextResponse.json(
        {
          error: `A page with slug "${validation.slug}" already exists. Add ?overwrite=true to confirm overwrite.`,
          slug: validation.slug,
        },
        { status: 409 },
      );
    }
  }

  let staged;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    staged = stageUpload(buffer, {
      originalName: file.name,
      slug: validation.slug,
      extension: validation.extension,
    });
  } catch (error) {
    logger.error("[api:upload] Failed to stage upload:", error);
    return NextResponse.json({ error: "Failed to store file" }, { status: 500 });
  }

  return NextResponse.json({
    staged: true,
    uploadId: staged.uploadId,
    slug: staged.slug,
    bytes: staged.bytes,
  });
}

/** Cancel a staged upload the client decided not to publish. */
export async function DELETE(request: NextRequest) {
  const blocked = blockInProduction();
  if (blocked) return blocked;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = request.nextUrl.searchParams.get("uploadId");
  if (!uploadId) {
    return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
  }

  purgeUpload(uploadId);
  return NextResponse.json({ cancelled: true });
}
