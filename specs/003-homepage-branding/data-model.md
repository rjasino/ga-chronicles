# Data Model: Homepage Branding

This feature is a **presentation-only change**. It introduces no new entities, no new persistence, and no schema migrations.

## Confirmed no-data scope

- All new content is static copy rendered by the application: the motto `#fortheloveofgaming`, the footer's "what is Game Ako" description, and the three social link labels/placeholders.
- The hero visual is an existing brand asset already shipped with the web app; no media upload or storage is involved.
- Nothing in [spec.md](spec.md) FR-001–FR-008 requires reading or writing application data. The public article list, article bodies, comments, and settings are untouched.

## Consequences for the database

- No tables, columns, indexes, policies, or storage buckets are added or modified.
- No seed changes; local reset behavior is unaffected.
- If the publisher later wants the description/social URLs content-managed, that would be a separate feature with its own data model.

## Integrity and authorization rules

- N/A at the data layer. The only "validation" is presentational: the motto must remain real text (accessible), and the social placeholder links must remain obviously replaceable, as required by the spec's acceptance scenarios.