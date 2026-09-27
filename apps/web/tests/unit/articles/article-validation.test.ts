import { describe, expect, it } from "vitest";
import { articleInputSchema } from "@/features/articles/schema";

describe("article input validation", () => {
  it("requires non-empty title and body after trimming", () => {
    expect(articleInputSchema.safeParse({ title: " ", body: "text", type: "news" }).success).toBe(false);
    expect(articleInputSchema.safeParse({ title: "A title", body: "  ", type: "news" }).success).toBe(false);
  });
  it.each(["news", "review", "commentary/opinion", "interview"])("accepts type %s", (type) => {
    expect(articleInputSchema.safeParse({ title: "Title", body: "Body", type }).success).toBe(true);
  });
  it("rejects unknown content types", () => {
    expect(articleInputSchema.safeParse({ title: "Title", body: "Body", type: "guide" }).success).toBe(false);
  });
  it("accepts a local cover path and rejects remote image URLs", () => {
    expect(articleInputSchema.safeParse({ title: "Title", body: "Body", type: "news", cover_image: "/brand/cover-image.png" }).success).toBe(true);
    expect(articleInputSchema.safeParse({ title: "Title", body: "Body", type: "news", cover_image: "https://example.test/image.png" }).success).toBe(false);
  });
});
