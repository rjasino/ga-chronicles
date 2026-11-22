import { expect, test, type Page } from "@playwright/test";

async function signInAdmin(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function drawAndVote(
  facilitator: Page,
  player: Page,
  choice: "Go" | "No-go",
  assertReveal = false,
) {
  const spinButton = facilitator.getByRole("button", { name: "Spin the roulette" });
  await spinButton.click();
  await expect(spinButton).toBeDisabled();
  await expect(facilitator.getByText(/Waiting for the Wheel of Names animation/i)).toBeVisible();
  await expect(facilitator.getByText("Selection result")).toBeHidden();
  await player.reload();
  await expect(player.getByText("Now voting")).not.toBeVisible();
  await expect(facilitator.getByText("Voting open")).toBeVisible();
  const title = (await facilitator.locator("section h3").first().innerText()).trim();

  await player.reload();
  await expect(player.getByText("Now voting")).toBeVisible();
  await expect(player.getByRole("heading", { name: title })).toBeVisible();
  await expect(player.getByText("Game details have not been added.")).toBeVisible();
  await player.getByRole("button", { name: choice, exact: true }).click();
  await expect(player.getByText(/vote is recorded/i)).toBeVisible();

  await facilitator.getByRole("button", { name: "Close voting" }).click();
  await expect(facilitator.getByRole("button", { name: "Close voting" })).toBeHidden();
  if (assertReveal) {
    await expect(facilitator.getByText("Selection result")).toBeVisible();
    await expect(facilitator.getByText(/go · /)).toBeVisible();
  }
  return title;
}

test("a fixed roster completes three rounds, reveals votes only after close, and produces a GOTY winner", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.request.delete("http://127.0.0.1:3201/requests");
  await signInAdmin(page);
  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Annual games" }).click();
  const gotyYear = 2030 + (Date.now() % 60);
  const runId = Date.now();
  const fixtureTitles = Array.from(
    { length: 4 },
    (_, index) => `Wheel E2E ${runId} Game ${index + 1}`,
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
  const facilitatorUrl = page.url();
  const sessionId = facilitatorUrl.split("/").pop() as string;

  await expect(page.getByRole("heading", { name: "Roster confirmed" })).toBeVisible();
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByText("Round 1 of 3")).toBeVisible();
  await expect(page.getByText(/roster is locked/i).first()).toBeVisible();

  const player = await page.context().newPage();
  await player.goto(`/go-force/session/${sessionId}`);
  await expect(player.getByRole("heading", { name: "Player screen" })).toBeVisible();
  await expect(player.getByRole("heading", { name: "Your vote screen" })).toBeVisible();

  // Round 1: four fixture games, three go votes and one no-go.
  const roundOneTitles = [await drawAndVote(page, player, "Go", true)];
  await expect(player.getByText(/vote stays hidden/i)).not.toBeVisible();
  roundOneTitles.push(await drawAndVote(page, player, "Go"));
  const afterSecondSpin = await page.request.get("http://127.0.0.1:3201/requests");
  const secondSpinEntries = (await afterSecondSpin.json())[1].wheelConfig.entries as {
    text: string;
  }[];
  expect(secondSpinEntries.map(({ text }) => text)).not.toContain(roundOneTitles[0]);
  roundOneTitles.push(await drawAndVote(page, player, "Go"));
  roundOneTitles.push(await drawAndVote(page, player, "No-go"));
  await expect(page.getByText("Round 2 of 3")).toBeVisible();

  // Round 2: only Round 1 advancing games, two go votes and one no-go.
  await drawAndVote(page, player, "Go");
  const afterFirstRoundTwoSpin = await page.request.get("http://127.0.0.1:3201/requests");
  const requestsAfterFirstRoundTwoSpin = await afterFirstRoundTwoSpin.json();
  expect(
    requestsAfterFirstRoundTwoSpin[4].wheelConfig.entries.map(
      (entry: { text: string }) => entry.text,
    ),
  ).toEqual(roundOneTitles.slice(0, 3));
  await drawAndVote(page, player, "Go");
  await drawAndVote(page, player, "No-go");
  await expect(page.getByText("Round 3 of 3")).toBeVisible();

  // Round 3: exactly one go vote per player.
  const finalist = await drawAndVote(page, player, "Go");
  await drawAndVote(page, player, "No-go");
  await expect(page.getByRole("heading", { name: "Final ballot" })).toBeVisible();

  await player.reload();
  await expect(player.getByRole("heading", { name: "Pick your Game of the Year" })).toBeVisible();
  await player.getByLabel("Your GOTY finalist").selectOption({ index: 1 });
  await player.getByLabel("Optional remark").fill("The co-op run of the year.");
  await player.getByRole("button", { name: "Submit final ballot" }).click();
  await expect(player.getByText("Your ballot is submitted.")).toBeVisible();

  await page.getByRole("button", { name: "Close final ballot" }).click();
  await expect(page.getByText(/Vote completion: 100%/)).toBeVisible();
  await expect(page.getByRole("heading", { name: finalist })).toBeVisible();
  await expect(
    page.getByText("The results page is hidden until an admin publishes it."),
  ).toBeVisible();
  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Annual games" }).click();
  await expect(page.getByRole("row").filter({ hasText: roundOneTitles[0] })).toBeVisible();

  await player.close();
  expect(finalist.length).toBeGreaterThan(0);
});
