import type { SupabaseClient } from "@supabase/supabase-js";
import { ARTICLE_IMAGES_BUCKET, articleBodyImageStoragePath } from "@/features/articles/body-image";

// Lifecycle helpers for inline body images. The editor stores inline images in the
// `article-images` bucket and references them from the body; `article_body_images`
// records which storage paths an article references so replaced or removed images
// can be removed from storage once nothing references them anymore.

/** Extracts `src` values from `<img>` elements in a (sanitized) body. */
export function extractBodyImageSrcs(body: string): string[] {
  const srcs: string[] = [];
  const imgPattern = /<img\b[^>]*\bsrc="([^"]*)"/gi;
  let match: RegExpExecArray | null;
  while ((match = imgPattern.exec(body)) !== null) srcs.push(match[1]);
  return srcs;
}

/** Reduces a body to the unique `article-images` storage paths it references. */
export function bodyImagePaths(body: string, supabaseUrl: string): string[] {
  const paths = new Set<string>();
  for (const src of extractBodyImageSrcs(body)) {
    const path = articleBodyImageStoragePath(src, supabaseUrl);
    if (path) paths.add(path);
  }
  return [...paths];
}

export type ReconcileResult = { cleanupIncomplete: boolean };

/**
 * Makes the `article_body_images` rows for an article match the referenced paths,
 * then deletes any storage object whose last reference disappeared. Cleanup is
 * best-effort: failures are logged and reported but never block the article save.
 */
export async function reconcileArticleBodyImages(
  supabase: SupabaseClient,
  articleId: string,
  newPaths: string[],
): Promise<ReconcileResult> {
  const results: ReconcileResult = { cleanupIncomplete: false };
  const { data: existing, error: readError } = await supabase
    .from("article_body_images")
    .select("storage_path")
    .eq("article_id", articleId);
  if (readError) {
    console.error("Could not read article body image references.", readError);
    return { cleanupIncomplete: true };
  }

  const existingPaths = new Set((existing ?? []).map((row) => row.storage_path));
  const toAdd = [...new Set(newPaths)].filter((path) => !existingPaths.has(path));
  const toRemove = [...existingPaths].filter((path) => !newPaths.includes(path));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("article_body_images").insert(
      toAdd.map((storage_path) => ({ article_id: articleId, storage_path })),
    );
    if (insertError) console.error("Could not record article body image references.", insertError);
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("article_body_images")
      .delete()
      .eq("article_id", articleId)
      .in("storage_path", toRemove);
    if (deleteError) {
      console.error("Could not clear removed article body image references.", deleteError);
      return { ...results, cleanupIncomplete: true };
    }

    for (const path of toRemove) {
      const { data: stillReferenced, error: checkError } = await supabase
        .from("article_body_images")
        .select("storage_path")
        .eq("storage_path", path);
      if (checkError || (stillReferenced ?? []).length > 0) continue;
      const { error: removeError } = await supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([path]);
      if (removeError) {
        console.error("Could not remove an orphaned body image from storage.", removeError);
        results.cleanupIncomplete = true;
      }
    }
  }
  return results;
}