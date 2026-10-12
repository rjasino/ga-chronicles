import { expect, test } from "@playwright/test";
import { createManyPeople, deletePeople } from "./support/people";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("list paginates at 20 per page with accurate totals and no skips or repeats", async ({ page }) => {
  const prefix = `pag${Date.now().toString().slice(-6)}`;
  const ids = await createManyPeople(25, prefix);
  try {
    await signIn(page);
    await page.goto("/admin/users");
    const nav = page.getByRole("navigation", { name: "Pagination" });
    await expect(nav).toBeVisible();
    await expect(nav).toContainText(/Showing 1[–-]20 of \d+/);
    await expect(page.locator(".admin-list li")).toHaveCount(20);

    const firstPageNames = await page.locator(".admin-list li strong").allTextContents();
    await page.getByRole("link", { name: "Next", exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(nav).toContainText(/Showing 21[–-]/);
    const secondPageNames = await page.locator(".admin-list li strong").allTextContents();
    const overlap = firstPageNames.filter((name) => secondPageNames.includes(name));
    expect(overlap).toEqual([]);

    await page.getByRole("link", { name: "Previous", exact: true }).click();
    await expect(page).not.toHaveURL(/page=/);
    await expect(page.locator(".admin-list li")).toHaveCount(20);
  } finally {
    await deletePeople(ids);
  }
});

test("out-of-range and invalid pages resolve to a valid page", async ({ page }) => {
  const prefix = `pag${Date.now().toString().slice(-6)}`;
  const ids = await createManyPeople(25, prefix);
  try {
    await signIn(page);
    await page.goto("/admin/users?page=999");
    await expect(page).not.toHaveURL(/page=999/);
    await expect(page.locator(".admin-list li").first()).toBeVisible();

    await page.goto("/admin/users?page=abc");
    await expect(page.locator(".admin-list li").first()).toBeVisible();
  } finally {
    await deletePeople(ids);
  }
});

test("applying a filter returns the list to page 1", async ({ page }) => {
  const prefix = `pag${Date.now().toString().slice(-6)}`;
  const ids = await createManyPeople(25, prefix);
  try {
    await signIn(page);
    await page.goto("/admin/users?page=2");
    await expect(page).toHaveURL(/page=2/);
    await page.getByLabel("Search").fill(prefix);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/q=/);
    expect(new URL(page.url()).searchParams.has("page")).toBe(false);
    await expect(page.locator(".admin-list li").first()).toBeVisible();
  } finally {
    await deletePeople(ids);
  }
});