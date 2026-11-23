const messages: Record<string, string> = {
  NOT_AUTHORIZED: "Only the game master or an admin can do that.",
  INVALID_GOTY_YEAR: "Choose a year from 2000 through 2100.",
  INVALID_ROSTER: "Select between 1 and 64 players.",
  ACTIVE_ACCOUNT_REQUIRED: "Every selected player must have an active account.",
  SESSION_NOT_FOUND: "That Go Force session could not be found.",
  SESSION_NOT_READY: "This session has already started.",
  SESSION_NOT_LIVE: "This session is not accepting game votes.",
  EMPTY_ROSTER: "Add at least one player before starting the session.",
  NO_ELIGIBLE_GAMES: "Add at least one eligible game for this GOTY year before starting.",
  NO_ACTIVE_ROUND: "This session has no active round.",
  ROUND_EXHAUSTED: "Every game in this round has already been selected.",
  OPEN_BALLOT: "Close the current ballot before spinning again.",
  GAME_ALREADY_SELECTED: "That game has already been selected in this round.",
  GAME_NOT_ELIGIBLE: "That game is not eligible for the active round.",
  ROUND_NOT_ACTIVE: "This round is no longer accepting votes.",
  SELECTION_NOT_FOUND: "That game selection could not be found.",
  VOTING_CLOSED: "Voting for this game is already closed.",
  INVALID_CHOICE: "Choose go or no-go.",
  NOT_A_PARTICIPANT: "You are not on this session's roster.",
  VOTE_ALREADY_SUBMITTED: "You already voted on this game.",
  GO_LIMIT_REACHED: "You have used all of your go votes for this round.",
  BALLOT_NOT_OPEN: "The final ballot is not open.",
  NOT_A_FINALIST: "Choose one of the Round 3 finalists.",
  BALLOT_ALREADY_SUBMITTED: "You already submitted this ballot.",
  REMARK_TOO_LONG: "Keep remarks at 500 characters or fewer.",
};

export function goForceErrorMessage(error: { message?: string; code?: string } | null, fallback: string): string {
  const raw = error?.message ?? "";
  const code = Object.keys(messages).find((candidate) => raw.includes(candidate));
  if (code) return messages[code];
  if (error?.code === "23505") return "That record already exists.";
  return fallback;
}
