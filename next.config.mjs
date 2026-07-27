/** @type {import('@sentry/nextjs').withSentryConfig} */
const { withSentryConfig } = await import("@sentry/nextjs")

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

/** @type {import('next').NextConfig} */
const nextConfig = {
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
        source: "/(.*)",
        // Content-Security-Policy is deliberately absent here: it carries a
        // per-request nonce for the root layout's inline scripts, so it is
        // built and attached in src/middleware.ts instead. Static headers that
        // do not vary per request belong below.
        headers: [
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
})
