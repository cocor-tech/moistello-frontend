/**
 * Canonical CSP reporting coordinates.
 *
 * Plain `.mjs` for the same reason `api-csp.mjs` is: next.config.mjs is ESM and
 * is evaluated before any TypeScript compilation, so a value needed in *both*
 * the config and the request path has to live in a module both can import.
 * `csp.ts` re-exports these so application code has a single import site.
 *
 * Both values appear in two places that must not drift:
 *   - the policy string  (`report-uri` / `report-to` directives)
 *   - the response header (`Reporting-Endpoints`, served by next.config.mjs)
 *
 * A mismatch is silent: the browser resolves the report-to group, finds no
 * matching header, drops the report, and the deployment concludes — wrongly —
 * that nothing violates the policy.
 */

/** Reporting-Endpoints group name referenced by the `report-to` directive. */
export const CSP_REPORTING_GROUP = "csp-endpoint"

/** Path the browser POSTs violation reports to. Relative, so the policy is not tied to a hostname. */
export const CSP_REPORT_PATH = "/api/csp-report"
