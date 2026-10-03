// Audits every public route in the App Router for a unique meta description
// and OpenGraph tags. Run as a headless check in CI (see
// .github/workflows/ci.yml) so a route cannot ship without them.
//
//   npm run audit:seo
//
// Why static analysis rather than scraping <head> from a running build: the
// invariant we care about is "the source of every public route declares its own
// description and OG tags". Walking `src/app` proves that in about a second,
// needs no production build or port, and fails on the contributor's first push
// instead of after a deploy.
//
// The rules live in src/lib/seo/route-audit.ts so this script and the vitest
// suite (src/lib/seo/__tests__/route-audit.test.ts) assert the same thing.

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const CWD = process.cwd()
const ENTRY = path.join(CWD, "src", "lib", "seo", "route-audit.ts")

function fail(message) {
  process.stderr.write(`\n✗ SEO route audit failed\n\n${message}\n\n`)
  process.exit(1)
}

/**
 * The audit entry point is TypeScript, so it has to be compiled before a bare
 * Node process can import it. esbuild is already a devDependency — no extra
 * tooling, and the bundle is thrown away afterwards.
 */
async function loadAuditModule() {
  let esbuild
  try {
    esbuild = await import("esbuild")
  } catch {
    fail(
      "esbuild is not installed, so the TypeScript audit module cannot be loaded.\n" +
        "Run `npm install` (or `npm ci`) first — esbuild is a declared devDependency.",
    )
  }

  if (!fs.existsSync(ENTRY)) {
    fail(`${path.relative(CWD, ENTRY)} is missing. The SEO audit cannot run without it.`)
  }

  const outfile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "seo-audit-")),
    "route-audit.mjs",
  )

  try {
    await esbuild.build({
      entryPoints: [ENTRY],
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node18",
      // Everything the module actually imports at runtime is a Node builtin or
      // a relative file, so nothing needs resolving out of node_modules.
      packages: "external",
      outfile,
      logLevel: "silent",
    })
    return await import(pathToFileURL(outfile).href)
  } catch (error) {
    fail(`Failed to compile the audit module:\n${error?.message ?? error}`)
  } finally {
    fs.rmSync(path.dirname(outfile), { recursive: true, force: true })
  }
}

const { auditSeoRoutes, sitemapPaths, SITE_URL, OG_IMAGE } = await loadAuditModule()
const { routes, violations } = auditSeoRoutes(CWD)

const width = Math.max(...routes.map((route) => route.pattern.length), 4)
process.stdout.write(`Auditing ${routes.length} public route(s) under src/app\n\n`)
for (const route of routes) {
  const kind = route.isDynamic ? "dynamic" : "static"
  process.stdout.write(`  ${route.pattern.padEnd(width)}  ${kind.padEnd(7)}  ${route.file}\n`)
}

process.stdout.write(`\nSitemap source: ${SITE_URL} (${sitemapPaths().length} indexable route(s))\n`)
process.stdout.write(`Default OG image: ${OG_IMAGE.url} (${OG_IMAGE.width}x${OG_IMAGE.height})\n`)

if (violations.length > 0) {
  fail(
    violations
      .map((violation) => `  • [${violation.route}] ${violation.message}`)
      .join("\n"),
  )
}

process.stdout.write(
  "\n✓ Every public route has a unique meta description and OpenGraph tags.\n",
)
