import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getVerifiedSession: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/session", () => ({ getVerifiedSession: mocks.getVerifiedSession }));

import { postComment, reportComment } from "@/features/comments/actions";
import { submitGoForceFinalBallot } from "@/features/go-force/ballot-actions";
import { deleteComment } from "@/features/moderation/actions";
import { updateCommentSettings } from "@/features/moderation/settings-actions";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function commentForm(body: string) {
  const formData = new FormData();
  formData.set("body", body);
  formData.set("articleId", "30000000-0000-4000-8000-000000000001");
  return formData;
}

function ballotForm() {
  const formData = new FormData();
  formData.set("sessionId", "40000000-0000-4000-8000-000000000001");
  formData.set("finalistGameId", "60000000-0000-4000-8000-000000000001");
  formData.set("remark", "");
  return formData;
}

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(spy.mock.calls.at(-1) ?? []);
}

describe("Server Action failure reporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "10000000-0000-4000-8000-000000000001",
      username: "reader",
      roles: ["reader"],
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("correlates an unexpected comment insert failure without leaking its message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({
      error: { code: "XX000", message: "insert failed password=hunter2" },
    });
    mocks.createClient.mockResolvedValue({ from: () => ({ insert }) });

    const result = await postComment({}, commentForm("A thoughtful comment."));

    expect(result.error).toBe("Your comment could not be posted. Please try again.");
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
    expect(consoleOutput(log)).not.toContain("hunter2");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("leaves an expected blocked-term result unchanged and unreported", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await postComment({}, commentForm("spoiler"));

    expect(result).toEqual({
      error: "This comment includes a blocked term. Edit it and try again.",
      body: "spoiler",
    });
    expect(result).not.toHaveProperty("errorId");
    expect(log).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("keeps the expected duplicate-report outcome free of an identifier", async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    mocks.createClient.mockResolvedValue({ from: () => ({ insert }) });
    const formData = new FormData();
    formData.set("commentId", "50000000-0000-4000-8000-000000000001");

    const result = await reportComment({}, formData);

    expect(result).toEqual({ error: "You have already reported this comment." });
    expect(result).not.toHaveProperty("errorId");
  });

  it("reports an unexpected report failure with a matching identifier", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const insert = vi.fn().mockResolvedValue({ error: { message: "database unavailable" } });
    mocks.createClient.mockResolvedValue({ from: () => ({ insert }) });
    const formData = new FormData();
    formData.set("commentId", "50000000-0000-4000-8000-000000000001");

    const result = await reportComment({}, formData);

    expect(result.error).toBe("The report could not be submitted. Please try again.");
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("keeps expected moderation threshold results out of diagnostics", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "20000000-0000-4000-8000-000000000001",
      username: "moderator",
      roles: ["moderator"],
    });
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "THRESHOLD_NOT_MET" },
    });
    mocks.createClient.mockResolvedValue({ rpc });
    const formData = new FormData();
    formData.set("commentId", "50000000-0000-4000-8000-000000000001");

    const result = await deleteComment({}, formData);

    expect(result).toEqual({ error: "The report threshold has not been reached." });
    expect(result).not.toHaveProperty("errorId");
    expect(log).not.toHaveBeenCalled();
  });

  it("reports an unexpected moderation failure with a matching identifier", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "20000000-0000-4000-8000-000000000001",
      username: "moderator",
      roles: ["moderator"],
    });
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "database unavailable" } });
    mocks.createClient.mockResolvedValue({ rpc });
    const formData = new FormData();
    formData.set("commentId", "50000000-0000-4000-8000-000000000001");

    const result = await deleteComment({}, formData);

    expect(result.error).toBe("This comment could not be removed.");
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("reports unexpected settings persistence failures", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getVerifiedSession.mockResolvedValue({
      userId: "20000000-0000-4000-8000-000000000002",
      username: "admin",
      roles: ["admin"],
    });
    const eq = vi.fn().mockResolvedValue({ error: { message: "write failed" } });
    mocks.createClient.mockResolvedValue({ from: () => ({ update: () => ({ eq }) }) });
    const formData = new FormData();
    formData.set("threshold", "3");
    formData.set("comments_enabled", "on");

    const result = await updateCommentSettings({}, formData);

    expect(result.error).toBe("Settings could not be saved.");
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("keeps known Go Force domain errors unreported", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "BALLOT_NOT_OPEN" } });
    mocks.createClient.mockResolvedValue({ rpc });

    const result = await submitGoForceFinalBallot({}, ballotForm());

    expect(result).toEqual({ error: "The final ballot is not open." });
    expect(result).not.toHaveProperty("errorId");
    expect(log).not.toHaveBeenCalled();
  });

  it("reports unexpected Go Force failures with a matching identifier", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "connection reset" } });
    mocks.createClient.mockResolvedValue({ rpc });

    const result = await submitGoForceFinalBallot({}, ballotForm());

    expect(result.error).toBe("Your final ballot could not be submitted.");
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("still returns the safe failure result when console output fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });
    const insert = vi.fn().mockResolvedValue({ error: { message: "insert failed" } });
    mocks.createClient.mockResolvedValue({ from: () => ({ insert }) });

    const result = await postComment({}, commentForm("A thoughtful comment."));

    expect(result.error).toBe("Your comment could not be posted. Please try again.");
    expect(result.errorId).toMatch(UUID_PATTERN);
  });
});
