import { expect, test } from "@playwright/test";

test("text fields share the same keyboard focus treatment across forms", async ({ page }) => {
  await page.goto("/sign-in");
  const signInUsername = page.getByLabel("Username");
  await signInUsername.focus();
  const signInOutline = await signInUsername.evaluate((node) => getComputedStyle(node).outlineColor + " " + getComputedStyle(node).outlineStyle);

  await page.goto("/sign-up");
  const signUpUsername = page.getByLabel("Username");
  await signUpUsername.focus();
  const signUpOutline = await signUpUsername.evaluate((node) => getComputedStyle(node).outlineColor + " " + getComputedStyle(node).outlineStyle);

  expect(signUpOutline).toBe(signInOutline);
  expect(signInOutline).not.toContain("none");
});

test("a sign-in error appears above the submit button", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localcontributor");
  await page.getByLabel("Password").fill("wrong-password-value");
  await page.getByRole("button", { name: "Sign in" }).click();
  const error = page.locator(".form-error");
  await expect(error).toContainText(/username or password is incorrect/i);
  const submit = page.getByRole("button", { name: "Sign in" });
  const errorBox = await error.boundingBox();
  const submitBox = await submit.boundingBox();
  expect(errorBox!.y).toBeLessThan(submitBox!.y);
});
