import { expect, test } from "@playwright/test";

test("the footer presents the channels as accessible social icons", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Facebook", "YouTube", "Twitch"]) {
    const link = page.getByRole("link", { name });
    await expect(link).toBeVisible();
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
  }
  await expect(page.locator(".site-footer__social-list a")).toHaveCount(3);
});

test("the footer shows a copyright line and placeholder links never send visitors away", async ({
  page,
}) => {
  await page.goto("/");
  const legal = page.locator(".site-footer__legal");
  await expect(legal).toContainText(/all rights reserved/i);
  await expect(legal).toContainText(/©\s*20\d\d Game Ako Chronicles/);

  await page.locator(".site-footer__social-list a").first().click();
  await expect(page).toHaveURL(/127\.0\.0\.1:3000/);
});
