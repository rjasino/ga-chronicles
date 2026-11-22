import { expect, test } from "@playwright/test";

const completedSessionId = "60000000-0000-4000-8000-000000000001";

test("results stay hidden or incomplete until a completed session is published", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  const anonymous = await browser.newContext();
  const viewer = await anonymous.newPage();

  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Sessions" }).click();
  const completedRow = page.locator("li").filter({ hasText: "GOTY 2025" });
  await expect(completedRow.getByText(/complete/)).toBeVisible();
  const resultVisibility = completedRow.getByLabel("Public results page");
  if (await resultVisibility.isChecked()) {
    await resultVisibility.uncheck();
    await completedRow.getByRole("button", { name: "Save results visibility" }).click();
    await expect(completedRow.getByText("The results page is hidden.")).toBeVisible();
  }

  await viewer.goto(`/go-force/results/${completedSessionId}`);
  await expect(viewer.getByRole("heading", { name: "Article not found" })).toBeVisible();

  await resultVisibility.check();
  await completedRow.getByRole("button", { name: "Save results visibility" }).click();
  await expect(completedRow.getByText("The results page is public.")).toBeVisible();

  await viewer.reload();
  await expect(viewer.getByRole("heading", { name: "E2E Past Winner" })).toBeVisible();
  await expect(viewer.getByText(/Vote completion: 100%/)).toBeVisible();
  await expect(viewer.getByText("A year-defining world.")).toBeVisible();
  await expect(viewer.getByText("The one I kept replaying.")).toBeVisible();
  await expect(viewer.getByRole("heading", { name: "Round 3" })).toBeVisible();

  // An unfinished session never presents a public result page.
  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await page.getByLabel("GOTY year").last().fill("2028");
  await page.getByLabel(/Local Admin \(localadmin\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await page.getByRole("link", { name: "Open the facilitator screen" }).click();
  await expect(page).toHaveURL(/\/admin\/go-force\/sessions\/[0-9a-f-]+$/);
  const readySessionId = page.url().split("/").pop() as string;
  await viewer.goto(`/go-force/results/${readySessionId}`);
  await expect(viewer.getByRole("heading", { name: "Article not found" })).toBeVisible();

  await anonymous.close();
});
