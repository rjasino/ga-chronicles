# Data Model: Editorial Desk UI Fixes

This feature does not add or change any persisted entity. No database migration is needed.

## Existing entities used

### Article

- Fields used: `title`, `type`, `body`, `cover_image`, `slug`.
- `body` stores sanitized rich HTML for new content. Legacy plain-text bodies are still supported.
- No change to the storage format. Lists and links already save correctly; only how they display changes.

### Article Body Image

- Stored in the `article-images` bucket and referenced by URL inside `body`.
- Size limit: `ARTICLE_IMAGES_MAX_SIZE` (10 MiB). Unchanged.
- Allowed formats: JPEG, PNG, WebP. Unchanged.

## Derived (in-memory) values

### Card summary text

- Input: an article's stored `body`.
- Output: plain text from `richBodyToPlainText(body)`, truncated to 155 characters with an ellipsis, as in the current card.
- Not stored. Recomputed on render.

### Image upload state (client only)

- `uploading: boolean`: true from the start of an inline image upload until the action resolves or throws.
- `imageError: string | null`: the most recent upload error. Cleared on the next valid selection or edit.
- Not persisted.
