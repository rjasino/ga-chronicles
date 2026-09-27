import { describe, expect, it } from "vitest";
import { accountInputSchema, passwordChangeSchema } from "@/features/admin/account-schema";

describe("account management validation", () => {
  it("normalizes username and accepts additive role selection", () => {
    expect(accountInputSchema.parse({ username: "  New.Editor ", email: "editor@example.test", roles: ["contributor", "moderator"] }).username).toBe("new.editor");
  });
  it("rejects invalid usernames and weak password changes", () => {
    expect(accountInputSchema.safeParse({ username: "x", email: "a@example.test", roles: [] }).success).toBe(false);
    expect(accountInputSchema.safeParse({ username: "newuser", email: "a@example.test", password: "Strong-Password-1", roles: ["admin"] }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ password: "tiny", confirm: "tiny" }).success).toBe(false);
  });
});
