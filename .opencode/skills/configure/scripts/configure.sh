#!/usr/bin/env bash
# Configure the local environment for Spec-Driven Development on this project.
# See docs/configure-command-plan.md for the behavior this script implements.
#
# Usage: configure.sh integration=<agent>   (e.g. integration=claude)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(pwd)"

info()  { printf '[configure] %s\n' "$1"; }
warn()  { printf '[configure] WARNING: %s\n' "$1" >&2; }
fail()  { printf '[configure] ERROR: %s\n' "$1" >&2; exit 1; }

# --- 0. required parameters and preconditions -------------------------------
INTEGRATION=""
for arg in "$@"; do
    case "$arg" in
        integration=*) INTEGRATION="${arg#integration=}" ;;
    esac
done
[ -n "$INTEGRATION" ] || fail "missing required parameter: integration=<agent> (e.g. integration=claude). Run 'specify integration list' for valid values."

DRAFT="$SKILL_ROOT/docs/constitution-draft.md"
[ -f "$DRAFT" ] || fail "missing required file: $DRAFT. Create it with the principles/values that should be the basis for ratifying the project constitution, then re-run."

# --- 1. uv -----------------------------------------------------------------
if command -v uv >/dev/null 2>&1; then
    info "uv is installed ($(uv --version)); checking for updates..."
    uv self update || warn "uv self update failed; continuing with the current version"
else
    info "uv is not installed; installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh || fail "uv installation failed"
    export PATH="$HOME/.local/bin:$PATH"
    command -v uv >/dev/null 2>&1 || fail "uv was installed but is not on PATH; open a new shell and re-run this script"
fi

# --- 2. speckit (specify CLI) ------------------------------------------------
if command -v specify >/dev/null 2>&1; then
    info "specify CLI is installed; checking for updates..."
    if ! specify self upgrade; then
        warn "specify self upgrade failed; trying 'uv tool upgrade specify-cli'..."
        uv tool upgrade specify-cli || warn "uv tool upgrade specify-cli also failed; continuing with the current version"
    fi
else
    info "specify CLI is not installed; installing via uv..."
    uv tool install specify-cli --from git+https://github.com/github/spec-kit.git || fail "specify-cli installation failed"
fi

# --- 3. speckit project initialization --------------------------------------
if [ -d "$REPO_ROOT/.specify" ]; then
    info "speckit is already initialized (.specify/ exists)"
else
    info "speckit is not initialized; initializing in place with integration '$INTEGRATION'..."
    specify init --here --force --non-interactive --integration "$INTEGRATION" || fail "speckit init failed"
fi

# --- 4. required extensions --------------------------------------------------
for ext in assess bug; do
    if [ -d "$REPO_ROOT/.specify/extensions/$ext" ]; then
        info "extension '$ext' is already installed; checking for updates..."
        specify extension update "$ext" || warn "failed to update extension '$ext'"
    else
        info "installing extension '$ext'..."
        specify extension add "$ext" || warn "failed to install extension '$ext'"
    fi
done

# --- 5. constitution ratification check -------------------------------------
# Matches any unresolved bracketed placeholder token, e.g. [PROJECT_NAME], [SECTION_2_NAME]
CONSTITUTION="$REPO_ROOT/.specify/memory/constitution.md"
if [ -f "$CONSTITUTION" ] && grep -Eq '\[[A-Z][A-Z0-9_]*\]' "$CONSTITUTION"; then
    warn "constitution has not been ratified yet (placeholders remain in $CONSTITUTION)"
    warn "run '/speckit.constitution' using $DRAFT as the basis for ratification"
elif [ -f "$CONSTITUTION" ]; then
    info "constitution is ratified"
else
    warn "no constitution found at $CONSTITUTION; run '/speckit.constitution' using $DRAFT as the basis for ratification"
fi

# --- 6. critical project folders --------------------------------------------
for dir in apps docs; do
    if [ -d "$REPO_ROOT/$dir" ]; then
        info "folder '$dir/' exists"
    else
        info "creating missing folder '$dir/'..."
        mkdir -p "$REPO_ROOT/$dir"
    fi
done

info "configure complete"
