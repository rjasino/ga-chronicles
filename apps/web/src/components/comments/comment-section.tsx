"use client";

import { useActionState } from "react";
import { reportComment, type CommentState } from "@/features/comments/actions";
import { CommentForm } from "@/components/comments/comment-form";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";

type PublicComment = { id: string; body: string; created_at: string; display_name: string | null };

function ReportButton({ commentId }: { commentId: string }) {
  const [state, action, pending] = useActionState(reportComment, {} satisfies CommentState);
  return <form action={action}><input type="hidden" name="commentId" value={commentId} /><Button purpose="text" pending={pending}>{pending ? "Sending…" : "Report"}</Button>{state.error && <Message tone="error" className="mt-1">{state.error}</Message>}{state.success && <Message tone="success" className="mt-1">{state.success}</Message>}</form>;
}

export function CommentSection({ articleId, comments, enabled, signedIn }: { articleId: string; comments: PublicComment[]; enabled: boolean; signedIn: boolean }) {
  return <section className="comment-section mx-auto mt-12 mb-20 max-w-[760px] border-t-[3px] border-blue pt-6" aria-labelledby="comments-heading">
    <h2 id="comments-heading" className="m-0 font-display text-[1.8rem] font-semibold text-blue">Conversation <span className="text-[.95rem] font-medium text-muted">{comments.length}</span></h2>
    {!enabled && <p className="comments-off mx-auto mt-4 mb-16 max-w-[760px] border-l-4 border-yellow bg-paper px-[1.2rem] py-4">Comments are turned off for this article.</p>}
    {comments.length ? <ul className="comment-list m-6 grid list-none gap-3.5 p-0">{comments.map((comment) => <li key={comment.id} className="border border-line px-[1.2rem] py-4">
      <p className="comment-author m-0 font-bold text-blue">{comment.display_name || "Reader"}</p>
      <p className="my-1 mb-2.5">{comment.body}</p>
      <ReportButton commentId={comment.id} />
    </li>)}</ul> : <p className="empty-state bg-paper p-8 text-muted">No comments yet. Start the conversation.</p>}
    {enabled && <CommentForm articleId={articleId} signedIn={signedIn} />}
  </section>;
}
