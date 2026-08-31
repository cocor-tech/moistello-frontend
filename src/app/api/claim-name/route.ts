import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session-cookies";

// In-memory rate limiting map for name claims: IP -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const MAX_CLAIMS_PER_WINDOW = 5;

// In-memory claimed names store: canonicalName -> { userId: string, claimedAt: number }
const claimedNames = new Map<string, { userId: string; claimedAt: number }>();

export function sanitizeAndCanonicalizeName(name: string): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim().toLowerCase();
  // Name rules: 3-30 characters, alphanumeric, underscores, hyphens
  if (!/^[a-z0-9_-]{3,30}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export async function getServerSession(request: NextRequest): Promise<{ user: { id: string } } | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token) return { user: { id: token } };
  }
  const cookie =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    request.cookies.get("moistello_session")?.value ||
    request.cookies.get("user_id")?.value;
  if (cookie) {
    return { user: { id: cookie } };
  }
  return null;
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_CLAIMS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

  // 1. Rate Limiting Check
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before claiming another name." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawName = body.name ?? body.displayName;
  if (typeof rawName !== "string") {
    return NextResponse.json({ error: "Missing required 'name' field" }, { status: 400 });
  }

  // 2. Input Validation + Canonicalization
  const canonicalName = sanitizeAndCanonicalizeName(rawName);
  if (!canonicalName) {
    return NextResponse.json(
      {
        error:
          "Invalid name format. Names must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.",
      },
      { status: 400 }
    );
  }

  // 3. Ownership Binding Check
  const session = await getServerSession(request);
  const userId = session?.user?.id ?? (typeof body.userId === "string" ? body.userId : null);

  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "Authentication required to claim a display name" },
      { status: 401 }
    );
  }

  const existingClaim = claimedNames.get(canonicalName);
  if (existingClaim) {
    if (existingClaim.userId !== userId) {
      return NextResponse.json(
        { error: "Name is already claimed by another account" },
        { status: 409 }
      );
    }
    // Idempotent re-claim by same owner
    return NextResponse.json({
      success: true,
      name: canonicalName,
      claimedBy: userId,
      status: "re-claimed",
    });
  }

  // Record binding
  claimedNames.set(canonicalName, { userId, claimedAt: Date.now() });

  return NextResponse.json(
    {
      success: true,
      name: canonicalName,
      claimedBy: userId,
      status: "claimed",
    },
    { status: 201 }
  );
}

// Reset helper for unit testing
export function _resetClaimNameState() {
  rateLimitMap.clear();
  claimedNames.clear();
}
