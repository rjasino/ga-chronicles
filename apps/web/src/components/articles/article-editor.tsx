"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveArticle, type EditorState } from "@/features/articles/actions";
import { RichTextEditor } from "@/features/articles/richtext/editor";
import type { Article } from "@/features/articles/queries";

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
    <label>Title<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Article type<select name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="news">News</option><option value="review">Review</option><option value="commentary/opinion">Commentary / opinion</option><option value="interview">Interview</option></select></label>
    <label>Cover image<input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    {article?.cover_image && <fieldset className="form-stack">
      <legend>Current cover image</legend>
      <p>A cover image is saved for this article. Choose a new file above to replace it.</p>
      <label><input type="checkbox" name="remove_cover" value="true" /> Remove current cover image</label>
    </fieldset>}
    <div className="form-stack">
      <span className="field-label">Article body</span>
      <RichTextEditor initialBody={article?.body ?? ""} />
    </div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.message && <p className="form-success" role="status">{state.message}</p>}
    <div className="form-actions"><button name="intent" value="draft" disabled={pending}>Save draft</button><button name="intent" value="publish" disabled={pending}>Publish</button>{articleId && <Link className="text-link" href={`/admin/articles/${articleId}/preview`}>Preview draft</Link>}</div>
  </form>;
}