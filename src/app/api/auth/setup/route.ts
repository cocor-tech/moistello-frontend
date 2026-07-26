import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const TOKENS_FILE = path.join(process.cwd(), "content", "setup-tokens.json");
const USERS_FILE = path.join(process.cwd(), "content", "users.json");
const SESSIONS_FILE = path.join(process.cwd(), "content", "sessions.json");

function ensureFiles() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "[]");
  if (!fs.existsSync(TOKENS_FILE)) fs.writeFileSync(TOKENS_FILE, "[]");
  if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, "[]");
}

// OWASP 2023 recommendation: minimum 600,000 iterations for PBKDF2-SHA512
const PBKDF2_ITERATIONS = 600_000;

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

function createSession(userId: string): string {
  ensureFiles();
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
  sessions.push({ token: sessionToken, userId, createdAt: Date.now() });
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100);
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  return sessionToken;
}

export async function POST(request: NextRequest) {
  ensureFiles();

  const body = await request.json();
  const { token, username, password } = body;

  if (!token || !username || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
    return NextResponse.json({ error: "Username must be 3-30 chars" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const foundToken = tokens.find((t: any) => t.token === token && !t.used);

  if (!foundToken) {
    return NextResponse.json({ error: "Invalid or expired setup token" }, { status: 401 });
  }

  if (foundToken.expiresAt < Date.now()) {
    return NextResponse.json({ error: "Setup token has expired" }, { status: 410 });
  }

  // Check username
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (users.find((u: any) => u.username === username)) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const userId = crypto.randomBytes(8).toString("hex");
  const { hash, salt } = hashPassword(password);

  users.push({
    id: userId,
    username,
    passwordHash: hash,
    passwordSalt: salt,
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  foundToken.used = true;
  foundToken.usedBy = username;
  foundToken.usedAt = new Date().toISOString();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));

  const sessionToken = createSession(userId);

  const response = NextResponse.json({ success: true, username });
  response.cookies.set("moistello_session", sessionToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
