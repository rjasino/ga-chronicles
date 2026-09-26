---
description: >
  Set up this repository's Spec-Driven Development environment so that spec-kit
  tooling (uv, the specify CLI, project initialization, and required extensions)
  is installed, up to date, and correctly configured, then verify the
  project-level prerequisites (ratified constitution, critical project folders)
  are in place.
---

Set up this repository's Spec-Driven Development environment so that spec-kit tooling
(`uv`, the `specify` CLI, project initialization, and required extensions) is installed,
up to date, and correctly configured, then verify the project-level prerequisites
(ratified constitution, critical project folders) are in place.

## Required input

- **integration** — which coding agent spec-kit should target when it initializes the
  project, passed as `$ARGUMENTS` (e.g. `/configure opencode`, `/configure claude`,
  `/configure cursor`). If `$ARGUMENTS` is empty, default to `integration=opencode`
  since this command runs under OpenCode, unless the user's request says otherwise.
  You can list valid values with `specify integration list` once `specify` is
  available.
- **`.claude/skills/configure/docs/constitution-draft.md`** — must already exist and
  contain the principles/values that will be used as the basis for ratifying the
  project constitution. If it doesn't exist, stop and ask the user to create it (or
  draft it yourself from their input) before proceeding — do not fabricate governing
  principles on your own.

Reference: @.claude/skills/configure/docs/constitution-draft.md

## Steps

1. **Pick a working interpreter yourself, then run the matching implementation
   script, passing `integration=<agent>`** from the repository root. There is no
   wrapper/dispatcher script — you must probe for a usable interpreter using your
   terminal tool, in this order, and stop at the first one that actually works:
   1. **bash**: check that it is really usable, not just present, by running
      `bash -c "echo __configure_ok__"` and confirming the output is exactly
      `__configure_ok__` with a zero exit code. (On Windows, `bash` may resolve to
      the WSL launcher stub at `System32\bash.exe`, which exists on PATH but fails
      when no WSL distro is installed — this check filters that out.) If it passes,
      run `bash .claude/skills/configure/scripts/configure.sh integration=<agent>`.
   2. **pwsh**: if bash isn't usable, check whether `pwsh` is on PATH. If so, run
      `pwsh -File .claude/skills/configure/scripts/configure.ps1 integration=<agent>`.
   3. **powershell**: if `pwsh` isn't available, check for Windows PowerShell. If
      found, run
      `powershell -ExecutionPolicy Bypass -File .claude/skills/configure/scripts/configure.ps1 integration=<agent>`.
   4. **python3 / python**: if none of the above are available, check for
      `python3` or `python` on PATH and run
      `python3 .claude/skills/configure/scripts/configure.py integration=<agent>`
      (or `python .claude/skills/configure/scripts/configure.py integration=<agent>`).
   5. If none of these are usable, stop and tell the user no supported interpreter
      (bash, pwsh, powershell, or python3/python) could be found.

   Whichever implementation runs performs the same preconditions, checks, and installs:
   - Fails immediately if `integration=<agent>` was not supplied, or if
     `.claude/skills/configure/docs/constitution-draft.md` does not exist — see
     [Required input](#required-input).
   - Checks whether `uv` is installed; installs it if missing, otherwise updates it via
     `uv self update`.
   - Checks whether the `specify` CLI (spec-kit) is installed; installs it via `uv` if
     missing, otherwise updates it via `specify self upgrade` (falling back to
     `uv tool upgrade specify-cli` if that fails).
   - Checks whether spec-kit is initialized in this repository (`.specify/` exists);
     initializes it in place with `--integration <agent>` if not.
   - Checks whether the `assess` and `bug` spec-kit extensions are installed; installs
     any that are missing and updates any that are already present.
   - Checks whether the project constitution (`.specify/memory/constitution.md`) is
     ratified (i.e. no unresolved bracketed placeholder tokens such as
     `[PROJECT_NAME]` or `[SECTION_2_NAME]` remain); warns if it still needs to be
     ratified.
   - Checks whether the critical project folders (`apps/`, `docs/`) exist; creates any
     that are missing.

2. **Read the script's output.** Every check prints its result. Pay attention to any
   `WARNING` lines — those require follow-up action from you, not the script, because
   they need judgment or user input.

3. **Ratify the constitution if the script warned that it isn't ratified.** Invoke the
   project's constitution command (e.g. `/speckit.constitution` or
   `speckit-constitution`) using the content of
   `.claude/skills/configure/docs/constitution-draft.md` (referenced above and
   validated to exist in [Required input](#required-input)) as the basis for
   ratification.

4. **Re-verify** critical folders and the constitution status after any follow-up
   action, and summarize what was installed, updated, or still needs attention.

## Notes

- The interpreter-selection logic lives here, in this prompt, rather than in a
  wrapper script, so you can follow the same steps regardless of which shell or OS
  you run on. The scripts themselves live under `.claude/skills/configure/scripts/`
  but are always invoked from the repository root, since the checks they perform
  (`.specify/`, `apps/`, `docs/`, etc.) are relative to the repo root.
- Never fabricate a successful state — if a script step fails or warns, report it to
  the user instead of assuming it succeeded.
- Do not re-run destructive install steps unnecessarily; the scripts are idempotent and
  safe to re-run.
