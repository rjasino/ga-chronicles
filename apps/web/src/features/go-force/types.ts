export const GO_FORCE_ROUND_NUMBERS = [1, 2, 3] as const;

export type GoForceRoundNumber = (typeof GO_FORCE_ROUND_NUMBERS)[number];

export const GO_FORCE_SESSION_STATUSES = [
  "ready",
  "live",
  "final_ballot",
  "complete",
  "stopped_no_finalists",
  "incomplete_vote_threshold",
] as const;

export type GoForceSessionStatus = (typeof GO_FORCE_SESSION_STATUSES)[number];

export type GoForceVoteChoice = "go" | "no-go" | "abstain";

export type AnnualGameEligibility = "eligible" | "ineligible";

export type AnnualGame = {
  id: string;
  goty_year: number;
  title: string;
  eligibility_state: AnnualGameEligibility;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type GoForcePageSettings = {
  id: boolean;
  page_visible: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type GoForceSession = {
  id: string;
  goty_year: number;
  game_master_id: string;
  status: GoForceSessionStatus;
  started_at: string | null;
  completed_at: string | null;
  vote_completion_percentage: number | null;
  created_at: string;
  updated_at: string;
};

export type SessionParticipant = {
  session_id: string;
  account_id: string;
  display_name_snapshot: string;
  roster_order: number;
  active: boolean;
  created_at: string;
};

export type SessionGameSnapshot = {
  id: string;
  session_id: string;
  annual_game_id: string | null;
  title_snapshot: string;
  source_year: number;
  display_order: number;
  created_at: string;
};

export type GoForceRound = {
  id: string;
  session_id: string;
  round_number: GoForceRoundNumber;
  status: "pending" | "active" | "complete";
  go_limit: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type GameSelection = {
  id: string;
  round_id: string;
  session_game_id: string;
  selection_order: number;
  selected_at: string;
  voting_closed_at: string | null;
  advancement_outcome: "pending" | "advanced" | "eliminated";
};

export type GameVote = {
  id: string;
  selection_id: string;
  participant_account_id: string;
  choice: GoForceVoteChoice;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type FinalBallotVote = {
  id: string;
  session_id: string;
  participant_account_id: string;
  finalist_game_id: string | null;
  remark: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type GOTYResult = {
  id: string;
  session_id: string;
  winner_game_ids: string[];
  final_vote_totals: Record<string, number>;
  results_visible: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SelectionWithVotes = GameSelection & {
  game: SessionGameSnapshot | null;
  round: GoForceRound | null;
  votes: GameVote[];
};

export type FinalistWithTitle = {
  gameId: string;
  title: string;
  votes: number;
};

export type SessionView = {
  session: GoForceSession;
  participants: SessionParticipant[];
  games: SessionGameSnapshot[];
  rounds: GoForceRound[];
  selections: SelectionWithVotes[];
  finalBallotVotes: FinalBallotVote[];
  result: GOTYResult | null;
};

export type FacilitatorSessionView = SessionView & {
  currentRound: GoForceRound | null;
  currentSelection: SelectionWithVotes | null;
  closingSelection: SelectionWithVotes | null;
  remainingGames: SessionGameSnapshot[];
  finalists: FinalistWithTitle[];
  ballotSubmittedCount: number;
  roundThreeGoCounts: Record<string, number>;
};

export type PlayerSessionView = SessionView & {
  participant: SessionParticipant | null;
  currentRound: GoForceRound | null;
  currentSelection: SelectionWithVotes | null;
  ownVote: GameVote | null;
  ownFinalBallotVote: FinalBallotVote | null;
  goVotesUsedInRound: number;
  finalists: FinalistWithTitle[];
};

export type PublicResultsView = SessionView & {
  finalists: FinalistWithTitle[];
  winners: FinalistWithTitle[];
  roundThreeSelections: SelectionWithVotes[];
};
