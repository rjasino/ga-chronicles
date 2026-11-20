import { expect, test } from "@playwright/test";

test("admins control Go Force visibility and maintain the annual list without redeploying", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/go-force");
  const visibility = page.getByLabel("Show the public Go Force page");
  await expect(visibility).toBeChecked();
  await visibility.uncheck();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is hidden.")).toBeVisible();

  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto("/go-force");
  await expect(visitor.getByRole("heading", { name: "Article not found" })).toBeVisible();
  await anonymous.close();

  await page.getByLabel("Show the public Go Force page").check();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is visible.")).toBeVisible();

  const title = `E2E GOTY Game ${Date.now()}`;
  await page.getByLabel("Game title").first().fill(title);
  await page.getByLabel("GOTY year").first().fill("2027");
  await page.getByLabel("Eligibility").first().selectOption("eligible");
  await page.getByLabel("Display order").first().fill("5");
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText("Game added.")).toBeVisible();
  await expect(page.locator(`input[value="${title}"]`)).toBeVisible();

  const row = page.locator("li").filter({ has: page.locator(`input[value="${title}"]`) });
  const editedTitle = `${title} edited`;
  await row.getByLabel("Game title").fill(editedTitle);
  await row.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Game updated.")).toBeVisible();
  await expect(page.locator(`input[value="${editedTitle}"]`)).toBeVisible();

  const editedRow = page.locator("li").filter({ has: page.locator(`input[value="${editedTitle}"]`) });
  await editedRow.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator(`input[value="${editedTitle}"]`)).toBeHidden();

  await page.goto("/go-force");
  await expect(page.getByRole("heading", { name: "Go Force", level: 1 })).toBeVisible();
});
