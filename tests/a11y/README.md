# Accessibility gate — baseline and exclusions

`dashboard-a11y.spec.ts` runs `@axe-core/playwright` against the four main
dashboard routes and fails CI on any **serious** or **critical** violation.

## Scanned routes

| Route       | Path       | Auth required |
| ----------- | ---------- | ------------- |
| Dashboard   | `/`        | no            |
| Circles     | `/circles` | yes           |
| Wallet      | `/wallet`  | yes           |
| Settings    | `/settings`| yes           |

Rules are restricted to WCAG 2.0/2.1/2.2 A and AA tags — the conformance
target for this product. `best-practice` tags are deliberately **not** enabled:
they are advisory, not normative, and including them makes a conformance gate
indistinguishable from a style gate.

## Severity threshold, and why it is where it is

| Impact      | Gate behaviour |
| ----------- | -------------- |
| `critical`  | **fails CI**   |
| `serious`   | **fails CI**   |
| `moderate`  | reported only  |
| `minor`     | reported only  |

The lower two tiers are recorded (attached to the Playwright report as
`axe-results`, and summarised to stdout) but do not fail the build.

This is a deliberate trade-off. A real product surface accumulates minor and
moderate findings indefinitely; a gate that is permanently red trains everyone
to ignore it, which is functionally identical to having no gate at all. Serious
and critical is the line past which a violation stops a real user completing a
real task. The non-blocking tiers are still fully visible, so the list of things
worth fixing next is never hidden — it is just not allowed to block a release on
day one.

## Baseline exclusions

**Currently empty.** All four routes pass the serious/critical gate with no rule
suppressions.

Exclusions are declared in one place only — `BASELINE_EXCLUSIONS` in
[`axe-baseline.ts`](./axe-baseline.ts) — and that file derives the actual
`disableRules` list from it. They are not duplicated per spec, because
exclusions that drift between specs produce a suite that passes locally and fails
in CI, or a route that quietly stopped being scanned.

### Adding an exclusion

Each entry requires a reason and an owner:

```ts
export const BASELINE_EXCLUSIONS = [
  {
    rule: "color-contrast",
    reason: "Chart series use a categorical palette verified against WCAG 1.4.11 " +
            "at 4.6:1; axe cannot resolve the computed colour over the SVG gradient.",
    owner: "@<team-or-person>",
  },
]
```

Three rules for keeping this list honest:

1. **No unexplained entries.** An exclusion without a reason is
   indistinguishable from a bug being hidden. If the reason is "we looked at it
   and it is fine", that is a reason — write it down.
2. **Prefer fixing.** A violation that is excluded is a violation nobody is
   going to look at. The list should shrink.
3. **Scope it to the rule, never the whole run.** Do not disable a tag or a
   category to make one route pass; fix the route.

## Why a session cookie is seeded

`/circles`, `/wallet` and `/settings` are in `PROTECTED_PATHS` in
`src/middleware.ts`. Without a seeded `moistello_token` cookie the server
redirects all three to `/login`, and axe scans the login page three times while
the suite reports green.

The spec therefore asserts the final URL and a route-specific heading before
scanning, and a dedicated test (`the dashboard scan is pointed at the dashboard,
not the login page`) exists purely to fail if that redirect ever comes back.

## Running it

```bash
# Locally, against the dev server on :1110 (started automatically by Playwright)
npx playwright test tests/a11y/dashboard-a11y.spec.ts

# Only one route, for iterating on a single page
npx playwright test tests/a11y/dashboard-a11y.spec.ts -g "wallet"

# HTML report with the full axe-results attachment per route
npx playwright show-report
```

## What this does not cover

Automated axe scanning catches roughly a third of real WCAG issues. It cannot
judge whether alt text is *meaningful*, whether focus order matches the visual
order, whether a focus trap releases correctly, or whether the app is usable with
a screen reader at all. Those still need manual review — the gate exists to stop
the machine-checkable regressions from accumulating, not to replace a human
looking at the screen.
