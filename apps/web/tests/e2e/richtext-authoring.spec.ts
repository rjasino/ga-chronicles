import { expect, test } from "@playwright/test";

test("contributors can author a rich article with an inline image and preview it", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/articles/new");
  const title = `A rich story ${Date.now()}`;
  await page.getByLabel("Title").fill(title);

  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.getByRole("button", { name: "Heading 2" }).click();
  await page.keyboard.type("Small teams, big moods");
  await page.keyboard.press("Enter");
  await page.keyboard.type("An opening paragraph for readers.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("A bold closing line.");
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+End");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.keyboard.press("End");
  await expect(page.locator('input[name="body"]')).toHaveValue(/<strong>A bold closing line\.<\/strong>/);

  await page.locator('input[name="body_image"]').setInputFiles("public/brand/neon_ga_logo_2.png");
  await expect(editor.locator("img")).toHaveCount(1);
  await expect(page.locator(".rich-editor .form-error")).toHaveCount(0);

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/draft saved/i)).toBeVisible();

  const articleId = await page.locator('input[name="articleId"]').inputValue();
  await page.goto(`/admin/articles/${articleId}/preview`);
  await expect(page.getByRole("heading", { name: "Small teams, big moods" }), "preview heading appears").toBeVisible({ timeout: 15000 });
  await expect(page.locator(".story__body")).toContainText("An opening paragraph for readers.", { timeout: 15000 });
  await expect(page.locator(".story__body strong"), "bold closing line renders as bold").toContainText("A bold closing line.", { timeout: 15000 });
  await expect(page.locator(".story__body img"), "inline image renders in preview").toHaveCount(1, { timeout: 15000 });
});

test("contributors receive a clear error for unsupported body images", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/articles/new");
  const title = `Rejected image ${Date.now()}`;
  await page.getByLabel("Title").fill(title);

  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("Still entering text.");

  await page.locator('input[name="body_image"]').setInputFiles("tests/fixtures/richtext-inline-image.svg");
  await expect(page.locator(".rich-editor .form-error")).toContainText(/JPEG, PNG, or WebP/);
  await expect(page.locator('input[name="body"]')).toHaveValue(/Still entering text/);
  await expect(editor.locator("img")).toHaveCount(0);
});