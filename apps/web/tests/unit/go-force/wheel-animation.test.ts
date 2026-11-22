import { describe, expect, it } from "vitest";
import { wheelAnimationDurationMs } from "@/features/go-force/wheel-animation";

function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function uint32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function webpWithFrameDurations(...durations: number[]): string {
  const chunks = durations.flatMap((duration) => {
    const frame = new Uint8Array(16);
    frame[12] = duration & 0xff;
    frame[13] = (duration >>> 8) & 0xff;
    frame[14] = (duration >>> 16) & 0xff;
    return [..."ANMF"]
      .map((character) => character.charCodeAt(0))
      .concat(uint32(frame.length), [...frame]);
  });
  const body = [..."WEBP"].map((character) => character.charCodeAt(0)).concat(chunks);
  return base64(
    Uint8Array.from([
      ..."RIFF".split("").map((character) => character.charCodeAt(0)),
      ...uint32(body.length),
      ...body,
    ]),
  );
}

describe("Wheel of Names animation duration", () => {
  it("sums non-looping animated WebP frame durations", () => {
    expect(wheelAnimationDurationMs(webpWithFrameDurations(120, 240, 80), "webp")).toBe(440);
  });

  it("returns zero for static or malformed media so it can be revealed immediately", () => {
    expect(
      wheelAnimationDurationMs(
        "UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NmgA",
        "webp",
      ),
    ).toBe(0);
    expect(wheelAnimationDurationMs("not-base64", "gif")).toBe(0);
  });

  it("sums animated GIF frame delays", () => {
    const bytes = Uint8Array.from([
      ...[..."GIF89a"].map((character) => character.charCodeAt(0)),
      1,
      0,
      1,
      0,
      0,
      0,
      0,
      0x21,
      0xf9,
      4,
      0,
      10,
      0,
      0,
      0,
      0x2c,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      1,
      0,
      0,
      0x21,
      0xf9,
      4,
      0,
      20,
      0,
      0,
      0,
      0x2c,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      0,
      0,
      2,
      1,
      0,
      0,
      0x3b,
    ]);
    expect(wheelAnimationDurationMs(base64(bytes), "gif")).toBe(300);
  });
});
