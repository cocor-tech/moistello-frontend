import fs from "fs";
import path from "path";

import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/security/html-sanitizer";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  UPLOAD_LIMITS_BY_TYPE,
  validateUploadFile,
} from "@/app/upload/utils/upload-limits";

/**
 * Validation and page rendering shared by the upload and finalize routes.
 *
 * Both phases must agree on what a legal upload is, otherwise a file could be
 * staged and then published under rules the staging phase never checked.
 */

export const PAGES_DIR = path.join(process.cwd(), "content/pages");
export const ALLOWED_EXTENSIONS = ALLOWED_UPLOAD_EXTENSIONS;
export const MAX_UPLOAD_SIZE = Math.max(
  ...Object.values(UPLOAD_LIMITS_BY_TYPE).map((l) => l.maxBytes),
);

export interface ValidationFailure {
  error: string;
  status: number;
}

export type ValidationResult =
  | { ok: true; slug: string; extension: string }
  | { ok: false; failure: ValidationFailure };

export function validateUpload(fileName: string, size: number): ValidationResult {
  const result = validateUploadFile(fileName, size);
  if (!result.ok) {
    return {
      ok: false,
      failure: { error: result.error, status: result.status },
    };
  }

  return { ok: true, slug: result.slug, extension: result.extension };
}

/** True when the target page already exists and overwrite was not requested. */
export function isSlugTaken(slug: string): boolean {
  if (!fs.existsSync(PAGES_DIR)) return false;
  return fs.existsSync(path.join(PAGES_DIR, `${slug}.md`));
}

/**
 * Render the published markdown for a staged upload.
 *
 * `.html` uploads are reduced to their body, sanitized, and wrapped in
 * frontmatter so the `/p/<slug>` renderer treats both formats identically.
 */
export function renderPageContent(
  buffer: Buffer,
  extension: string,
  slug: string,
): string {
  const raw = new TextDecoder().decode(buffer);
  if (extension !== ".html") return raw;

  const titleMatch = raw.match(/<title>(.*?)<\/title>/i);
  const descMatch = raw.match(
    /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i,
  );
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const title = titleMatch ? titleMatch[1].trim() : slug;
  const description = descMatch ? descMatch[1].trim() : "";
  const body = sanitizeHtml(bodyMatch ? bodyMatch[1].trim() : raw);

  return [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    "---",
    "",
    body,
  ].join("\n");
}

/** Write the rendered page, creating `content/pages/` on first use. */
export function writePage(slug: string, content: string): void {
  if (!fs.existsSync(PAGES_DIR)) {
    fs.mkdirSync(PAGES_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(PAGES_DIR, `${slug}.md`), content, "utf-8");
}

/** Remove a page published by this request; used to keep a failed publish clean. */
export function removePage(slug: string): void {
  try {
    fs.rmSync(path.join(PAGES_DIR, `${slug}.md`), { force: true });
  } catch (error) {
    logger.error("[api:upload] Failed to roll back page:", error);
  }
}
