import type { Role } from "@/lib/authz/permissions";
import { canSpendGo } from "@/features/go-force/rules";
import type { GoForceSessionStatus, GoForceVoteChoice } from "@/features/go-force/types";

export type GoForceAccessContext = {
  userId: string | null;
  roles: readonly Role[];
  session: { gameMasterId: string; status: GoForceSessionStatus } | null;
  participantIds: readonly string[];
};

export function isGoForceAdmin(roles: readonly Role[]): boolean {
  return roles.includes("admin");
}

export function isGoForceGameMaster(userId: string | null, gameMasterId: string): boolean {
  return Boolean(userId) && userId === gameMasterId;
}

export function isRosterMember(userId: string | null, participantIds: readonly string[]): boolean {
  return Boolean(userId) && participantIds.includes(userId as string);
}

export function canManageGoForce(roles: readonly Role[]): boolean {
  return isGoForceAdmin(roles);
}

export function canViewGoForcePage(pageVisible: boolean, roles: readonly Role[]): boolean {
  return pageVisible || isGoForceAdmin(roles);
}

export function canSeeGoForceNavigation(pageVisible: boolean, hasActiveSession: boolean, roles: readonly Role[]): boolean {
  return isGoForceAdmin(roles) || (pageVisible && hasActiveSession);
}

export function canAccessGoForceSession(context: GoForceAccessContext): boolean {
  if (!context.session) return false;
  if (isGoForceAdmin(context.roles)) return true;
  if (isGoForceGameMaster(context.userId, context.session.gameMasterId)) return true;
  return isRosterMember(context.userId, context.participantIds);
}

export function canControlGoForceSession(context: GoForceAccessContext): boolean {
  if (!context.session) return false;
  return isGoForceAdmin(context.roles) || isGoForceGameMaster(context.userId, context.session.gameMasterId);
}

export function canStartGoForceSession(context: GoForceAccessContext): boolean {
  return context.session?.status === "ready" && canControlGoForceSession(context);
}

export function canDrawSelection(context: GoForceAccessContext): boolean {
  return context.session?.status === "live" && canControlGoForceSession(context);
}

export function canCloseSelection(context: GoForceAccessContext): boolean {
  return context.session?.status === "live" && canControlGoForceSession(context);
}

export function canCloseFinalBallot(context: GoForceAccessContext): boolean {
  return context.session?.status === "final_ballot" && canControlGoForceSession(context);
}

export function canViewResults(
  status: GoForceSessionStatus,
  resultsVisible: boolean,
  roles: readonly Role[],
): boolean {
  if (isGoForceAdmin(roles)) return true;
  return status === "complete" && resultsVisible;
}

export function canPublishResults(status: GoForceSessionStatus, roles: readonly Role[]): boolean {
  return isGoForceAdmin(roles) && status === "complete";
}

export type GameVoteAccessInput = {
  sessionStatus: GoForceSessionStatus;
  roundStatus: "pending" | "active" | "complete";
  roundNumber: number;
  votingClosed: boolean;
  isParticipant: boolean;
  hasSubmitted: boolean;
  usedGo: number;
  choice: GoForceVoteChoice;
};

export function canSubmitGameVote(input: GameVoteAccessInput): boolean {
  if (input.sessionStatus !== "live" || input.roundStatus !== "active") return false;
  if (input.votingClosed || !input.isParticipant || input.hasSubmitted) return false;
  if (input.choice === "abstain") return false;
  return input.choice === "no-go" || canSpendGo(input.roundNumber, input.usedGo);
}

export function canSubmitFinalBallot(input: {
  sessionStatus: GoForceSessionStatus;
  isParticipant: boolean;
  hasSubmitted: boolean;
}): boolean {
  return input.sessionStatus === "final_ballot" && input.isParticipant && !input.hasSubmitted;
}
