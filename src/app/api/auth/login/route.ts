import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const USERS_FILE = path.join(process.cwd(), "content", "users.json");

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function createSession(userId: string): string {
  const sessionsFile = path.join(process.cwd(), "content", "sessions.json");
  if (!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile, "[]");
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessions = JSON.parse(fs.readFileSync(sessionsFile, "utf-8"));
  sessions.push({ token: sessionToken, userId, createdAt: Date.now() });
  if (sessions.length > 100) sessions.splice(0, sessions.length - 100);
  fs.writeFileSync(sessionsFile, JSON.stringify(sessions, null, 2));
  return sessionToken;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (!fs.existsSync(USERS_FILE)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = users.find((u: any) => u.username === username);

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const hash = hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const sessionToken = createSession(user.id);

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, username: user.username, role: user.role },
  });

  response.cookies.set("moistello_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
