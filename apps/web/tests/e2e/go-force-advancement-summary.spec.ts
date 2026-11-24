import { expect, test, type Page } from "@playwright/test";
import {
  cleanupGoForceFixture,
  goForceServiceClient,
  readyGoForceSessionId,
  seedGoForceFixtureGames,
  unusedGoForceYear,
} from "./support/go-force-fixtures";

async function signInAdmin(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function openSelection(
  facilitator: Page,
  service: ReturnType<typeof goForceServiceClient>,
  sessionId: string,
  gameId: string,
) {
  const { data: round, error: roundError } = await service
    .from("go_force_rounds")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .single();
  if (roundError || !round) throw roundError ?? new Error("No active round is available.");
  const { data: selections, error: selectionsError } = await service
    .from("go_force_selections")
    .select("selection_order")
    .eq("round_id", round.id);
  if (selectionsError) throw selectionsError;
  const selectionOrder =
    Math.max(0, ...(selections ?? []).map((selection) => selection.selection_order)) + 1;
  const { error } = await service.from("go_force_selections").insert({
    round_id: round.id,
    session_game_id: gameId,
    selection_order: selectionOrder,
    voting_deadline_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw error;
  await facilitator.reload();
  await expect(facilitator.getByText("Voting open")).toBeVisible();
  return (await facilitator.locator(".go-force-roulette__result strong").innerText()).trim();
}

test("advancement card summarizes closed ballots as provisional then confirmed", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const service = goForceServiceClient();
  let sessionId = "";
  let gotyYear = 2000;
  let titles: string[] = [];
  try {
    await signInAdmin(page);
    await page.goto("/admin/go-force");

    gotyYear = await unusedGoForceYear(service);
    const runId = Date.now();
    titles = [`Advancement ${runId} Alpha`, `Advancement ${runId} Beta`];
    await seedGoForceFixtureGames(service, gotyYear, titles);

    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.getByLabel("GOTY year").last().fill(String(gotyYear));
    await page.getByLabel(/Local Admin \(localadmin\)/).check();
    await page.getByRole("button", { name: "Create ready session" }).click();
    await expect(page.getByText(/Session ready\./)).toBeVisible({ timeout: 20_000 });
    sessionId = await readyGoForceSessionId(service, gotyYear);
    await page.goto(`/admin/go-force/sessions/${sessionId}`);
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(page.getByText("Round 1 of 3")).toBeVisible();

    const { data: sessionGames, error: gameError } = await service
      .from("go_force_session_games")
      .select("id,display_order")
      .eq("session_id", sessionId)
      .order("display_order", { ascending: true });
    if (gameError) throw gameError;
    if (sessionGames?.length !== 2) throw new Error("Expected two advancement fixture games.");

    const card = page.getByRole("region", { name: "Round advancement summary" });
    await expect(card.getByText("No games have qualified from this round yet.")).toBeVisible();

    const firstTitle = await openSelection(page, service, sessionId, sessionGames[0]!.id);
    await expect(card.getByText(firstTitle)).toHaveCount(0);
    const player = await page.context().newPage();
    await player.goto(`/go-force/session/${sessionId}`);
    await expect(player.getByRole("heading", { name: "Your vote screen" })).toBeVisible();
    await expect(player.getByText("Now voting")).toBeVisible();
    await player.getByRole("button", { name: "Go", exact: true }).click();
    await expect(player.getByText(/vote is recorded/i)).toBeVisible();
    await page.getByRole("button", { name: "Close voting" }).click();

    const provisional = card.getByRole("region", { name: "Round 1 · Advancing so far" });
    await expect(provisional.getByText(firstTitle)).toBeVisible();
    await expect(provisional.getByText(firstTitle).locator("..")).toContainText(/1\s+Go/);

    const secondTitle = await openSelection(page, service, sessionId, sessionGames[1]!.id);
    expect(secondTitle).not.toBe(firstTitle);
    await expect(provisional.getByText(secondTitle)).toHaveCount(0);
    await player.reload();
    await expect(player.getByText("Now voting")).toBeVisible();
    await player.getByRole("button", { name: "No-go", exact: true }).click();
    await expect(player.getByText(/vote is recorded/i)).toBeVisible();
    await page.getByRole("button", { name: "Close voting" }).click();

    const confirmed = card.getByRole("region", { name: "Round 1 · Confirmed" });
    await expect(confirmed.getByText(firstTitle)).toBeVisible();
    await expect(confirmed.getByText(firstTitle).locator("..")).toContainText(/1\s+Go/);
    await expect(card.getByRole("heading", { name: "Round 2 · Advancing so far" })).toBeVisible();

    // The only Round 2 selection has an open ballot, so the card remains empty
    // for that round until it closes.
    await openSelection(page, service, sessionId, sessionGames[0]!.id);
    await expect(card.getByText("No games have qualified from this round yet.")).toBeVisible();
    await player.reload();
    await expect(player.getByText("Now voting")).toBeVisible();
    await player.getByRole("button", { name: "No-go", exact: true }).click();
    await page.getByRole("button", { name: "Close voting" }).click();
    await expect(card.getByRole("heading", { name: "Round 2 · Confirmed" })).toBeVisible();
    await expect(card.getByText("No games advanced from this round.")).toBeVisible();
  } finally {
    await cleanupGoForceFixture(service, sessionId || null, gotyYear, titles);
  }
});
