import { describe, expect, it } from "vitest";
import { RICH_HTML_CONFIG, isPlainTextBody, plainTextParagraphs, plainTextToHtml, renderRichBody, richBodyHasContent, richBodyToPlainText, sanitizeRichHtml } from "@/features/articles/richtext/rich-html";

describe("richBodyToPlainText", () => {
  it("returns the words of a rich body without tags", () => {
    expect(richBodyToPlainText("<p>AI may help <strong>smaller teams</strong> stretch.</p><p>Second line.</p>")).toBe(
      "AI may help smaller teams stretch. Second line.",
    );
  });

  it("decodes entities the sanitizer escapes", () => {
    expect(richBodyToPlainText("<p>Tom &amp; Jerry say &quot;hi&quot; &lt;3</p>")).toBe('Tom & Jerry say "hi" <3');
  });

  it("returns legacy plain text with whitespace collapsed", () => {
    expect(richBodyToPlainText("First  paragraph\n\nSecond")).toBe("First paragraph Second");
  });

  it("returns an empty string for an empty body", () => {
    expect(richBodyToPlainText("<p></p>")).toBe("");
    expect(richBodyToPlainText("")).toBe("");
  });
});

describe("rich body sanitization", () => {
  it("keeps the configured editorial subset and drops unsafe markup", () => {
    const input =
      '<p>Hello <strong>bold</strong> and <em>em</em>.</p><h2>Subhead</h2><ul><li>One</li><li>Two</li></ul><blockquote>A quote</blockquote><p><a href="https://example.test">link</a></p>';
    const output = sanitizeRichHtml(input);
    expect(output).toContain("<p>Hello <strong>bold</strong> and <em>em</em>.</p>");
    expect(output).toContain("<h2>Subhead</h2>");
    expect(output).toContain("<ul><li>One</li><li>Two</li></ul>");
    expect(output).toContain("<blockquote>A quote</blockquote>");
    expect(output).toContain('<a href="https://example.test" target="_blank" rel="noopener noreferrer">link</a>');
  });

  it("removes scripts, event handlers, styles, and not-allowed tags", () => {
    const output = sanitizeRichHtml(
      '<script>alert(1)</script><p style="color:red" onclick="x()">Text<img src="https://example.test/a.png" onerror="alert(1)" width="50"></p><iframe src="https://evil.test/embed/abc"></iframe>',
    );
    expect(output).not.toContain("<script");
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("style=");
    expect(output).not.toContain("<iframe");
    expect(output).toContain('<img src="https://example.test/a.png"');
  });

  it("blocks unsafe link and image URL schemes and protocol-relative sources", () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizeRichHtml('<a href="//example.test/x">x</a>')).toBe('<a target="_blank" rel="noopener noreferrer">x</a>');
    expect(sanitizeRichHtml('<img src="data:image/png;base64,AAAA">')).toBe("<img />");
  });

  it("keeps YouTube embeds while rejecting other hosts, unsafe schemes, and relative sources", () => {
    const youtube = sanitizeRichHtml('<div data-youtube-video=""><iframe src="https://www.youtube.com/embed/abc123" width="640" height="360" title="Video"></iframe></div>');
    const noCookie = sanitizeRichHtml('<div data-youtube-video=""><iframe src="https://www.youtube-nocookie.com/embed/abc123"></iframe></div>');
    expect(youtube).toContain('<iframe src="https://www.youtube.com/embed/abc123"');
    expect(youtube).toContain('loading="lazy"');
    expect(youtube).toContain('title="Video"');
    expect(noCookie).toContain('src="https://www.youtube-nocookie.com/embed/abc123"');
    expect(sanitizeRichHtml('<iframe src="https://evil.test/embed/abc123"></iframe>')).not.toContain("<iframe");
    expect(sanitizeRichHtml('<iframe src="javascript:alert(1)"></iframe>')).not.toContain("<iframe");
    expect(sanitizeRichHtml('<iframe src="data:text/html,abc"></iframe>')).not.toContain("<iframe");
    expect(sanitizeRichHtml('<iframe src="//www.youtube.com/embed/abc123"></iframe>')).not.toContain("<iframe");
  });

  it("forces safe new-tab attributes on every body link and is idempotent", () => {
    const input = '<p><a href="https://example.test" target="_self" rel="opener">first</a><a href="https://second.test" target="named">second</a></p>';
    const output = sanitizeRichHtml(input);
    expect(output).toContain('href="https://example.test" target="_blank" rel="noopener noreferrer"');
    expect(output).toContain('href="https://second.test" target="_blank" rel="noopener noreferrer"');
    expect(sanitizeRichHtml(output)).toBe(output);
  });

  it("exposes an allowlist config with explicit image, link, and video attributes", () => {
    const tags = RICH_HTML_CONFIG.allowedTags ?? [];
    expect(tags).toEqual(expect.arrayContaining(["p", "h1", "strong", "em", "ul", "ol", "li", "blockquote", "a", "img", "div", "iframe"]));
    expect(RICH_HTML_CONFIG.allowedAttributes).toMatchObject({
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title"],
      div: ["data-youtube-video"],
      iframe: expect.arrayContaining(["src", "width", "height", "title", "allow", "allowfullscreen", "frameborder", "referrerpolicy"]),
    });
    expect(RICH_HTML_CONFIG.allowedIframeHostnames).toContain("www.youtube.com");
  });
});

describe("richBodyHasContent", () => {
  it("accepts video-only bodies and still rejects empty content", () => {
    expect(richBodyHasContent('<div data-youtube-video=""><iframe src="https://www.youtube.com/embed/abc123"></iframe></div>')).toBe(true);
    expect(richBodyHasContent("<p></p>")).toBe(false);
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

  it("applies safe links and lazy loading to approved video embeds", () => {
    const output = renderRichBody('<p><a href="https://example.test" target="_self">Read more</a></p><div data-youtube-video=""><iframe src="https://www.youtube.com/embed/abc123"></iframe></div>');
    expect(output).toContain('href="https://example.test" target="_blank" rel="noopener noreferrer"');
    expect(output).toContain('<iframe src="https://www.youtube.com/embed/abc123"');
    expect(output).toContain('loading="lazy"');
    expect(renderRichBody(output)).toBe(output);
  });

  it("converts legacy plain text to paragraphs", () => {
    expect(renderRichBody("First\n\nSecond")).toBe("<p>First</p><p>Second</p>");
  });

  it("keeps an empty legacy body renderable", () => {
    expect(renderRichBody("")).toBe("<p></p>");
  });
});
