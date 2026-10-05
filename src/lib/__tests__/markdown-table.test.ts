import { describe, it, expect } from "vitest";
import { renderMarkdownTable, MARKDOWN_TABLE_HINT } from "../markdown-table";
import { sanitizeHtml } from "../security/html-sanitizer";

const HEADER = "Endpoint | Method | Auth";
const BODY = "/api/circles | GET | none\n/api/circles/:id | POST | session";

describe("renderMarkdownTable", () => {
  it("wraps the table in a named, focusable scroll region", () => {
    const html = renderMarkdownTable(HEADER, BODY);

    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    // The name comes from the columns, so a screen-reader user landing on the
    // landmark learns what is inside it rather than hearing "region".
    expect(html).toContain('aria-label="Table 1: Endpoint, Method, Auth"');
    expect(html).toContain(MARKDOWN_TABLE_HINT);
  });

  it("gives each table a distinct name when a document has several", () => {
    const first = renderMarkdownTable(HEADER, BODY, { index: 0 });
    const second = renderMarkdownTable(HEADER, BODY, { index: 1 });

    expect(first).toContain('aria-label="Table 1:');
    expect(second).toContain('aria-label="Table 2:');
  });

  it("emits a caption and scoped column headers", () => {
    const html = renderMarkdownTable(HEADER, BODY);

    expect(html).toContain('<caption class="sr-only">Table 1</caption>');
    expect(html.match(/<th scope="col"/g) ?? []).toHaveLength(3);
  });

  it("labels every body cell with its column for the stacked layout", () => {
    const html = renderMarkdownTable(HEADER, BODY);

    expect(html).toContain('data-label="Endpoint"');
    expect(html).toContain('data-label="Method"');
    expect(html).toContain('data-label="Auth"');
    // One label per header, per row: 3 columns across 2 body rows.
    expect(html.match(/data-label=/g) ?? []).toHaveLength(6);
  });

  it("pads short rows instead of emitting holes", () => {
    const html = renderMarkdownTable(HEADER, "/api/circles | GET");

    expect(html).not.toContain("undefined");
    expect(html.match(/<td /g) ?? []).toHaveLength(3);
  });

  it("keeps a blank middle cell in place instead of shifting the row", () => {
    // Dropping empty cells would move "5" under the "Method" label, so a
    // stacked card would say "Method: 5" for a value that is an amount.
    const html = renderMarkdownTable(HEADER, "/api/circles |  | session");

    // Read the label→value pairs back out in document order, which is the only
    // way to catch a shift: each label must still be followed by its own value.
    const cells = Array.from(html.matchAll(/<td data-label="([^"]*)"[^>]*>([^<]*)</g)).map(
      (match) => [match[1], match[2]] as const
    );

    expect(cells).toEqual([
      ["Endpoint", "/api/circles"],
      ["Method", ""],
      ["Auth", "session"],
    ]);
  });

  it("names the region without stacking two ellipses on a truncated column list", () => {
    const wide = Array.from({ length: 8 }, (_, i) => `Column${i}`).join(" | ");
    const html = renderMarkdownTable(wide, "a | b | c | d | e | f | g | h");

    const label = html.match(/aria-label="([^"]*)"/)?.[1] ?? "";

    // One overflow marker from the omitted columns, one at most from the cut.
    expect(label.match(/…/g) ?? []).toHaveLength(1);
    expect(label.startsWith("Table 1: ")).toBe(true);
  });

  it("does not cut a name through an HTML entity", () => {
    // Cell text is escaped before it reaches here, so a naive slice can leave
    // a dangling `&am` — literal garbage in the accessible name.
    const dangling = renderMarkdownTable(
      `${"x".repeat(88)} &amp; more`,
      "a | b"
    );
    const danglingLabel = dangling.match(/aria-label="([^"]*)"/)?.[1] ?? "";

    // The cut lands mid-entity, so the whole entity is dropped rather than
    // half-emitted.
    expect(danglingLabel).not.toContain("&");
    expect(danglingLabel.endsWith("…")).toBe(true);

    // A complete entity that fits inside the cut is kept intact.
    const intact = renderMarkdownTable(`${"x".repeat(82)} &amp; tail`, "a | b");
    const intactLabel = intact.match(/aria-label="([^"]*)"/)?.[1] ?? "";

    expect(intactLabel).toContain("&amp;");
    expect(intactLabel).not.toMatch(/&(?!amp;)/);
  });

  it("survives sanitisation with its accessibility attributes intact", () => {
    // Regression guard: `sanitizeHtml` used to drop `role`, `aria-*`, `tabindex`,
    // `data-label`, `scope` and `<caption>` outright, which silently undid
    // everything this renderer does.
    const clean = sanitizeHtml(renderMarkdownTable(HEADER, BODY));

    expect(clean).toContain('role="region"');
    expect(clean).toContain('tabindex="0"');
    expect(clean).toContain('aria-label="Table 1: Endpoint, Method, Auth"');
    expect(clean).toContain("<caption");
    expect(clean).toContain('scope="col"');
    expect(clean).toContain('data-label="Endpoint"');
    expect(clean).toContain('class="sr-only"');
  });

  it("still strips scripting from table markup", () => {
    const clean = sanitizeHtml(
      renderMarkdownTable("A | B", `<script>alert(1)</script> | x | y`)
    );

    expect(clean).not.toMatch(/script|alert/i);
  });
});
