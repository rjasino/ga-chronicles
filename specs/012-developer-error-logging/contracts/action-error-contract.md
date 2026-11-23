# Server Action Error Contract

## Scope

The application currently communicates most mutation outcomes through serializable Server Action state consumed by React forms. This contract standardizes the client-visible shape for unexpected failures; it does not add a REST endpoint or change the OAuth callback redirect.

## Result behavior

### Expected, user-correctable failure

- Keep the existing safe, actionable `error` message.
- Do not classify or report the result as an unexpected application failure.
- Do not require an `errorId`.

Example shape:

```json
{
  "error": "Check the submitted values and try again."
}
```

### Unexpected failure

- Return a generic, safe `error` message.
- Include an opaque `errorId`.
- Emit one developer-facing console diagnostic with the same `errorId`.
- Never return a stack trace, secret, credential, raw exception message, or internal implementation details.

Example shape:

```json
{
  "error": "The operation could not be completed. Please try again.",
  "errorId": "opaque-reference"
}
```

The example identifier is illustrative; it is not a fixed value or a persisted lookup key.

## Diagnostic safety

- The identifier is for correlating a live client report with console output only.
- Console context is allow-listed and bounded.
- Request bodies, form contents, cookies, authorization headers, and unrelated personal data are excluded.
- If console output fails, the original safe action result is still returned.
