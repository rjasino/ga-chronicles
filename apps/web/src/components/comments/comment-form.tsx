"use client";

import { useActionState, useState } from "react";
import { postComment, type CommentState } from "@/features/comments/actions";

export function CommentForm({ articleId, signedIn }: { articleId: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(postComment, {} satisfies CommentState);
  if (!signedIn) return <p><a href="/sign-in">Sign in</a> to join the conversation.</p>;
  return <form className="form-stack comment-form" action={action}>
    <input type="hidden" name="articleId" value={articleId} />
    <label htmlFor="comment-body">Your comment</label>
    <CommentTextarea key={state.resetKey ?? "first"} initialValue={state.body ?? ""} />
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status">{state.success}</p>}
    <button disabled={pending}>{pending ? "Posting…" : "Post comment"}</button>
  </form>;
}

function CommentTextarea({ initialValue }: { initialValue: string }) {
  const [body, setBody] = useState(initialValue);
  return <textarea id="comment-body" name="body" rows={4} maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} />;
}
