import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { blockInProduction } from "@/lib/security/dev-only-route";
// Pure helpers shared with the client — the `/p/<slug>` shape and the shape of
// an idempotency key, so the two can never disagree about either.
import { getUploadPath } from "@/app/upload/utils/upload";
import {
  IDEMPOTENCY_KEY_HEADER,
  isValidIdempotencyKey,
} from "@/app/upload/utils/upload-idempotency";
import { isAuthorized } from "./auth";
import { isSlugTaken, validateUpload } from "./publish";
import {
  findUploadByIdempotencyKey,
  purgeUpload,
  stageUpload,
  sweepStaging,
} from "./staging";

/**
 * Phase 1 of the two-phase upload: accept the bytes and stage them.
 *
 * This request deliberately does **not** publish. It validates, stores the
 * payload under a server-generated id, and hands that id back so the client
 * can drive phase 2 (`POST /api/upload/finalize`) as a separate, retryable
 * step. Reserving the slug here means the collision check happens once, before
 * the user waits on the publish call.
 *
 * Every request carries a client-generated idempotency key naming the upload
 * it belongs to. The key is what makes this phase safe to retry: a repeat
 * request carrying a key that was already staged replays the existing record
 * instead of creating a second one, and a key whose record already published
 * reports that the page is live. Retrying is therefore never what produces
 * duplicates — a genuinely new upload gets a new key, and that one does get
 * its own record.
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

  // Required, and validated before the body is touched: a request that cannot
  // be correlated to an upload could not be de-duplicated, and buffering a
  // file only to throw it away is exactly the duplicate we are preventing.
  const idempotencyKey = request.headers.get(IDEMPOTENCY_KEY_HEADER);
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return NextResponse.json(
      { error: `A valid ${IDEMPOTENCY_KEY_HEADER} header is required` },
      { status: 400 },
    );
  }

  // A retry of an upload this key already covers. Nothing is read from the
  // body or written to disk: the record the first attempt produced is the
  // answer, whether it is still staged or already published.
  const known = findUploadByIdempotencyKey(idempotencyKey);
  if (known) {
    return NextResponse.json({
      staged: !known.published,
      replayed: true,
      alreadyPublished: known.published,
      uploadId: known.uploadId,
      slug: known.slug,
      url: getUploadPath(known.slug),
      bytes: known.bytes,
    });
  }

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
      idempotencyKey,
    });
  } catch (error) {
    logger.error("[api:upload] Failed to stage upload:", error);
    return NextResponse.json({ error: "Failed to store file" }, { status: 500 });
  }

  return NextResponse.json({
    staged: true,
    // `stageUpload` re-checks the key itself, so a request that raced another
    // one for the same key still reports the replay rather than a fresh record.
    replayed: staged.replayed,
    uploadId: staged.meta.uploadId,
    slug: staged.meta.slug,
    bytes: staged.meta.bytes,
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
