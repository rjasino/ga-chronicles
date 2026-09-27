import { describe, expect, it } from "vitest";
import { can } from "@/lib/authz/permissions";

describe("additive permissions", () => {
  it.each([
    [[], "read", true],
    [[], "comment", true],
    [["contributor"], "publish", true],
    [["moderator"], "moderate", true],
    [["admin"], "manageRoles", true],
    [["contributor", "moderator"], "publish", true],
    [["contributor", "moderator"], "moderate", true],
    [["moderator"], "publish", false],
    [["contributor"], "moderate", false],
    [["reader"], "manageSettings", false],
  ] as const)("roles %j %s => %s", (roles, action, allowed) => {
    expect(can(roles, action)).toBe(allowed);
  });
});
