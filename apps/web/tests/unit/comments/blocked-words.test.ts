import { describe, expect, it } from "vitest";
import { findBlockedWord, normalizeComment } from "@/features/comments/blocked-words";

describe("blocked comment terms", () => {
  it("normalizes case, accents, and whitespace", () => {
    expect(normalizeComment("  CAFÉ   game ")).toBe("cafe game");
  });
  it("matches blocked terms as words, not substrings", () => {
    expect(findBlockedWord("that is a spoiler", ["spoiler"])).toBe("spoiler");
    expect(findBlockedWord("spoilers are fine", ["spoiler"])).toBeNull();
  });
  it("rejects empty comments", () => {
    expect(normalizeComment("   ")).toBe("");
  });
});
