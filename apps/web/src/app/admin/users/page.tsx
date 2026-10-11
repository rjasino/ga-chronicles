import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAnyRole } from "@/lib/authz/require-role";
import { listManagedAccounts } from "@/features/admin/account-actions";
import { buildViewUrl, clampPage, parseView, type SearchParamsLike } from "@/features/admin/people-view";
import { PeopleFilters } from "@/components/admin/people-filters";
import { PeopleList } from "@/components/admin/people-list";
import { PeopleSort } from "@/components/admin/people-sort";
import { Pagination } from "@/components/admin/pagination";
import { ButtonLink } from "@/components/ui/button";

export default async function UsersPage({ searchParams }: { searchParams?: Promise<SearchParamsLike> }) {
  const session = await requireAnyRole(["admin"]);
  const view = parseView(await searchParams);
  const { rows, total } = await listManagedAccounts(view);

  // An address that asks for a page beyond the last valid page settles on the
  // last page (or page 1), matching the view-state contract.
  const page = clampPage(view.page, total);
  if (page !== view.page) redirect(buildViewUrl("/admin/users", { ...view, page }));

  return (
    <main className="page-shell admin-page min-h-[70vh] py-12 pb-20">
      <div className="section-heading mb-6 flex items-center justify-between border-b-[3px] border-blue">
        <h1 className="m-0 mb-2.5 font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] tracking-[-.05em] text-blue">People & roles</h1>
        <ButtonLink purpose="primary" href="/admin/users/new">Create internal account</ButtonLink>
      </div>
      <PeopleFilters initial={view} />
      <PeopleSort initial={view} />
      {total === 0 ? (
        <p className="empty-state bg-paper p-8 text-muted" role="status">
          No people match the current filters. <Link href="/admin/users">Clear filters</Link>
        </p>
      ) : (
        <>
          <PeopleList rows={rows} />
          <Pagination view={view} total={total} />
        </>
      )}
      <p className="field-hint m-0 text-[.88rem] text-muted">Signed in with {session.roles.join(" + ") || "reader"} access.</p>
    </main>
  );
}