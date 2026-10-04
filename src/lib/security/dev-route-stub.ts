/**
 * Production stub for dev-only scaffolding routes.
 *
 * The webpack NormalModuleReplacementPlugin (configured in next.config.mjs)
 * replaces the three flat-file dev routes with this module when
 * NODE_ENV === "production". The stub exports only a 404 GET/POST handler so
 * the route is registered by Next.js App Router (required for a valid export)
 * but immediately rejects every request without touching the filesystem,
 * exposing credentials, or leaking route existence.
 *
 * No `fs`, no `path`, no flat-file imports — this module is safe to ship.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type NotFoundHandler = (req: NextRequest) => NextResponse;

function notFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export const GET: NotFoundHandler = notFound;
export const POST: NotFoundHandler = notFound;
export const PUT: NotFoundHandler = notFound;
export const PATCH: NotFoundHandler = notFound;
export const DELETE: NotFoundHandler = notFound;
