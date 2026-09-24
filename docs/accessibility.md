# Accessibility

Moistello targets WCAG 2.1 AA. Interactive controls must have an accessible name, remain operable with a keyboard, expose their state, and provide a visible focus indicator.

## Authoring checklist

- Give every icon-only button or link an `aria-label` (or an associated visible label).
- Use native `button`, `input`, `select`, and `textarea` elements before building custom controls.
- Associate labels with form controls using `label`/`htmlFor`, the shared `Input` and `Select` primitives, or an explicit `aria-label`.
- Use `aria-expanded` and `aria-controls` for disclosures, `aria-pressed` for toggle buttons, and `aria-checked` with an appropriate role for custom checkboxes and switches.
- Announce asynchronous results with `role="status"`/`aria-live`; use `role="alert"` for errors that interrupt the user.
- Mark decorative SVGs and icons `aria-hidden="true"`; provide a text alternative when an icon carries meaning.
- Give links a destination-oriented name, especially when the visible text is only an icon or an abbreviation.
- Preserve keyboard focus, focus trapping, and Escape handling in dialogs and menus.
- External links opened in a new tab must use `rel="noopener noreferrer"` and should say that they open a new tab.

The shared `Button`, `Input`, `Select`, `Modal`, and `Dialog` primitives apply focus-visible styles and preserve native semantics. Do not remove those attributes when adding a visual variant.

## Verification

1. Run `npm run lint` and `npm test`.
2. Exercise login, wallet connection, upload, notifications, and the developer/upload pages using only Tab, Shift+Tab, Enter, Space, and Escape.
3. Run the Playwright accessibility audit in `tests/e2e/a11y-audit.spec.ts` against a running development server.
4. Test the critical flows with a screen reader (VoiceOver on macOS/iOS, NVDA on Windows, and Orca on Linux). Confirm that every control announces its role, name, state, and result.

Automated checks are a safety net, not a substitute for keyboard and screen-reader testing. When adding a control, add or update a focused component test that asserts its accessible role and name.
