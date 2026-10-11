"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveArticle, type EditorState } from "@/features/articles/actions";
import { RichTextEditor } from "@/features/articles/richtext/editor";
import type { Article } from "@/features/articles/queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Message } from "@/components/ui/message";
import { Select, TextField } from "@/components/ui/text-field";

export function ArticleEditor({ article }: { article?: Article | null }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [type, setType] = useState(article?.type ?? "news");
  const [state, action, pending] = useActionState(saveArticle, {
    articleId: article?.id,
    title,
    type,
    ...({} satisfies EditorState),
  });
  const articleId = state.articleId ?? article?.id ?? "";
  return <form action={action} className="form-stack article-editor">
    <input type="hidden" name="articleId" value={articleId} />
    <TextField label="Title" name="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
    <Select label="Article type" name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="news">News</option><option value="review">Review</option><option value="commentary/opinion">Commentary / opinion</option><option value="interview">Interview</option></Select>
    <TextField label="Cover image" name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" />
    {article?.cover_image && <fieldset className="form-stack">
      <legend>Current cover image</legend>
      <p>A cover image is saved for this article. Choose a new file above to replace it.</p>
      <Checkbox name="remove_cover" value="true" label="Remove current cover image" />
    </fieldset>}
    <div className="form-stack">
      <span className="font-semibold text-ink">Article body</span>
      <RichTextEditor initialBody={article?.body ?? ""} />
    </div>
    {state.error && <Message tone="error">{state.error}</Message>}
    {state.message && <Message tone="success">{state.message}</Message>}
    <div className="form-actions"><Button name="intent" value="draft" purpose="secondary" pending={pending}>Save draft</Button><Button name="intent" value="publish" purpose="primary" pending={pending}>Publish</Button>{articleId && <Link className="text-link" href={`/admin/articles/${articleId}/preview`}>Preview draft</Link>}</div>
  </form>;
}
