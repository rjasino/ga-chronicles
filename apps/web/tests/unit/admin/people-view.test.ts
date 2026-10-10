import { describe, expect, it } from "vitest";
import {
  buildViewUrl,
  clampPage,
  DEFAULT_VIEW,
  PAGE_SIZE,
  parseView,
  roleRank,
  type PeopleView,
} from "@/features/admin/people-view";

describe("parseView", () => {
  it("returns defaults for empty or missing params", () => {
    expect(parseView({})).toEqual(DEFAULT_VIEW);
    expect(parseView(undefined as unknown as Record<string, string>)).toEqual(DEFAULT_VIEW);
  });

  it("accepts every documented filter/sort value", () => {
    const view = parseView({
      q: "  jane  ",
      role: "moderator",
      status: "disabled",
      sort: "created",
      dir: "desc",
      page: "3",
    });
    expect(view).toEqual({ q: "jane", role: "moderator", status: "disabled", sort: "created", dir: "desc", page: 3 });
  });

  it("trims the search value and caps it at 100 characters", () => {
    const view = parseView({ q: `  ${"a".repeat(150)}  ` });
    expect(view.q).toBe("a".repeat(100));
  });

  it("falls back to defaults for unknown role, status, sort, and dir values", () => {
    const view = parseView({ role: "superuser", status: "banned", sort: "height", dir: "sideways" });
    expect(view.role).toBe("any");
    expect(view.status).toBe("any");
    expect(view.sort).toBe("username");
    expect(view.dir).toBe("asc");
  });

  it("treats non-positive, fractional, and non-numeric pages as page 1", () => {
    expect(parseView({ page: "0" }).page).toBe(1);
    expect(parseView({ page: "-4" }).page).toBe(1);
    expect(parseView({ page: "2.5" }).page).toBe(1);
    expect(parseView({ page: "abc" }).page).toBe(1);
    expect(parseView({ page: "7" }).page).toBe(7);
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseView({ page: ["2", "9"] }).page).toBe(2);
    expect(parseView({ role: ["contributor", "admin"] }).role).toBe("contributor");
  });
});

describe("roleRank", () => {
  it("ranks the implicit reader (no grants) lowest", () => {
    expect(roleRank([])).toBe(0);
    expect(roleRank(["bogus"])).toBe(0);
  });

  it("ranks explicit roles by the fixed hierarchy", () => {
    expect(roleRank(["contributor"])).toBe(1);
    expect(roleRank(["moderator"])).toBe(2);
    expect(roleRank(["admin"])).toBe(3);
    expect(roleRank(["moderator"])).toBeGreaterThan(roleRank(["contributor"]));
    expect(roleRank(["admin"])).toBeGreaterThan(roleRank(["moderator"]));
  });

  it("returns the highest rank for multi-role people", () => {
    expect(roleRank(["contributor", "moderator"])).toBe(2);
    expect(roleRank(["moderator", "admin"])).toBe(3);
  });
});

describe("clampPage", () => {
  it("returns page 1 when there are no matches", () => {
    expect(clampPage(5, 0)).toBe(1);
  });

  it("clamps to the last valid page when the requested page is out of range", () => {
    expect(clampPage(99, 45)).toBe(3); // 45 / 20 = 3 pages
  });

  it("keeps valid pages and floors to one page at or below the page size", () => {
    expect(clampPage(1, 45)).toBe(1);
    expect(clampPage(3, 45)).toBe(3);
    expect(clampPage(2, 20)).toBe(1);
  });
});

describe("viewToSearchParams / buildViewUrl", () => {
  it("omits every default value so the default view maps to the bare path", () => {
    expect(buildViewUrl("/admin/users", DEFAULT_VIEW)).toBe("/admin/users");
  });

  it("serializes the explicit criteria into the query string", () => {
    const view: PeopleView = { q: "jane", role: "reader", status: "active", sort: "role", dir: "desc", page: 2 };
    const url = buildViewUrl("/admin/users", view);
    expect(url).toContain("q=jane");
    expect(url).toContain("role=reader");
    expect(url).toContain("status=active");
    expect(url).toContain("sort=role");
    expect(url).toContain("dir=desc");
    expect(url).toContain("page=2");
    expect(url.startsWith("/admin/users?")).toBe(true);
  });

  it("exports the fixed page size used by pagination", () => {
    expect(PAGE_SIZE).toBe(20);
  });
});