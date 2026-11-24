import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  cleanupGoForceFixture,
  goForceServiceClient,
  readyGoForceSessionId,
  seedGoForceFixtureGames,
  unusedGoForceYear,
} from "./support/go-force-fixtures";

async function signIn(page: Page, username: string, password: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 20_000 });
}

test("players receive live session updates, retain vote privacy, and catch up after reconnect", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const playerContexts: BrowserContext[] = [];
  const service = goForceServiceClient();
  let sessionId = "";
  let gotyYear = 2000;
  let fixtureTitles: string[] = [];

  try {
    await signIn(page, "localadmin", "local-admin-password");
    await page.goto("/admin/go-force");

    gotyYear = await unusedGoForceYear(service);
    const runId = Date.now();
    fixtureTitles = [`Realtime ${runId} Alpha`, `Realtime ${runId} Beta`];
    await seedGoForceFixtureGames(service, gotyYear, fixtureTitles);

    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.getByLabel("GOTY year").last().fill(String(gotyYear));
    await page.getByLabel(/Local Admin \(localadmin\)/).check();
    await page.getByLabel(/Local Reader \(localreader\)/).check();
    await page.getByLabel(/Local Contributor \(localcontributor\)/).check();
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
      .select("id,display_order,title_snapshot")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true });
    if (gamesError) throw gamesError;
    if (games?.length !== 2) throw new Error("Expected two realtime fixture games.");

    const readerContext = await browser.newContext();
    const contributorContext = await browser.newContext();
    playerContexts.push(readerContext, contributorContext);
    const reader = await readerContext.newPage();
    const contributor = await contributorContext.newPage();
    await signIn(reader, "localreader", "local-reader-password");
    await signIn(contributor, "localcontributor", "local-contributor-password");
    await reader.goto(`/go-force/session/${sessionId}`);
    await contributor.goto(`/go-force/session/${sessionId}`);
    await expect(page.getByText("Live updates on")).toBeVisible();
    await expect(reader.getByText("Live updates on")).toBeVisible();
    await expect(contributor.getByText("Live updates on")).toBeVisible();

    await page.emulateMedia({ reducedMotion: "reduce" });
    const spinButton = page.getByRole("button", { name: "Spin the roulette" });
    await spinButton.click();
    await expect(page.getByText("Voting open")).toBeVisible({ timeout: 30_000 });
    const firstTitle = (await page.locator(".go-force-roulette__result strong").innerText()).trim();

    // These assertions deliberately do not reload either player page.
    const selectionCommittedAt = Date.now();
    await expect(reader.getByText("Now voting")).toBeVisible();
    await expect(reader.getByRole("heading", { name: firstTitle })).toBeVisible();
    await expect(contributor.getByText("Now voting")).toBeVisible();
    await expect(contributor.getByRole("heading", { name: firstTitle })).toBeVisible();
    const selectionLatencyMs = Date.now() - selectionCommittedAt;
    expect(selectionLatencyMs).toBeLessThanOrEqual(2_000);

    await reader.getByRole("button", { name: "Go", exact: true }).click();
    await expect(
      reader.getByText(/(?:Your vote is recorded as Go|Go vote recorded\.)/),
    ).toBeVisible({ timeout: 15_000 });
    const voteCommittedAt = Date.now();
    await expect(page.getByText(/1 of 3 players have submitted/)).toBeVisible({ timeout: 30_000 });
    const voteUpdateLatencyMs = Date.now() - voteCommittedAt;
    await expect(contributor.getByText(/Your vote is recorded as/i)).not.toBeVisible();
    console.log(
      `Go Force realtime observations (3 connected participants): selection=${selectionLatencyMs}ms, vote=${voteUpdateLatencyMs}ms`,
    );

    await contributorContext.setOffline(true);
    await page.getByRole("button", { name: "Close voting" }).click();
    await expect(page.getByRole("button", { name: "Close voting" })).toBeHidden();
    const deadline = new Date(Date.now() + 10 * 60_000).toISOString();
    const nextGame = games.find((game) => game.title_snapshot !== firstTitle);
    if (!nextGame) throw new Error("No unselected realtime fixture game remains.");
    const { error: nextSelectionError } = await service.from("go_force_selections").insert({
      round_id: round.id,
      session_game_id: nextGame.id,
      selection_order: 2,
      voting_deadline_at: deadline,
    });
    if (nextSelectionError) throw nextSelectionError;

    await contributorContext.setOffline(false);
    await expect(contributor.getByRole("heading", { name: nextGame.title_snapshot })).toBeVisible({
      timeout: 15_000,
    });
    await expect(contributor.getByText("Now voting")).toBeVisible();
    await expect(reader.getByRole("heading", { name: firstTitle })).toBeVisible();
  } finally {
    await Promise.all(playerContexts.map((context) => context.close()));
    await cleanupGoForceFixture(service, sessionId || null, gotyYear, fixtureTitles);
  }
});
