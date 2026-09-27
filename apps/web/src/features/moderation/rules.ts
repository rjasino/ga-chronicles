import type { Role } from "@/lib/authz/permissions";

export function moderationEligibility(
  reporterIds: readonly string[],
  threshold: number,
  roles: readonly Role[],
) {
  if (!Number.isInteger(threshold) || threshold < 1) throw new Error("Threshold must be positive.");
  const uniqueReports = new Set(reporterIds).size;
  const admin = roles.includes("admin");
  return {
    uniqueReports,
    flagged: uniqueReports > 0,
    actionable: admin || (roles.includes("moderator") && uniqueReports >= threshold),
  };
}
