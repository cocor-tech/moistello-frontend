#!/usr/bin/env node
/**
 * Tiny zero-dependency static file server used to host the built Storybook
 * (or any static dir) for the visual regression Playwright runs.
 *
 *   node scripts/serve-storybook.mjs [port] [dir]
 *
 * Sends SPA-friendly fallbacks so /iframe.html etc. resolve when a route is
 * requested without a trailing file.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.argv[2] ?? 6100);
const root = normalize(process.argv[3] ?? "./storybook-static");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";

    let filePath = join(root, normalize(pathname));
    // Directory-ish request → try index.html (SPA fallback)
    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }
    if (!info) {
      // SPA: serve the app shell for unknown paths so client routing works.
      filePath = join(root, "index.html");
      await stat(filePath);
    }

    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Static server on http://127.0.0.1:${port} serving ${root}`);
});