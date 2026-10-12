"use client";

import Link from "next/link";
import { useActionState } from "react";
import { deleteComment, removeArticle, type ModerationState } from "@/features/moderation/actions";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";

type QueueItem = { id: string; body: string; articles: { title: string; slug: string } | null; reportCount: number; threshold: number; actionable: boolean };

function CommentAction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deleteComment, {} satisfies ModerationState);
  return <form action={action}><input type="hidden" name="commentId" value={id} /><Button purpose="error" pending={pending}>{pending ? "Removing…" : "Remove comment"}</Button>{state.error && <Message tone="error" className="mt-1">{state.error}</Message>}{state.success && <Message tone="success" className="mt-1">{state.success}</Message>}</form>;
}

function ArticleAction({ id }: { id: string }) {
  const [state, action, pending] = useActionState(removeArticle, {} satisfies ModerationState);
  return <form action={action}><input type="hidden" name="articleId" value={id} /><Button purpose="error" pending={pending}>{pending ? "Removing…" : "Remove article"}</Button>{state.error && <Message tone="error" className="mt-1">{state.error}</Message>}{state.success && <Message tone="success" className="mt-1">{state.success}</Message>}</form>;
}

export function ReviewQueue({ items }: { items: QueueItem[] }) {
  return <div className="review-list my-6 mb-12 grid gap-4">{items.length ? items.map((item) => <article className="review-item border border-line p-5" key={item.id}>
    <p className="review-item__state m-0 font-bold text-red">{item.actionable ? "Action available" : "Flagged — below threshold"} · {item.reportCount} of {item.threshold} reports</p>
    <blockquote className="my-3 border-l-[3px] border-yellow pl-4">{item.body}</blockquote>
    {item.articles && <p>On <Link href={`/articles/${item.articles.slug}`}>{item.articles.title}</Link></p>}
    {item.actionable && <CommentAction id={item.id} />}
  </article>) : <p className="empty-state bg-paper p-8 text-muted">No reported comments need review.</p>}</div>;
}

export { ArticleAction };
