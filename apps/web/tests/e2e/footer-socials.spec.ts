import { expect, test } from "@playwright/test";

test("the footer lists replaceable social placeholders for the upcoming channels", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Facebook", "YouTube", "Twitch"]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }
  await expect(page.locator(".site-footer__social-list a")).toHaveCount(3);
});

test("social placeholders are clearly forthcoming and never send visitors away", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-footer__forthcoming")).toContainText(/coming soon/i);
  await page.locator(".site-footer__social-list a").first().click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3000/);
});