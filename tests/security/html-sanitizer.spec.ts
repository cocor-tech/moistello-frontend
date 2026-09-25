import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/security/html-sanitizer";

describe("HTML sanitizer security contract", () => {
  it("removes script elements and executable payloads", () => {
    const result = sanitizeHtml(
      '<p>Hello</p><script>alert("xss")</script><img src=x onerror=alert(1)>',
    );

    expect(result).not.toMatch(/script/i);
    expect(result).not.toMatch(/onerror/i);
    expect(result).not.toMatch(/alert/i);
  });

  it("rejects javascript and data URL schemes", () => {
    const result = sanitizeHtml(
      '<a href="javascript:alert(1)">bad</a><img src="data:text/html;base64,abc">',
    );

    expect(result).not.toMatch(/javascript:/i);
    expect(result).not.toMatch(/data:/i);
  });

  it("removes SVG, MathML, inline event handlers, and style attributes", () => {
    const result = sanitizeHtml(
      '<svg><script>alert(1)</script></svg><p style="color:red" onclick="alert(1)">text</p>',
    );

    expect(result).not.toMatch(/svg|script|style=|onclick=/i);
  });

  it("preserves explicitly supported safe formatting", () => {
    const result = sanitizeHtml(
      '<h2 class="gradient-text">Heading</h2><p><strong>Safe</strong> <a href="https://example.com">link</a></p>',
    );

    expect(result).toContain("<h2");
    expect(result).toContain("<strong>");
    expect(result).toContain('href="https://example.com"');
  });
});
