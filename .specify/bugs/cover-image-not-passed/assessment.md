# Bug Assessment: cover_image Zod validation fails for URLs and local paths

- **Slug**: cover-image-not-passed
- **Created**: 2026-09-28T00:00:00Z
- **Source**: pasted text (updated with new findings)
- **Verdict**: invalid (schema validation issue - regex too restrictive)
- **Severity**: high (blocking article creation/publishing with cover images)

## Report

The user reports that `cover_image` fails Zod validation when trying to pass a URL for an image OR even a locally stored image path. The issue is in the Zod schema validation at `apps/web/src/features/articles/schema.ts:9`, which uses a regex that is too restrictive. The schema was originally intended for local paths only, but users need to be able to pass image URLs (which will be uploaded to Supabase Storage) or potentially other path formats.

The bug was identified in review of `@apps/web/src/features/articles/schema.ts`.

## Symptom

When submitting a new article with a `cover_image` value that is either:
- A URL (e.g., `https://example.test/image.png`), OR
- A local path (e.g., any path format that doesn't exactly match the regex `^/(\?!\/)[a-zA-Z0-9_./,-]+$`)

The Zod schema validation fails with the error "Use a local stored-image path.", preventing the article from being saved. The cover_image field is rejected regardless of whether it's a valid local path or a proper URL.

## Reproduction

1. Open the ArticleEditor component
2. Enter a cover image URL (e.g., `https://example.test/image.png`) or a local path in the cover image input
3. Submit the form to save/publish the article
4. Observe the Zod validation error: "Use a local stored-image path."
5. The article cannot be saved regardless of the cover_image value provided

## Suspected Code Paths

- `apps/web/src/features/articles/schema.ts:9` — The schema defines `cover_image: z.union([z.literal(""), z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9_./,-]+$/, "Use a local stored-image path.")]).optional()`. The regex `^/(\?!\/)[a-zA-Z0-9_./,-]+$` strictly requires:
  - String starts with `/`
  - No double `/` after the first character
  - Only contains alphanumeric characters, underscore, dot, comma, hyphen
  - This completely excludes URLs (which start with `http://`, `https://`, etc.) and many valid local path formats
- `apps/web/src/features/articles/actions.ts:34` — Reads `cover_image` from form data and passes it to schema validation; the normalization `.trim() || ""` does not fix the format mismatch
- `apps/web/src/components/articles/article-editor.tsx:12` — The default value change to `"/brand/cover.jpg"` helps for local paths but does not address URL support

## Root Cause Hypothesis

Confidence: high

The Zod schema regex is fundamentally too restrictive. It was designed to accept only a very specific format of local image paths (starting with `/`, containing only `[a-zA-Z0-9_.,-]`), but the system's intent is to support cover images that are uploaded to Supabase Storage. Users reasonably attempt to provide either:
1. URLs pointing to images (which will be uploaded to Supabase Storage), or
2. Local paths with formats that don't match the narrow regex

The validation rejects both cases, making the cover_image field effectively non-functional for any use case beyond the one specific local path format the regex was designed for.

## Proposed Remediation

**Preferred**: Relax the Zod schema validation to accept any string value for `cover_image`, since the actual format handling should be at the Supabase Storage integration level. Change the `cover_image` schema from:

```typescript
cover_image: z.union([z.literal(""), z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9_./,-]+$/, "Use a local stored-image path.")]).optional()
```

to:

```typescript
cover_image: z.string().trim().optional()
```

This removes the restrictive regex validation entirely, since:
- The `cover_image` field is optional (`optional()`)
- Empty string `""` is already handled by the `|| null` logic in `actions.ts` (line 54: `cover_image: parsed.data.cover_image || null`)
- URLs and arbitrary local paths will be passed through to Supabase Storage handling, which should deal with the actual path format
- If specific format validation is needed, it should be done at the Supabase Storage integration level, not in the article input schema

**Alternatives**:
- Keep the regex but expand it to also match URL patterns (e.g., `^(https?://|/)[^"]+$` or similar)
- Make `cover_image` a required field with strict validation, forcing all clients to use a specific format (but this would break existing workflows)

**Files likely to change**:
- `apps/web/src/features/articles/schema.ts` — Relax or remove the restrictive regex on `cover_image`
- `apps/web/src/features/articles/actions.ts` — May need adjustment if the `cover_image || null` logic changes behavior
- `apps/web/src/components/articles/article-editor.tsx` — May need UI updates to guide users on acceptable cover image formats

**Tests to add or update**:
- Verify that submitting a new article with `cover_image: "https://example.test/image.png"` passes schema validation (new test)
- Verify that submitting a new article with `cover_image: "/brand/cover.jpg"` passes schema validation (existing behavior preserved)
- Verify that submitting a new article with no `cover_image` passes schema validation and stores `cover_image: null` in database (existing behavior)
- Verify that submitting with an obviously invalid path still provides useful feedback (consider adding a basic non-empty check)

## Risks & Considerations

- Removing the regex validation means the schema no longer enforces a specific path format — this is intentional since the actual format handling should be at the Supabase Storage level
- If downstream code (Supabase Storage uploader) expects a specific path format, removing the validation could cause runtime errors — need to verify the Storage integration handles arbitrary strings
- API contract change: clients may now send cover_image values in formats they couldn't before; document the expected format(s)
- Performance/observability: without format validation, need to ensure invalid paths are caught earlier or logged appropriately

## Open Questions

- [NEEDS CLARIFICATION: What image URL formats are supported by the Supabase Storage integration? (http, https, relative paths, etc.)]
- [NEEDS CLARIFICATION: Does the Supabase Storage uploader expect `cover_image` to be a path starting with `/`, a full URL, or something else?]
- [NEEDS CLARIFICATION: Is there any downstream code that validates or transforms the `cover_image` value before it reaches Supabase Storage?]
- [NEEDS CLARIFICATION: Should the schema retain any minimal validation (e.g., non-empty check), or is pure optional string acceptable?]