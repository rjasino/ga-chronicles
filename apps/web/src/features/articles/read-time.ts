import { decodeHTML } from "entities";
import { isPlainTextBody } from "@/features/articles/richtext/rich-html";

const WORDS_PER_MINUTE = 200;
const BLOCK_BOUNDARY = /<\/?(?:p|h[1-6]|li|ul|ol|blockquote|br)\b[^>]*>/gi;

export function estimateReadMinutes(body: string): number {
  const text = isPlainTextBody(body) ? body : body.replace(BLOCK_BOUNDARY, " ").replace(/<[^>]*>/g, "");
  const words = decodeHTML(text)
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
