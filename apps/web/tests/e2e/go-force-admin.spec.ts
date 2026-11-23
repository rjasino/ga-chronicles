import path from "node:path";
import { expect, test } from "@playwright/test";

function gamesJsonFile(records: unknown[], name = "annual-games.json") {
  return {
    name,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(records)),
  };
}

async function signInAdmin(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function openAnnualGames(page: import("@playwright/test").Page) {
  await page.goto("/admin/go-force");
  await page.getByRole("tab", { name: "Annual games" }).click();
}

test("admins control Go Force visibility and maintain the annual list without redeploying", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const reactFormWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Cannot specify a encType or method")
    ) {
      reactFormWarnings.push(message.text());
    }
  });
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();

  await page.goto("/admin/go-force");
  expect(reactFormWarnings).toEqual([]);
  const visibility = page.getByLabel("Show the public Go Force page");
  if (!(await visibility.isChecked())) {
    await visibility.check();
    await page.getByRole("button", { name: "Save visibility" }).click();
    await expect(page.getByText("The Go Force page is visible.")).toBeVisible();
  }
  await expect(visibility).toBeChecked();
  const roundTimer = page.getByLabel("Round vote duration (seconds)");
  const finalTimer = page.getByLabel("Final ballot duration (seconds)");
  await expect(roundTimer).toHaveValue("10");
  await expect(finalTimer).toHaveValue("10");
  await roundTimer.fill("25");
  await finalTimer.fill("35");
  await page.getByRole("button", { name: "Save voting timers" }).click();
  await expect(page.getByText("Go Force voting timers saved.")).toBeVisible();
  await page.goto("/admin/go-force");
  await expect(page.getByLabel("Round vote duration (seconds)")).toHaveValue("25");
  await expect(page.getByLabel("Final ballot duration (seconds)")).toHaveValue("35");
  await page.getByLabel("Round vote duration (seconds)").fill("10");
  await page.getByLabel("Final ballot duration (seconds)").fill("10");
  await page.getByRole("button", { name: "Save voting timers" }).click();
  await expect(page.getByText("Go Force voting timers saved.")).toBeVisible();

  await visibility.uncheck();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is hidden.")).toBeVisible();
  await expect(visibility).not.toBeChecked();
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Go Force", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Go Force", level: 1 })).toBeVisible();
  await page.goto("/admin/go-force");
  await expect(page.getByLabel("Show the public Go Force page")).not.toBeChecked();

  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto("/go-force");
  await expect(visitor.getByRole("heading", { name: "Article not found" })).toBeVisible();
  await anonymous.close();

  await page.getByLabel("Show the public Go Force page").check();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is visible.")).toBeVisible();
  await expect(page.getByLabel("Show the public Go Force page")).toBeChecked();
  await page.goto("/admin/go-force");
  await expect(page.getByLabel("Show the public Go Force page")).toBeChecked();

  await page.getByRole("tab", { name: "Annual games" }).click();
  const title = `E2E GOTY Game ${Date.now()}`;
  await page.getByLabel("Game title").first().fill(title);
  await page.getByLabel("GOTY year").first().fill("2027");
  await page.getByLabel("Eligibility").first().selectOption("eligible");
  await page.getByLabel("Display order").first().fill("5");
  await page.getByLabel("Developer (optional)").first().fill("Test Studio");
  await page.getByLabel("Publisher (optional)").first().fill("Test Publisher");
  await page.getByLabel("Genre (optional)").first().fill("Action");
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText("Game added.")).toBeVisible();
  const addedRow = page.locator("tr[data-game-id]").filter({ hasText: title });
  await expect(addedRow).toBeVisible();
  const gameId = await addedRow.getAttribute("data-game-id");
  const row = page.locator(`tr[data-game-id="${gameId}"]`);

  await row.getByRole("button", { name: "Edit" }).click();
  const editedTitle = `${title} edited`;
  await row.getByLabel("Cover art URL (optional)").fill("https://example.test/game-cover.webp");
  await row.getByLabel("Game title").fill(editedTitle);
  await row.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Game updated.")).toBeVisible();
  const editedRow = page.locator(`tr[data-game-id="${gameId}"]`);
  await expect(editedRow).toContainText(editedTitle);
  await editedRow.getByRole("button", { name: "Edit" }).click();
  await expect(editedRow.getByLabel("Developer (optional)")).toHaveValue("Test Studio");
  await expect(editedRow.getByLabel("Publisher (optional)")).toHaveValue("Test Publisher");
  await expect(editedRow.getByLabel("Genre (optional)")).toHaveValue("Action");
  await expect(editedRow.getByLabel("Cover art URL (optional)")).toHaveValue(
    "https://example.test/game-cover.webp",
  );

  await editedRow
    .getByLabel("Upload cover art (optional)")
    .setInputFiles(path.resolve(process.cwd(), "../../docs/neon_ga_logo_2.png"));
  await editedRow.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Game updated.")).toBeVisible();
  await editedRow.getByRole("button", { name: "Edit" }).click();
  await expect(editedRow.getByLabel("Cover art URL (optional)")).toHaveValue(
    /\/storage\/v1\/object\/public\/go-force-covers\//,
  );
  await editedRow.getByRole("button", { name: "Cancel" }).click();
  await editedRow.getByRole("button", { name: "Delete" }).click();
  await expect(editedRow).toBeHidden();

  await page.goto("/go-force");
  await expect(page.getByRole("heading", { name: "Go Force", level: 1 })).toBeVisible();
});

test("annual-game Server Action forms keep uploads and avoid React encoding warnings", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const reactFormWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Cannot specify a encType or method")
    ) {
      reactFormWarnings.push(message.text());
    }
  });

  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/admin/go-force");
  expect(reactFormWarnings).toEqual([]);

  await page.getByRole("tab", { name: "Annual games" }).click();
  const runId = Date.now();
  const title = `Wheel form upload ${runId}`;
  await page.getByLabel("Game title").first().fill(title);
  await page
    .getByLabel("GOTY year")
    .first()
    .fill(String(2090 + (runId % 10)));
  await page.getByLabel("Display order").first().fill("1");
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText("Game added.")).toBeVisible();

  const addedRow = page.locator("tr[data-game-id]").filter({ hasText: title });
  const gameId = await addedRow.getAttribute("data-game-id");
  const row = page.locator(`tr[data-game-id="${gameId}"]`);
  await row.getByRole("button", { name: "Edit" }).click();
  await row
    .getByLabel("Upload cover art (optional)")
    .setInputFiles(path.resolve(process.cwd(), "../../docs/neon_ga_logo_2.png"));
  await row.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Game updated.")).toBeVisible();
  await row.getByRole("button", { name: "Edit" }).click();
  await expect(row.getByLabel("Cover art URL (optional)")).toHaveValue(
    /\/storage\/v1\/object\/public\/go-force-covers\//,
  );

  await row.getByRole("button", { name: "Cancel" }).click();
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toBeHidden();
  expect(reactFormWarnings).toEqual([]);
});

test("Go Force navigation is visible to admins always and rostered players only for visible active sessions", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localadmin");
  await page.getByLabel("Password").fill("local-admin-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
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

  await page.getByRole("tab", { name: "Sessions" }).click();
  const gotyYear = 2000 + (Date.now() % 101);
  await page.getByLabel("GOTY year").last().fill(String(gotyYear));
  await page.getByLabel(/Local Reader \(localreader\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await expect(page.getByRole("link", { name: "Open the facilitator screen" })).toBeVisible();

  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();

  await page.getByRole("tab", { name: "Page & timers" }).click();
  await visibility.uncheck();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await expect(page.getByText("The Go Force page is hidden.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go Force", exact: true })).toBeVisible();
  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: "Sessions" }).click();
  const readySession = page.locator("li").filter({ hasText: `GOTY ${gotyYear}` });
  await readySession.getByRole("button", { name: "Remove ready session" }).click();
  await page.getByRole("tab", { name: "Page & timers" }).click();
  await visibility.check();
  await page.getByRole("button", { name: "Save visibility" }).click();
  await player.reload();
  await expect(player.getByRole("link", { name: "Go Force", exact: true })).toHaveCount(0);

  await playerContext.close();
});

test("admins import a valid annual-game JSON file and can still add one game manually", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInAdmin(page);
  await openAnnualGames(page);

  const runId = Date.now();
  const year = 2070 + (runId % 20);
  const firstTitle = `Import First ${runId}`;
  const secondTitle = `Import Second ${runId}`;

  await page.getByLabel("Games JSON file").setInputFiles(
    gamesJsonFile([
      { title: firstTitle, gotyYear: year },
      {
        title: secondTitle,
        gotyYear: year,
        eligibilityState: "ineligible",
        displayOrder: 9,
        developer: "Import Studio",
        publisher: "Import Publisher",
        genre: "Strategy",
        coverArtUrl: "https://example.test/import-cover.webp",
      },
    ]),
  );

  await expect(page.getByRole("heading", { name: "Review import" })).toBeVisible();
  await expect(page.getByText(`GOTY ${year} \u00b7 2 to add \u00b7 0 to skip`)).toBeVisible();
  const reviewTable = page.getByRole("table", { name: "Parsed annual game records" });
  await expect(reviewTable).toContainText(firstTitle);
  await expect(reviewTable).toContainText(secondTitle);
  await expect(reviewTable).toContainText("Import Studio");
  await expect(reviewTable).toContainText("ineligible");

  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Added 2 games. Skipped 0 duplicate games.")).toBeVisible();

  const annualTable = page.getByRole("table", {
    name: "Annual games, including eligible and ineligible titles",
  });
  await expect(annualTable).toContainText(firstTitle);
  await expect(annualTable).toContainText(secondTitle);

  const manualTitle = `Manual After Import ${runId}`;
  await page.getByLabel("Game title").fill(manualTitle);
  await page.getByLabel("GOTY year").first().fill(String(year));
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText("Game added.")).toBeVisible();
  await expect(annualTable).toContainText(manualTitle);
});

test("invalid files and records never change the annual list", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAdmin(page);
  await openAnnualGames(page);

  const rowsBefore = await page.locator("tr[data-game-id]").count();
  const fileInput = page.getByLabel("Games JSON file");

  await fileInput.setInputFiles({
    name: "malformed.json",
    mimeType: "application/json",
    buffer: Buffer.from("{not valid json"),
  });
  await expect(page.getByText("The selected file is not valid JSON.")).toBeVisible();

  await fileInput.setInputFiles(gamesJsonFile([]));
  await expect(page.getByText("The JSON file must contain at least one game record.")).toBeVisible();

  await fileInput.setInputFiles(
    gamesJsonFile([
      { title: "Mixed Year One", gotyYear: 2030 },
      { title: "Mixed Year Two", gotyYear: 2031 },
    ]),
  );
  await expect(page.getByText("All records in the file must use the same GOTY year.")).toBeVisible();

  await fileInput.setInputFiles(
    gamesJsonFile([
      { title: "", gotyYear: 2030 },
      { title: "Valid Companion", gotyYear: 2030 },
    ]),
  );
  await expect(page.getByText("Fix these records before importing:")).toBeVisible();
  await expect(page.getByText(/Record 1: Add a game title\./)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeDisabled();

  await fileInput.setInputFiles({
    name: "too-large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(524_289, "x"),
  });
  await expect(page.getByText("Choose a JSON file that is 512 KiB or smaller.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review import" })).toHaveCount(0);

  expect(await page.locator("tr[data-game-id]").count()).toBe(rowsBefore);
});

test("admins skip duplicates and can cancel a review without saving", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAdmin(page);
  await openAnnualGames(page);

  const runId = Date.now();
  const year = 2050 + (runId % 20);
  const existingTitle = `Existing Import Target ${runId}`;
  const newTitle = `Fresh Import Target ${runId}`;

  await page.getByLabel("Game title").fill(existingTitle);
  await page.getByLabel("GOTY year").first().fill(String(year));
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByText("Game added.")).toBeVisible();

  const rowsBefore = await page.locator("tr[data-game-id]").count();
  const duplicateFile = gamesJsonFile([
    { title: `  ${existingTitle.toUpperCase()} `, gotyYear: year },
    { title: newTitle, gotyYear: year },
    { title: ` ${newTitle.toLowerCase()} `, gotyYear: year },
  ]);

  await page.getByLabel("Games JSON file").setInputFiles(duplicateFile);
  await expect(page.getByText(`GOTY ${year} \u00b7 1 to add \u00b7 2 to skip`)).toBeVisible();
  await expect(page.getByText(/is already in the annual list for this year/)).toBeVisible();
  await expect(page.getByText(/repeats an earlier title in this file/)).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Review import" })).toHaveCount(0);
  await expect(page.getByText(/^Added /)).toHaveCount(0);
  expect(await page.locator("tr[data-game-id]").count()).toBe(rowsBefore);

  await page.getByLabel("Games JSON file").setInputFiles(duplicateFile);
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Added 1 game. Skipped 2 duplicate games.")).toBeVisible();

  const annualTable = page.getByRole("table", {
    name: "Annual games, including eligible and ineligible titles",
  });
  await expect(annualTable).toContainText(newTitle);
  await expect(
    page.locator("tr[data-game-id]").filter({ hasText: existingTitle }),
  ).toHaveCount(1);
});

test("unauthorized accounts cannot reach the import controls", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Username").fill("localreader");
  await page.getByLabel("Password").fill("local-reader-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/admin/go-force");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Go Force GOTY" })).toHaveCount(0);
  await expect(page.getByLabel("Games JSON file")).toHaveCount(0);
});

test("importing another annual game does not rewrite a started session snapshot", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await signInAdmin(page);
  await openAnnualGames(page);

  const runId = Date.now();
  const year = 2090 + (runId % 10);
  const seedTitle = `Snapshot Seed ${runId}`;
  const laterTitle = `Snapshot Later ${runId}`;

  await page.getByLabel("Games JSON file").setInputFiles(
    gamesJsonFile([{ title: seedTitle, gotyYear: year }]),
  );
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Added 1 game. Skipped 0 duplicate games.")).toBeVisible();

  await page.getByRole("tab", { name: "Sessions" }).click();
  await page.getByLabel("GOTY year").last().fill(String(year));
  await page.getByLabel(/Local Admin \(localadmin\)/).check();
  await page.getByRole("button", { name: "Create ready session" }).click();
  await page.getByRole("link", { name: "Open the facilitator screen" }).click();
  await expect(page).toHaveURL(/\/admin\/go-force\/sessions\/[0-9a-f-]+$/);
  const sessionUrl = page.url();
  await page.getByRole("button", { name: "Start session" }).click();
  await expect(page.getByText("Round 1 of 3")).toBeVisible();
  const remaining = page.getByText(/\d+ games? left to select/);
  const remainingBefore = await remaining.textContent();
  await expect(remaining).toBeVisible();
  await expect(page.getByText(laterTitle)).toHaveCount(0);

  await openAnnualGames(page);
  await page.getByLabel("Games JSON file").setInputFiles(
    gamesJsonFile([{ title: laterTitle, gotyYear: year }]),
  );
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.getByText("Added 1 game. Skipped 0 duplicate games.")).toBeVisible();
  const annualTable = page.getByRole("table", {
    name: "Annual games, including eligible and ineligible titles",
  });
  await expect(annualTable).toContainText(laterTitle);

  await page.goto(sessionUrl);
  await expect(page.getByText("Round 1 of 3")).toBeVisible();
  await expect(page.getByText(/\d+ games? left to select/)).toHaveText(remainingBefore ?? "");
  await expect(page.getByText(laterTitle)).toHaveCount(0);
});
