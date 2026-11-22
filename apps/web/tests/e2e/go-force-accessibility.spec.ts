import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test("player and facilitator screens are responsive, keyboard reachable, and axe-clean", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await page.getByLabel("GOTY year").last().fill("2029");
  await page.getByLabel(/Local Admin \(localadmin\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await page.getByRole("link", { name: "Open the facilitator screen" }).click();
  await expect(page).toHaveURL(/\/admin\/go-force\/sessions\/[0-9a-f-]+$/);
  const sessionId = page.url().split("/").pop() as string;

  const readyResult = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(readyResult.violations).toEqual([]);

  const start = page.getByRole("button", { name: "Start session" });
  await start.focus();
  await expect(start).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Round 1 of 3")).toBeVisible();

  const facilitatorResult = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(facilitatorResult.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Spin the roulette" })).toBeVisible();
  expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(390);

  await page.goto(`/go-force/session/${sessionId}`);
  await expect(page.getByRole("heading", { name: "Your vote screen" })).toBeVisible();
  const playerResult = await new AxeBuilder({ page }).withTags(tags).analyze();
  expect(playerResult.violations).toEqual([]);
  expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(390);
});
