"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveArticle, type EditorState } from "@/features/articles/actions";
import type { Article } from "@/features/articles/queries";

export function ArticleEditor({ article }: { article?: Article | null }) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [body, setBody] = useState(article?.body ?? "");
  const [type, setType] = useState(article?.type ?? "news");
  const [coverImage, setCoverImage] = useState(article?.cover_image ?? "");
  const [state, action, pending] = useActionState(saveArticle, {
    articleId: article?.id,
    title,
    body,
    type,
    ...({} satisfies EditorState),
  });
  const articleId = state.articleId ?? article?.id ?? "";
  return <form action={action} className="form-stack article-editor">
    <input type="hidden" name="articleId" value={articleId} />
    <label>Title<input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
    <label>Article type<select name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="news">News</option><option value="review">Review</option><option value="commentary/opinion">Commentary / opinion</option><option value="interview">Interview</option></select></label>
    <label>Cover image path<input name="cover_image" placeholder="/brand/cover.jpg" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} /></label>
    <label>Article body<textarea name="body" rows={14} required value={body} onChange={(event) => setBody(event.target.value)} /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.message && <p className="form-success" role="status">{state.message}</p>}
    <div className="form-actions"><button name="intent" value="draft" disabled={pending}>Save draft</button><button name="intent" value="publish" disabled={pending}>Publish</button>{articleId && <Link className="text-link" href={`/admin/articles/${articleId}/preview`}>Preview draft</Link>}</div>
  </form>;
}
