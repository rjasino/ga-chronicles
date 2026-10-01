# Bug Assessment: Article cover images are not uploaded to Supabase Storage

- **Slug**: cover-image-upload
- **Created**: 2026-10-02
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

> Can you verify if when uploading cover image on writing articles also upload in supabase storage. I notice that it only add the text from the form. If not please change the input text to input file so we can upload the real image and save the image to supabase storage then the url in the table is the link in supabase storage. Also how can I check if file is uploaded if setup for supabase is via docker.

## Symptom

The article editor accepts a cover-image path as text, and article submission saves that string to `articles.cover_image`; it does not upload a selected image to Supabase Storage. Expected behavior is a file picker that uploads the image and stores its Supabase Storage URL in the article row.

## Reproduction

1. Sign in with an account allowed to publish and open the new-article or edit-article page.
2. Enter a cover-image path in the “Cover image path” text field and save or publish the article.
3. Inspect the article's `cover_image` value in the database; it is the entered text. No article upload operation is present in the save path.

## Suspected Code Paths

- `apps/web/src/components/articles/article-editor.tsx:12,25` — Initializes a string cover-image state and renders a text input named `cover_image`.
- `apps/web/src/features/articles/actions.ts:29-35,49-67` — Reads `cover_image` as a string and writes it directly into the article row; no Storage upload is performed.
- `apps/web/src/features/articles/schema.ts:5-10` — Validates `cover_image` as an optional string rather than validating an uploaded file.
- `supabase/config.toml:34-36` — Enables local Supabase Storage and sets a 10 MiB file limit, but the repository has no cover bucket or corresponding Storage policies configured.
- `apps/web/next.config.ts:7-14` — Allows HTTPS `*.supabase.co` image hosts, but not the HTTP local Supabase Storage origin; local uploaded images may need a development-only allowance to render through `next/image`.

## Root Cause Hypothesis

The authoring flow was implemented to accept and persist an image path/string, not a binary file. Neither the editor nor the server action sends file data to Supabase Storage, and the local Supabase configuration does not provision a cover-image bucket. Confidence: high; this follows directly from the current form and save-action code.

## Proposed Remediation

**Preferred**: Replace the text input with an optional image file input. In the server action, continue checking the verified session and publish permission, allow only JPEG, PNG, and WebP images, validate the file size, upload it to a dedicated public-read Supabase Storage bucket, and save the resulting public URL in `articles.cover_image`. Provision the bucket and least-privilege Storage policies through a migration or supported local configuration; authorize uploads/replacements/removals only for contributors/admins. If editing and no new file is selected, preserve the current cover URL. Provide an explicit remove-cover action that clears `articles.cover_image` and deletes the associated Storage object when it belongs to the article-cover bucket; do not attempt to delete legacy external/local-path values. If a new upload succeeds but the article save fails, remove the just-uploaded object where possible to avoid orphaned files. Permit the local Supabase URL for Next.js image rendering in development.

For Docker-based verification, document opening local Supabase Studio at `http://127.0.0.1:54323` and checking the Storage bucket/object, then checking that the article row contains a URL shaped like `http://127.0.0.1:54321/storage/v1/object/public/<bucket>/<object-path>`. Opening that URL should return the uploaded image.

**Alternatives**:
- Upload directly from the browser using the user's authenticated Supabase client, then submit the returned URL. This avoids sending the file through the server action, but requires client-side upload state, robust Storage RLS policies, and careful handling of partially completed form submissions.
- Store only the bucket/object path in `cover_image` and derive the public URL when rendering. This is more resilient if the Storage host changes, but differs from the requested table value and current image-rendering contract.

**Files likely to change**:
- `apps/web/src/components/articles/article-editor.tsx`
- `apps/web/src/features/articles/actions.ts`
- `apps/web/src/features/articles/schema.ts` (if file validation is shared there)
- `apps/web/next.config.ts`
- A new Supabase migration or supported Storage bucket configuration for the bucket and policies
- Article unit/e2e tests and local setup/verification documentation

**Tests to add or update**:
- Verify the editor renders a file input and submits a selected image as `FormData`.
- Verify unauthorized users cannot upload and invalid MIME types or files above the configured size are rejected.
- Verify a valid image upload stores a Storage URL in `articles.cover_image` for both new and edited articles.
- Verify editing without selecting a replacement preserves the current cover, and a failed database save does not leave an uploaded orphan when cleanup succeeds.
- Verify an editor can remove the cover, clearing the database URL and deleting the associated bucket object without attempting to delete legacy non-Storage references.
- Verify Storage bucket/policies allow public reads but restrict writes to authorized publishing roles.
- Verify JPEG, PNG, and WebP files are accepted and other formats rejected.
- Add an end-to-end or local integration check that the stored URL returns the uploaded image and renders on article cards/detail pages.

## Risks & Considerations

- A public bucket makes uploaded covers publicly accessible by design; do not place private images in it.
- Storage permissions must match the app's contributor/admin authorization model. Do not expose the service-role key to the browser; if a service-role client is used server-side, keep explicit session/role checks before every upload or delete.
- Set a maximum file size and allowlist image formats; do not trust the filename or browser-provided MIME type alone.
- Upload and database writes are separate operations. Cleanup on database failure is best-effort, and replacement/deletion behavior needs to avoid removing an image still referenced by another record.
- Existing `cover_image` strings may be local paths or external URLs. Preserve compatibility when editing legacy articles; avoid treating their values as Storage object paths without validation.
- Local Supabase URLs use HTTP and a local hostname, which may need separate Next.js image configuration from deployed `*.supabase.co` URLs.
- Supabase local configuration already sets a 10 MiB storage limit; application-side validation should be consistent with it.

## Open Questions

- None. Confirmed decisions: public-read bucket; JPEG, PNG, and WebP allowlist; editors can remove the cover image.
