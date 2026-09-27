/** @type {import('@sentry/nextjs').withSentryConfig} */
const { withSentryConfig } = await import("@sentry/nextjs")
const withBundleAnalyzer = (await import("@next/bundle-analyzer")).default({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: false,
})

import { API_CSP } from "./src/lib/security/api-csp.mjs"
import { CSP_REPORT_PATH, CSP_REPORTING_GROUP } from "./src/lib/security/csp-report-paths.mjs"

// Derive the backend hostname from the API URL env var so the image allowlist
// stays in sync with the deployment without hardcoding domain names here.
// Falls back to localhost for local development.
function apiHostname() {
  const raw = process.env.NEXT_PUBLIC_API_URL || ""
  try {
    return new URL(raw).hostname
  } catch {
    return "localhost"
  }
}


// Static CSP served on every /api/:path* response. Canonical policy lives in
// src/lib/security/api-csp.mjs so the middleware can serve the same header and
// the validation script can assert it. API routes only ever return JSON, so the
// policy is deliberately minimal — no scripts, no frames, no subresources.
const apiCsp = API_CSP

import { createRequire } from "module"
import { fileURLToPath } from "url"
import path from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)
const webpack = require("webpack")

/**
 * The flat-file dev-auth routes are replaced with a 404 stub at
 * build time when NODE_ENV === "production". This ensures they are physically
 * absent from the production bundle — the runtime blockInProduction() check
 * alone is insufficient because the route module (and its `fs` imports) would
 * still be compiled into the bundle. Using NormalModuleReplacementPlugin
 * swaps the entire module before compilation, so no flat-file code, no `fs`
 * writes, and no credential-related logic ever ships to prod.
 *
 * The stub (src/lib/security/dev-route-stub.ts) exports a minimal 404
 * handler that is Next.js App Router-compatible and has zero node:fs imports.
 *
 * Both halves of the two-phase upload (`/api/upload` and
 * `/api/upload/finalize`) must be listed: the finalize handler reaches the
 * same `fs` staging code through `../staging`, so leaving it out would ship
 * that module to production.
 */
const DEV_ONLY_ROUTES = [
  /src[/\\]app[/\\]api[/\\]auth[/\\]login[/\\]route\.[jt]s$/,
  /src[/\\]app[/\\]api[/\\]auth[/\\]setup[/\\]route\.[jt]s$/,
  /src[/\\]app[/\\]api[/\\]upload[/\\]route\.[jt]s$/,
  /src[/\\]app[/\\]api[/\\]upload[/\\]finalize[/\\]route\.[jt]s$/,
]

const stubPath = path.resolve(__dirname, "src/lib/security/dev-route-stub.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@stellar/stellar-base"],
  },
  webpack(config, { isServer }) {
    // Only exclude on the server-side build (route handlers are server-only).
    // The client build never imports these files, but we guard isServer to be
    // explicit and avoid any accidental tree-shaking edge cases.
    if (isServer && process.env.NODE_ENV === "production") {
      DEV_ONLY_ROUTES.forEach((pattern) => {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(pattern, stubPath)
        )
      })
    }

    if (!isServer) {
      config.optimization = config.optimization || {}
      config.optimization.splitChunks = config.optimization.splitChunks || {}
      const cacheGroups = config.optimization.splitChunks.cacheGroups || {}

      cacheGroups.stellar = {
        test: /[\\/]node_modules[\\/](@stellar|stellar-sdk)[\\/]/,
        name: "stellar-vendor",
        chunks: "all",
        priority: 40,
        reuseExistingChunk: true,
      }

      cacheGroups.walletconnect = {
        test: /[\\/]node_modules[\\/]@walletconnect[\\/]/,
        name: "walletconnect-vendor",
        chunks: "all",
        priority: 40,
        reuseExistingChunk: true,
      }

      cacheGroups.ledger = {
        test: /[\\/]node_modules[\\/]@ledgerhq[\\/]/,
        name: "ledger-vendor",
        chunks: "all",
        priority: 40,
        reuseExistingChunk: true,
      }

      cacheGroups.framerMotion = {
        test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
        name: "framer-motion-vendor",
        chunks: "all",
        priority: 35,
        reuseExistingChunk: true,
      }

      config.optimization.splitChunks.cacheGroups = cacheGroups
    }

    return config
  },

  images: {
    // Restrict to the specific hosts this application actually serves images
    // from. The wildcard "**" that was here before is an SSRF vector — any
    // user-supplied URL would be fetched server-side by Next.js image
    // optimisation. Each entry below is a real, known source:
    //
    //   1. The app's own backend API (avatar / media uploads)
    //   2. Cloudflare-hosted IPFS gateway (avatarIpfsHash profile pictures)
    //   3. Public IPFS gateway — fallback for IPFS-pinned assets
    //
    // Add new entries here only when a genuine new image source is introduced.
    remotePatterns: [
      {
        // App backend — avatar uploads, media served by the API
        protocol: "https",
        hostname: apiHostname(),
      },
      {
        // Cloudflare IPFS gateway — used for avatarIpfsHash profile images
        protocol: "https",
        hostname: "cloudflare-ipfs.com",
        pathname: "/ipfs/**",
      },
      {
        // Public IPFS gateway — fallback for IPFS-pinned assets
        protocol: "https",
        hostname: "ipfs.io",
        pathname: "/ipfs/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: apiCsp,
          },
        ],
      },
      {
        source: "/(.*)",
        // Page CSP is built in src/middleware.ts because it carries a
        // per-request nonce for the root layout's inline scripts. API routes
        // receive the static CSP entry above. Static headers that do not vary
        // per request belong below.
        headers: [
          {
            // Publishing the Reporting API group that the page policy's
            // `report-to` directive names. Browsers resolve `report-to` by
            // looking the group up in this header — a group with no matching
            // Reporting-Endpoints entry is silently discarded, which would look
            // exactly like "no violations are happening". Served unconditionally
            // rather than behind CSP_REPORT_ONLY because it is inert on its own:
            // without a report-only policy nothing references the group, and
            // header presence alone causes no traffic. Static, so it belongs
            // here and not in the per-request middleware.
            key: "Reporting-Endpoints",
            value: `${CSP_REPORTING_GROUP}="${CSP_REPORT_PATH}"`,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

const configWithSentry = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
})

export default withBundleAnalyzer(configWithSentry)
