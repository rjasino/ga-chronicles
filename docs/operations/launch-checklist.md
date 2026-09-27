# Launch operations checklist

## Hosting eligibility

- [ ] Confirm the publication's actual commercial/personal use is eligible under current Vercel Hobby terms. If not, choose an eligible paid plan before launch.
- [ ] Confirm region, environment separation, domain, TLS, preview access, and production-only secrets.

## Supabase quotas and reliability

- [ ] Review current Supabase Free database, egress, storage, and inactivity-pause limits; set an owner and monthly quota review.
- [ ] Enable and test backups appropriate to the selected plan. For Free, schedule encrypted `supabase db dump` exports and verify restore into a separate project before relying on the content.
- [ ] Store exported database backups and article images outside the primary project, with access restricted to administrators.
- [ ] Define an upgrade trigger before quota exhaustion or project pausing affects publishing.

## Release verification

- [ ] Run `specs/001-blog-site-launch/quickstart.md` against a production-like preview.
- [ ] Confirm RLS, account recovery, admin bootstrap removal/rotation, OAuth, and comments-disabled behavior.
- [ ] Attach performance baseline results and accessibility review to the release record.
- [ ] Verify a restore procedure and named incident contact before public announcement.
