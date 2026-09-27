// Validates the Content-Security-Policy headers a production build actually
// serves. Runs as a headless check in CI (see .github/workflows/ci.yml).
//
// Usage:
//   CSP_VALIDATE_URL=http://localhost:8080 node scripts/validate-csp.mjs
//
// It fetches a page route (where the nonce-based page policy must apply) and an
// API route (where the static, script-free API policy must apply) and asserts
// the expected directives. Fails (exit 1) on any violation so the pipeline
// stops when the headers drift from the hardened policy.
//
// A CSP value can carry multiple comma-joined policy strings when static
// headers() and the middleware both contribute; every policy must satisfy the
// check.

const BASE_URL = process.env.CSP_VALIDATE_URL || "http://localhost:8080";

function parsePolicies(header) {
  return header ? header.split(",") : [];
}

function extractDirective(policy, name) {
  const part = policy
    .split(";")
    .map((s) => s.trim())
    .find((s) => s === name || s.startsWith(`${name} `));
  return part ? part.slice(name.length).trim() : "";
}

function check(condition, message) {
  if (!condition) {
    throw new Error(`CSP validation failed: ${message}`);
  }
}

async function fetchWithRetry(url, attempts = 30) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      return res;
    } catch (err) {
      lastErr = err;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Could not reach ${url}: ${lastErr?.message ?? "unknown error"}`);
}

async function validatePageCsp() {
  const res = await fetchWithRetry(`${BASE_URL}/`);
  const header = res.headers.get("content-security-policy");
  check(!!header, "page response is missing the Content-Security-Policy header");

  for (const policy of parsePolicies(header)) {
    const scriptSrc = extractDirective(policy, "script-src");
    check(scriptSrc.includes("'nonce-"), "production page script-src lacks a nonce");
    check(scriptSrc.includes("'strict-dynamic'"), "production page script-src lacks 'strict-dynamic'");
    check(scriptSrc.includes("'wasm-unsafe-eval'"), "production page script-src lacks 'wasm-unsafe-eval' (Stellar WASM)");
    check(!scriptSrc.includes("'unsafe-eval'"), "production page script-src must not contain 'unsafe-eval'");
    check(!scriptSrc.includes("'unsafe-inline'"), "production page script-src must not contain 'unsafe-inline'");
    check(extractDirective(policy, "object-src") === "'none'", "page object-src must be 'none'");
    check(extractDirective(policy, "base-uri") === "'self'", "page base-uri must be 'self'");
    check(extractDirective(policy, "frame-ancestors") === "'none'", "page frame-ancestors must be 'none'");
  }
  process.stdout.write("✔ page CSP: nonce-based, no unsafe-eval / unsafe-inline\n");
}

async function validateApiCsp() {
  // /api/auth/session answers 401 without a token but still carries the static
  // API CSP header — a safe, side-effect-free route to probe.
  const res = await fetchWithRetry(`${BASE_URL}/api/auth/session`);
  const header = res.headers.get("content-security-policy");
  check(!!header, "API response is missing the Content-Security-Policy header");

  for (const policy of parsePolicies(header)) {
    check(extractDirective(policy, "script-src") === "'none'", "API script-src must be 'none'");
    const scriptSrc = extractDirective(policy, "script-src");
    check(!scriptSrc.includes("'unsafe-eval'"), "API script-src must not contain 'unsafe-eval'");
    check(!scriptSrc.includes("'unsafe-inline'"), "API script-src must not contain 'unsafe-inline'");
    check(!scriptSrc.includes("'strict-dynamic'"), "API script-src must not contain 'strict-dynamic'");
    check(!scriptSrc.includes("'nonce-"), "API responses must not carry a nonce");
    check(extractDirective(policy, "default-src") === "'none'", "API default-src must be 'none'");
    check(extractDirective(policy, "frame-ancestors") === "'none'", "API frame-ancestors must be 'none'");
  }
  process.stdout.write("✔ API CSP: default-src 'none', script-src 'none'\n");
}

async function main() {
  process.stdout.write(`Validating CSP against ${BASE_URL} …\n`);
  await validatePageCsp();
  await validateApiCsp();
  process.stdout.write("All CSP validation checks passed.\n");
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});