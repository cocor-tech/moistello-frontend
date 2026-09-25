# `dangerouslySetInnerHTML` Inventory

## Reviewed files

- `src/app/layout.tsx`
  - Theme initialization script.
  - Organization JSON-LD.
  - WebSite JSON-LD.
  - Analytics initialization script.
  - Analytics `noscript` fallback.
- `src/app/docs/[[...slug]]/page.tsx`
  - Documentation article content.
- `src/app/p/[[...slug]]/page.tsx`
  - Uploaded page content.

## Classification

| Usage | Expected control |
|---|---|
| Theme initialization | Nonce-bound script plus restrictive CSP |
| JSON-LD | Nonce-bound script; data must be generated internally |
| Analytics bootstrap | Nonce-bound script, reviewed external origin, consent behavior |
| Analytics fallback | Avoid unnecessary HTML injection; retain only if required |
| Markdown-generated article/page content | Parser-based HTML sanitizer with strict allowlist |

## Completion evidence required

- [ ] Every occurrence is listed and reviewed.
- [ ] All user-controlled or file-controlled HTML is sanitized.
- [ ] CSP is emitted on all relevant routes.
- [ ] Nonce propagation is verified.
- [ ] Browser XSS regression tests pass.
- [ ] Build and lint pass.
- [ ] Security reviewer signs off.
