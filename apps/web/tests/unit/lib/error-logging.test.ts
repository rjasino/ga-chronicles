import { afterEach, describe, expect, it, vi } from "vitest";
import {
  failureResult,
  reportFailure,
  UNEXPECTED_ERROR_MESSAGE,
} from "@/lib/error-logging";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(spy.mock.calls.at(-1) ?? []);
}

describe("reportFailure", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes unknown error values and generates unique identifiers", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const fromString = reportFailure({ operation: "articles.save", error: "boom" });
    const fromUndefined = reportFailure({ operation: "articles.save", error: undefined });
    const fromPlainObject = reportFailure({
      operation: "articles.save",
      error: { name: "ProviderError", message: "provider rejected the request" },
    });

    expect(fromString.errorId).toMatch(UUID_PATTERN);
    expect(fromUndefined.errorId).toMatch(UUID_PATTERN);
    expect(fromString.errorId).not.toBe(fromUndefined.errorId);
    expect(fromString).toMatchObject({ errorName: "Error", message: "boom" });
    expect(fromUndefined).toMatchObject({ errorName: "UnknownError" });
    expect(fromPlainObject).toMatchObject({
      errorName: "ProviderError",
      message: "provider rejected the request",
    });
    expect(log).toHaveBeenCalledTimes(3);
  });

  it("never serializes an unknown object or its raw payload", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    reportFailure({
      operation: "auth.sign-in",
      error: { password: "hunter2", token: "secret-token" },
    });

    const output = consoleOutput(log);
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("secret-token");
    expect(output).not.toContain("[object Object]");
  });

  it("bounds operation, error name, message, and stack fields", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("x".repeat(2_000));
    error.name = "N".repeat(300);

    const diagnostic = reportFailure({ operation: "o".repeat(300), error });

    expect(diagnostic.operation.length).toBeLessThanOrEqual(120);
    expect(diagnostic.errorName.length).toBeLessThanOrEqual(120);
    expect(diagnostic.message.length).toBeLessThanOrEqual(500);
    expect(diagnostic.stack?.length ?? 0).toBeLessThanOrEqual(4_000);
    expect(consoleOutput(log).length).toBeLessThan(8_000);
  });

  it("redacts credentials, tokens, keys, emails, and long values", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const jwt = `eyJ${"a".repeat(20)}.${"b".repeat(20)}.${"c".repeat(20)}`;

    const diagnostic = reportFailure({
      operation: "provider.call",
      error: new Error(
        `request failed password=hunter2 Authorization: Bearer abc.def.ghi ${jwt} user@example.test ${"Q".repeat(200)}`,
      ),
    });

    const output = consoleOutput(log);
    for (const secret of ["hunter2", "abc.def.ghi", jwt, "user@example.test", "Q".repeat(200)]) {
      expect(output).not.toContain(secret);
    }
    expect(diagnostic.message).toContain("[REDACTED]");
  });

  it("keeps only allow-listed context fields with bounded values", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const diagnostic = reportFailure({
      operation: "next.request.action",
      error: new Error("render failed"),
      context: {
        routePath: "/app/admin/page",
        routeType: "action",
        status: 500,
        renderSource: "react-server-components",
        headers: { authorization: "Bearer secret" },
        cookies: "session=secret",
        query: "token=secret",
        body: { password: "hunter2" },
        operationPayload: "x".repeat(1_000),
        route: "route segment ".repeat(40),
      },
    });

    expect(diagnostic.context).toEqual({
      routePath: "/app/admin/page",
      routeType: "action",
      status: 500,
      renderSource: "react-server-components",
      route: expect.any(String),
    });
    expect(diagnostic.context?.route).toHaveLength(200);

    const output = consoleOutput(log);
    expect(output).not.toContain("authorization");
    expect(output).not.toContain("session=secret");
    expect(output).not.toContain("token=secret");
    expect(output).not.toContain("hunter2");
  });

  it("reports once with an identifier that matches the returned diagnostic", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const diagnostic = reportFailure({
      operation: "comments.post",
      error: new Error("insert failed"),
    });

    expect(log).toHaveBeenCalledTimes(1);
    expect(consoleOutput(log)).toContain(diagnostic.errorId);
    expect(consoleOutput(log)).toContain("comments.post");
  });

  it("does not throw when console output fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });

    expect(() =>
      reportFailure({ operation: "articles.save", error: new Error("original failure") }),
    ).not.toThrow();
  });
});

describe("failureResult", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a safe message with an identifier matching its console diagnostic", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = failureResult({
      operation: "moderation.delete-comment",
      error: new Error("permission denied for table comments"),
    });

    expect(result).toEqual({ error: UNEXPECTED_ERROR_MESSAGE, errorId: expect.any(String) });
    expect(result.errorId).toMatch(UUID_PATTERN);
    expect(consoleOutput(log)).toContain(result.errorId);
  });

  it("preserves a provided safe message without exposing internal details", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const safeMessage = "Your comment could not be posted. Please try again.";

    const result = failureResult({
      operation: "comments.post",
      error: new Error("stack trace with password=hunter2"),
      message: safeMessage,
    });

    expect(result.error).toBe(safeMessage);
    expect(result.error).not.toContain("hunter2");
    expect(result).not.toHaveProperty("stack");
    expect(JSON.stringify(result)).not.toContain("hunter2");
    expect(consoleOutput(log)).not.toContain("hunter2");
  });

  it("still returns the safe result when console output fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });

    expect(() =>
      failureResult({
        operation: "articles.save",
        error: new Error("original failure"),
        message: "Could not save this article.",
      }),
    ).not.toThrow();

    expect(
      failureResult({
        operation: "articles.save",
        error: new Error("original failure"),
        message: "Could not save this article.",
      }),
    ).toMatchObject({ error: "Could not save this article.", errorId: expect.any(String) });
  });
});
