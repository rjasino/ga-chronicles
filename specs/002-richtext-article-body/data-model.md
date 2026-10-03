# Data Model: Richtext Article Body

This model captures the entities and integrity rules required by [spec.md](spec.md) for rich article bodies and inline images. It extends the model defined in `specs/001-blog-site-launch/data-model.md` (account/role, article, comment/report, settings) rather than replacing it.

## Entities

### Article (modified — rich body)

Represents a news article, review, commentary/opinion piece, or interview. All fields are unchanged from the launch model except the semantics of `body`.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `title` | Required and non-empty after trimming. |
| `slug` | Required, normalized, unique public route identifier. |
| `body` | Required and non-empty after trimming. For new content this stores sanitized rich HTML (headings, bold/italic, lists, block quotes, links, inline images). For legacy content it stores plain paragraphs; the renderer detects and converts those as before. |
| `type` | One of news, review, commentary/opinion, or interview. |
| `status` | Draft, published, or removed; only published articles appear publicly. |
| `author_id` | Required reference to the account that authored the article. |
| `cover_image` | Optional reference to the article cover image (unchanged). |
| `published_at` | Absent for drafts; set when published and refreshed on republish. |
| `created_at`, `updated_at` | Required timestamps. |

Validation of `body`: non-empty after trimming (corrected with a clear message, preserving the draft), and capped at a reasonable HTML length (e.g., 200,000 characters) as a storage safety valve. Only sanitized rich HTML is accepted for new saves from the editor.

### Article Body Image (new)

A stored image file referenced from within an article body. Tracks which article references which storage path so lifecycle cleanup is correct.

| Field | Meaning / validation |
|---|---|
| `id` | Stable unique identifier. |
| `article_id` | Required reference to the article whose body references the image; cascade-deleted with the article. |
| `storage_path` | Required reference to the object in the `article-images` storage bucket (for example `<user-id>/<uuid>.webp`). |
| `created_at` | Required timestamp. |

The pair (`storage_path`, `article_id`) is unique, so an article references a given stored image at most once. A storage path may be referenced by multiple articles (shared reuse) — cleanup only deletes an object after every reference is gone.

### Body Image Storage bucket (new)

A public Supabase Storage bucket `article-images` that holds inline body images.

| Property | Value / validation |
|---|---|
| `public` | Readable by anyone (anonymous readers and previews fetch images directly). |
| `file_size_limit` | 10 MiB per object, matching the cover-image limit. |
| `allowed_mime_types` | `image/jpeg`, `image/png`, `image/webp`. |
| Object path convention | `<uploading-user-id>/<random-uuid>.<extension>` — the first folder equals the uploading account so ownership-based RLS matches the existing cover bucket. |

## Relationships

- One article has zero or more referenced body images, recorded in `article_body_images`; each reference points to one `storage_path` in the bucket.
- One `storage_path` may be referenced by one or more articles; it is retained while at least one reference exists and is eligible for deletion only when its last reference disappears.
- `Article.body` embeds inline image locations as URLs derived from `storage_path`; `article_body_images` is bookkeeping for lifecycle, not read on the public rendering path.
- The article cover image (`cover_image`) is independent of body images and continues to follow the existing cover lifecycle.

## Key state transitions

- **Body image reference**: `referenced ↔ removed` — added when a body contains the path after a save; removed when a save no longer contains it. When the removed path's last reference is gone, the storage object is deleted (best-effort).
- **Article body format**: `plain text → rich HTML` — a legacy body transforms to rich HTML only when the author edits and resaves it through the editor; until then it renders as plain paragraphs.
- **Article states**: unchanged from the launch model (`draft → published → draft`, etc.); rich editing works within every article state.

## Integrity and authorization rules

- Enforce non-empty and length-capped `body`, unique article slugs, and unique (`storage_path`, `article_id`) references.
- Sanitize authored body HTML on the trusted server boundary before storing; reject or neutralize anything outside the documented allowlist.
- Restrict `article_body_images` writes to the article's author or admins (RLS), matching article authoring policy.
- Restrict bucket object insert/delete to authenticated contributors/admins (upload under own user folder; admins may delete anywhere); allow public reads.
- Delete storage objects only when no database reference remains; log and continue if a cleanup deletion fails so article saves are never blocked.
- Keep rich-editor client code out of anonymous reader pages; readers receive already-sanitized server-rendered HTML.