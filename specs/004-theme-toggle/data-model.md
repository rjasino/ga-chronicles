# Data Model: Light/Dark Theme Toggle

This feature introduces **no server-side or database entities**. The only data is a single non-sensitive, device-local appearance preference held by the browser. No tables, columns, indexes, policies, storage buckets, or seed data are added or modified.

## Entity: Theme Preference

A visitor's explicitly chosen site appearance, scoped to the device/browser rather than to an account.

| Attribute | Type | Values | Notes |
|---|---|---|---|
| `theme` | enumerated string | `"light"` \| `"dark"` | The only stored field. |

### Rules

- **Default**: When no valid preference exists, the effective theme is `light`. The default never depends on the operating system's color setting.
- **Scope**: Device/browser-local and non-sensitive. It is not tied to a user account, is not sent to the server, and is not shared between devices.
- **Allowed values**: Only `light` and `dark` are valid. Any other, missing, or unreadable value resolves to `light`.
- **Persistence**: The value survives page navigation and subsequent visits on the same device until the visitor changes it.
- **Fail-safe**: If storage is unavailable or blocked, reads and writes must not throw and the site must remain usable in light for the session.

### State transitions

```text
(no preference) --first visit--> light (default)
light --toggle--> dark   (persisted)
dark  --toggle--> light  (persisted)
light|dark --toggle--> opposite (persisted)
any invalid/unreadable value --> light (fallback, no error)
```

### Presentation consequence

The effective theme is expressed as the root document's theme attribute (`light`/`dark`) and drives the shared color tokens. It affects appearance only; it does not change, gate, or personalize any content, query, route, or authorization decision.

## Integrity and authorization rules

- No authorization is involved: the preference is non-sensitive presentation state and is neither user-authored content nor an access control.
- The only validation is value validation: the stored string must be exactly `light` or `dark`, otherwise light is used.
- No personal data is collected, and no analytics or tracking is introduced.
