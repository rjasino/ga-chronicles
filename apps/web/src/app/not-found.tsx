import Link from "next/link";

export default function NotFound() {
  return <main className="page-shell not-found flex min-h-[55vh] flex-col items-start justify-center"><p className="article-type m-0 mb-2.5 text-[.78rem] font-bold tracking-[.06em] text-red uppercase">No story here</p><h1 className="m-0 font-display text-[clamp(2.5rem,6vw,4rem)] leading-[.98] tracking-[-.065em] text-blue">Article not found</h1><p>This story may be unpublished or the address may be incorrect.</p><Link className="text-link mt-2 inline-block font-bold text-blue" href="/">Back to all stories</Link></main>;
}
