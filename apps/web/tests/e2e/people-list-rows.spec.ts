import { expect, test } from "@playwright/test";
import { createPerson, deletePeople } from "./support/people";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("each row shows email, status, and roles for identification", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  const rows = page.locator(".admin-list li");

  await expect(rows.filter({ hasText: "localadmin" })).toContainText("admin@example.test");
  await expect(rows.filter({ hasText: "localadmin" }).locator(".people-row__status")).toHaveText("active");
  await expect(rows.filter({ hasText: "localadmin" }).locator(".people-row__roles")).toHaveText("admin");

  await expect(rows.filter({ hasText: "localreader" }).locator(".people-row__roles")).toHaveText("reader");
  await expect(rows.filter({ hasText: "localmulti" }).locator(".people-row__roles")).toHaveText("contributor + moderator");
});

test("a person with no email on file shows the missing-email indicator", async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const username = `nomail${suffix}`;
  const id = await createPerson({ username, email: `${username}@example.test`, withEmail: false });
  try {
    await signIn(page);
    await page.goto(`/admin/users?q=${username}`);
    const row = page.locator(".admin-list li").filter({ hasText: username });
    await expect(row).toHaveCount(1);
    await expect(row.locator(".people-row__email")).toHaveText("no email on file");
  } finally {
    await deletePeople([id]);
  }
});

test("the per-row role assignment controls still render and update roles", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  const row = page.locator(".admin-list li").filter({ hasText: "localmulti" });
  await expect(row.getByRole("checkbox", { name: "Contributor" })).toBeChecked();
  await expect(row.getByRole("checkbox", { name: "Moderator" })).toBeChecked();
  await expect(row.getByRole("button", { name: "Save roles" })).toBeVisible();
});