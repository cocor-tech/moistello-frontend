import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PAGES_DIR = path.join(process.cwd(), "content/pages");
const ALLOWED_EXTENSIONS = [".md", ".html"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure pages directory exists
if (!fs.existsSync(PAGES_DIR)) {
  fs.mkdirSync(PAGES_DIR, { recursive: true });
}

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
    console.error("[api:upload] Session check failed:", e)
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Validate extension
  const originalName = file.name;
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json(
      { error: "Only .md and .html files are allowed" },
      { status: 400 }
    );
  }

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` },
      { status: 400 }
    );
  }

  // Generate slug from filename (unique — reject if exists)
  const slug = originalName.replace(ext, "");
  // Only allow slugs with letters, numbers, hyphens, underscores
  if (!/^[a-zA-Z0-9\-_]+$/.test(slug)) {
    return NextResponse.json(
      { error: "Filename must contain only letters, numbers, hyphens, or underscores" },
      { status: 400 }
    );
  }

  // Check for slug collision before writing
  const filename = `${slug}.md`;
  const filePath = path.join(PAGES_DIR, filename);

  if (fs.existsSync(filePath)) {
    const overwrite = request.nextUrl.searchParams.get("overwrite");
    if (overwrite !== "true") {
      return NextResponse.json(
        {
          error: `A page with slug "${slug}" already exists. Add ?overwrite=true to confirm overwrite.`,
          slug,
        },
        { status: 409 }
      );
    }
  }

  // Read content
  const buffer = await file.arrayBuffer();
  let content = new TextDecoder().decode(buffer);

  // For .html files: strip everything except the body content
  if (ext === ".html") {
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const descMatch = content.match(
      /<meta\s+name=["']description["']\s+content=["'](.*?)["']/i
    );
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const extractedTitle = titleMatch ? titleMatch[1].trim() : slug;
    const extractedDesc = descMatch ? descMatch[1].trim() : "";

    // Strip html/head/body wrappers, keep only body inner content
    let strippedContent = bodyMatch ? bodyMatch[1].trim() : content;
    // Remove any remaining script/style tags
    strippedContent = strippedContent.replace(
      /<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    );
    // Remove onclick, onload, etc
    strippedContent = strippedContent.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");

    // Convert to .md with frontmatter
    content = [
      "---",
      `title: ${extractedTitle}`,
      `description: ${extractedDesc}`,
      "---",
      "",
      strippedContent,
    ].join("\n");
  }

  // Write the file (checked for collision above)
  try {
    fs.writeFileSync(filePath, content, "utf-8");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    slug,
    url: `/p/${slug}`,
    message: `Published as /p/${slug}`,
  });
}
