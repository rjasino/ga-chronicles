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

async function openSelection(
  facilitator: Page,
  service: ReturnType<typeof goForceServiceClient>,
  sessionId: string,
  gameId: string,
  players: Page[],
) {
  const { data: round, error: roundError } = await service
    .from("go_force_rounds")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "active")
    .single();
  if (roundError || !round) throw roundError ?? new Error("No active round is available.");

  const { data: existingSelections, error: selectionError } = await service
    .from("go_force_selections")
    .select("selection_order")
    .eq("round_id", round.id);
  if (selectionError) throw selectionError;
  const selectionOrder =
    Math.max(0, ...(existingSelections ?? []).map((selection) => selection.selection_order)) + 1;
  const { error } = await service.from("go_force_selections").insert({
    round_id: round.id,
    session_game_id: gameId,
    selection_order: selectionOrder,
    voting_deadline_at: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  if (error) throw error;

  await facilitator.reload();
  await expect(facilitator.getByText("Voting open")).toBeVisible();
  const title = (await facilitator.locator(".go-force-roulette__result strong").innerText()).trim();

  await Promise.all(
    players.map(async (player) => {
      await player.reload();
      await expect(player.getByText("Now voting")).toBeVisible();
      await expect(player.getByRole("heading", { name: title })).toBeVisible();
    }),
  );
  return title;
}

async function castVote(player: Page, choice: "Go" | "No-go") {
  await player.getByRole("button", { name: choice, exact: true }).click();
  await expect(
    player.getByText(
      new RegExp(`(?:Your vote is recorded as ${choice}|${choice} vote recorded)`, "i"),
    ),
  ).toBeVisible({ timeout: 15_000 });
}

async function closeGameVote(facilitator: Page) {
  await facilitator.getByRole("button", { name: "Close voting" }).click();
  await expect(facilitator.getByRole("button", { name: "Close voting" })).toBeHidden({
    timeout: 45_000,
  });
}

async function addPlayer(facilitator: Page, accountId: string) {
  await facilitator.getByLabel("Player to add").selectOption(accountId);
  await facilitator.getByRole("button", { name: "Add player" }).click();
  await expect(facilitator.getByText("Player added to the session.")).toBeVisible({
    timeout: 30_000,
  });
  await expect(facilitator.locator(`option[value="${accountId}"]`)).toHaveCount(0, {
    timeout: 30_000,
  });
}

test("late players join from their addition time through the open final ballot", async ({
  page,
  browser,
}) => {
  test.setTimeout(360_000);
  const extraContexts: BrowserContext[] = [];
  const service = goForceServiceClient();
  let sessionId = "";
  let gotyYear = 2000;
  let fixtureTitles: string[] = [];

  try {
    await signIn(page, "localadmin", "local-admin-password");
    await page.goto("/admin/go-force");

    gotyYear = await unusedGoForceYear(service);
    const runId = Date.now();
    fixtureTitles = [`Late Join ${runId} Alpha`, `Late Join ${runId} Beta`];
    await seedGoForceFixtureGames(service, gotyYear, fixtureTitles);

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
    if (sessionGames?.length !== 2) throw new Error("Expected two live-player fixture games.");

    const gameMasterPlayer = await page.context().newPage();
    await gameMasterPlayer.goto(`/go-force/session/${sessionId}`);
    await expect(gameMasterPlayer.getByRole("heading", { name: "Your vote screen" })).toBeVisible();

    await openSelection(page, service, sessionId, sessionGames[0]!.id, [gameMasterPlayer]);
    await addPlayer(page, "10000000-0000-4000-8000-000000000001");

    const readerContext = await browser.newContext();
    extraContexts.push(readerContext);
    const reader = await readerContext.newPage();
    await signIn(reader, "localreader", "local-reader-password");
    await reader.goto(`/go-force/session/${sessionId}`);
    await expect(reader.getByRole("heading", { name: "Your vote screen" })).toBeVisible();
    await expect(gameMasterPlayer.getByText("Now voting")).toBeVisible();

    await castVote(gameMasterPlayer, "Go");
    await castVote(reader, "Go");
    await closeGameVote(page);

    // This player arrives after the first selection is closed. Their missing
    // row must be shown as ineligible, not as an abstention.
    await addPlayer(page, "10000000-0000-4000-8000-000000000002");
    await expect(page.getByText("Not eligible")).toBeVisible();

    const contributorContext = await browser.newContext();
    extraContexts.push(contributorContext);
    const contributor = await contributorContext.newPage();
    await signIn(contributor, "localcontributor", "local-contributor-password");
    await contributor.goto(`/go-force/session/${sessionId}`);
    await expect(contributor.getByRole("heading", { name: "Your vote screen" })).toBeVisible();

    let activePlayers = [gameMasterPlayer, reader, contributor];
    const { data: activeRound, error: activeRoundError } = await service
      .from("go_force_rounds")
      .select("id")
      .eq("session_id", sessionId)
      .eq("status", "active")
      .single();
    if (activeRoundError || !activeRound)
      throw activeRoundError ?? new Error("No active round is available.");
    const { data: selectedGames, error: selectedGamesError } = await service
      .from("go_force_selections")
      .select("session_game_id")
      .eq("round_id", activeRound.id);
    if (selectedGamesError) throw selectedGamesError;
    const nextRoundOneGame = sessionGames.find(
      (game) => !selectedGames?.some((selection) => selection.session_game_id === game.id),
    );
    if (!nextRoundOneGame) throw new Error("No unselected game remains in round one.");
    await openSelection(page, service, sessionId, nextRoundOneGame.id, activePlayers);
    for (const player of activePlayers) await castVote(player, "Go");
    await closeGameVote(page);

    // Round 2 has two go votes per participant; both fixture games advance.
    for (const game of sessionGames) {
      await openSelection(page, service, sessionId, game!.id, activePlayers);
      for (const player of activePlayers) await castVote(player, "Go");
      await closeGameVote(page);
    }
    await expect(page.getByText("Round 3 of 3")).toBeVisible();

    // All three round participants must use their one Round 3 go.
    await openSelection(page, service, sessionId, sessionGames[0]!.id, activePlayers);
    for (const player of activePlayers) await castVote(player, "Go");
    await closeGameVote(page);
    await openSelection(page, service, sessionId, sessionGames[1]!.id, activePlayers);
    for (const player of activePlayers) await castVote(player, "No-go");
    await closeGameVote(page);
    await expect(page.getByRole("heading", { name: "Final ballot" })).toBeVisible();
    const { error: finalDeadlineError } = await service
      .from("go_force_sessions")
      .update({ final_ballot_deadline_at: new Date(Date.now() + 10 * 60_000).toISOString() })
      .eq("id", sessionId);
    expect(finalDeadlineError).toBeNull();

    // A player added during the final ballot can vote there without being
    // retroactively required to have a Round 3 game vote.
    await addPlayer(page, "10000000-0000-4000-8000-000000000005");
    const finalPlayerContext = await browser.newContext();
    extraContexts.push(finalPlayerContext);
    const finalPlayer = await finalPlayerContext.newPage();
    await signIn(finalPlayer, "localmulti", "local-multi-password");
    await finalPlayer.goto(`/go-force/session/${sessionId}`);
    await expect(
      finalPlayer.getByRole("heading", { name: "Pick your Game of the Year" }),
    ).toBeVisible();

    activePlayers = [...activePlayers, finalPlayer];
    for (const player of activePlayers) {
      if (player !== finalPlayer) {
        await player.reload();
        await expect(
          player.getByRole("heading", { name: "Pick your Game of the Year" }),
        ).toBeVisible();
      }
      await player.getByLabel("Your GOTY finalist").selectOption({ index: 1 });
      await player.getByRole("button", { name: "Submit final ballot" }).click();
      await expect(player.getByText("Your ballot is submitted.")).toBeVisible();
    }

    await page.getByRole("button", { name: "Close final ballot" }).click();
    await expect(page.getByText(/GOTY \d+ · complete/)).toBeVisible();
  } finally {
    await Promise.all(extraContexts.map((context) => context.close()));
    await cleanupGoForceFixture(service, sessionId || null, gotyYear, fixtureTitles);
  }
});
