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

test("the home hero carries the channel motto and the real neon GA logo", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".masthead__motto")).toHaveText("#fortheloveofgaming");
  const logo = page.locator(".masthead__mark");
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("src", /neon-GA-trans-01\.png/);
  await expect(logo).toHaveAttribute("alt", "");
});

test("the header shows the complete wordmark on every page", async ({ page }) => {
  await page.goto("/articles/a-new-chapter-for-independent-games");
  await expect(page.getByRole("link", { name: "Game Ako Chronicles home" })).toContainText("Game Ako Chronicles");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "Game Ako Chronicles home" })).toBeVisible();
});

test("the footer explains what Game Ako is on home and article pages", async ({ page }) => {
  for (const path of ["/", "/articles/a-new-chapter-for-independent-games"]) {
    await page.goto(path);
    await expect(page.locator(".site-footer__name")).toHaveText("Game Ako Chronicles");
    await expect(page.locator(".site-footer__about")).toContainText("independent gaming outlet");
    await expect(page.locator(".site-footer__motto")).toHaveText("#fortheloveofgaming");
  }
});