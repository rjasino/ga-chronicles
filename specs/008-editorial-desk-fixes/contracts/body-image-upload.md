# Contract: `uploadArticleBodyImage` result

This is the only changed interface. It is the server action the rich text editor calls to upload an inline image.

## Request

- Input: `FormData` with one field `image` containing a single file.
- Unchanged.

## Response

```ts
type BodyImageUploadResult = {
  error?: string;
  errorCode?: "not_signed_in" | "missing_file" | "too_large" | "invalid_type" | "invalid_signature" | "upload_failed";
  url?: string;
};
```

- Success: `{ url }`. `errorCode` is absent.
- Failure: `{ error }` with a plain-language message and an `errorCode` for the client to branch on.

### Error cases

| Condition | `errorCode` | `error` message |
|---|---|---|
| Not signed in or lacks publish permission | `not_signed_in` | "You do not have permission to add images to articles." |
| No file or empty file | `missing_file` | "Choose an image file." |
| File larger than 10 MiB | `too_large` | "Inline images must be 10 MiB or smaller. This image is X MiB." |
| Type not JPEG, PNG, or WebP | `invalid_type` | "Inline images must be JPEG, PNG, or WebP." |
| Bytes do not match the declared format | `invalid_signature` | "The selected file does not match its image format." |
| Storage write failed | `upload_failed` | "The image could not be uploaded. Try again." |

## Client obligations

- Before sending, the editor checks size locally with the same limit and shows the `too_large` message without uploading.
- The editor wraps the call in try/catch. A thrown error, such as a request above the 11 MB server action body limit, shows the `too_large` message if the file is over the limit, or the `upload_failed` message otherwise.
- The loading modal is shown for the full duration of the call and closes in a `finally` block.
- The editor inserts the image only when `url` is present.

## Compatibility

- `error` remains a string with the same meaning, so existing callers keep working.
- `errorCode` is additive.
