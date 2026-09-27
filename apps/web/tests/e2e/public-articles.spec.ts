import { expect, test } from "@playwright/test";

test("anonymous readers can open published stories but not drafts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /the games worth your time/i })).toBeVisible();
  await page.goto("/articles/a-new-chapter-for-independent-games");
  await expect(page.getByRole("article")).toContainText("A launch-week field note");
  await expect(page.getByRole("img", { name: /launch story cover/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  const draftResponse = await page.goto("/articles/private-preview-draft");
  expect(draftResponse?.status()).toBe(404);
});
