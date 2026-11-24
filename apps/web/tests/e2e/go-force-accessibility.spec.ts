import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  cleanupGoForceFixture,
  goForceServiceClient,
  readyGoForceSessionId,
  seedGoForceFixtureGames,
  unusedGoForceYear,
} from "./support/go-force-fixtures";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("player and facilitator screens are responsive, keyboard reachable, and axe-clean", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const service = goForceServiceClient();
  let sessionId = "";
  let gotyYear = 2000;
  let fixtureTitles: string[] = [];

  try {
    await page.goto("/sign-in");
    await page.getByLabel("Username").fill("localadmin");
    await page.getByLabel("Password").fill("local-admin-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/admin/go-force");
    gotyYear = await unusedGoForceYear(service);
    fixtureTitles = [`Accessibility fixture ${Date.now()}`];
    await seedGoForceFixtureGames(service, gotyYear, fixtureTitles);
    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.getByLabel("GOTY year").last().fill(String(gotyYear));
    await page.getByLabel(/Local Admin \(localadmin\)/).check();
    await page.getByRole("button", { name: "Create ready session" }).click();
    await expect(page.getByText(/Session ready\./)).toBeVisible({ timeout: 20_000 });
    sessionId = await readyGoForceSessionId(service, gotyYear);
    await page.goto(`/admin/go-force/sessions/${sessionId}`);

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
    expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    await page.goto(`/go-force/session/${sessionId}`);
    await expect(page.getByRole("heading", { name: "Your vote screen" })).toBeVisible();
    const playerResult = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(playerResult.violations).toEqual([]);
    expect(await page.locator("body").evaluate((node) => node.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  } finally {
    await cleanupGoForceFixture(service, sessionId || null, gotyYear, fixtureTitles);
  }
});

test("go and no-go result labels remain accessible in grayscale and dark theme", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const contexts: BrowserContext[] = [];
  const service = goForceServiceClient();
  let sessionId = "";
  let gotyYear = 2000;
  let fixtureTitles: string[] = [];
  try {
    await signIn(page, "localadmin", "local-admin-password");
    await page.goto("/admin/go-force");

    gotyYear = await unusedGoForceYear(service);
    const runId = Date.now();
    fixtureTitles = [`Vote colors ${runId} A`, `Vote colors ${runId} B`];
    await seedGoForceFixtureGames(service, gotyYear, fixtureTitles);

    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.getByLabel("GOTY year").last().fill(String(gotyYear));
    await page.getByLabel(/Local Admin \(localadmin\)/).check();
    await page.getByLabel(/Local Reader \(localreader\)/).check();
    await page.getByRole("button", { name: "Create ready session" }).click();
    await expect(page.getByText(/Session ready\./)).toBeVisible({ timeout: 20_000 });
    sessionId = await readyGoForceSessionId(service, gotyYear);
    await page.goto(`/admin/go-force/sessions/${sessionId}`);
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByText("Round 1 of 3")).toBeVisible();

    const { data: round, error: roundError } = await service
      .from("go_force_rounds")
      .select("id")
      .eq("session_id", sessionId)
      .eq("status", "active")
      .single();
    if (roundError || !round) throw roundError ?? new Error("No active round is available.");
    const { data: games, error: gamesError } = await service
      .from("go_force_session_games")
      .select("id")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true });
    if (gamesError || !games?.[0])
      throw gamesError ?? new Error("No eligible fixture game is available.");
    const { error: selectionError } = await service.from("go_force_selections").insert({
      round_id: round.id,
      session_game_id: games[0].id,
      selection_order: 1,
      voting_deadline_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (selectionError) throw selectionError;
    await page.reload();

    const gameMasterPlayer = await page.context().newPage();
    await gameMasterPlayer.goto(`/go-force/session/${sessionId}`);
    const readerContext = await browser.newContext();
    contexts.push(readerContext);
    const reader = await readerContext.newPage();
    await signIn(reader, "localreader", "local-reader-password");
    await reader.goto(`/go-force/session/${sessionId}`);

    await expect(page.getByText("Voting open")).toBeVisible();
    await expect(gameMasterPlayer.getByText("Now voting")).toBeVisible();
    await expect(reader.getByText("Now voting")).toBeVisible();
    await gameMasterPlayer.getByRole("button", { name: "Go", exact: true }).click();
    await reader.getByRole("button", { name: "No-go", exact: true }).click();
    await page.getByRole("button", { name: "Close voting" }).click();

    const goLabel = page.locator('[data-vote-choice="go"]').last();
    const noGoLabel = page.locator('[data-vote-choice="no-go"]').last();
    await expect(goLabel).toHaveText("Go");
    await expect(noGoLabel).toHaveText("No-go");
    const lightResult = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(lightResult.violations).toEqual([]);

    await page.locator("body").evaluate((element) => {
      (element as HTMLElement).style.filter = "grayscale(1)";
    });
    await expect(goLabel).toHaveText("Go");
    await expect(noGoLabel).toHaveText("No-go");

    await page.evaluate(() => {
      document.body.style.filter = "none";
      document.documentElement.dataset.theme = "dark";
    });
    const darkResult = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(darkResult.violations).toEqual([]);
    await expect(goLabel).toBeVisible();
    await expect(noGoLabel).toBeVisible();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await cleanupGoForceFixture(service, sessionId || null, gotyYear, fixtureTitles);
  }
});
