import { expect, test, type Page } from "@playwright/test";

async function signInAdmin(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("facilitator can toggle fallback mode before and during a session and draw all remaining games without repeats", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signInAdmin(page);
  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Annual games" }).click();

  const gotyYear = 2040 + (Date.now() % 50);
  const runId = Date.now();
  const fixtureTitles = Array.from(
    { length: 3 },
    (_, index) => `Fallback E2E ${runId} Game ${index + 1}`,
  );

  for (const [index, title] of fixtureTitles.entries()) {
    await page.getByLabel("Game title").first().fill(title);
    await page.getByLabel("GOTY year").first().fill(String(gotyYear));
    await page
      .getByLabel("Display order")
      .first()
      .fill(String(index + 1));
    await page.getByRole("button", { name: "Add game" }).click();
    await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();
  }

  await page.getByRole("tab", { name: "Sessions" }).click();
  await page.getByLabel("GOTY year").last().fill(String(gotyYear));
  await page.getByLabel(/Local Admin \(localadmin\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await page.getByRole("link", { name: "Open the facilitator screen" }).click();
  await expect(page).toHaveURL(/\/admin\/go-force\/sessions\/[0-9a-f-]+$/);

  // Toggle fallback on before starting the session
  await page.getByRole("button", { name: "Use fallback queue" }).click();
  await expect(page.getByText("Draw mode: Pre-randomized fallback queue")).toBeVisible();

  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByRole("heading", { name: "Roulette and vote control" })).toBeVisible();

  // Toggle fallback off and back on mid-game without losing session state
  await page.getByRole("button", { name: "Switch to Wheel of Names" }).click();
  await expect(page.getByRole("button", { name: "Spin the roulette" })).toBeVisible();
  await page.getByRole("button", { name: "Use fallback queue" }).click();
  await expect(page.getByRole("button", { name: "Draw next game (Fallback)" })).toBeVisible();

  const drawnTitles = new Set<string>();
  for (let i = 0; i < fixtureTitles.length; i += 1) {
    await page.getByRole("button", { name: "Draw next game (Fallback)" }).click();
    await expect(page.getByText("Voting open")).toBeVisible();
    const title = (await page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Roulette and vote control" }) })
      .locator("article h3")
      .innerText()).trim();
    expect(fixtureTitles).toContain(title);
    expect(drawnTitles.has(title)).toBe(false);
    drawnTitles.add(title);

    await page.getByRole("button", { name: "Close voting" }).click();
    await expect(page.getByRole("button", { name: "Close voting" })).toBeHidden();
  }

  expect(drawnTitles.size).toBe(fixtureTitles.length);
});
