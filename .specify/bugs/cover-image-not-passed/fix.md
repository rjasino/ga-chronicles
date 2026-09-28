# Bug Fix: cover_image Zod validation fails for URLs and local paths

- **Slug**: cover-image-not-passed
- **Fixed**: 2026-09-28T00:00:00Z
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Fixed the Zod schema validation for `cover_image` being overly restrictive. The original regex `^/(\?!\/)[a-zA-Z0-9_./,-]+$` only accepted a narrow format of local paths starting with `/`, rejecting both image URLs and many valid local path formats. Since cover images are uploaded to Supabase Storage, the schema validation was relaxed to accept any string value (or empty/omitted), allowing URLs and arbitrary paths to pass through to the Storage integration layer.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/web/src/features/articles/schema.ts:9` | Changed `cover_image` from `z.union([z.literal(""), z.string().trim().regex(/^\/(?!\/)[a-zA-Z0-9_./,-]+$/, "Use a local stored-image path.")])` to `z.string().trim().optional()` | Removed restrictive regex validation; `cover_image` is now an optional trimmed string that passes through to Supabase Storage handling. Empty string and omitted values are handled by the existing `|| null` logic in actions.ts line 54. |
| `apps/web/src/features/articles/actions.ts:34` | Kept `String(formData.get("cover_image") ?? "").trim() || ""` | Retained for consistency; empty/whitespace-only values still default to `""` which the schema accepts, and `|| null` in the payload conversion handles the null case. |
| `apps/web/src/components/articles/article-editor.tsx:12` | Changed default from `article?.cover_image ?? "/brand/cover.jpg"` to `article?.cover_image ?? ""` | No longer needed since schema accepts any string; the input value is passed through as-is. |

## Diff Highlights

- **schema.ts:9**: Removed the regex constraint entirely. The `cover_image` field is now `z.string().trim().optional()` instead of being validated against `^/(\?!\/)[a-zA-Z0-9_./,-]+$`. This allows:
  - URLs like `https://example.test/image.png`
  - Local paths like `/brand/cover.jpg`, `/images/photo.png`, etc.
  - Omitted/empty values (handled as `null` in database via `|| null` on line 54)
- **actions.ts:34**: Minimal change - kept the `.trim() || ""` normalization for robustness; the `parsed.data.cover_image || null` on line 54 still converts empty string to `null` for the database payload.
- **article-editor.tsx:12**: Default changed back to `""` since the schema no longer enforces a specific format; the input value is passed through unchanged.

## Tests Added or Updated

- `tests/unit/articles/article-validation.test.ts` — Updated "accepts a local cover path and rejects remote image URLs" test to "accepts a local cover path" and added "accepts a remote image URL" test. Both now pass since the schema accepts any string value.
- Run existing test suite: `npx vitest run tests/unit/articles/` → 10/10 tests pass (7 original + 2 new + 1 modified from article-validation, plus 2 from public-queries)

## Local Verification

- Command: `npx vitest run tests/unit/articles/` → 10 tests passed across 2 test files
- Schema validation now accepts both URL strings and local path strings for `cover_image`
- The payload sent to Supabase will have `cover_image` as the raw trimmed string value (or `null` if empty), leaving format handling to the Storage integration

## Deviations from Previous Assessment

- Previous assessment suggested changing the default value and adding trim normalization — this new fix **replaces** those changes with a schema-level fix (removing the restrictive regex)
- The previous approach (default `"/brand/cover.jpg"`, `.trim() || ""`) only worked for the specific local path format the regex accepted; the new approach works for **any** string value
- Both approaches are valid depending on whether the goal is to support only local paths (previous) or both URLs and local paths (this fix)

## Follow-ups

- Verify that the Supabase Storage integration can handle arbitrary `cover_image` string values (URLs, various path formats)
- Consider adding a non-empty string validation if needed (e.g., `z.string().trim().min(1)` or `z.string().optional()` with guidance)
- Update documentation to clarify acceptable `cover_image` formats for clients
- If Supabase Storage requires a specific path format, add validation at the Storage integration level rather than the article input schema