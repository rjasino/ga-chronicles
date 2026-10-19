import { File as NodeFile } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ARTICLE_IMAGES_MAX_SIZE } from "@/features/articles/body-image";

const mocks = vi.hoisted(() => ({
  getVerifiedSession: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/env", () => ({ getPublicEnv: () => ({}) }));
vi.mock("@/lib/authz/permissions", () => ({ can: () => true }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: () => ({ data: { publicUrl: "https://cdn.example.test/stored.png" } }),
      }),
    },
  }),
}));

const { uploadArticleBodyImage } = await import("@/features/articles/actions");

function formWith(file: unknown): FormData {
  return { get: (name: string) => (name === "image" ? file : null) } as unknown as FormData;
}

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("uploadArticleBodyImage", () => {
  beforeEach(() => {
    mocks.getVerifiedSession.mockResolvedValue({ userId: "user-1", roles: ["contributor"] });
    mocks.upload.mockReset().mockResolvedValue({ error: null });
  });

  it("returns not_signed_in without a session", async () => {
    mocks.getVerifiedSession.mockResolvedValue(null);
    const result = await uploadArticleBodyImage(formWith(new NodeFile([new Uint8Array(pngSignature)], "a.png", { type: "image/png" })));
    expect(result.errorCode).toBe("not_signed_in");
  });

  it("returns missing_file when no file is chosen", async () => {
    expect((await uploadArticleBodyImage(formWith(null))).errorCode).toBe("missing_file");
  });

  it("returns too_large with the limit and file size for oversized files", async () => {
    const oversized = new NodeFile([new Uint8Array(ARTICLE_IMAGES_MAX_SIZE + 1)], "big.png", { type: "image/png" });
    const result = await uploadArticleBodyImage(formWith(oversized));
    expect(result).toEqual({
      errorCode: "too_large",
      error: "Inline images must be 10 MiB or smaller. This image is 10.1 MiB.",
    });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("returns invalid_type for unsupported formats", async () => {
    const gif = new NodeFile([new Uint8Array([0x47, 0x49, 0x46])], "a.gif", { type: "image/gif" });
    expect((await uploadArticleBodyImage(formWith(gif))).errorCode).toBe("invalid_type");
  });

  it("returns invalid_signature when bytes do not match the declared format", async () => {
    const fake = new NodeFile([new Uint8Array([0x00, 0x01, 0x02])], "a.png", { type: "image/png" });
    expect((await uploadArticleBodyImage(formWith(fake))).errorCode).toBe("invalid_signature");
  });

  it("returns upload_failed when storage rejects the file", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "bucket unavailable" } });
    const png = new NodeFile([new Uint8Array(pngSignature)], "a.png", { type: "image/png" });
    expect(await uploadArticleBodyImage(formWith(png))).toEqual({
      errorCode: "upload_failed",
      error: "The image could not be uploaded. Try again.",
    });
  });

  it("returns the public URL on success", async () => {
    const png = new NodeFile([new Uint8Array(pngSignature)], "a.png", { type: "image/png" });
    expect(await uploadArticleBodyImage(formWith(png))).toEqual({ url: "https://cdn.example.test/stored.png" });
  });
});
