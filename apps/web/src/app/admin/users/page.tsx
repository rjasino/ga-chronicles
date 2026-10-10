import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/authz/require-role";
import { listManagedAccounts } from "@/features/admin/account-actions";
import { buildViewUrl, clampPage, parseView, type SearchParamsLike } from "@/features/admin/people-view";
import { PeopleFilters } from "@/components/admin/people-filters";
import { PeopleList } from "@/components/admin/people-list";
import { PeopleSort } from "@/components/admin/people-sort";
import { Pagination } from "@/components/admin/pagination";

export default async function UsersPage({ searchParams }: { searchParams?: Promise<SearchParamsLike> }) {
  const session = await requireAnyRole(["admin"]);
  const view = parseView(await searchParams);
  const { rows, total } = await listManagedAccounts(view);

  // An address that asks for a page beyond the last valid page settles on the
  // last page (or page 1), matching the view-state contract.
  const page = clampPage(view.page, total);
  if (page !== view.page) redirect(buildViewUrl("/admin/users", { ...view, page }));

  return (
    <main className="page-shell admin-page">
      <div className="section-heading">
        <h1>People & roles</h1>
        <Link className="button-link" href="/admin/users/new">Create internal account</Link>
      </div>
      <PeopleFilters initial={view} />
      <PeopleSort initial={view} />
      {total === 0 ? (
        <p className="empty-state" role="status">
          No people match the current filters. <Link href="/admin/users">Clear filters</Link>
        </p>
      ) : (
        <>
          <PeopleList rows={rows} />
          <Pagination view={view} total={total} />
        </>
      )}
      <p className="field-hint">Signed in with {session.roles.join(" + ") || "reader"} access.</p>
    </main>
  );
}