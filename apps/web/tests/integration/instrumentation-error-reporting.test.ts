import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "@/instrumentation";

type RequestContext = Parameters<typeof onRequestError>[1];
type ErrorContext = Parameters<typeof onRequestError>[2];

function requestFor(path = "/admin?token=query-secret"): RequestContext {
  return {
    path,
    method: "POST",
    headers: {
      authorization: "Bearer header-secret",
      cookie: "session=cookie-secret",
      "x-request-body": "body-secret",
    },
  };
}

function contextFor(overrides: Partial<ErrorContext> = {}): ErrorContext {
  return {
    routerKind: "App Router",
    routePath: "/app/admin/go-force/page",
    routeType: "action",
    renderSource: "react-server-components",
    revalidateReason: undefined,
    ...overrides,
  };
}

function consoleOutput(spy: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(spy.mock.calls.at(-1) ?? []);
}

describe("onRequestError instrumentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports an uncaught server error with safe route context and no request data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await onRequestError(
      new Error("database failed password=hunter2"),
      requestFor(),
      contextFor(),
    );

    expect(log).toHaveBeenCalledTimes(1);
    const output = consoleOutput(log);
    expect(output).toContain("next.request.action");
    expect(output).toContain("/app/admin/go-force/page");
    expect(output).toContain("App Router");
    for (const secret of [
      "hunter2",
      "header-secret",
      "cookie-secret",
      "body-secret",
      "query-secret",
    ]) {
      expect(output).not.toContain(secret);
    }
  });

  it("reports route handler and render stages with their own operation labels", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await onRequestError(new Error("route failed"), requestFor(), contextFor({ routeType: "route" }));
    expect(consoleOutput(log)).toContain("next.request.route");

    await onRequestError(new Error("render failed"), requestFor(), contextFor({ routeType: "render" }));
    expect(consoleOutput(log)).toContain("next.request.render");
    expect(log).toHaveBeenCalledTimes(2);
  });

  it("normalizes non-Error thrown values without failing the request pipeline", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      onRequestError({ unexpected: "payload" }, requestFor(), contextFor()),
    ).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledTimes(1);
    expect(consoleOutput(log)).toContain("next.request.action");
  });

  it("does not fail the request pipeline when console output fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console unavailable");
    });

    await expect(
      onRequestError(new Error("original failure"), requestFor(), contextFor()),
    ).resolves.toBeUndefined();
  });
});
