# XSS and Content Security Policy

## Why `dangerouslySetInnerHTML` is sensitive

React escapes interpolated text by default. `dangerouslySetInnerHTML` bypasses that protection and inserts HTML into the document. It must only receive content that has been sanitized using a parser-based sanitizer with an explicit allowlist.

The Markdown parser is not a security boundary. It generates HTML-like output, and the resulting HTML must still be sanitized before rendering.

## Rules

- Do not render untrusted HTML without sanitization.
- Do not add `style`, event-handler, `srcdoc`, SVG, MathML, or executable URL attributes to the sanitizer allowlist.
- Allow only `https`, `http`, `mailto`, relative, and fragment URLs where required.
- Keep the CSP restrictive and review every external script, image, font, and connection origin.
- Use a per-request nonce for inline scripts.
- Do not use `unsafe-eval`.
- Avoid `unsafe-inline` for scripts. Inline scripts must carry the nonce.
- Review CSP changes whenever analytics, wallet providers, WebSocket endpoints, or third-party embeds change.

## Verification

The security review must include:

- Sanitizer unit tests for script tags, event handlers, dangerous URLs, SVG/MathML, and malformed attributes.
- Browser tests confirming that injected payloads do not execute.
- Header tests confirming CSP, `X-Content-Type-Options`, frame restrictions, and referrer policy.
- Production verification that all required third-party origins are included and no unnecessary origins are allowed.

A passing sanitizer test suite does not replace manual review of newly added `dangerouslySetInnerHTML` usage.
