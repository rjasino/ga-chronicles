# Local Supabase Docker maintenance

Runbook for keeping this repository's local Supabase stack on known images, running it alongside another local Supabase project, and clearing stale-image "duplicates" that appear in Docker Desktop after a CLI upgrade. Applies to the `supabase/` stack in this repository (`project_id = "game-ako-chronicles"`, ports `55320`–`55324`).

## Two local Supabase projects

This machine can run more than one local stack at a time. Each project has its own `project_id`, container names, Docker network, data volume, and ports. The `game-ako-chronicles` stack uses `55320`–`55324` so it does not collide with `game-lookup-app` (currently on `54320`–`54324`, with `55420`–`55424` configured for its next restart).

The CLI is pinned to `supabase@2.122.0` in `apps/web/package.json`. That version resolves the same image tags already used by the `game-lookup-app` stack, so starting this project does not pull newer images.

## Why duplicates appear

A single project can show two sets of **image tags**:

- the images used by the running containers, and
- newer images pulled by a newer Supabase CLI but never started.

The CLI is now pinned, but if someone runs `npx supabase` without the project dependency, it resolves the latest published CLI. A newer CLI resolves newer default image versions and downloads them. `supabase start` is idempotent, however: it finds the existing containers and the version pins in `supabase/.temp/*-version` and keeps the old stack running. Docker Desktop then lists both tags.

`supabase status` may also print `Stopped services: [imgproxy, analytics, vector, pooler]`. That is normal: analytics is disabled in `supabase/config.toml`, and imgproxy/pooler are not enabled. It is not duplication.

## Diagnose

Run from the repository root:

```powershell
npm --prefix apps/web run supabase:version
npm view supabase version
npm --prefix apps/web run supabase:status
docker ps --format "table {{.Names}}\t{{.Image}}"
docker images --format "{{.Repository}}:{{.Tag}}" | Select-String supabase

Get-ChildItem supabase\.temp -Filter *-version |
  ForEach-Object { "$($_.Name) = $(Get-Content $_.FullName -Raw)" }
```

Compare the running images with the cached tags. A version pin older than the cached tag is the usual cause. `docker system df` shows how much space the unused tags hold.

## Refresh to the latest images

This keeps the data volume. Do not add `--no-backup` unless a clean database is intended; that flag deletes the volumes.

```powershell
# Stop the stack; the volume and link metadata are preserved
npm --prefix apps/web run supabase:stop

# Clear only the image-version pins, not linked-project.json or project-ref
Get-ChildItem supabase\.temp -Filter *-version | Remove-Item -Force

# Recreate with the pinned CLI's image set
npm --prefix apps/web run supabase:start
```

If the CLI reports a Postgres **major** version change (for example 15 to 17), do not rely on this procedure. Dump the database first (`npm --prefix apps/web exec -- supabase db dump --local -f <path>`), then recreate and restore or reseed. Confirm `[db] major_version` in `supabase/config.toml` matches both the volume and the hosted project.

## Verify

```powershell
npm --prefix apps/web run supabase:status
docker ps --format "table {{.Names}}\t{{.Image}}"
```

All containers should be healthy, and the REST endpoint should answer:

```powershell
(Invoke-WebRequest -Uri "http://127.0.0.1:55321/rest/v1/" -UseBasicParsing).StatusCode
```

`supabase status` reports the linked project (`segycgobrqtlizaqtwhl`, Game Ako Chronicles) when the project is linked. `.env.local` points at `http://127.0.0.1:55321` and needs no change when this repository uses the `553xx` port block.

## Remove old images

After the new stack is healthy, list images that no running container uses:

```powershell
$running = docker ps --format "{{.Image}}"
docker images --format "{{.Repository}}:{{.Tag}}" |
  Where-Object { $_ -like "public.ecr.aws/supabase/*" -and $_ -notin $running }
```

Remove the stale tags individually with `docker rmi <tag>`. Do not use `docker image prune -a`: it also deletes images for other projects and tools that are not running, such as `pg_prove` (used by `npm --prefix apps/web run test:database`) and the analytics images (`logflare`, `vector`) that are kept for when `[analytics] enabled` is turned back on.

## Windows port binding failure

Symptom:

```text
failed to start docker container "supabase_db_...":
ports are not available: exposing port TCP 0.0.0.0:54322 -> 127.0.0.1:0:
listen tcp 0.0.0.0:54322: bind: An attempt was made to access a socket
in a way forbidden by its access permissions.
```

This is a Windows/Hyper-V port reservation, not a Supabase problem. Check the excluded ranges:

```powershell
netsh int ipv4 show excludedportrange protocol=tcp
```

If 54321–54324 fall inside a reserved range, clear it from an **elevated** PowerShell (accept the UAC prompt):

```powershell
net stop winnat /y
net start winnat
```

From a non-elevated terminal the same can be triggered with:

```powershell
Start-Process cmd.exe -ArgumentList '/c net stop winnat /y & net start winnat' -Verb RunAs -Wait
```

Then run `npm --prefix apps/web run supabase:start` again. The reservation can return after a reboot, a Docker Desktop update, or a WSL/Hyper-V network change; repeating the `winnat` restart or rebooting clears it.

## Prevent surprise CLI upgrades

The CLI is pinned in `apps/web/package.json` (`"supabase": "2.122.0"`). Run Supabase through the project scripts so npm resolves the local binary:

```powershell
npm --prefix apps/web run supabase:start
npm --prefix apps/web run supabase:status
npm --prefix apps/web run supabase:reset
npm --prefix apps/web run test:database
```

Do not run bare `npx supabase` from the repository root; that can resolve the latest CLI and pull newer image tags. If a command is missing from the scripts, use `npm --prefix apps/web exec -- supabase <command>`.

Upgrading is deliberate: change the `supabase` version in `apps/web/package.json`, run `npm --prefix apps/web install`, then follow the refresh procedure above.

Do not commit `supabase/.temp/`; it is gitignored and machine-specific. Running `supabase link` rewrites `postgres-version` from the hosted project, so re-linking after a local refresh re-pins Postgres to the hosted build. Upgrade the hosted project first (Dashboard → Settings → Infrastructure) if local and remote should stay aligned.

## Quick reference

| Symptom | Meaning | Fix |
|---|---|---|
| Two tags per service in Docker Desktop | New images pulled, old containers still running | Clear `.temp/*-version`, stop, start |
| `Stopped services: imgproxy, analytics, vector, pooler` | Normal when analytics/pooler are disabled | Ignore |
| `ports are not available` on `543xx` | Another local Supabase project owns that port block | Use this project's `553xx` ports or stop the other stack |
| `ports are not available ... forbidden by access permissions` | Windows excluded port range | Elevated `net stop winnat /y; net start winnat` |
| `supabase start` pulls images but nothing changes | Version pins in `.temp` | Same as first row |
| Local DB will not start after a major version change | Data directory is an older Postgres major | Dump, `stop --no-backup`, `start`, restore or `db reset` |
| Link metadata missing after cleanup | `.temp` was deleted wholesale | Re-run `supabase link --project-ref segycgobrqtlizaqtwhl` |

## Data safety

- `supabase stop` stops containers and keeps the volumes.
- `supabase stop --no-backup` deletes the volumes.
- `supabase db reset` destroys local data and re-applies migrations plus `supabase/seed.sql`.
- The database volume is small (~76 MB); dump it with `supabase db dump --local -f <path>` before any destructive step if the data matters.

## Last performed

2026-11-20: pinned `supabase@2.122.0` in `apps/web/package.json`, moved this project to ports `55320`–`55324`, and started it beside the existing `game-lookup-app` stack without pulling newer images.

2026-10-31: refreshed from the older pinned set (Postgres 17.6.1.166, Studio 2026.09.28, storage-api 1.77.5, realtime 2.140.3, postgrest 14.5, postgres-meta 0.99.0, edge-runtime 1.77.1) to Postgres 17.11.0.006, Studio 2026.10.19, storage-api 1.84.19, realtime 2.147.1, postgrest 16.5, postgres-meta 0.100.0, and edge-runtime 1.77.8. `[db] major_version` was corrected from 15 to 17 to match the volume and the hosted project. Docker image usage dropped from 15.3 GB to 8.42 GB.
