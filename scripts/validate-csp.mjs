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

// Extract a policy's directive list into a shared shape so the enforcing and
// report-only headers are held to exactly the same standard. The policy string
// is identical in both modes — only the header it travels in differs — so if
// these ever diverge it is a bug worth failing on.
function checkPagePolicy(policy, label) {
  const scriptSrc = extractDirective(policy, "script-src");
  check(scriptSrc.includes("'nonce-"), `production page script-src lacks a nonce (${label})`);
  check(scriptSrc.includes("'strict-dynamic'"), `production page script-src lacks 'strict-dynamic' (${label})`);
  check(scriptSrc.includes("'wasm-unsafe-eval'"), `production page script-src lacks 'wasm-unsafe-eval' (Stellar WASM) (${label})`);
  check(!scriptSrc.includes("'unsafe-eval'"), `production page script-src must not contain 'unsafe-eval' (${label})`);
  check(!scriptSrc.includes("'unsafe-inline'"), `production page script-src must not contain 'unsafe-inline' (${label})`);
  check(extractDirective(policy, "object-src") === "'none'", `page object-src must be 'none' (${label})`);
  check(extractDirective(policy, "base-uri") === "'self'", `page base-uri must be 'self' (${label})`);
  check(extractDirective(policy, "frame-ancestors") === "'none'", `page frame-ancestors must be 'none' (${label})`);
}

async function validatePageCsp() {
  const res = await fetchWithRetry(`${BASE_URL}/`);
  const enforcing = res.headers.get("content-security-policy");
  const reportOnly = res.headers.get("content-security-policy-report-only");

  // A deployment running with CSP_REPORT_ONLY=true serves the policy under the
  // report-only header and no enforcing header at all. That is a legitimate,
  // intentional configuration for staging — it is exactly the "validate before
  // enforcing" mode. Validating it here and passing is correct, but it must be
  // loud: silently accepting a report-only deployment as if it were enforcing
  // would let a misconfigured production box pass this gate while protecting
  // nothing. So the mode is printed, and CSP_STRICT_ENFORCEMENT can make a
  // report-only deployment a hard failure.
  const strict = process.env.CSP_STRICT_ENFORCEMENT === "true";

  if (!enforcing) {
    check(
      !!reportOnly,
      "page response carries neither Content-Security-Policy nor Content-Security-Policy-Report-Only",
    );
    if (strict) {
      throw new Error(
        "CSP validation failed: page policy is report-only, but CSP_STRICT_ENFORCEMENT=true requires enforcement",
      );
    }
    for (const policy of parsePolicies(reportOnly)) {
      checkPagePolicy(policy, "report-only");
      check(
        extractDirective(policy, "report-uri") !== "",
        "report-only policy is missing a report-uri directive — violations would not be collected",
      );
    }
    process.stdout.write(
      "⚠ page CSP: REPORT-ONLY (CSP_REPORT_ONLY is on) — policy validated but NOT enforced\n",
    );
    return;
  }

  for (const policy of parsePolicies(enforcing)) {
    checkPagePolicy(policy, "enforced");
  }

  // When both headers are present the browser enforces AND reports, which is a
  // legitimate steady state for a policy being rolled out. Verify the reporting
  // half actually works rather than assuming it.
  if (reportOnly) {
    for (const policy of parsePolicies(reportOnly)) {
      check(
        extractDirective(policy, "report-uri") !== "",
        "report-only policy is present but carries no report-uri directive",
      );
    }
    process.stdout.write("✔ page CSP: enforced, with report-only collection enabled\n");
    return;
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