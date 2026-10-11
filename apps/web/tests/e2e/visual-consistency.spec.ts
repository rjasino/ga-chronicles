import { expect, test, type Page } from "@playwright/test";

const pages = [
  { name: "home", path: "/" },
  { name: "article", path: "/articles/a-new-chapter-for-independent-games" },
  { name: "sign-in", path: "/sign-in" },
  { name: "sign-up", path: "/sign-up" },
  { name: "account-password", path: "/account/password", login: ["localcontributor", "local-contributor-password"] },
  { name: "admin-article-editor", path: "/admin/articles/new", login: ["localcontributor", "local-contributor-password"] },
  { name: "admin-moderation", path: "/admin/moderation", login: ["localmoderator", "local-moderator-password"] },
  { name: "admin-users", path: "/admin/users", login: ["localadmin", "local-admin-password"] },
] as const;

const viewports = [390, 1440];
const themes = ["light", "dark"] as const;

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function setTheme(page: Page, theme: (typeof themes)[number]) {
  const toggle = page.getByRole("button", { name: /dark mode/i });
  const isDark = (await toggle.getAttribute("aria-pressed")) === "true";
  if ((theme === "dark") !== isDark) await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

for (const entry of pages) {
  for (const theme of themes) {
    for (const width of viewports) {
      test(`${entry.name} matches its ${theme} ${width}px baseline`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        if ("login" in entry) await signIn(page, entry.login[0], entry.login[1]);
        await page.goto(entry.path);
        await setTheme(page, theme);
        await page.evaluate(() => document.fonts.ready);
        await expect(page).toHaveScreenshot(`${entry.name}-${theme}-${width}.png`, {
          fullPage: true,
          animations: "disabled",
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
}
