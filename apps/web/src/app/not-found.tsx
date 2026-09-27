import Link from "next/link";

export default function NotFound() {
  return <main className="page-shell not-found"><p className="article-type">No story here</p><h1>Article not found</h1><p>This story may be unpublished or the address may be incorrect.</p><Link className="text-link" href="/">Back to all stories</Link></main>;
}
