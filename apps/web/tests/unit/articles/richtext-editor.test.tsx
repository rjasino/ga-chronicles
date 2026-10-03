import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RichTextEditor } from "@/features/articles/richtext/editor";

const { uploadArticleBodyImage } = vi.hoisted(() => ({ uploadArticleBodyImage: vi.fn() }));
vi.mock("@/features/articles/actions", () => ({ uploadArticleBodyImage }));

function hiddenBody(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[name="body"]');
  if (!input) throw new Error("hidden body input not rendered");
  return input as HTMLInputElement;
}

async function renderEditor(initialBody: string) {
  const view = render(<RichTextEditor initialBody={initialBody} />);
  await waitFor(() => expect(view.container.querySelector('input[name="body"]')).not.toBeNull());
  return view;
}

describe("RichTextEditor", () => {
  beforeEach(() => {
    uploadArticleBodyImage.mockReset();
  });

  it("initializes rich HTML into the hidden body field", async () => {
    const { container } = await renderEditor("<p>Hello <strong>world</strong></p>");
    expect(hiddenBody(container).value).toBe("<p>Hello <strong>world</strong></p>");
  });

  it("converts legacy plain text to paragraphs on init", async () => {
    const { container } = await renderEditor("First paragraph\n\nSecond paragraph");
    expect(hiddenBody(container).value).toBe("<p>First paragraph</p><p>Second paragraph</p>");
  });

  it("sanitizes away unsafe markup on init", async () => {
    const { container } = await renderEditor('<p onclick="x()">Text</p><script>bad()</script>');
    expect(hiddenBody(container).value).toBe("<p>Text</p>");
  });

  it("uploads a chosen image and embeds it in the body", async () => {
    uploadArticleBodyImage.mockResolvedValue({ url: "https://cdn.example.test/shot.png" });
    const { container } = await renderEditor("<p>Start</p>");
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "shot.jpg", { type: "image/jpeg" });
    fireEvent.change(container.querySelector('input[name="body_image"]')!, { target: { files: [file] } });
    await waitFor(() => expect(uploadArticleBodyImage).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const value = hiddenBody(container).value;
      expect(value).toMatch(/<img/);
      expect(value).toContain("https://cdn.example.test/shot.png");
    });
  });

  it("reports upload errors without losing the authored body", async () => {
    uploadArticleBodyImage.mockResolvedValue({ error: "Inline images must be JPEG, PNG, or WebP." });
    const { container } = await renderEditor("<p>Start</p>");
    const file = new File([new Uint8Array([0x47, 0x49, 0x46])], "x.gif", { type: "image/gif" });
    fireEvent.change(container.querySelector('input[name="body_image"]')!, { target: { files: [file] } });
    await waitFor(() => screen.findByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent(/JPEG, PNG, or WebP/);
    expect(hiddenBody(container).value).toBe("<p>Start</p>");
  });
});