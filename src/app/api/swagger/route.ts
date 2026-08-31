import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const customPath = process.env.SWAGGER_JSON_PATH || process.env.SWAGGER_PATH;
  const backendUrl = process.env.SWAGGER_BACKEND_URL || process.env.BACKEND_URL;

  const candidatePaths = customPath
    ? [customPath]
    : [
        path.join(process.cwd(), "docs", "api", "swagger.json"),
        path.join(process.cwd(), "public", "swagger.json"),
        "/opt/moistello/backend/docs/api/swagger.json",
      ];

  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const specContent = fs.readFileSync(filePath, "utf-8");
        const spec = JSON.parse(specContent);
        return NextResponse.json(spec, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        });
      }
    } catch {
      // Try next candidate
    }
  }

  if (backendUrl) {
    try {
      const url = backendUrl.endsWith("/swagger.json")
        ? backendUrl
        : `${backendUrl.replace(/\/$/, "")}/docs/api/swagger.json`;
      const res = await fetch(url);
      if (res.ok) {
        const spec = await res.json();
        return NextResponse.json(spec, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        });
      }
    } catch {
      // Backend proxy failed
    }
  }

  return NextResponse.json(
    { error: "Swagger API specification not found" },
    { status: 404 }
  );
}