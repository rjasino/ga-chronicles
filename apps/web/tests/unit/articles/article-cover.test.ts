import { File as NodeFile } from "node:buffer";
import { describe, expect, it } from "vitest";
import { ARTICLE_COVER_MAX_SIZE, articleCoverExtension, articleCoverStoragePath, isLocalArticleCoverUrl, validateArticleCover } from "@/features/articles/article-cover";

function imageFile(name: string, type: string, bytes: number[]) {
  return new NodeFile([new Uint8Array(bytes)], name, { type });
}

describe("article cover images", () => {
  it.each([
    ["image/jpeg", "jpg", [0xff, 0xd8, 0xff, 0x00]],
    ["image/png", "png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", "webp", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ])("accepts %s files with matching image signatures", async (type, extension, bytes) => {
    const file = imageFile(`cover.${extension}`, type, bytes);
    expect(articleCoverExtension(type)).toBe(extension);
    expect(await validateArticleCover(file)).toBeNull();
  });

  it("rejects unsupported formats and mismatched file signatures", async () => {
    expect(await validateArticleCover(imageFile("cover.gif", "image/gif", [0x47, 0x49, 0x46]))).toMatch(/JPEG, PNG, or WebP/);
    expect(await validateArticleCover(imageFile("cover.png", "image/png", [0x00, 0x01, 0x02]))).toMatch(/does not match/);
  });

  it("rejects empty and oversized files", async () => {
    expect(await validateArticleCover(imageFile("empty.png", "image/png", []))).toMatch(/Choose an image/);
    const oversized = new NodeFile([new Uint8Array(ARTICLE_COVER_MAX_SIZE + 1)], "large.png", { type: "image/png" });
    expect(await validateArticleCover(oversized)).toMatch(/10 MiB or smaller/);
  });

  it("only extracts object paths from this Supabase instance and bucket", () => {
    const base = "http://127.0.0.1:54321";
    expect(articleCoverStoragePath(`${base}/storage/v1/object/public/article-covers/user%2Fcover.png`, base)).toBe("user/cover.png");
    expect(articleCoverStoragePath("https://elsewhere.test/storage/v1/object/public/article-covers/user/cover.png", base)).toBeNull();
    expect(articleCoverStoragePath(`${base}/storage/v1/object/public/other/user/cover.png`, base)).toBeNull();
  });

  it("bypasses Next image optimization only for local Supabase article covers", () => {
    const local = "http://127.0.0.1:54321";
    expect(isLocalArticleCoverUrl(`${local}/storage/v1/object/public/article-covers/user/cover.png`, local)).toBe(true);
    expect(isLocalArticleCoverUrl("https://project.supabase.co/storage/v1/object/public/article-covers/user/cover.png", "https://project.supabase.co")).toBe(false);
    expect(isLocalArticleCoverUrl("https://elsewhere.test/storage/v1/object/public/article-covers/user/cover.png", local)).toBe(false);
  });
});
