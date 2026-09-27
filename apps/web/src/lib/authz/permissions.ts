export type Role = "reader" | "contributor" | "moderator" | "admin";
export type Permission =
  | "read"
  | "comment"
  | "publish"
  | "moderate"
  | "manageRoles"
  | "manageSettings";

const grants: Record<Exclude<Permission, "read" | "comment">, readonly Role[]> = {
  publish: ["contributor", "admin"],
  moderate: ["moderator", "admin"],
  manageRoles: ["admin"],
  manageSettings: ["admin"],
};

export function can(roles: readonly Role[], permission: Permission): boolean {
  if (permission === "read" || permission === "comment") return true;
  return grants[permission].some((role) => roles.includes(role));
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}
