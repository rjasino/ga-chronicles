"use client";

import { useActionState, useState } from "react";
import { postComment, type CommentState } from "@/features/comments/actions";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextArea } from "@/components/ui/text-field";

export function CommentForm({ articleId, signedIn }: { articleId: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState(postComment, {} satisfies CommentState);
  if (!signedIn) return <p><a href="/sign-in">Sign in</a> to join the conversation.</p>;
  return <form className="form-stack comment-form" action={action}>
    <input type="hidden" name="articleId" value={articleId} />
    <CommentTextarea key={state.resetKey ?? "first"} initialValue={state.body ?? ""} />
    {state.error && <Message tone="error">{state.error}</Message>}
    {state.success && <Message tone="success">{state.success}</Message>}
    <Button purpose="primary" pending={pending}>{pending ? "Posting…" : "Post comment"}</Button>
  </form>;
}

function CommentTextarea({ initialValue }: { initialValue: string }) {
  const [body, setBody] = useState(initialValue);
  return <TextArea id="comment-body" label="Your comment" name="body" rows={4} maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} />;
}
