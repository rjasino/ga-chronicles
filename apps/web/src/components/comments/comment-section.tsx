"use client";

import { useActionState } from "react";
import { reportComment, type CommentState } from "@/features/comments/actions";
import { CommentForm } from "@/components/comments/comment-form";

type PublicComment = { id: string; body: string; created_at: string; display_name: string | null };

function ReportButton({ commentId }: { commentId: string }) {
  const [state, action, pending] = useActionState(reportComment, {} satisfies CommentState);
  return <form action={action}><input type="hidden" name="commentId" value={commentId} /><button className="button-text" disabled={pending}>{pending ? "Sending…" : "Report"}</button>{state.error && <span role="alert"> {state.error}</span>}{state.success && <span role="status"> {state.success}</span>}</form>;
}

export function CommentSection({ articleId, comments, enabled, signedIn }: { articleId: string; comments: PublicComment[]; enabled: boolean; signedIn: boolean }) {
  return <section className="comment-section" aria-labelledby="comments-heading">
    <h2 id="comments-heading">Conversation <span>{comments.length}</span></h2>
    {!enabled && <p className="comments-off">Comments are turned off for this article.</p>}
    {comments.length ? <ul className="comment-list">{comments.map((comment) => <li key={comment.id}>
      <p className="comment-author">{comment.display_name || "Reader"}</p>
      <p>{comment.body}</p>
      <ReportButton commentId={comment.id} />
    </li>)}</ul> : <p className="empty-state">No comments yet. Start the conversation.</p>}
    {enabled && <CommentForm articleId={articleId} signedIn={signedIn} />}
  </section>;
}
