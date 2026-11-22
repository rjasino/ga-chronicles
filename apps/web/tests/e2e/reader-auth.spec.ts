import { expect, test } from "@playwright/test";

test("sign-in failures remain generic and retryable", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("not-a-real-user");
  await page.getByLabel("Password").fill("incorrect-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".form-error")).toContainText(/username or password is incorrect/i);
  await expect(page.getByLabel("Username")).toHaveValue("not-a-real-user");
  const createAccountLink = page.getByRole("link", { name: /create an account/i });
  await expect(createAccountLink).toBeVisible();
  await expect(createAccountLink).toHaveClass(/auth-signup-link/);
  await expect(createAccountLink).toHaveCSS("text-decoration-line", "underline");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
});

test("readers can register with username and password and recover from OAuth callback errors", async ({ page }) => {
  const username = `reader${Date.now()}`;
  const password = "Reader-Test-Password-953!";
  await page.goto("/sign-up");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@example.test`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/sign-in?error=oauth");
  await expect(page.locator(".form-error")).toContainText(/google sign-in did not finish/i);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toHaveCount(0);
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/auth/callback?error=access_denied");
  await expect(page).toHaveURL(/\/sign-in\?error=oauth$/);
  await expect(page.locator(".form-error")).toContainText(/google sign-in did not finish/i);
});
