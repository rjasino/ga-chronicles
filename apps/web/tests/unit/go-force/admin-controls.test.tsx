import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoForceAdminControls } from "@/components/go-force/admin-controls";
import type { GoForceAdminData } from "@/features/go-force/admin-queries";

const actions = vi.hoisted(() => ({
  removeAnnualGame: vi.fn(),
  saveAnnualGame: vi.fn(),
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
    final_ballot_seconds: 10,
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

  it("groups page visibility and timers and supports arrow-key tab navigation", () => {
    render(<GoForceAdminControls data={data} />);

    const settingsTab = screen.getByRole("tab", { name: "Page & timers" });
    expect(settingsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Show the public Go Force page")).toBeInTheDocument();
    expect(screen.getByLabelText("Round vote duration (seconds)")).toBeInTheDocument();

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
