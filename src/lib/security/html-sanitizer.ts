/**
 * HTML Sanitizer - Removes dangerous HTML/JavaScript from user content
 * to prevent XSS attacks while preserving safe formatting
 */

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "table",
  "caption",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "div",
  "span",
  "hr",
]);

/**
 * Attributes that carry accessibility semantics rather than behaviour.
 *
 * None of them can execute script or fetch a URL, and stripping them is what
 * previously reduced every sanitised table to an unnamed, captionless block of
 * cells: the markup looked fine but a screen reader had no column association
 * and no landmark to navigate to.
 *
 * They are still granted per-tag, never as a blanket rule. `aria-*` on a `<p>`
 * or a `tabindex` on an `<a>` would let content add landmark names and extra
 * focus stops it has no business defining, so each tag only gets what the
 * markdown table renderer actually emits on it.
 */
const A11Y_ATTRIBUTES = {
  /** The focusable, named scroll region wrapped around a wide table. */
  scrollRegion: ["role", "aria-label", "tabindex"],
  /** Column/row semantics on a header cell. */
  headerCell: ["scope"],
  /** Column name, read by `.responsive-table__cell::before` when stacked. */
  bodyCell: ["data-label"],
} as const;

/**
 * `tabindex` values that cannot create a focus trap.
 *
 * A positive `tabindex` reorders the whole document's tab sequence, so
 * `tabindex="1"` in content is a keyboard trap by another name — exactly the
 * failure this allowlist exists to avoid. Only "in document order" and
 * "programmatically focusable" survive.
 */
const SAFE_TABINDEX = new Set(["0", "-1"]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  div: new Set(["class", ...A11Y_ATTRIBUTES.scrollRegion]),
  span: new Set(["class"]),
  code: new Set(["class"]),
  pre: new Set(["class"]),
  table: new Set(["class"]),
  caption: new Set(["class"]),
  thead: new Set(["class"]),
  tbody: new Set(["class"]),
  tr: new Set(["class"]),
  th: new Set(["class", ...A11Y_ATTRIBUTES.headerCell]),
  td: new Set(["class", ...A11Y_ATTRIBUTES.bodyCell]),
  h1: new Set(["class"]),
  h2: new Set(["class"]),
  h3: new Set(["class"]),
  h4: new Set(["class"]),
  h5: new Set(["class"]),
  h6: new Set(["class"]),
  p: new Set(["class"]),
  ul: new Set(["class"]),
  ol: new Set(["class"]),
  li: new Set(["class"]),
  blockquote: new Set(["class"]),
};

const ALLOWED_URL_SCHEMES = new Set(["http:", "https:", "mailto:"]);

/**
 * Sanitize HTML by removing dangerous tags, attributes, and scripts
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  html = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );

  // Remove style tags and their content
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove dangerous tags
  html = html.replace(
    /<(iframe|object|embed|applet|meta|link|base|form|input|button)[^>]*>(?:.*?<\/\1>)?/gi,
    "",
  );

  // Remove event handler attributes (onclick, onload, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: URLs
  html = html.replace(/href\s*=\s*["']?\s*javascript:/gi, 'href="#"');
  html = html.replace(/src\s*=\s*["']?\s*javascript:/gi, 'src=""');

  // Remove data: URLs (can contain base64-encoded scripts)
  html = html.replace(/href\s*=\s*["']?\s*data:/gi, 'href="#"');
  html = html.replace(/src\s*=\s*["']?\s*data:/gi, 'src=""');

  // Remove vbscript: URLs
  html = html.replace(/href\s*=\s*["']?\s*vbscript:/gi, 'href="#"');

  // Sanitize tag attributes
  html = html.replace(/<(\w+)([^>]*)>/g, (match, tagName, attributes) => {
    const tag = tagName.toLowerCase();

    // Remove tags not in allowlist
    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    // If no attributes or tag doesn't support attributes, return simple tag
    if (!attributes.trim() || !ALLOWED_ATTRIBUTES[tag]) {
      return `<${tag}>`;
    }

    // Parse and filter attributes
    const allowedAttrs = ALLOWED_ATTRIBUTES[tag];
    const sanitizedAttrs: string[] = [];

    // Match attribute patterns: name="value" or name='value' or name=value.
    // Hyphens are part of attribute names (`data-label`, `aria-label`), so the
    // name pattern cannot be `\w+` or every one of those is silently dropped.
    const attrRegex = /([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attributes)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";

      if (allowedAttrs.has(attrName)) {
        // Additional validation for URLs
        if (attrName === "href" || attrName === "src") {
          try {
            const url = new URL(attrValue, "http://example.com");
            if (ALLOWED_URL_SCHEMES.has(url.protocol)) {
              sanitizedAttrs.push(
                `${attrName}="${attrValue.replace(/"/g, "&quot;")}"`,
              );
            }
          } catch {
            // Invalid URL, skip attribute
            continue;
          }
        } else if (attrName === "target") {
          // Only allow safe target values
          if (attrValue === "_blank" || attrValue === "_self") {
            sanitizedAttrs.push(`${attrName}="${attrValue}"`);
            // Add rel="noopener noreferrer" for _blank
            if (
              attrValue === "_blank" &&
              !sanitizedAttrs.some((a) => a.startsWith("rel="))
            ) {
              sanitizedAttrs.push('rel="noopener noreferrer"');
            }
          }
        } else if (attrName === "tabindex") {
          // Drop anything that would reorder or trap the tab sequence.
          if (SAFE_TABINDEX.has(attrValue.trim())) {
            sanitizedAttrs.push(`tabindex="${attrValue.trim()}"`);
          }
        } else {
          // Escape quotes in attribute values
          sanitizedAttrs.push(
            `${attrName}="${attrValue.replace(/"/g, "&quot;")}"`,
          );
        }
      }
    }

    return sanitizedAttrs.length > 0
      ? `<${tag} ${sanitizedAttrs.join(" ")}>`
      : `<${tag}>`;
  });

  return html;
}

/**
 * Escape HTML entities to prevent XSS in plain text
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}
