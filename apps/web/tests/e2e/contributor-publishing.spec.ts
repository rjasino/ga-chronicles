import { expect, test } from "@playwright/test";

test("contributors can preserve, preview, and publish drafts", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin/articles/new");
  const title = `A browser-tested story ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("An opening paragraph for readers.");
  await page.getByLabel("Cover image").setInputFiles("public/brand/neon_ga_logo_2.png");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/draft saved/i)).toBeVisible();

  const articleId = await page.locator('input[name="articleId"]').inputValue();
  await page.goto(`/admin/articles/${articleId}/preview`);
  await expect(page.getByText(/private preview/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".story__cover img")).toBeVisible();

  await page.goto(`/admin/articles/${articleId}/edit`);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator(".form-error")).toContainText(/article content/i);
  await expect(page.locator('input[name="body"]')).toHaveValue("<p></p>");
  await editor.click();
  await page.keyboard.type("An opening paragraph for readers.");
  const publishResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/admin/articles/${articleId}/edit`));
  await page.getByRole("button", { name: "Publish" }).click();
  await publishResponse;
  await expect(page.getByText(/article published/i)).toBeVisible();
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("A revised paragraph after editorial review.");
  const republishResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/admin/articles/${articleId}/edit`));
  await page.getByRole("button", { name: "Publish" }).click();
  await republishResponse;
  await expect(page.getByText(/article published/i)).toBeVisible();
  await page.goto(`/articles/${title.toLowerCase().replaceAll(" ", "-")}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".story__body")).toContainText("A revised paragraph after editorial review.");
  await expect(page.locator(".story__cover img")).toBeVisible();

  await page.goto(`/admin/articles/${articleId}/edit`);
  await page.getByLabel("Remove current cover image").check();
  const removeCoverResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/admin/articles/${articleId}/edit`));
  await page.getByRole("button", { name: "Publish" }).click();
  await removeCoverResponse;
  await expect(page.getByText(/article published/i)).toBeVisible();
  await page.goto(`/articles/${title.toLowerCase().replaceAll(" ", "-")}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".story__cover img")).toHaveCount(0);
});

test("moderator-only accounts cannot author articles", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localmoderator");
  await page.getByLabel("Password").fill("local-moderator-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin/articles/new");
  await expect(page).toHaveURL(/\/$/);
});