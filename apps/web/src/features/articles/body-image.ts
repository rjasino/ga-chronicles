// Shared validation and storage-path helpers for article imagery.
// Both the article cover flow (article-cover.ts) and the inline body-image flow
// use these so image rules live in one place.

export const ARTICLE_IMAGES_BUCKET = "article-images";
export const ARTICLE_IMAGES_MAX_SIZE = 10 * 1024 * 1024;

/** Rounds up to one decimal so a file just over a limit never displays at the limit. */
export function formatImageSize(bytes: number): string {
  return `${(Math.ceil((bytes / (1024 * 1024)) * 10) / 10).toFixed(1)} MiB`;
}

export function imageTooLargeMessage(subject: string, fileSize: number, maxSizeBytes: number): string {
  return `${subject} must be ${maxSizeBytes / (1024 * 1024)} MiB or smaller. This image is ${formatImageSize(fileSize)}.`;
}

type ImageFile = {
  size: number;
  type: string;
  slice(start?: number, end?: number): { arrayBuffer(): Promise<ArrayBuffer> };
};

const imageFormats = {
  "image/jpeg": { extension: "jpg", matches: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", matches: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a },
  "image/webp": { extension: "webp", matches: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
} satisfies Record<string, { extension: string; matches: (bytes: Uint8Array) => boolean }>;

export function articleImageExtension(contentType: string): string | null {
  return Object.hasOwn(imageFormats, contentType) ? imageFormats[contentType as keyof typeof imageFormats].extension : null;
}

/**
 * Validates a chosen image file against the shared format table and a size limit.
 * Returns a plain-language error string, or `null` when the file is acceptable.
 * The `subject` names the field in user-facing messages (e.g. "Cover images").
 */
export async function validateImageFile(file: ImageFile, maxSizeBytes: number, subject: string): Promise<string | null> {
  if (file.size === 0) return "Choose an image file.";
  if (file.size > maxSizeBytes) return imageTooLargeMessage(subject, file.size, maxSizeBytes);

  const format = Object.hasOwn(imageFormats, file.type) ? imageFormats[file.type as keyof typeof imageFormats] : null;
  if (!format) return `${subject} must be JPEG, PNG, or WebP.`;

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!format.matches(signature)) return "The selected file does not match its image format.";
  return null;
}

/**
 * Extracts a storage object path from a public storage URL when the URL belongs to
 * this Supabase instance and the given bucket. Returns `null` for anything else,
 * including path segments that could traverse the bucket.
 */
export function storageObjectPath(imageUrl: string | null, supabaseUrl: string, bucket: string): string | null {
  if (!imageUrl) return null;
  try {
    const image = new URL(imageUrl);
    const supabase = new URL(supabaseUrl);
    const prefix = `/storage/v1/object/public/${bucket}/`;
    if (image.origin !== supabase.origin || !image.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(image.pathname.slice(prefix.length));
    if (!path || path.split("/").some((segment) => !segment || segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

/** True when the URL is a storage object served by a local Supabase instance. */
export function isLocalStorageUrl(imageUrl: string | null, supabaseUrl: string, bucket: string): boolean {
  if (!storageObjectPath(imageUrl, supabaseUrl, bucket)) return false;
  try {
    const supabase = new URL(supabaseUrl);
    return supabase.protocol === "http:" && (supabase.hostname === "127.0.0.1" || supabase.hostname === "localhost");
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Inline body-image helpers
// ---------------------------------------------------------------------------

export const ARTICLE_BODY_IMAGE_SUBJECT = "Inline images";

export async function validateArticleBodyImage(file: ImageFile): Promise<string | null> {
  return validateImageFile(file, ARTICLE_IMAGES_MAX_SIZE, ARTICLE_BODY_IMAGE_SUBJECT);
}

export function articleBodyImageStoragePath(imageUrl: string | null, supabaseUrl: string): string | null {
  return storageObjectPath(imageUrl, supabaseUrl, ARTICLE_IMAGES_BUCKET);
}

export function isLocalArticleBodyImageUrl(imageUrl: string | null, supabaseUrl: string): boolean {
  return isLocalStorageUrl(imageUrl, supabaseUrl, ARTICLE_IMAGES_BUCKET);
}