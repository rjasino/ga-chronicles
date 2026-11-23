import { afterEach, describe, expect, it, vi } from "vitest";
import {
  failureResult,
  UNEXPECTED_ERROR_MESSAGE,
} from "@/lib/error-logging";

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(spy.mock.calls.at(-1) ?? []);
}

describe("Server Action error contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a safe error and correlatable identifier for unexpected failures", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = failureResult({
      operation: "comments.post",
      error: new Error("permission denied for table comments"),
    });

    expect(result).toEqual({
      error: UNEXPECTED_ERROR_MESSAGE,
      errorId: expect.any(String),
    });
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("keeps expected validation results free of identifiers and diagnostics", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const expected = { error: "Check the submitted values and try again." };

    expect(expected).not.toHaveProperty("errorId");
    expect(log).not.toHaveBeenCalled();
  });

  it("never returns internal exception details to the client", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const internal = new Error("connection refused password=hunter2");

    const result = failureResult({
      operation: "articles.save",
      error: internal,
      message: "Could not save this article. Check the title is unique and try again.",
    });

    const serialized = JSON.stringify(result);
    for (const internalDetail of ["connection refused", "hunter2", "stack", "Error:"]) {
      expect(serialized).not.toContain(internalDetail);
    }
  });

  it("returns the safe result even when the diagnostic console write fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });

    const result = failureResult({
      operation: "comments.post",
      error: new Error("original failure"),
      message: "Your comment could not be posted. Please try again.",
    });

    expect(result.error).toBe("Your comment could not be posted. Please try again.");
    expect(result.errorId).toEqual(expect.any(String));
  });
});
