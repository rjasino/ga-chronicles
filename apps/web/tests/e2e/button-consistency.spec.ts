import { expect, test, type Page } from "@playwright/test";

const BLUE = "rgb(18, 58, 114)";
const RED = "rgb(198, 54, 61)";
const TRANSPARENT = "rgba(0, 0, 0, 0)";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("the Publish button uses the primary blue fill", async ({ page }) => {
  await signIn(page, "localcontributor", "local-contributor-password");
  await page.goto("/admin/articles/new");
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCSS("background-color", BLUE);
});

test("the Save draft button uses the secondary outline with no fill", async ({ page }) => {
  await signIn(page, "localcontributor", "local-contributor-password");
  await page.goto("/admin/articles/new");
  const saveDraft = page.getByRole("button", { name: "Save draft" });
  await expect(saveDraft).toHaveCSS("background-color", TRANSPARENT);
  await expect(saveDraft).toHaveCSS("border-top-color", BLUE);
});

test("the Remove article button uses the error red fill", async ({ page }) => {
  await signIn(page, "localmoderator", "local-moderator-password");
  await page.goto("/admin/moderation");
  await expect(page.getByRole("button", { name: "Remove article" }).first()).toHaveCSS("background-color", RED);
});

test("the Sign out control uses the text purpose with no fill", async ({ page }) => {
  await signIn(page, "localcontributor", "local-contributor-password");
  await expect(page.getByRole("button", { name: "Sign out" })).toHaveCSS("background-color", TRANSPARENT);
});
