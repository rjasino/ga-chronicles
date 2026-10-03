import { describe, expect, it } from "vitest";
import { RICH_HTML_CONFIG, isPlainTextBody, plainTextParagraphs, plainTextToHtml, renderRichBody, sanitizeRichHtml } from "@/features/articles/richtext/rich-html";

describe("rich body sanitization", () => {
  it("keeps the configured editorial subset and drops unsafe markup", () => {
    const input =
      '<p>Hello <strong>bold</strong> and <em>em</em>.</p><h2>Subhead</h2><ul><li>One</li><li>Two</li></ul><blockquote>A quote</blockquote><p><a href="https://example.test">link</a></p>';
    const output = sanitizeRichHtml(input);
    expect(output).toContain("<p>Hello <strong>bold</strong> and <em>em</em>.</p>");
    expect(output).toContain("<h2>Subhead</h2>");
    expect(output).toContain("<ul><li>One</li><li>Two</li></ul>");
    expect(output).toContain("<blockquote>A quote</blockquote>");
    expect(output).toContain('<a href="https://example.test">link</a>');
  });

  it("removes scripts, event handlers, styles, and not-allowed tags", () => {
    const output = sanitizeRichHtml(
      '<script>alert(1)</script><p style="color:red" onclick="x()">Text<img src="https://example.test/a.png" onerror="alert(1)" width="50"></p><iframe src="https://evil.test"></iframe>',
    );
    expect(output).not.toContain("<script");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("style=");
    expect(output).not.toContain("<iframe");
    expect(output).toContain('<img src="https://example.test/a.png"');
  });

  it("blocks unsafe URL schemes and protocol-relative sources", () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
    expect(sanitizeRichHtml('<a href="//example.test/x">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRichHtml('<img src="data:image/png;base64,AAAA">')).toBe("<img />");
  });

  it("exposes an allowlist config with explicit image and link attributes", () => {
    const tags = RICH_HTML_CONFIG.allowedTags ?? [];
    expect(tags).toEqual(expect.arrayContaining(["p", "h1", "strong", "em", "ul", "ol", "li", "blockquote", "a", "img"]));
    expect(RICH_HTML_CONFIG.allowedAttributes).toMatchObject({ a: ["href", "title"], img: ["src", "alt", "title"] });
  });
});

describe("legacy plain-text bodies", () => {
  it("detects plain text and rich HTML", () => {
    expect(isPlainTextBody("Hello world.\n\nSecond paragraph.")).toBe(true);
    expect(isPlainTextBody("<p>Hello world.</p>")).toBe(false);
    expect(isPlainTextBody("   <p>Leading whitespace before HTML</p>")).toBe(false);
  });

  it("splits plain text on blank lines and trims paragraphs", () => {
    expect(plainTextParagraphs("A\n\n  B  \nC\n\nD")).toEqual(["A", "B  \nC", "D"]);
    expect(plainTextParagraphs("")).toEqual([]);
    expect(plainTextParagraphs("Only one")).toEqual(["Only one"]);
  });

  it("converts plain text to paragraph HTML with escaped markup", () => {
    expect(plainTextToHtml("Hello\n\nWorld")).toBe("<p>Hello</p><p>World</p>");
    expect(plainTextToHtml("1 < 2 & 3 > 2")).toBe("<p>1 &lt; 2 &amp; 3 &gt; 2</p>");
    expect(plainTextToHtml("   ")).toBe("");
  });
});

describe("renderRichBody", () => {
  it("re-sanitizes rich bodies and marks images lazy", () => {
    const output = renderRichBody('<p onclick="x()">Hi</p><img src="https://a.test/i.png" alt="shot">');
    expect(output).not.toContain("onclick");
    expect(output).toContain("<p>Hi</p>");
    expect(output).toContain('loading="lazy"');
    expect(output).toMatch(/<img[^>]*src="https:\/\/a.test\/i.png"/);
  });

  it("converts legacy plain text to paragraphs", () => {
    expect(renderRichBody("First\n\nSecond")).toBe("<p>First</p><p>Second</p>");
  });

  it("keeps an empty legacy body renderable", () => {
    expect(renderRichBody("")).toBe("<p></p>");
  });
});