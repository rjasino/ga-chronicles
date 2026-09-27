"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteComment, removeArticle, type ModerationState } from "@/features/moderation/actions";

type QueueItem = { id: string; body: string; articles: { title: string; slug: string } | null; reportCount: number; threshold: number; actionable: boolean };

function CommentAction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteComment, {} satisfies ModerationState);
  return <form action={action}><input type="hidden" name="commentId" value={id} /><button disabled={pending}>{pending ? "Removing…" : "Remove comment"}</button>{state.error && <span role="alert">{state.error}</span>}{state.success && <span role="status">{state.success}</span>}</form>;
}

function ArticleAction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeArticle, {} satisfies ModerationState);
  return <form action={action}><input type="hidden" name="articleId" value={id} /><button className="button-secondary" disabled={pending}>{pending ? "Removing…" : "Remove article"}</button>{state.error && <span role="alert">{state.error}</span>}{state.success && <span role="status">{state.success}</span>}</form>;
}

export function ReviewQueue({ items }: { items: QueueItem[] }) {
  return <div className="review-list">{items.length ? items.map((item) => <article className="review-item" key={item.id}>
    <p className="review-item__state">{item.actionable ? "Action available" : "Flagged — below threshold"} · {item.reportCount} of {item.threshold} reports</p>
    <blockquote>{item.body}</blockquote>
    {item.articles && <p>On <Link href={`/articles/${item.articles.slug}`}>{item.articles.title}</Link></p>}
    {item.actionable && <CommentAction id={item.id} />}
  </article>) : <p className="empty-state">No reported comments need review.</p>}</div>;
}

export { ArticleAction };
