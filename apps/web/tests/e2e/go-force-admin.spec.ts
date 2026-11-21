import path from "node:path";
import { expect, test } from "@playwright/test";

test("admins control Go Force visibility and maintain the annual list without redeploying", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();

  await page.goto("/admin/go-force");
  await expect(page.getByLabel("Round vote duration (seconds)")).toHaveValue("10");
  await expect(page.getByLabel("Final ballot duration (seconds)")).toHaveValue("10");
  const visibility = page.getByLabel("Show the public Go Force page");
  await expect(visibility).toBeChecked();
  await visibility.uncheck();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is hidden.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Go Force", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Go Force", level: 1 })).toBeVisible();
  await page.goto("/admin/go-force");

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
  await page.getByLabel("Developer (optional)").first().fill("Test Studio");
  await page.getByLabel("Publisher (optional)").first().fill("Test Publisher");
  await page.getByLabel("Genre (optional)").first().fill("Action");
  await page.getByLabel("Cover art URL (optional)").first().fill("https://example.test/game-cover.webp");
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
  await expect(editedRow.getByLabel("Developer (optional)")).toHaveValue("Test Studio");
  await expect(editedRow.getByLabel("Publisher (optional)")).toHaveValue("Test Publisher");
  await expect(editedRow.getByLabel("Genre (optional)")).toHaveValue("Action");
  await expect(editedRow.getByLabel("Cover art URL (optional)")).toHaveValue("https://example.test/game-cover.webp");

  await editedRow.getByLabel("Upload cover art (optional)").setInputFiles(path.resolve(process.cwd(), "../../docs/neon_ga_logo_2.png"));
  await editedRow.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Game updated.")).toBeVisible();
  await expect(editedRow.getByLabel("Cover art URL (optional)")).toHaveValue(/\/storage\/v1\/object\/public\/go-force-covers\//);
  await editedRow.getByRole("button", { name: "Remove" }).click();
  await expect(page.locator(`input[value="${editedTitle}"]`)).toBeHidden();

  await page.goto("/go-force");
  await expect(page.getByRole("heading", { name: "Go Force", level: 1 })).toBeVisible();
});

test("Go Force navigation is visible to admins always and rostered players only for visible active sessions", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/admin/go-force");

  const visibility = page.getByLabel("Show the public Go Force page");
  if (!(await visibility.isChecked())) {
    await visibility.check();
    await page.getByRole("button", { name: "Save visibility" }).click();
    await expect(page.getByText("The Go Force page is visible.")).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();

  const playerContext = await browser.newContext();
  const player = await playerContext.newPage();
  await player.goto("/sign-in");
  await player.getByLabel("Username").fill("localreader");
  await player.getByLabel("Password").fill("local-reader-password");
  await player.getByRole("button", { name: "Sign in" }).click();
  await expect(player).toHaveURL(/\/$/);
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toHaveCount(0);

  const gotyYear = 2000 + (Date.now() % 101);
  await page.getByLabel("GOTY year").last().fill(String(gotyYear));
  await page.getByLabel(/Local Reader \(localreader\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await expect(page.getByRole("link", { name: "Open the facilitator screen" })).toBeVisible();

  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();

  await visibility.uncheck();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is hidden.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();
  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toHaveCount(0);

  const readySession = page.locator("li").filter({ hasText: `GOTY ${gotyYear}` });
  await readySession.getByRole("button", { name: "Remove ready session" }).click();
  await visibility.check();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toHaveCount(0);

  await playerContext.close();
});
