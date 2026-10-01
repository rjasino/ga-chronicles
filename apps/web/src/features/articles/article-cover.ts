export const ARTICLE_COVER_BUCKET = "article-covers";
export const ARTICLE_COVER_MAX_SIZE = 10 * 1024 * 1024;

type CoverFile = {
  size: number;
  type: string;
  slice(start?: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
};

const coverTypes = {
  "image/jpeg": { extension: "jpg", matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", matches: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a },
  "image/webp": { extension: "webp", matches: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
} satisfies Record<string, { extension: string; matches: (bytes: Uint8Array) => boolean }>;

export function articleCoverExtension(contentType: string): string | null {
  return Object.hasOwn(coverTypes, contentType) ? coverTypes[contentType as keyof typeof coverTypes].extension : null;
}

export async function validateArticleCover(file: CoverFile): Promise<string | null> {
  if (file.size === 0) return "Choose an image file.";
  if (file.size > ARTICLE_COVER_MAX_SIZE) return "Cover images must be 10 MiB or smaller.";

  const format = Object.hasOwn(coverTypes, file.type) ? coverTypes[file.type as keyof typeof coverTypes] : null;
  if (!format) return "Cover images must be JPEG, PNG, or WebP.";

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!format.matches(signature)) return "The selected file does not match its image format.";
  return null;
}

export function articleCoverStoragePath(imageUrl: string | null, supabaseUrl: string): string | null {
  if (!imageUrl) return null;
  try {
    const image = new URL(imageUrl);
    const supabase = new URL(supabaseUrl);
    const prefix = `/storage/v1/object/public/${ARTICLE_COVER_BUCKET}/`;
    if (image.origin !== supabase.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

export function isLocalArticleCoverUrl(imageUrl: string | null, supabaseUrl: string): boolean {
  if (!articleCoverStoragePath(imageUrl, supabaseUrl)) return false;
  try {
    const supabase = new URL(supabaseUrl);
    return supabase.protocol === "http:" && (supabase.hostname === "127.0.0.1" || supabase.hostname === "localhost");
  } catch {
    return false;
  }
}
