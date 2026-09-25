import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote",
  "a", "img", "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "hr",
];

const ALLOWED_ATTR = [
  "href", "title", "rel", "target",
  "src", "alt", "width", "height",
  "class",
];

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto):|\/|#)/i;

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    USE_PROFILES: { html: true },
    ALLOWED_URI_REGEXP,
    FORBID_TAGS: [
      "script", "style", "iframe", "object", "embed", "form",
      "input", "button", "textarea", "select", "option",
      "svg", "math", "template",
    ],
    FORBID_ATTR: [
      "style", "srcdoc",
      "onerror", "onload", "onclick", "onmouseover",
    ],
  });
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}
