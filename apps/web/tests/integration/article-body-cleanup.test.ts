import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { bodyImagePaths, reconcileArticleBodyImages } from "@/features/articles/body-image-refs";

// Exercises the save-time image lifecycle end to end against a scripted Supabase
// client: a first save records new images, a second save replaces them, and a
// third save removes the last image — storage objects are deleted only once no
// reference remains, mirroring the reconcile calls made by saveArticle.

const BASE = "http://127.0.0.1:54321";
type RefRow = { article_id: string; storage_path: string };

function statefulSupabase() {
  const rows: RefRow[] = [];
  const removedPaths: string[] = [];
  let remove: () => Promise<{ error: Error | null }> = async () => ({ error: null });
  return {
    rows,
    removedPaths,
    removeError: (message: string | null) => {
      remove = async () => ({ error: message ? new Error(message) : null });
    },
    client: {
      from: (table: string) => {
        if (table !== "article_body_images") throw new Error(`unexpected table ${table}`);
        return {
          select: () => ({
            eq: (column: string, value: string) =>
              Promise.resolve({
                data: (column === "storage_path" ? rows.filter((r) => r.storage_path === value) : rows).map((r) => ({ storage_path: r.storage_path })),
                error: null,
              }),
          }),
          insert: async (values: unknown[]) => {
            rows.push(...(values as RefRow[]));
            return { error: null };
          },
          delete: () => ({
            eq: (column: string, value: string) => ({
              in: async (columnName: string, paths: string[]) => {
                rows.splice(
                  0,
                  rows.length,
                  ...rows.filter((r) => !(r.article_id === value && paths.includes(r.storage_path))),
                );
                return { error: null };
              },
            }),
          }),
        };
      },
      storage: {
        from: () => ({
          remove: async (paths: string[]) => {
            removedPaths.push(...paths);
            return remove();
          },
        }),
      },
    } as unknown as SupabaseClient,
  };
}

describe("article body image cleanup on save", () => {
  it("records, replaces, and removes images with storage cleanup trailing references", async () => {
    const supabase = statefulSupabase();
    const articleBodyBase = '<p>Atmosphere matters.</p><img src="%SRC%" alt="shot" />';

    // First save: body references one image -> row recorded, nothing deleted.
    const firstBody = articleBodyBase.replace("%SRC%", `${BASE}/storage/v1/object/public/article-images/u/one.png`);
    await reconcileArticleBodyImages(supabase.client, "article-x", bodyImagePaths(firstBody, BASE));
    expect(supabase.rows).toEqual([{ article_id: "article-x", storage_path: "u/one.png" }]);
    expect(supabase.removedPaths).toEqual([]);

    // Second save: image replaced -> old object removed, new row recorded.
    const secondBody = articleBodyBase.replace("%SRC%", `${BASE}/storage/v1/object/public/article-images/u/two.png`);
    await reconcileArticleBodyImages(supabase.client, "article-x", bodyImagePaths(secondBody, BASE));
    expect(supabase.rows).toEqual([{ article_id: "article-x", storage_path: "u/two.png" }]);
    expect(supabase.removedPaths).toEqual(["u/one.png"]);

    // Third save: image removed from the body -> row gone, object deleted.
    await reconcileArticleBodyImages(supabase.client, "article-x", bodyImagePaths("<p>Text only.</p>", BASE));
    expect(supabase.rows).toEqual([]);
    expect(supabase.removedPaths).toEqual(["u/one.png", "u/two.png"]);
  });

  it("keeps the save flowing with a warning when a storage deletion fails", async () => {
    const supabase = statefulSupabase();
    supabase.rows.push({ article_id: "article-x", storage_path: "u/keep.png" });
    await reconcileArticleBodyImages(supabase.client, "article-x", []);
    expect(supabase.rows).toEqual([]);
    expect(supabase.removedPaths).toEqual(["u/keep.png"]);

    // A failure cleaning storage is reported but the reference removal still ran.
    supabase.rows.push({ article_id: "article-x", storage_path: "u/fail.png" });
    supabase.removeError("storage unavailable");
    const result = await reconcileArticleBodyImages(supabase.client, "article-x", []);
    expect(result.cleanupIncomplete).toBe(true);
    expect(supabase.rows).toEqual([]);
  });
});