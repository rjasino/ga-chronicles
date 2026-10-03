import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("public home and sign-in have no axe violations", async ({ page }) => {
  for (const path of ["/", "/sign-in"]) {
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
});

test("keyboard users can reach the skip link and primary navigation", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Stories" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Latest stories" })).toBeVisible();
});

test("home brand text is real content and the hero logo is decorative", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".masthead__motto")).toHaveText("#fortheloveofgaming");
  await expect(page.locator(".masthead__mark")).toHaveAttribute("alt", "");
  await expect(page.locator(".site-footer__social-list a").first()).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(result.violations).toEqual([]);
});

test("authoring and moderation screens have no axe violations", async ({ page }) => {
  for (const [username, password, path] of [
    ["localcontributor", "local-contributor-password", "/admin/articles/new"],
    ["localmoderator", "local-moderator-password", "/admin/moderation"],
  ]) {
    await page.goto("/sign-in");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto(path);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(result.violations).toEqual([]);
    await page.getByRole("button", { name: "Sign out" }).click();
  }
});
