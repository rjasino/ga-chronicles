export function normalizeComment(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en").trim().replace(/\s+/g, " ");
}

export function findBlockedWord(text: string, terms: readonly string[]): string | null {
  const normalized = normalizeComment(text);
  if (!normalized) return null;
  for (const term of terms) {
    const candidate = normalizeComment(term);
    if (candidate && new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(candidate)}(?:$|[^\\p{L}\\p{N}])`, "u").test(normalized)) {
      return candidate;
    }
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const launchBlockedWords = ["spoiler"] as const;
