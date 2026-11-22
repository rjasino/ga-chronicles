import { describe, expect, it } from "vitest";
import {
  canAccessGoForceSession,
  canCloseFinalBallot,
  canCloseSelection,
  canPublishResults,
  canStartGoForceSession,
  canSubmitFinalBallot,
  canSubmitGameVote,
  canSeeGoForceNavigation,
  canViewGoForcePage,
  canViewResults,
} from "@/features/go-force/access";

const gameMasterId = "33333333-3333-4333-8333-333333333333";
const playerId = "44444444-4444-4444-8444-444444444444";
const outsiderId = "55555555-5555-4555-8555-555555555555";

const baseContext = {
  roles: [] as const,
  session: { gameMasterId, status: "ready" as const },
  participantIds: [playerId],
};

describe("Go Force access rules", () => {
  it("lets admins see a hidden public page", () => {
    expect(canViewGoForcePage(false, ["reader"])).toBe(false);
    expect(canViewGoForcePage(true, ["reader"])).toBe(true);
    expect(canViewGoForcePage(false, ["admin"])).toBe(true);
  });

  it("shows navigation to admins always and to participants only on a visible active session", () => {
    expect(canSeeGoForceNavigation(false, false, ["admin"])).toBe(true);
    expect(canSeeGoForceNavigation(true, false, ["admin"])).toBe(true);
    expect(canSeeGoForceNavigation(true, true, ["reader"])).toBe(true);
    expect(canSeeGoForceNavigation(false, true, ["reader"])).toBe(false);
    expect(canSeeGoForceNavigation(true, false, ["reader"])).toBe(false);
  });

  it("admits the game master, roster players, and admins to a session", () => {
    expect(canAccessGoForceSession({ ...baseContext, userId: gameMasterId, roles: ["reader"] })).toBe(true);
    expect(canAccessGoForceSession({ ...baseContext, userId: playerId, roles: ["reader"] })).toBe(true);
    expect(canAccessGoForceSession({ ...baseContext, userId: "99999999-9999-4999-8999-999999999999", roles: ["admin"] })).toBe(true);
    expect(canAccessGoForceSession({ ...baseContext, userId: outsiderId, roles: ["reader"] })).toBe(false);
  });

  it("only controls a session as game master or admin", () => {
    expect(canStartGoForceSession({ ...baseContext, userId: gameMasterId, roles: [] })).toBe(true);
    expect(canStartGoForceSession({ ...baseContext, userId: playerId, roles: [] })).toBe(false);
    expect(canCloseSelection({ ...baseContext, userId: gameMasterId, roles: [], session: { gameMasterId, status: "live" } })).toBe(true);
    expect(canCloseFinalBallot({ ...baseContext, userId: gameMasterId, roles: [], session: { gameMasterId, status: "final_ballot" } })).toBe(true);
  });

  it("requires a completed published session for public results", () => {
    expect(canViewResults("complete", true, ["reader"])).toBe(true);
    expect(canViewResults("complete", false, ["reader"])).toBe(false);
    expect(canViewResults("final_ballot", true, ["reader"])).toBe(false);
    expect(canViewResults("final_ballot", false, ["admin"])).toBe(true);
    expect(canPublishResults("complete", ["admin"])).toBe(true);
    expect(canPublishResults("live", ["admin"])).toBe(false);
  });

  it("enforces go quotas and closed votes for player submissions", () => {
    const allowed = {
      sessionStatus: "live" as const,
      roundStatus: "active" as const,
      roundNumber: 1,
      votingClosed: false,
      isParticipant: true,
      hasSubmitted: false,
      usedGo: 2,
      choice: "go" as const,
    };
    expect(canSubmitGameVote(allowed)).toBe(true);
    expect(canSubmitGameVote({ ...allowed, usedGo: 3 })).toBe(false);
    expect(canSubmitGameVote({ ...allowed, usedGo: 3, choice: "no-go" })).toBe(true);
    expect(canSubmitGameVote({ ...allowed, hasSubmitted: true })).toBe(false);
    expect(canSubmitGameVote({ ...allowed, votingClosed: true })).toBe(false);
    expect(canSubmitGameVote({ ...allowed, isParticipant: false })).toBe(false);
    expect(canSubmitGameVote({ ...allowed, choice: "abstain" })).toBe(false);
  });

  it("accepts one final ballot from an active participant", () => {
    expect(canSubmitFinalBallot({ sessionStatus: "final_ballot", isParticipant: true, hasSubmitted: false })).toBe(true);
    expect(canSubmitFinalBallot({ sessionStatus: "final_ballot", isParticipant: true, hasSubmitted: true })).toBe(false);
    expect(canSubmitFinalBallot({ sessionStatus: "live", isParticipant: true, hasSubmitted: false })).toBe(false);
  });
});
