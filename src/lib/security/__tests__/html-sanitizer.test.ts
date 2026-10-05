import { describe, it, expect } from "vitest";
import { sanitizeHtml, escapeHtml } from "../html-sanitizer";

/**
 * `sanitizeHtml` feeds the docs and long-form post renderers, so it is the last
 * gate in front of table markup that this change made deliberately rich with
 * accessibility attributes. The allowlist has to keep the inert ones (`role`,
 * `aria-label`, `scope`, `data-label`, `tabindex`) or every table silently
 * degrades, and it has to keep refusing the dangerous ones or the whole thing
 * is theatre.
 */

describe("sanitizeHtml — table accessibility", () => {
  it("keeps the focusable named scroll region around a table", () => {
    const clean = sanitizeHtml(
      '<div class="scroll-region" role="region" aria-label="Table 1: A, B" tabindex="0"><table><tr><td>x</td></tr></table></div>'
    );

    expect(clean).toContain('role="region"');
    expect(clean).toContain('aria-label="Table 1: A, B"');
    expect(clean).toContain('tabindex="0"');
  });

  it("keeps scope on header cells and the column name on body cells", () => {
    const clean = sanitizeHtml(
      '<table><thead><tr><th scope="col">Amount</th></tr></thead><tbody><tr><td data-label="Amount">5</td></tr></tbody></table>'
    );

    expect(clean).toContain('scope="col"');
    expect(clean).toContain('data-label="Amount"');
  });

  it("keeps the caption element and its content", () => {
    const clean = sanitizeHtml('<table><caption class="sr-only">Round 1</caption><tr><td>x</td></tr></table>');

    expect(clean).toContain("<caption");
    expect(clean).toContain("Round 1");
  });

  it("does not grant a11y attributes to tags that have no use for them", () => {
    // A landmark or a focus stop on a paragraph is content redefining the page
    // structure, which the renderer is not allowed to do.
    expect(sanitizeHtml('<p role="region" tabindex="0">hi</p>')).not.toContain("tabindex");
    expect(sanitizeHtml('<p role="region" tabindex="0">hi</p>')).not.toContain("role=");
    expect(sanitizeHtml('<a href="/x" tabindex="5">link</a>')).not.toContain("tabindex");
    expect(sanitizeHtml('<span aria-label="x">s</span>')).not.toContain("aria-label");
  });

  it("does not put data-label on a tag that never reads it", () => {
    expect(sanitizeHtml('<tr data-label="Nope"><td>x</td></tr>')).not.toContain(
      "data-label"
    );
  });

  it("refuses a positive tabindex, which would trap the tab sequence", () => {
    // The bug this change fixes is a keyboard trap; allowing content to
    // reintroduce one via tab ordering would be self-defeating.
    expect(sanitizeHtml('<div role="region" tabindex="1">x</div>')).not.toContain("tabindex");
    expect(sanitizeHtml('<div role="region" tabindex="999">x</div>')).not.toContain("tabindex");
    // -1 is programmatic-only and cannot be tabbed into.
    expect(sanitizeHtml('<div role="region" tabindex="-1">x</div>')).toContain('tabindex="-1"');
  });
});

describe("sanitizeHtml — still refuses active content", () => {
  it("strips script, style and event handlers", () => {
    const clean = sanitizeHtml(
      '<p onclick="steal()">hi</p><script>alert(1)</script><style>body{}</style>'
    );

    expect(clean).not.toMatch(/script|onclick|style|alert|steal/i);
  });

  it("strips javascript: and data: URLs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript/i);
    expect(sanitizeHtml('<img src="data:text/html,<script>">')).not.toMatch(/data:/i);
  });

  it("drops tags outside the allowlist", () => {
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe>')).not.toContain("iframe");
    expect(sanitizeHtml('<button>pay</button>')).not.toContain("button");
    expect(sanitizeHtml('<form action="/x"><input name="a"></form>')).not.toContain("input");
  });

  it("keeps safe links and images", () => {
    const clean = sanitizeHtml('<a href="/circles" class="link">circle</a>');

    expect(clean).toContain('href="/circles"');
    expect(clean).toContain("circle");
  });
});

describe("escapeHtml", () => {
  it("neutralises every character that could break out of an attribute", () => {
    // Exact match: this is the contract, and `&` surviving as a raw character
    // is the thing that would let a name like `&amp;quot; onx=` reassemble.
    expect(escapeHtml(`a"b'c<d>e&f/g`)).toBe(
      "a&quot;b&#x27;c&lt;d&gt;e&amp;f&#x2F;g"
    );
  });

  it("is what makes header text safe to place inside data-label", () => {
    // `renderMarkdownTable` interpolates an escaped header into an attribute;
    // without escaping first, a column named `" onmouseover="` breaks out.
    const escaped = escapeHtml('" onmouseover="alert(1)');

    expect(escaped).not.toContain('"');
    expect(sanitizeHtml(`<td data-label="${escaped}">x</td>`)).not.toContain("onmouseover");
  });
});
