import fs from "fs";
import path from "path";

import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/security/html-sanitizer";

/**
 * Validation and page rendering shared by the upload and finalize routes.
 *
 * Both phases must agree on what a legal upload is, otherwise a file could be
 * staged and then published under rules the staging phase never checked.
 */

export const PAGES_DIR = path.join(process.cwd(), "content/pages");
export const ALLOWED_EXTENSIONS = [".md", ".html"] as const;
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const SLUG_PATTERN = /^[a-zA-Z0-9\-_]+$/;

export interface ValidationFailure {
  error: string;
  status: number;
}

export type ValidationResult =
  | { ok: true; slug: string; extension: string }
  | { ok: false; failure: ValidationFailure };

export function validateUpload(fileName: string, size: number): ValidationResult {
  const extension = path.extname(fileName).toLowerCase();

  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(extension)) {
    return {
      ok: false,
      failure: { error: "Only .md and .html files are allowed", status: 400 },
    };
  }

  if (size > MAX_UPLOAD_SIZE) {
    return {
      ok: false,
      failure: {
        error: `File too large (max ${MAX_UPLOAD_SIZE / 1024 / 1024}MB)`,
        status: 400,
      },
    };
  }

  const slug = fileName.replace(extension, "");
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      failure: {
        error:
          "Filename must contain only letters, numbers, hyphens, or underscores",
        status: 400,
      },
    };
  }

  return { ok: true, slug, extension };
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
