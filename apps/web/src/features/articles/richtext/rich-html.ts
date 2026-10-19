import sanitizeHtml from "sanitize-html";

// The canonical shape of article bodies:
//  - Legacy bodies (authored before this feature) are plain text paragraphs.
//  - New bodies are rich HTML produced by the editor and stored sanitized.
// This module owns the detection, conversion, and sanitization logic so the
// editor, the save action, and the public renderer all agree on the format.

/** Allowlist applied to every rich body on save and render. */
export const RICH_HTML_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "strong",
    "b",
    "em",
    "i",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "br",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: {
    a: ["http", "https"],
    img: ["http", "https"],
  },
  allowProtocolRelative: false,
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, RICH_HTML_CONFIG);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Heuristic for legacy bodies: authored rich HTML always begins with a block
 * tag (e.g. `<p>`), while legacy plain text does not.
 */
export function isPlainTextBody(body: string): boolean {
  return !/^<[a-zA-Z!]/.test(body.trimStart());
}

/** Splits legacy plain text into paragraphs using the pre-feature blank-line rule. */
export function plainTextParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Converts a legacy plain-text body into `<p>` rich HTML for the editor. */
export function plainTextToHtml(body: string): string {
  return plainTextParagraphs(body)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

/**
 * True when the body renders meaningful content: at least one visible character
 * of text or at least one inline image. Guards against `""`, whitespace, and the
 * empty rich-editor document `<p></p>` while still accepting image-only bodies.
 */
export function richBodyHasContent(body: string): boolean {
  if (!body.trim()) return false;
  const text = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  return text.length > 0 || /<img(?:\s|>)/i.test(body);
}

/**
 * Plain-text form of a stored body for summaries. Block boundaries become spaces so
 * adjacent paragraphs do not run together, markup is removed, and the entities the
 * sanitizer re-escapes are decoded.
 */
export function richBodyToPlainText(body: string): string {
  if (isPlainTextBody(body)) return body.replace(/\s+/g, " ").trim();
  const text = sanitizeHtml(body.replace(/<\/(p|h[1-6]|li|blockquote)>|<br\s*\/?>/gi, " "), {
    allowedTags: [],
    allowedAttributes: {},
  });
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Renders a stored article body into safe HTML for readers. Legacy plain-text
 * bodies are converted to paragraphs; rich bodies are sanitized again on render
 * (defense-in-depth) and body images are marked lazy so they do not delay the
 * rest of the article.
 */
export function renderRichBody(body: string): string {
  if (isPlainTextBody(body)) {
    const paragraphs = plainTextParagraphs(body).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
    return paragraphs || "<p></p>";
  }
  return sanitizeRichHtml(body).replace(/<img\b/gi, '<img loading="lazy"');
}