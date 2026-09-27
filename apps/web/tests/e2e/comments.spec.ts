import { expect, test } from "@playwright/test";

test("signed-in readers can comment and report without hiding comments", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localreader");
  await page.getByLabel("Password").fill("local-reader-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/articles/a-new-chapter-for-independent-games");
  await page.getByLabel("Your comment").fill("This spoiler should not be accepted.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.locator(".form-error")).toContainText(/blocked term/i);
  await expect(page.getByLabel("Your comment")).toHaveValue("This spoiler should not be accepted.");

  const comment = `The world design made this one memorable ${Date.now()}.`;
  await page.getByLabel("Your comment").fill(comment);
  await page.getByRole("button", { name: "Post comment" }).click();
  const commentRow = page.locator(".comment-list li").filter({ hasText: comment });
  await expect(commentRow).toBeVisible();
  await commentRow.getByRole("button", { name: "Report" }).click();
  await expect(commentRow.getByText(/report sent to the moderation team/i)).toBeVisible();
  await expect(commentRow.getByText(comment)).toBeVisible();
  await commentRow.getByRole("button", { name: "Report" }).click();
  await expect(commentRow.getByText(/already reported/i)).toBeVisible();
});
