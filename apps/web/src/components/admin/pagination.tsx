import Link from "next/link";
import { buildViewUrl, PAGE_SIZE, type PeopleView } from "@/features/admin/people-view";

/** Paged navigation for the People & roles list; hidden when results fit one page. */
export function Pagination({ view, total }: { view: PeopleView; total: number }) {
  if (total <= PAGE_SIZE) return null;
  const maxPage = Math.ceil(total / PAGE_SIZE);
  const page = Math.min(Math.max(1, view.page), maxPage);
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination__summary">Showing {from}–{to} of {total}</p>
      <ul className="pagination__list">
        <li className="pagination__item">
          {page > 1
            ? <Link href={buildViewUrl("/admin/users", { ...view, page: page - 1 })}>Previous</Link>
            : <span aria-hidden="true">Previous</span>}
        </li>
        {pages.map((n) => (
          <li className="pagination__item" key={n}>
            {n === page
              ? <span aria-current="page">{n}</span>
              : <Link href={buildViewUrl("/admin/users", { ...view, page: n })}>{n}</Link>}
          </li>
        ))}
        <li className="pagination__item">
          {page < maxPage
            ? <Link href={buildViewUrl("/admin/users", { ...view, page: page + 1 })}>Next</Link>
            : <span aria-hidden="true">Next</span>}
        </li>
      </ul>
    </nav>
  );
}