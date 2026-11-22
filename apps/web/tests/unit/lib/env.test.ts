import { afterEach, describe, expect, it, vi } from "vitest";
import { getWheelOfNamesApiKey } from "@/lib/env";
import { getPublicEnv } from "@/lib/public-env";

describe("Wheel of Names environment configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured server-side API key", () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "wheel-test-key");

    expect(getWheelOfNamesApiKey()).toBe("wheel-test-key");
  });

  it("rejects a missing API key with setup guidance", () => {
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "");

    expect(() => getWheelOfNamesApiKey()).toThrow(/WHEEL_OF_NAMES_API_KEY is required/i);
  });

  it("keeps the provider key out of public environment configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:55321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "local-anon-key");
    vi.stubEnv("WHEEL_OF_NAMES_API_KEY", "");

    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:55321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-anon-key",
    });
  });
});
