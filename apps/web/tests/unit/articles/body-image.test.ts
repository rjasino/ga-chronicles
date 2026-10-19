import { File as NodeFile } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  ARTICLE_IMAGES_MAX_SIZE,
  articleBodyImageStoragePath,
  articleImageExtension,
  isLocalArticleBodyImageUrl,
  validateArticleBodyImage,
} from "@/features/articles/body-image";

function imageFile(name: string, type: string, bytes: number[]) {
  return new NodeFile([new Uint8Array(bytes)], name, { type });
}

describe("inline body images", () => {
  it.each([
    ["image/jpeg", "jpg", [0xff, 0xd8, 0xff, 0x00]],
    ["image/png", "png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", "webp", [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ])("accepts %s files with matching image signatures", async (type, extension, bytes) => {
    const file = imageFile(`image.${extension}`, type, bytes);
    expect(articleImageExtension(type)).toBe(extension);
    expect(await validateArticleBodyImage(file)).toBeNull();
  });

  it("rejects unsupported formats, mismatched signatures, and oversized files", async () => {
    expect(await validateArticleBodyImage(imageFile("image.gif", "image/gif", [0x47, 0x49, 0x46]))).toMatch(/JPEG, PNG, or WebP/);
    expect(await validateArticleBodyImage(imageFile("image.png", "image/png", [0x00, 0x01, 0x02]))).toMatch(/does not match/);
    expect(await validateArticleBodyImage(imageFile("empty.png", "image/png", []))).toMatch(/Choose an image/);
    const oversized = new NodeFile([new Uint8Array(ARTICLE_IMAGES_MAX_SIZE + 1)], "large.png", { type: "image/png" });
    expect(await validateArticleBodyImage(oversized)).toMatch(/10 MiB or smaller/);
  });

  it("explains the limit and the file size for oversized inline images", async () => {
    const oversized = new NodeFile([new Uint8Array(ARTICLE_IMAGES_MAX_SIZE + 1)], "large.png", { type: "image/png" });
    expect(await validateArticleBodyImage(oversized)).toBe("Inline images must be 10 MiB or smaller. This image is 10.1 MiB.");
  });

  it("accepts a file exactly at the size limit", async () => {
    const bytes = new Uint8Array(ARTICLE_IMAGES_MAX_SIZE);
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(await validateArticleBodyImage(new NodeFile([bytes], "limit.png", { type: "image/png" }))).toBeNull();
  });

  it("only extracts object paths from this Supabase instance and the body-image bucket", () => {
    const base = "http://127.0.0.1:54321";
    expect(articleBodyImageStoragePath(`${base}/storage/v1/object/public/article-images/user%2Fshot.png`, base)).toBe("user/shot.png");
    expect(articleBodyImageStoragePath(`${base}/storage/v1/object/public/article-covers/user/cover.png`, base)).toBeNull();
    expect(articleBodyImageStoragePath("https://elsewhere.test/storage/v1/object/public/article-images/user/shot.png", base)).toBeNull();
  });

  it("bypasses image optimization only for local Supabase body images", () => {
    const local = "http://127.0.0.1:54321";
    expect(isLocalArticleBodyImageUrl(`${local}/storage/v1/object/public/article-images/user/shot.png`, local)).toBe(true);
    expect(isLocalArticleBodyImageUrl("https://project.supabase.co/storage/v1/object/public/article-images/user/shot.png", "https://project.supabase.co")).toBe(false);
    expect(isLocalArticleBodyImageUrl("https://elsewhere.test/storage/v1/object/public/article-images/user/shot.png", local)).toBe(false);
  });
});