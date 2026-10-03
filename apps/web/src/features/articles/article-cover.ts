// Article cover images: thin cover-specific wrapper over the shared imagery helpers
// in body-image.ts so cover and inline-image rules stay in one place.

import {
  articleImageExtension,
  isLocalStorageUrl,
  storageObjectPath,
  validateImageFile,
} from "@/features/articles/body-image";

export const ARTICLE_COVER_BUCKET = "article-covers";
export const ARTICLE_COVER_MAX_SIZE = 10 * 1024 * 1024;

export function articleCoverExtension(contentType: string): string | null {
  return articleImageExtension(contentType);
}

export function validateArticleCover(file: {
  size: number;
  type: string;
  slice(start?: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
}): Promise<string | null> {
  return validateImageFile(file, ARTICLE_COVER_MAX_SIZE, "Cover images");
}

export function articleCoverStoragePath(imageUrl: string | null, supabaseUrl: string): string | null {
  return storageObjectPath(imageUrl, supabaseUrl, ARTICLE_COVER_BUCKET);
}

export function isLocalArticleCoverUrl(imageUrl: string | null, supabaseUrl: string): boolean {
  return isLocalStorageUrl(imageUrl, supabaseUrl, ARTICLE_COVER_BUCKET);
}