import { expect, test, type Page } from "@playwright/test";

async function signInAsContributor(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("local-contributor-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

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

test("Editorial desk is the page heading", async ({ page }) => {
  await signInAsContributor(page);
  await page.goto("/admin/articles/new");
  await expect(page.getByRole("heading", { level: 1, name: "Editorial desk" })).toBeVisible();
});

test("the formatting toolbar stays at the top of the viewport while a long article is scrolled", async ({ page }) => {
  await signInAsContributor(page);
  await page.goto("/admin/articles/new");
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  for (let index = 1; index <= 40; index += 1) {
    await page.keyboard.type(`Paragraph ${index} of a long article.`);
    await page.keyboard.press("Enter");
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const toolbar = page.getByRole("toolbar", { name: "Article body formatting" });
  const box = await toolbar.boundingBox();
  expect(box?.y ?? 999).toBeLessThanOrEqual(1);
});

test("an applied link is styled in the editor before saving", async ({ page }) => {
  await signInAsContributor(page);
  await page.goto("/admin/articles/new");
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("Read the official notes today");
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.getByRole("button", { name: "Link" }).click();
  await page.getByLabel("Link URL").fill("example.com");
  await page.getByRole("button", { name: "Apply link" }).click();
  const link = editor.locator("a", { hasText: "Read" });
  await expect(link).toHaveCount(1);
  await expect(link).toHaveCSS("text-decoration-line", /underline/);
  await expect(page.locator('input[name="body"]')).toHaveValue(/<a href="https:\/\/example\.com"/);
});

test("bulleted and numbered lists render with visible markers", async ({ page }) => {
  await signInAsContributor(page);
  await page.goto("/admin/articles/new");
  const title = `Lists story ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("First item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Second item");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Third item");
  await page.keyboard.press("Control+A");
  await page.getByRole("button", { name: "Bulleted list" }).click();
  await expect(editor.locator("ul > li")).toHaveCount(3);
  await expect(editor.locator("ul")).toHaveCSS("list-style-type", "disc");

  await page.getByRole("button", { name: "Bulleted list" }).click();
  await expect(editor.locator("ul")).toHaveCount(0);

  await page.keyboard.press("Control+A");
  await page.getByRole("button", { name: "Numbered list" }).click();
  await expect(editor.locator("ol > li")).toHaveCount(3);
  await expect(editor.locator("ol")).toHaveCSS("list-style-type", "decimal");

  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/draft saved/i)).toBeVisible();
  const articleId = await page.locator('input[name="articleId"]').inputValue();
  await page.goto(`/admin/articles/${articleId}/preview`);
  await expect(page.locator(".story__body ol")).toHaveCSS("list-style-type", "decimal", { timeout: 15000 });
});

test("an inline image upload blocks the page with a loading dialog until it finishes", async ({ page }) => {
  await signInAsContributor(page);
  await page.route("**/admin/articles/new", async (route) => {
    if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto("/admin/articles/new");
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("Waiting for an image.");

  await page.locator('input[name="body_image"]').setInputFiles("public/brand/neon_ga_logo_2.png");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel("Title").click({ timeout: 800 })).rejects.toThrow();
  await expect(dialog).toBeHidden({ timeout: 15000 });
  await expect(editor.locator("img")).toHaveCount(1);
});

test("oversized inline images show the size limit and are not inserted", async ({ page }) => {
  await signInAsContributor(page);
  await page.goto("/admin/articles/new");
  const editor = page.getByRole("textbox", { name: "Article body" });
  await editor.click();
  await page.keyboard.type("Still entering text.");

  await page.locator('input[name="body_image"]').setInputFiles({
    name: "huge.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.locator(".rich-editor .form-error")).toContainText("Inline images must be 10 MiB or smaller. This image is 10.1 MiB.");
  await expect(editor.locator("img")).toHaveCount(0);

  await page.locator('input[name="body_image"]').setInputFiles("public/brand/neon_ga_logo_2.png");
  await expect(editor.locator("img")).toHaveCount(1);
  await expect(page.locator(".rich-editor .form-error")).toHaveCount(0);
});