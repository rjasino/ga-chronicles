import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("admins provision multi-role users who can change their temporary password", async ({ page }) => {
  const suffix = Date.now();
  const username = `team${suffix}`;
  const initialPassword = "Temp-Password-953!";
  const updatedPassword = "Updated-Password-953!";
  await signIn(page, "localadmin", "local-admin-password");
  await page.goto("/admin/users/new");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Temporary password").fill(initialPassword);
  await page.getByRole("checkbox", { name: "Contributor" }).check();
  await page.getByRole("checkbox", { name: "Moderator" }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(/internal account created/i)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, username, initialPassword);
  await page.goto("/admin/articles");
  await expect(page.getByRole("heading", { name: "Your articles" })).toBeVisible();
  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
  await page.goto("/account/password");
  await page.getByLabel("New password").fill(updatedPassword);
  await page.getByLabel("Confirm password").fill(updatedPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "localadmin", "local-admin-password");
  await page.goto("/admin/users");
  const accountRow = page.locator(".admin-list li").filter({ hasText: username });
  await expect(accountRow.getByRole("checkbox", { name: "Contributor" })).toBeChecked();
  await expect(accountRow.getByRole("checkbox", { name: "Moderator" })).toBeChecked();
  await accountRow.getByRole("checkbox", { name: "Moderator" }).uncheck();
  await accountRow.getByRole("button", { name: "Save roles" }).click();
  await expect(accountRow.getByText("Role grants updated.")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, username, updatedPassword);
  await page.goto("/admin/moderation");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin/articles");
  await expect(page.getByRole("heading", { name: "Your articles" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, "localadmin", "local-admin-password");
  await page.goto("/admin/users");
  const refreshedRow = page.locator(".admin-list li").filter({ hasText: username });
  await refreshedRow.getByRole("checkbox", { name: "Moderator" }).check();
  await refreshedRow.getByRole("button", { name: "Save roles" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, username, updatedPassword);
  await page.goto("/admin/moderation");
  await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
});

test("public signup never offers internal roles", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText(/public signup creates a reader account/i)).toBeVisible();
});
