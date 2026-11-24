import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoForceAdminControls } from "@/components/go-force/admin-controls";
import type { GoForceAdminData } from "@/features/go-force/admin-queries";

function jsonFile(records: unknown[]) {
  return new File([JSON.stringify(records)], "games.json", { type: "application/json" });
}

async function openGamesTab() {
  const user = userEvent.setup();
  render(<GoForceAdminControls data={data} />);
  await user.click(screen.getByRole("tab", { name: "Annual games" }));
  return user;
}

const actions = vi.hoisted(() => ({
  removeAnnualGame: vi.fn(),
  saveAnnualGame: vi.fn(),
  importAnnualGames: vi.fn(),
  saveGoForcePageVisibility: vi.fn(),
  saveGoForceVotingSettings: vi.fn(),
  setGoForceResultVisibility: vi.fn(),
  createGoForceSession: vi.fn(),
  deleteReadyGoForceSession: vi.fn(),
}));

vi.mock("@/features/go-force/admin-actions", () => actions);
vi.mock("@/features/go-force/session-actions", () => actions);

const data = {
  settings: {
    id: true,
    page_visible: true,
    round_voting_seconds: 10,
    round_voting_timed: true,
    final_ballot_seconds: 10,
    final_ballot_timed: true,
    minimum_round_three_go_voters: 2,
    updated_by: null,
    updated_at: "2025-01-01T00:00:00.000Z",
  },
  games: [
    {
      id: "51000000-0000-4000-8000-000000000001",
      goty_year: 2025,
      title: "Eligible fixture",
      developer: "Fixture Studio",
      publisher: "Fixture Publisher",
      genre: "Action",
      cover_art_url: null,
      eligibility_state: "eligible" as const,
      display_order: 1,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
    },
    {
      id: "51000000-0000-4000-8000-000000000002",
      goty_year: 2024,
      title: "Ineligible fixture",
      developer: null,
      publisher: null,
      genre: null,
      cover_art_url: null,
      eligibility_state: "ineligible" as const,
      display_order: 2,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z",
    },
  ],
  accounts: [],
  sessions: [],
  years: [2025, 2024],
} satisfies GoForceAdminData;

describe("Go Force admin tabs and annual games table", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows voting controls and supports arrow-key tab navigation", () => {
    render(<GoForceAdminControls data={data} />);

    const settingsTab = screen.getByRole("tab", { name: "Page & timers" });
    expect(settingsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Show the public Go Force page")).toBeInTheDocument();
    expect(screen.getByLabelText("Round vote duration (seconds)")).toBeInTheDocument();
    expect(screen.getByLabelText("Use a timer for round votes")).toBeChecked();
    expect(screen.getByLabelText("Use a timer for the final ballot")).toBeChecked();
    expect(screen.getByLabelText("Minimum Round 3 Go voters")).toHaveValue(2);

    fireEvent.keyDown(settingsTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Annual games" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Annual games" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Sessions" })).toHaveAttribute("aria-selected", "true");
  });

  it("lists eligible and ineligible games and keeps editing inline", async () => {
    const user = userEvent.setup();
    render(<GoForceAdminControls data={data} />);

    await user.click(screen.getByRole("tab", { name: "Annual games" }));
    const table = screen.getByRole("table", {
      name: "Annual games, including eligible and ineligible titles",
    });
    expect(table).toHaveTextContent("Title");
    expect(table).toHaveTextContent("Developer");
    expect(table).toHaveTextContent("Publisher");
    expect(table).toHaveTextContent("Year");
    expect(table).toHaveTextContent("Eligible fixture");
    expect(table).toHaveTextContent("Ineligible fixture");
    expect(screen.getByRole("button", { name: "Add game" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]!);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Eligibility").at(-1)).toHaveValue("eligible");
    expect(screen.getAllByLabelText("Developer (optional)").at(-1)).toHaveValue("Fixture Studio");
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("table")).toHaveTextContent("Eligible fixture");
  });
});

describe("Go Force annual game JSON import", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("labels the JSON file control and keeps the manual form available", async () => {
    await openGamesTab();

    const fileInput = screen.getByLabelText("Games JSON file");
    expect(fileInput).toHaveAttribute("type", "file");
    expect(fileInput).toHaveAttribute("accept", "application/json,.json");
    fileInput.focus();
    expect(fileInput).toHaveFocus();

    expect(screen.getByRole("button", { name: "Add game" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Game title").length).toBeGreaterThan(0);
  });

  it("reviews a valid file with defaults, add count, and required labels", async () => {
    const user = await openGamesTab();

    await user.upload(
      screen.getByLabelText("Games JSON file"),
      jsonFile([
        { title: "New Game", gotyYear: 2026 },
        {
          title: "Another Game",
          gotyYear: 2026,
          developer: "New Studio",
          publisher: "New Publisher",
          genre: "RPG",
          coverArtUrl: "https://example.com/cover.jpg",
        },
      ]),
    );

    expect(await screen.findByRole("heading", { name: "Review import" })).toBeInTheDocument();
    expect(screen.getByText(/GOTY 2026 · 2 to add · 0 to skip/)).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Parsed annual game records" });
    expect(table).toHaveTextContent("New Game");
    expect(table).toHaveTextContent("Another Game");
    expect(table).toHaveTextContent("New Studio");
    expect(table).toHaveTextContent("RPG");
    expect(screen.getByRole("button", { name: "Confirm import" })).toBeEnabled();
  });

  it("shows positioned invalid-record findings and disables confirmation", async () => {
    const user = await openGamesTab();

    await user.upload(
      screen.getByLabelText("Games JSON file"),
      jsonFile([
        { title: "", gotyYear: 2026 },
        { title: "Valid Game", gotyYear: 2026 },
      ]),
    );

    expect(await screen.findByText("Fix these records before importing:")).toBeInTheDocument();
    expect(screen.getByText(/Record 1: Add a game title\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm import" })).toBeDisabled();
  });

  it("reports existing and in-file duplicates with add and skip counts", async () => {
    const user = await openGamesTab();

    await user.upload(
      screen.getByLabelText("Games JSON file"),
      jsonFile([
        { title: " eligible FIXTURE ", gotyYear: 2025 },
        { title: "Brand New", gotyYear: 2025 },
        { title: "brand new", gotyYear: 2025 },
      ]),
    );

    expect(await screen.findByText("Duplicates will be skipped:")).toBeInTheDocument();
    expect(screen.getByText(/GOTY 2025 · 1 to add · 2 to skip/)).toBeInTheDocument();
    expect(screen.getByText(/is already in the annual list for this year/)).toBeInTheDocument();
    expect(screen.getByText(/repeats an earlier title in this file/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm import" })).toBeEnabled();
  });

  it("shows the 512 KiB limit without parsing an oversized file", async () => {
    const user = await openGamesTab();

    await user.upload(
      screen.getByLabelText("Games JSON file"),
      new File([new Uint8Array(524_289)], "too-large.json", { type: "application/json" }),
    );

    expect(
      await screen.findByText("Choose a JSON file that is 512 KiB or smaller."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Review import" })).not.toBeInTheDocument();
  });

  it("cancels a review without saving", async () => {
    const user = await openGamesTab();

    await user.upload(
      screen.getByLabelText("Games JSON file"),
      jsonFile([{ title: "Unsaved Game", gotyYear: 2026 }]),
    );
    expect(await screen.findByRole("heading", { name: "Review import" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("heading", { name: "Review import" })).not.toBeInTheDocument();
    expect(actions.importAnnualGames).not.toHaveBeenCalled();
  });

  it("submits the original JSON text after confirmation and clears the review", async () => {
    actions.importAnnualGames.mockResolvedValue({
      addedCount: 1,
      skippedCount: 1,
      success: "Added 1 game. Skipped 1 duplicate game.",
    });
    const user = await openGamesTab();
    const records = [
      { title: "Submitted Game", gotyYear: 2026 },
      { title: "submitted game", gotyYear: 2026 },
    ];

    await user.upload(screen.getByLabelText("Games JSON file"), jsonFile(records));
    expect(await screen.findByText(/1 to add · 1 to skip/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm import" }));

    expect(await screen.findByText("Added 1 game. Skipped 1 duplicate game.")).toBeInTheDocument();
    expect(actions.importAnnualGames).toHaveBeenCalledTimes(1);
    const submitted = actions.importAnnualGames.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("json")).toBe(JSON.stringify(records));
    expect(screen.queryByRole("heading", { name: "Review import" })).not.toBeInTheDocument();
  });
});
