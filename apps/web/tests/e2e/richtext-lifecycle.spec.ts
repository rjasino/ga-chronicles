import { expect, test } from "@playwright/test";

test("removing an inline image updates the article and cleans up storage", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/articles/new");
  const title = `An image worth removing ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("A paragraph beside a screenshot.");
  await page.locator('input[name="body_image"]').setInputFiles("public/brand/neon_ga_logo_2.png");
  await expect(editor.locator("img")).toHaveCount(1);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText(/article published/i)).toBeVisible();

  const articleId = await page.locator('input[name="articleId"]').inputValue();
  const slug = title.toLowerCase().replaceAll(" ", "-");
  await page.goto(`/articles/${slug}`);
  await expect(page.locator(".story__body img")).toHaveCount(1);
  const imageUrl = await page.locator(".story__body img").getAttribute("src");
  expect(imageUrl).not.toBeNull();
  const before = await page.request.get(imageUrl!);
  expect(before.ok()).toBe(true);

  // Remove the image by clearing the editor, then republish the text-only body.
  await page.goto(`/admin/articles/${articleId}/edit`);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.keyboard.type("A paragraph that stands without a screenshot.");
  const publishResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes(`/admin/articles/${articleId}/edit`));
  await page.getByRole("button", { name: "Publish" }).click();
  await publishResponse;
  await expect(page.getByText(/article published/i)).toBeVisible();

  await page.goto(`/articles/${slug}`);
  await expect(page.locator(".story__body img")).toHaveCount(0);
  await expect(page.locator(".story__body")).toContainText("stands without a screenshot");
  const after = await page.request.get(imageUrl!);
  expect(after.ok()).toBe(false);
});

test("publishing an emptied editor body is rejected and preserves content", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/articles/new");
  const title = `An empty-body guard ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("Draft content that must survive a rejected publish.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/draft saved/i)).toBeVisible();

  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await page.getByRole("button", { name: "Publish" }).click();
  await expect(page.locator(".form-error")).toContainText(/article content/i);
  await expect(page.locator('input[name="articleId"]')).not.toHaveValue("");
  await expect(page.locator('input[name="body"]')).toHaveValue("<p></p>");
});