import { describe, expect, it } from "vitest";
import { finalBallotInputSchema, gameVoteInputSchema, parseFinalBallotForm, parseGameVoteForm } from "@/features/go-force/schemas";

const selectionId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

describe("Go Force input schemas", () => {
  it("accepts go and no-go game votes", () => {
    expect(gameVoteInputSchema.safeParse({ selectionId, choice: "go" }).success).toBe(true);
    expect(gameVoteInputSchema.safeParse({ selectionId, choice: "no-go" }).success).toBe(true);
  });

  it("rejects abstentions and malformed selection ids from player input", () => {
    expect(gameVoteInputSchema.safeParse({ selectionId, choice: "abstain" }).success).toBe(false);
    expect(gameVoteInputSchema.safeParse({ selectionId: "not-a-uuid", choice: "go" }).success).toBe(false);
  });

  it("trims an optional final-ballot remark", () => {
    const parsed = finalBallotInputSchema.safeParse({ sessionId, finalistGameId: selectionId, remark: "  Still thinking  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.remark).toBe("Still thinking");
  });

  it("rejects a remark over 500 characters", () => {
    expect(
      finalBallotInputSchema.safeParse({ sessionId, finalistGameId: selectionId, remark: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejects a missing finalist", () => {
    expect(finalBallotInputSchema.safeParse({ sessionId, finalistGameId: "", remark: "" }).success).toBe(false);
  });

  it("reads hidden form fields for votes and ballots", () => {
    const voteForm = new FormData();
    voteForm.set("selectionId", selectionId);
    voteForm.set("choice", "no-go");
    expect(parseGameVoteForm(voteForm).success).toBe(true);

    const ballotForm = new FormData();
    ballotForm.set("sessionId", sessionId);
    ballotForm.set("finalistGameId", selectionId);
    ballotForm.set("remark", "A remarkable year.");
    const ballot = parseFinalBallotForm(ballotForm);
    expect(ballot.success).toBe(true);
    if (ballot.success) expect(ballot.data.remark).toBe("A remarkable year.");
  });
});
