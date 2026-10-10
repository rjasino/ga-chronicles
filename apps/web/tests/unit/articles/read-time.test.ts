import { describe, expect, it } from "vitest";
import { estimateReadMinutes } from "@/features/articles/read-time";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");

describe("estimateReadMinutes", () => {
  it("returns at least one minute for an empty body", () => {
    expect(estimateReadMinutes("<p></p>")).toBe(1);
  });

  it("returns one minute for an image-only body", () => {
    expect(estimateReadMinutes('<p><img src="https://cdn.example.test/a.png" alt="a long descriptive alternative text"></p>')).toBe(1);
  });

  it("returns one minute for a markup-only body", () => {
    expect(estimateReadMinutes("<h2></h2><ul><li></li></ul>")).toBe(1);
  });

  it("counts legacy plain-text words directly", () => {
    expect(estimateReadMinutes(words(450))).toBe(3);
  });

  it("does not count markup as words", () => {
    expect(estimateReadMinutes(`<p><strong>${words(199)}</strong></p>`)).toBe(1);
  });

  it("separates words across block elements", () => {
    expect(estimateReadMinutes(`<p>${words(120)}</p><p>${words(120)}</p>`)).toBe(2);
  });

  it("rounds up at exactly 200 and 201 words", () => {
    expect(estimateReadMinutes(`<p>${words(200)}</p>`)).toBe(1);
    expect(estimateReadMinutes(`<p>${words(201)}</p>`)).toBe(2);
  });

  it("never returns less for a longer article", () => {
    const shorter = estimateReadMinutes(`<p>${words(300)}</p>`);
    const longer = estimateReadMinutes(`<p>${words(1200)}</p><p>${words(1200)}</p>`);
    expect(longer).toBeGreaterThanOrEqual(shorter);
  });
});
