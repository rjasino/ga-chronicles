import { expect, test } from "@playwright/test";

test("anonymous readers see rich content with container-fitted lazy images", async ({ page }) => {
  await page.goto("/articles/a-rich-reading-room");
  await expect(page.getByRole("heading", { name: "Small teams, big worlds" })).toBeVisible();
  await expect(page.locator(".story__body")).toContainText("launch-week");
  await expect(page.locator(".story__body ul li")).toHaveCount(2);
  await expect(page.locator('.story__body img')).toHaveAttribute("loading", "lazy");

  const image = page.locator(".story__body img");
  await expect(image).toBeVisible();
  const imageBox = await image.boundingBox();
  const columnBox = await page.locator(".story__body").boundingBox();
  expect(imageBox!.width).toBeLessThanOrEqual(columnBox!.width + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBox = await image.boundingBox();
  const mobileColumnBox = await page.locator(".story__body").boundingBox();
  expect(mobileBox!.width).toBeLessThanOrEqual(mobileColumnBox!.width + 1);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});

test("legacy plain-text articles still render readably", async ({ page }) => {
  await page.goto("/articles/a-new-chapter-for-independent-games");
  await expect(page.locator(".story__body")).toContainText("A launch-week field note");
  await expect(page.locator(".story__body p")).toHaveCount(2);
});