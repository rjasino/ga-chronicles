import Link from "next/link";
import { buildViewUrl, PAGE_SIZE, type PeopleView } from "@/features/admin/people-view";

const itemLink = "inline-flex min-h-[34px] min-w-[34px] items-center justify-center border border-line bg-white px-2.5 font-semibold text-blue no-underline hover:border-blue";
const itemCurrent = "inline-flex min-h-[34px] min-w-[34px] items-center justify-center border border-blue bg-blue px-2.5 font-semibold text-white";
const itemDisabled = "inline-flex min-h-[34px] min-w-[34px] items-center justify-center border border-line bg-paper px-2.5 font-semibold text-muted";

/** Paged navigation for the People & roles list; hidden when results fit one page. */
export function Pagination({ view, total }: { view: PeopleView; total: number }) {
  if (total <= PAGE_SIZE) return null;
  const maxPage = Math.ceil(total / PAGE_SIZE);
  const page = Math.min(Math.max(1, view.page), maxPage);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);

  return (
    <nav className="pagination mx-0 my-4 mb-8 flex flex-wrap items-center justify-between gap-3 max-[760px]:justify-center" aria-label="Pagination">
      <p className="pagination__summary m-0 text-[.9rem] text-muted max-[760px]:w-full max-[760px]:text-center">Showing {from}–{to} of {total}</p>
      <ul className="pagination__list m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
        <li className="pagination__item">
          {page > 1
            ? <Link className={itemLink} href={buildViewUrl("/admin/users", { ...view, page: page - 1 })}>Previous</Link>
            : <span className={itemDisabled} aria-hidden="true">Previous</span>}
        </li>
        {pages.map((n) => (
          <li className="pagination__item" key={n}>
            {n === page
              ? <span className={itemCurrent} aria-current="page">{n}</span>
              : <Link className={itemLink} href={buildViewUrl("/admin/users", { ...view, page: n })}>{n}</Link>}
          </li>
        ))}
        <li className="pagination__item">
          {page < maxPage
            ? <Link className={itemLink} href={buildViewUrl("/admin/users", { ...view, page: page + 1 })}>Next</Link>
            : <span className={itemDisabled} aria-hidden="true">Next</span>}
        </li>
      </ul>
    </nav>
  );
}
