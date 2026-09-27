import { expect, test } from "@playwright/test";

test("public pages fit desktop and mobile viewports", async ({ page }) => {
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto("/articles/a-new-chapter-for-independent-games");
    expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(width);
    await page.goto("/sign-in");
    expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
