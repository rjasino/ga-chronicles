import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("search narrows the list by username or email", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  const rows = page.locator(".admin-list li");
  await expect(rows.filter({ hasText: "localmoderator" })).toBeVisible();

  await page.getByLabel("Search").fill("localmoderator");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/\/admin\/users\?q=localmoderator/);
  await expect(rows.filter({ hasText: "localmoderator" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "localadmin" })).toHaveCount(0);

  await page.getByLabel("Search").fill("localadmin");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(rows.filter({ hasText: "localadmin" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "localmoderator" })).toHaveCount(0);
});

test("role and status filters combine and support the implicit reader role", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  const rows = page.locator(".admin-list li");

  await page.locator('select[name="role"]').selectOption("moderator");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(rows.filter({ hasText: "localmoderator" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "localmulti" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "localadmin" })).toHaveCount(0);

  // Reader filter shows accounts with no role grants only.
  await page.locator('select[name="role"]').selectOption("reader");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(rows.filter({ hasText: "localreader" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "localadmin" })).toHaveCount(0);

  // Combining moderator with status disabled matches nobody in the seed data.
  await page.locator('select[name="role"]').selectOption("moderator");
  await page.locator('select[name="status"]').selectOption("disabled");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(/no people match/i)).toBeVisible();
});

test("an unmatched filter shows the empty state with a clear-filters path", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/users");
  await page.getByLabel("Search").fill("no-such-person-anywhere");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText(/no people match/i)).toBeVisible();

  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.locator(".admin-list li").filter({ hasText: "localadmin" })).toBeVisible();
});