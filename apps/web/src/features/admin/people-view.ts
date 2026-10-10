/**
 * Pure view-state module for the "People & roles" admin list.
 *
 * All incoming query values are parsed and validated here against the allowed
 * values in `data-model.md` before they ever reach the data layer, so the page
 * and the data accessor always operate on a known-safe shape.
 */

export const PAGE_SIZE = 20;
export const MAX_Q_LENGTH = 100;

export const ROLE_FILTERS = ["any", "reader", "contributor", "moderator", "admin"] as const;
export type RoleFilter = (typeof ROLE_FILTERS)[number];

export const STATUS_FILTERS = ["any", "active", "disabled"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORT_KEYS = ["username", "email", "status", "role", "created"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_DIRS = ["asc", "desc"] as const;
export type SortDir = (typeof SORT_DIRS)[number];

export type PeopleView = {
  q: string;
  role: RoleFilter;
  status: StatusFilter;
  sort: SortKey;
  dir: SortDir;
  page: number;
};

export const DEFAULT_VIEW: PeopleView = { q: "", role: "any", status: "any", sort: "username", dir: "asc", page: 1 };

export type SearchParamsLike = Record<string, string | string[] | undefined>;

/** Fixed role hierarchy: admin > moderator > contributor > reader (implicit). */
export const ROLE_RANK = { reader: 0, contributor: 1, moderator: 2, admin: 3 } as const;

export function roleRank(roles: readonly string[]): number {
  if (!roles || roles.length === 0) return ROLE_RANK.reader;
  return Math.max(...roles.map((role) => ROLE_RANK[role as keyof typeof ROLE_RANK] ?? ROLE_RANK.reader));
}

function first(params: SearchParamsLike | undefined, key: string): string | undefined {
  const value = params?.[key];
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function parseView(params: SearchParamsLike | undefined): PeopleView {
  const rawQ = first(params, "q")?.trim() ?? "";
  const q = rawQ.slice(0, MAX_Q_LENGTH);
  const role = pick(first(params, "role"), ROLE_FILTERS, "any");
  const status = pick(first(params, "status"), STATUS_FILTERS, "any");
  const sort = pick(first(params, "sort"), SORT_KEYS, "username");
  const dir = pick(first(params, "dir"), SORT_DIRS, "asc");
  const parsedPage = Number(first(params, "page") ?? "");
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  return { q, role, status, sort, dir, page };
}

/** Clamps 1-based pages to a valid page for the given total (page 1 when total <= 0). */
export function clampPage(page: number, total: number): number {
  if (total <= 0) return 1;
  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, Math.ceil(total / PAGE_SIZE)));
}

/** Serializes the view back to query parameters, omitting defaults. */
export function viewToSearchParams(view: PeopleView): URLSearchParams {
  const sp = new URLSearchParams();
  if (view.q) sp.set("q", view.q);
  if (view.role !== "any") sp.set("role", view.role);
  if (view.status !== "any") sp.set("status", view.status);
  if (view.sort !== "username") sp.set("sort", view.sort);
  if (view.dir !== "asc") sp.set("dir", view.dir);
  if (view.page !== 1) sp.set("page", String(view.page));
  return sp;
}

/** Builds a route href that preserves the given list view. */
export function buildViewUrl(path: string, view: PeopleView): string {
  const qs = viewToSearchParams(view).toString();
  return qs ? `${path}?${qs}` : path;
}