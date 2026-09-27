import { describe, expect, it } from "vitest";
import { moderationEligibility } from "@/features/moderation/rules";

describe("moderation threshold", () => {
  it("requires a positive threshold and counts unique reporters only", () => {
    expect(() => moderationEligibility(["a", "a"], 0, ["moderator"])).toThrow();
    expect(moderationEligibility(["a", "a", "b"], 3, ["moderator"]).actionable).toBe(false);
    expect(moderationEligibility(["a", "b", "c"], 3, ["moderator"]).actionable).toBe(true);
  });
  it("allows admins to bypass the threshold", () => {
    expect(moderationEligibility(["a"], 4, ["admin"]).actionable).toBe(true);
  });
});
