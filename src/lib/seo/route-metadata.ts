import type { Metadata } from "next"

import {
  AUTHOR_NAME,
  OG_IMAGE,
  SITE_NAME,
  TWITTER_CREATOR,
  TWITTER_SITE,
  absoluteUrl,
} from "./site"

/** Sitemap `changefreq` values Next.js accepts. */
export type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"

export type RouteSeo = {
  /**
   * The route as it appears in the URL — `"/about"`, `"/"` for the home page.
   * This doubles as the registry key, so it must match the segment list the
   * route audit derives from the App Router directory tree.
   */
  path: string
  /** `title` for the document head. Rendered verbatim, so include the brand. */
  title: string
  /**
   * `<meta name="description">`. Unique per route — the audit script fails the
   * build on a duplicate, because a repeated description is the exact symptom
   * this registry exists to prevent.
   */
  description: string
  /** `og:title` — a link-preview headline, so it may differ from `title`. */
  ogTitle: string
  /** `og:description`. Unique per route, and the audit enforces that too. */
  ogDescription: string
  /** Split on commas in the emitted `keywords` meta tag. */
  keywords: string[]
  /**
   * Whether search engines may index the route. Non-indexable routes still
   * ship a full description and OG block — a shared 403 link should describe
   * itself, it just should not be crawled.
   */
  indexable: boolean
  /** Defaults to `"website"`. */
  ogType?: "website" | "article" | "profile"
  /** Sitemap hints. Ignored for non-indexable routes. */
  changeFrequency?: ChangeFrequency
  priority?: number
}

/**
 * Route groups whose pages are auth-gated. They are deliberately absent from
 * `PUBLIC_ROUTES`: the `(dashboard)` layout already sets `noindex, nofollow`,
 * so re-declaring every wallet and settings screen here would add noise
 * without adding coverage.
 */
export const NON_PUBLIC_ROUTE_GROUPS = ["(dashboard)"] as const

/**
 * Every public route, with its own description and OpenGraph copy.
 *
 * Pages build their `metadata` from an entry here rather than hand-rolling
 * one, which buys three things:
 *
 *  1. **Uniqueness is enforceable.** Descriptions live in one list, so a
 *     duplicate is a data bug an audit can catch, not a copy-paste slip
 *     spread over a dozen files.
 *  2. **OG tags can never go missing.** A route cannot opt out of
 *     `openGraph`/`twitter` without deleting its whole entry, and the builder
 *     emits both from the same strings as the meta description.
 *  3. **Canonicals stay honest.** `metadataBase`, `og:url` and the canonical
 *     link all derive from `SITE_URL`, so they cannot drift apart.
 *
 * Keep the order grouped: indexable marketing/docs routes first, then the
 * auth entry points, then the utility and error routes.
 */
export const PUBLIC_ROUTES: readonly RouteSeo[] = [
  {
    path: "/",
    title: "Moistello — Stellar Savings Circles",
    description:
      "Decentralized savings circles on Stellar. Sign in with a passkey (Face ID or fingerprint) and your Stellar wallet is created automatically. Zero platform fees, no KYC, no email.",
    ogTitle: "Moistello — decentralized savings circles on Stellar",
    ogDescription:
      "Join trustless passkey savings circles with zero intermediaries. Auto-created wallet, zero fees, no KYC — built on Stellar for real financial sovereignty.",
    keywords: [
      "moistello",
      "stellar",
      "savings circles",
      "defi",
      "decentralized finance",
      "passkey",
      "webauthn",
      "USDC",
      "XLM",
      "soroban",
    ],
    indexable: true,
    priority: 1,
  },
  {
    path: "/about",
    title: "About — Moistello",
    description:
      "Moistello brings traditional savings circles — esusu, tontines, chit funds, tandas — onto the Stellar blockchain. Our mission, why we chose Stellar, and how the platform is open source.",
    ogTitle: "About Moistello — financial inclusion on Stellar",
    ogDescription:
      "How Moistello wraps centuries-old rotating savings circles in Soroban smart contracts, so 1.3 billion unbanked adults can build portable on-chain credit.",
    keywords: [
      "moistello",
      "about",
      "financial inclusion",
      "unbanked",
      "esusu",
      "tontine",
      "chit fund",
      "stellar",
      "soroban",
      "open source",
    ],
    indexable: true,
  },
  {
    path: "/how-it-works",
    title: "How It Works — Moistello",
    description:
      "A step-by-step walkthrough of a Moistello savings circle: passkey sign-in, creating or joining a circle, contributing USDC each cycle, receiving your payout, and building your MoiScore.",
    ogTitle: "How Moistello savings circles work, step by step",
    ogDescription:
      "Five steps from passkey sign-in to your first payout. See how random, fixed-order, auction and vote-based payout rules are enforced on Stellar.",
    keywords: [
      "moistello",
      "how it works",
      "savings circles",
      "passkey",
      "USDC",
      "payout",
      "moiscore",
      "stellar",
      "rosca",
    ],
    indexable: true,
  },
  {
    path: "/faq",
    title: "FAQ — Moistello",
    description:
      "Answers about Moistello savings circles: what a ROSCA is, how passkey sign-in provisions your Stellar wallet, penalties for missed contributions, and how MoiScore is scored.",
    ogTitle: "Moistello FAQ — circles, wallets and fees",
    ogDescription:
      "What is a ROSCA? How do late-payment penalties work? What does your MoiScore measure? Direct answers on circles, passkey wallets, USDC and zero platform fees.",
    keywords: [
      "moistello",
      "faq",
      "questions",
      "rosca",
      "esusu",
      "passkey",
      "webauthn",
      "USDC",
      "XLM",
      "moiscore",
      "smart contracts",
    ],
    indexable: true,
  },
  {
    path: "/docs/api",
    title: "API Reference — Moistello",
    description:
      "Interactive reference for the Moistello REST API. Every endpoint, request body and response shape for passkey auth, wallets, circles, contributions and reputation, served as live Swagger docs.",
    ogTitle: "Moistello API reference — live Swagger docs",
    ogDescription:
      "Browse every Moistello REST endpoint with schemas and examples: passkey auth, auto-provisioned wallets, circles, contributions and reputation.",
    keywords: [
      "moistello",
      "api",
      "api reference",
      "rest",
      "swagger",
      "openapi",
      "endpoints",
      "developers",
      "stellar",
    ],
    indexable: true,
  },
  {
    path: "/developers",
    title: "Developers — Moistello",
    description:
      "Build on Moistello: a full REST API reference, WebAuthn passkey authentication, auto-provisioned Stellar wallets and seven Soroban smart contracts, all Apache 2.0 licensed.",
    ogTitle: "Developers — build on Moistello's Stellar platform",
    ogDescription:
      "API docs, the passkey auth flow and a smart-contract reference for building on Moistello. Zero platform fees, no KYC, Apache 2.0 throughout.",
    keywords: [
      "moistello",
      "developers",
      "api",
      "rest",
      "typescript",
      "react",
      "stellar",
      "soroban",
      "smart contracts",
      "webauthn",
      "open source",
    ],
    indexable: true,
  },
  {
    path: "/docs",
    title: "Documentation — Moistello",
    description:
      "Moistello documentation covering getting started, savings circles, reputation scoring, wallet setup, contract architecture and platform security — for first-time savers and builders alike.",
    ogTitle: "Moistello documentation",
    ogDescription:
      "Guides for every Moistello workflow: passkey setup, creating circles, reputation scoring, Soroban contracts and security.",
    keywords: [
      "moistello",
      "documentation",
      "docs",
      "guides",
      "stellar",
      "savings circles",
      "wallet setup",
      "moiscore",
      "security",
      "soroban",
    ],
    indexable: true,
  },
  {
    path: "/become-a-contributor",
    title: "Become a Contributor — Moistello",
    description:
      "Contribute to Moistello, an open-source, zero-fee, KYC-free savings platform on Stellar. Developers, designers, technical writers and community builders are all welcome.",
    ogTitle: "Become a contributor — join Moistello's mission",
    ogDescription:
      "Help build passkey-based financial coordination for the next billion. Apply to contribute as a developer, designer, writer or community organiser.",
    keywords: [
      "moistello",
      "contribute",
      "open source",
      "developer",
      "designer",
      "community",
      "stellar",
      "soroban",
      "financial inclusion",
    ],
    indexable: true,
  },
  {
    path: "/status",
    title: "System Status — Moistello",
    description:
      "Live uptime and response times for the Moistello web app, public API, database and passkey authentication services on the Stellar network.",
    ogTitle: "Moistello system status — live uptime",
    ogDescription:
      "Check current availability and response times for the Moistello web app, API, database and WebAuthn services.",
    keywords: [
      "moistello",
      "status",
      "uptime",
      "availability",
      "incident",
      "monitoring",
      "api",
      "stellar",
    ],
    indexable: true,
    changeFrequency: "hourly",
  },
  {
    path: "/support",
    title: "Support — Moistello",
    description:
      "Get help with Moistello: passkey sign-in, your auto-provisioned Stellar wallet, USDC contributions and payouts, and your MoiScore reputation. Open a ticket or look one up by ID.",
    ogTitle: "Moistello support — get help",
    ogDescription:
      "Troubleshooting for passkeys, wallets, contributions and reputation, plus a direct route to the Moistello support team.",
    keywords: [
      "moistello",
      "support",
      "help",
      "contact",
      "ticket",
      "passkey",
      "wallet",
      "USDC",
      "moiscore",
    ],
    indexable: true,
  },
  {
    path: "/login",
    title: "Sign In — Moistello",
    description:
      "Sign in to Moistello with your passkey — Face ID, fingerprint or device PIN. No email address, no password, no seed phrase, and no separate wallet to back up.",
    ogTitle: "Sign in to Moistello with a passkey",
    ogDescription:
      "One tap with Face ID or fingerprint. No email, no password, no seed phrase — your Stellar wallet unlocks instantly.",
    keywords: [
      "moistello",
      "sign in",
      "login",
      "passkey",
      "webauthn",
      "face id",
      "fingerprint",
      "stellar wallet",
    ],
    indexable: true,
  },
  {
    path: "/register",
    title: "Create an Account — Moistello",
    description:
      "Create a Moistello account in under a minute using a passkey. No email address, no password and no KYC — a Stellar wallet is provisioned the moment you register.",
    ogTitle: "Create your Moistello account with a passkey",
    ogDescription:
      "Register in under a minute. No email, no password, no KYC, and your Stellar wallet is created automatically.",
    keywords: [
      "moistello",
      "register",
      "sign up",
      "create account",
      "passkey",
      "webauthn",
      "no kyc",
      "stellar wallet",
    ],
    indexable: true,
  },
  {
    path: "/privacy",
    title: "Privacy Policy — Moistello",
    description:
      "How Moistello handles your data: passkey credentials, your Stellar wallet address, public on-chain activity and anonymous analytics. No email address or KYC documents are collected.",
    ogTitle: "Privacy policy — Moistello",
    ogDescription:
      "What we store, what we never store, and how to exercise your data rights. Passkey-only, no email address, no KYC documents.",
    keywords: [
      "moistello",
      "privacy",
      "policy",
      "data protection",
      "gdpr",
      "passkey",
      "webauthn",
      "on-chain data",
      "analytics",
    ],
    indexable: true,
  },
  {
    path: "/terms",
    title: "Terms of Service — Moistello",
    description:
      "The legal terms covering Moistello: authentication with a passkey, automatic Stellar wallet creation, experimental smart contracts, limitations of liability and your responsibilities as a user.",
    ogTitle: "Terms of service — Moistello",
    ogDescription:
      "What you agree to when using Moistello: smart-contract risk, wallet security, eligibility and the limits of our liability.",
    keywords: [
      "moistello",
      "terms",
      "terms of service",
      "legal",
      "agreement",
      "liability",
      "smart contract risk",
      "stellar",
      "rosca",
    ],
    indexable: true,
  },

  // ── Non-indexable, but still described ───────────────────────────────────
  // These are reachable with no session, so a pasted link must not fall back
  // to the site-wide marketing description. They ship a full OG block and are
  // marked `noindex, nofollow` so they never compete with the real pages.
  {
    path: "/passkey-setup",
    title: "Set Up a Passkey — Moistello",
    description:
      "Add a passkey to your Moistello account so future sign-ins use Face ID, fingerprint or your device PIN instead of a browser prompt.",
    ogTitle: "Set up a passkey — Moistello",
    ogDescription:
      "Register Face ID, a fingerprint or your device PIN on your account for faster, phishing-resistant sign-ins.",
    keywords: ["moistello", "passkey", "webauthn", "setup", "face id", "fingerprint", "account security"],
    indexable: false,
  },
  {
    path: "/access-denied",
    title: "Access Denied (403) — Moistello",
    description:
      "Your Moistello account does not have permission to open this resource. If that seems wrong, the support team can verify your access.",
    ogTitle: "Access denied (403) — Moistello",
    ogDescription:
      "This account is not permitted to open the requested resource. Contact Moistello support if you believe this is a mistake.",
    keywords: ["moistello", "403", "access denied", "forbidden", "permission", "support"],
    indexable: false,
  },
  {
    path: "/auth-required",
    title: "Sign In Required (401) — Moistello",
    description:
      "Your Moistello session has expired, or you are signed out. Sign in with your passkey to pick up exactly where you left off.",
    ogTitle: "Sign in required (401) — Moistello",
    ogDescription: "Your session needs a passkey again. Sign in to pick up exactly where you left off.",
    keywords: ["moistello", "401", "unauthorized", "session expired", "sign in", "passkey"],
    indexable: false,
  },
  {
    path: "/bad-request",
    title: "Bad Request (400) — Moistello",
    description:
      "Moistello could not read one or more values in that request. Go back, check what you entered and submit again — nothing was changed.",
    ogTitle: "Bad request (400) — Moistello",
    ogDescription: "Some request values were invalid. Return to the previous screen and submit again.",
    keywords: ["moistello", "400", "bad request", "validation", "invalid input"],
    indexable: false,
  },
  {
    path: "/internal-error",
    title: "Something Went Wrong (500) — Moistello",
    description:
      "Moistello hit an unexpected server error and the problem has been logged. Try again, or send the request ID to support so we can trace it.",
    ogTitle: "Something went wrong (500) — Moistello",
    ogDescription:
      "An unexpected error occurred on our side. Retry the request, or send us the request ID and we will trace it.",
    keywords: ["moistello", "500", "internal error", "server error", "incident", "support"],
    indexable: false,
  },
  {
    path: "/service-unavailable",
    title: "Service Unavailable (503) — Moistello",
    description:
      "Moistello is temporarily unavailable while we finish maintenance or recover from an incident. Your funds are untouched on-chain — please try again shortly.",
    ogTitle: "Service unavailable (503) — Moistello",
    ogDescription:
      "We are down for maintenance. Nothing on-chain has changed — please try again shortly.",
    keywords: ["moistello", "503", "service unavailable", "maintenance", "downtime", "incident"],
    indexable: false,
  },
  {
    path: "/offline",
    title: "You Are Offline — Moistello",
    description:
      "This device has no network connection, so Moistello cannot reach the Stellar network right now. Reconnect and retry — anything already cached stays available.",
    ogTitle: "You are offline — Moistello",
    ogDescription: "No connection right now. Reconnect to reach the Stellar network and retry.",
    keywords: ["moistello", "offline", "no connection", "network error", "pwa"],
    indexable: false,
  },
  {
    path: "/404",
    title: "Page Not Found (404) — Moistello",
    description:
      "That Moistello page does not exist. It may have been renamed or removed — try the documentation, the FAQ, or head back to the home page.",
    ogTitle: "Page not found (404) — Moistello",
    ogDescription: "This page does not exist. Try the docs, the FAQ, or head back to the home page.",
    keywords: ["moistello", "404", "not found", "page missing"],
    indexable: false,
  },
  {
    path: "/setup",
    title: "Initial Setup — Moistello",
    description:
      "One-time operator setup for this Moistello deployment: choose the first administrator username and password.",
    ogTitle: "Moistello initial setup",
    ogDescription: "One-time administrator setup for this deployment.",
    keywords: ["moistello", "setup", "install", "bootstrap", "admin"],
    indexable: false,
  },
  {
    path: "/upload",
    title: "Content Upload — Moistello",
    description:
      "Restricted upload console for publishing documentation and content pages to this Moistello deployment.",
    ogTitle: "Moistello content upload",
    ogDescription: "Restricted publishing console for this deployment.",
    keywords: ["moistello", "upload", "content", "publishing", "admin"],
    indexable: false,
  },
]

const ROUTES_BY_PATH = new Map(PUBLIC_ROUTES.map((route) => [route.path, route]))

/** Look up a route's SEO entry. Returns `undefined` for unregistered paths. */
export function getRouteSeo(path: string): RouteSeo | undefined {
  return ROUTES_BY_PATH.get(path)
}

/** Indexable routes only — the set the sitemap should advertise. */
export const INDEXABLE_ROUTES: readonly RouteSeo[] = PUBLIC_ROUTES.filter(
  (route) => route.indexable,
)

/**
 * Build a Next.js `Metadata` object for a public route.
 *
 * Every field a social scraper or a crawler reads comes from a single registry
 * entry, so `description`, `og:description` and `twitter:description` are always
 * populated together and `og:url` always agrees with the canonical link.
 *
 * Throws on an unknown path rather than silently emitting an empty description.
 * A missing entry is exactly the bug this module exists to prevent, and failing
 * at build time is far cheaper than discovering it from a blank link preview.
 */
export function buildRouteMetadata(path: string): Metadata {
  const route = getRouteSeo(path)
  if (!route) {
    throw new Error(
      `[seo] No SEO entry registered for "${path}". Add one to PUBLIC_ROUTES in ` +
        "src/lib/seo/route-metadata.ts — the route audit fails the build on any " +
        "unregistered public route.",
    )
  }

  return {
    title: route.title,
    description: route.description,
    keywords: [...route.keywords],
    authors: [{ name: AUTHOR_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: { canonical: route.path },
    robots: route.indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      type: route.ogType ?? "website",
      locale: "en_US",
      url: absoluteUrl(route.path),
      siteName: SITE_NAME,
      title: route.ogTitle,
      description: route.ogDescription,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_SITE,
      creator: TWITTER_CREATOR,
      title: route.ogTitle,
      description: route.ogDescription,
      images: [OG_IMAGE.url],
    },
  }
}
