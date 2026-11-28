import { afterEach, describe, expect, it, vi } from "vitest";
import {
  spinWheelOfNames,
  type WheelOfNamesEntry,
} from "@/features/go-force/wheel-of-names-client";

const entries: WheelOfNamesEntry[] = [
  { id: "41000000-0000-4000-8000-000000000001", text: "Game One" },
  { id: "41000000-0000-4000-8000-000000000002", text: "Game Two" },
];

const validResponse = {
  animation:
    "UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NmgA",
  winner: { id: entries[1].id, text: entries[1].text },
};

describe("Wheel of Names client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("authenticates and builds a winner-removing wheel request", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(validResponse), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(spinWheelOfNames(entries)).resolves.toEqual({
      ...validResponse,
      animationFormat: "webp",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://wheelofnames.com/api/v3/wheels/animate");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-api-key")).toBe("wheel-test-key");
    expect(new Headers(init.headers).get("content-type")).toContain("application/json");
    expect(JSON.parse(String(init.body))).toEqual({
      wheelConfig: {
        title: "Go Force",
        autoRemoveWinner: true,
        entries,
      },
      imageFormat: "webp",
      size: 300,
      fps: 15,
      loop: false,
      responseFormat: "json",
    });
  });

  it("rejects an unknown provider winner ID", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...validResponse,
            winner: { id: "unknown-game", text: "Game One" },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(spinWheelOfNames(entries)).rejects.toMatchObject({
      message: expect.stringMatching(/not in the current game pool/i),
      reason: "invalid_winner",
    });
  });

  it("rejects a winner title that does not match its ID", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ...validResponse,
            winner: { id: entries[0].id, text: "A different game" },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(spinWheelOfNames(entries)).rejects.toMatchObject({
      message: expect.stringMatching(/winner title did not match/i),
      reason: "invalid_winner",
    });
  });

  it("keeps a validated winner when the animation is malformed", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            animation: "not-base64",
            winner: { id: entries[0].id, text: entries[0].text },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const result = await spinWheelOfNames(entries);
    expect(result).toMatchObject({
      winner: entries[0],
      animationFormat: "webp",
    });
    expect(result).not.toHaveProperty("animation");
  });

  it("validates a multi-megabyte animation without overflowing the stack", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    const animation = "A".repeat(9_886_656);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            animation,
            winner: { id: entries[0].id, text: entries[0].text },
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(spinWheelOfNames(entries)).resolves.toMatchObject({
      animation,
      winner: entries[0],
    });
  });

  it("continues without a malformed multi-megabyte animation", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const animation = `${"A".repeat(4_999_999)}!`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            animation,
            winner: { id: entries[0].id, text: entries[0].text },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await spinWheelOfNames(entries);
    expect(result).toMatchObject({ winner: entries[0] });
    expect(result).not.toHaveProperty("animation");
  });

  it("continues without animations larger than the configured size limit", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const animation = "A".repeat(12 * 1024 * 1024 + 4);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            animation,
            winner: { id: entries[0].id, text: entries[0].text },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await spinWheelOfNames(entries);
    expect(result).toMatchObject({ winner: entries[0] });
    expect(result).not.toHaveProperty("animation");
  });

  it("turns provider errors into a recoverable message", async () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));

    await expect(spinWheelOfNames(entries)).rejects.toMatchObject({
      message: expect.stringMatching(/could not complete the spin/i),
      reason: "availability",
    });
  });
});
