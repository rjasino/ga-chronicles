import { describe, expect, it } from "vitest";
import {
  annualGameInputSchema,
  createSessionSchema,
  goForceVotingSettingsSchema,
  pageVisibilitySchema,
  resultVisibilitySchema,
} from "@/features/go-force/admin-schemas";

describe("Go Force admin schemas", () => {
  it("requires a game title and a valid GOTY year", () => {
    expect(annualGameInputSchema.safeParse({ title: " ", gotyYear: 2026, eligibilityState: "eligible" }).success).toBe(false);
    expect(annualGameInputSchema.safeParse({ title: "Hades II", gotyYear: 1999, eligibilityState: "eligible" }).success).toBe(false);
    expect(annualGameInputSchema.safeParse({ title: "Hades II", gotyYear: "2026", eligibilityState: "eligible" }).success).toBe(true);
  });

  it("caps game titles at 200 characters", () => {
    expect(annualGameInputSchema.safeParse({ title: "x".repeat(201), gotyYear: 2026, eligibilityState: "eligible" }).success).toBe(false);
  });

  it("accepts optional game metadata and valid cover-art URLs", () => {
    expect(annualGameInputSchema.safeParse({
      title: "Hades II",
      gotyYear: 2026,
      eligibilityState: "eligible",
    }).success).toBe(true);
    expect(annualGameInputSchema.safeParse({
      title: "Hades II",
      gotyYear: 2026,
      eligibilityState: "eligible",
      developer: "Supergiant Games",
      publisher: "Supergiant Games",
      genre: "Roguelike",
      coverArtUrl: "https://cdn.example.test/hades-ii.webp",
    }).success).toBe(true);
    expect(annualGameInputSchema.safeParse({
      title: "Hades II",
      gotyYear: 2026,
      eligibilityState: "eligible",
      coverArtUrl: "javascript:alert(1)",
    }).success).toBe(false);
  });

  it("validates independently configurable voting timers", () => {
    const validSettings = {
      roundVotingSeconds: 10,
      roundVotingTimed: true,
      finalBallotSeconds: 10,
      finalBallotTimed: true,
      minimumRoundThreeGoVoters: 2,
    };
    expect(goForceVotingSettingsSchema.safeParse(validSettings).success).toBe(true);
    expect(
      goForceVotingSettingsSchema.safeParse({
        ...validSettings,
        roundVotingTimed: false,
        finalBallotTimed: false,
      }).success,
    ).toBe(true);
    expect(
      goForceVotingSettingsSchema.safeParse({ ...validSettings, roundVotingSeconds: 4 }).success,
    ).toBe(false);
    expect(
      goForceVotingSettingsSchema.safeParse({ ...validSettings, finalBallotSeconds: 601 }).success,
    ).toBe(false);
    expect(
      goForceVotingSettingsSchema.safeParse({
        ...validSettings,
        minimumRoundThreeGoVoters: 0,
      }).success,
    ).toBe(false);
    expect(
      goForceVotingSettingsSchema.safeParse({
        ...validSettings,
        minimumRoundThreeGoVoters: 65,
      }).success,
    ).toBe(false);
  });

  it("accepts only known eligibility states", () => {
    expect(annualGameInputSchema.safeParse({ title: "Balatro", gotyYear: 2026, eligibilityState: "eligible" }).success).toBe(true);
    expect(annualGameInputSchema.safeParse({ title: "Balatro", gotyYear: 2026, eligibilityState: "ineligible" }).success).toBe(true);
    expect(annualGameInputSchema.safeParse({ title: "Balatro", gotyYear: 2026, eligibilityState: "hidden" }).success).toBe(false);
  });

  it("reads the page visibility checkbox", () => {
    expect(pageVisibilitySchema.safeParse({ pageVisible: true }).success).toBe(true);
    expect(pageVisibilitySchema.safeParse({ pageVisible: false }).success).toBe(true);
  });

  it("requires a non-empty session roster", () => {
    expect(createSessionSchema.safeParse({ gotyYear: 2026, participantIds: [] }).success).toBe(false);
    expect(
      createSessionSchema.safeParse({
        gotyYear: 2026,
        participantIds: ["11111111-1111-4111-8111-111111111111"],
      }).success,
    ).toBe(true);
  });

  it("validates result publication input", () => {
    expect(
      resultVisibilitySchema.safeParse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        resultsVisible: true,
      }).success,
    ).toBe(true);
    expect(resultVisibilitySchema.safeParse({ sessionId: "nope", resultsVisible: true }).success).toBe(false);
  });
});
