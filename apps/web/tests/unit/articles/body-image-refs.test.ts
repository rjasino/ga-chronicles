import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { bodyImagePaths, extractBodyImageSrcs, reconcileArticleBodyImages } from "@/features/articles/body-image-refs";

const BASE = "http://127.0.0.1:54321";

type RefRow = { article_id: string; storage_path: string };

function buildMockSupabase(state: { rows: RefRow[]; removed: string[] }) {
  const storageRemove = vi.fn(async (paths: string[]) => {
    state.removed.push(...paths);
    return { error: null };
  });
  const client = {
    from: (table: string) => {
      if (table !== "article_body_images") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: (columnName: string, value: string) => {
            if (columnName === "storage_path") {
              return Promise.resolve({ data: state.rows.filter((r) => r.storage_path === value).map((r) => ({ storage_path: r.storage_path })), error: null });
            }
            return Promise.resolve({ data: state.rows.map((r) => ({ storage_path: r.storage_path })), error: null });
          },
        }),
        insert: async (rows: unknown[]) => {
          state.rows.push(...(rows as { article_id: string; storage_path: string }[]));
          return { error: null };
        },
        delete: () => ({
          eq: (column: string, value: string) => ({
            in: async (columnName: string, values: string[]) => {
              state.rows = state.rows.filter((r) => !(r.article_id === value && values.includes(r.storage_path)));
              return { error: null };
            },
          }),
        }),
      };
    },
    storage: { from: () => ({ remove: storageRemove }) },
  };
  return { client: client as unknown as SupabaseClient, storageRemove };
}

describe("body image reference extraction", () => {
  it("extracts every img src from a body", () => {
    const body = '<p>a</p><img src="http://127.0.0.1:54321/storage/v1/object/public/article-images/u/one.png" alt="1"><img src="https://elsewhere.test/x.png" alt="2">';
    expect(extractBodyImageSrcs(body)).toHaveLength(2);
  });

  it("reduces body images to unique storage paths for this instance and bucket", () => {
    const body =
      '<p>a</p><img src="http://127.0.0.1:54321/storage/v1/object/public/article-images/u/one.png"><img src="http://127.0.0.1:54321/storage/v1/object/public/article-images/u/one.png"><img src="http://127.0.0.1:54321/storage/v1/object/public/article-covers/u/cover.png">';
    expect(bodyImagePaths(body, BASE)).toEqual(["u/one.png"]);
  });
});

describe("reference reconciliation", () => {
  it("records newly referenced images and removes nothing", async () => {
    const state = { rows: [] as RefRow[], removed: [] as string[] };
    const { client, storageRemove } = buildMockSupabase(state);
    const result = await reconcileArticleBodyImages(client, "article-A", ["u/one.png", "u/two.png"]);
    expect(result.cleanupIncomplete).toBe(false);
    expect(state.rows).toHaveLength(2);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("removes unreferenced images and deletes their storage objects", async () => {
    const state = {
      rows: [{ article_id: "article-A", storage_path: "u/old.png" }] as RefRow[],
      removed: [] as string[],
    };
    const { client, storageRemove } = buildMockSupabase(state);
    const result = await reconcileArticleBodyImages(client, "article-A", []);
    expect(result.cleanupIncomplete).toBe(false);
    expect(state.rows).toHaveLength(0);
    expect(storageRemove).toHaveBeenCalledWith(["u/old.png"]);
    expect(state.removed).toContain("u/old.png");
  });

  it("does not delete a storage object another article still references", async () => {
    const state = {
      rows: [
        { article_id: "article-A", storage_path: "u/shared.png" },
        { article_id: "article-B", storage_path: "u/shared.png" },
      ] as RefRow[],
      removed: [] as string[],
    };
    const { client, storageRemove } = buildMockSupabase(state);
    const result = await reconcileArticleBodyImages(client, "article-A", []);
    expect(result.cleanupIncomplete).toBe(false);
    expect(state.rows).toEqual([{ article_id: "article-B", storage_path: "u/shared.png" }]);
    expect(storageRemove).not.toHaveBeenCalled();
  });

  it("keeps references that the new body still contains", async () => {
    const state = {
      rows: [
        { article_id: "article-A", storage_path: "u/keep.png" },
        { article_id: "article-A", storage_path: "u/drop.png" },
      ] as RefRow[],
      removed: [] as string[],
    };
    const { client, storageRemove } = buildMockSupabase(state);
    const result = await reconcileArticleBodyImages(client, "article-A", ["u/keep.png"]);
    expect(result.cleanupIncomplete).toBe(false);
    expect(state.rows).toEqual([{ article_id: "article-A", storage_path: "u/keep.png" }]);
    expect(storageRemove).toHaveBeenCalledWith(["u/drop.png"]);
  });
});