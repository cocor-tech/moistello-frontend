import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { logger } from "@/lib/logger";

const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json");

/** Session-based auth (checks httpOnly cookie set by /api/auth/login), shared
 * by every /api/upload* route. */
export function isAuthorized(request: NextRequest): boolean {
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
