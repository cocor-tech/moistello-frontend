import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { blockInProduction } from "@/lib/security/dev-only-route";
import { isAuthorized } from "../auth";
import { logger } from "@/lib/logger";

/**
 * Minimal chunk receiver backing the client-side chunked upload
 * (`src/app/upload/utils/chunked-upload.ts`, issue #493). In-memory only —
 * fine for local dev, where the whole `/api/upload*` family is already
 * blocked in production (see middleware.ts DEV_ONLY_API_PATHS).
 */
interface InProgressUpload {
  fileName: string
  totalChunks: number
  chunks: Map<number, Buffer>
}

const uploads = new Map<string, InProgressUpload>()

export async function POST(request: NextRequest) {
  const blocked = blockInProduction();
  if (blocked) return blocked;

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const chunkIndex = Number(formData.get("chunkIndex"));
  const totalChunks = Number(formData.get("totalChunks"));
  const fileName = String(formData.get("fileName") ?? "");
  const chunk = formData.get("chunk") as File | null;
  let uploadId = formData.get("uploadId") as string | null;

  if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks) || totalChunks < 1 || !fileName || !chunk) {
    return NextResponse.json({ error: "Missing or invalid chunk fields" }, { status: 400 });
  }

  if (!uploadId || !uploads.has(uploadId)) {
    uploadId = randomUUID();
    uploads.set(uploadId, { fileName, totalChunks, chunks: new Map() });
  }

  const upload = uploads.get(uploadId)!;
  try {
    upload.chunks.set(chunkIndex, Buffer.from(await chunk.arrayBuffer()));
  } catch (error) {
    logger.error("[api:upload/chunk] Failed to buffer chunk:", error);
    return NextResponse.json({ error: "Failed to read chunk" }, { status: 500 });
  }

  const receivedChunks = Array.from(upload.chunks.keys()).sort((a, b) => a - b);
  const complete = upload.chunks.size === upload.totalChunks;

  if (!complete) {
    return NextResponse.json({ uploadId, receivedChunks, complete: false });
  }

  // All chunks in — hand the assembled bytes to the same staging path the
  // whole-file upload uses, so finalize (/api/upload/finalize) works
  // unchanged regardless of which path staged the bytes.
  const { stageUpload } = await import("../staging");
  const { validateUpload, isSlugTaken } = await import("../publish");

  const assembled = Buffer.concat(
    Array.from({ length: upload.totalChunks }, (_, i) => upload.chunks.get(i)!),
  );
  uploads.delete(uploadId);

  const validation = validateUpload(upload.fileName, assembled.byteLength);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.failure.error }, { status: validation.failure.status });
  }
  if (isSlugTaken(validation.slug)) {
    return NextResponse.json(
      { error: `A page with slug "${validation.slug}" already exists.`, slug: validation.slug },
      { status: 409 },
    );
  }

  const staged = stageUpload(assembled, {
    originalName: upload.fileName,
    slug: validation.slug,
    extension: validation.extension,
  });

  return NextResponse.json({
    uploadId: staged.uploadId,
    receivedChunks,
    complete: true,
    slug: staged.slug,
  });
}
