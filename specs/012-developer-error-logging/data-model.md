# Data Model: Developer Error Logging

All entities below are transient values used while handling a failure. None is persisted.

## Failure Diagnostic

Represents a single unexpected failure reported to the developer-facing console.

| Field | Meaning | Validation |
|-------|---------|------------|
| `errorId` | Opaque identifier used to correlate a client-visible failure with its console diagnostic | Non-empty, unpredictable identifier; same value used in the response when one is returned |
| `operation` | Safe, bounded description of the action or operation that failed | Allow-listed or static label; no user-supplied full payload |
| `errorName` | Error class/type name, or a stable fallback for non-Error values | Bounded string; must not include raw object serialization |
| `message` | Sanitized developer-oriented failure summary | Bounded and redacted; no credentials, tokens, full request data, or unrelated personal data |
| `stack` | Optional sanitized stack context useful for locating the failure | Optional, bounded, and redacted; never returned to the client |
| `context` | Optional safe route/action stage details | Allow-listed fields only; omit headers, cookies, query values, and bodies |

### Lifecycle

1. A handled unexpected failure is normalized and assigned an `errorId`.
2. A best-effort console diagnostic is emitted.
3. If a client-facing failure result is returned, it includes the same `errorId` and a safe generic message.
4. The application keeps no diagnostic history or persistent copy; the hosting environment may independently capture console output.

## Error Response

Represents a client-visible failed Server Action result.

| Field | Meaning | Validation |
|-------|---------|------------|
| `error` | Safe message suitable for the existing UI result flow | Required for failed actions; contains no stack or internal exception detail |
| `errorId` | Optional identifier correlating an unexpected failure with its console diagnostic | Present for unexpected failures; absent for ordinary validation/authorization outcomes |

## Relationships

- An unexpected failure may create one `Failure Diagnostic`.
- A returned `Error Response` may reference that diagnostic through `errorId`.
- Expected user-correctable failures do not create a `Failure Diagnostic`.
