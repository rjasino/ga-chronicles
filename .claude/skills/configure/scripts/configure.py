#!/usr/bin/env python3
"""Configure the local environment for Spec-Driven Development on this project.

Usage: configure.py integration=<agent>   (e.g. integration=claude)

See docs/configure-command-plan.md for the behavior this script implements.
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parent.parent
REPO_ROOT = Path.cwd()


def info(message: str) -> None:
    print(f"[configure] {message}")


def warn(message: str) -> None:
    print(f"[configure] WARNING: {message}", file=sys.stderr)


def fail(message: str) -> None:
    print(f"[configure] ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def run(cmd: list[str]) -> bool:
    """Run a command, streaming output. Returns True on success."""
    try:
        subprocess.run(cmd, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        warn(f"command failed: {' '.join(cmd)} ({exc})")
        return False


def parse_integration() -> str:
    for arg in sys.argv[1:]:
        if arg.startswith("integration="):
            value = arg.split("=", 1)[1]
            if value:
                return value
    fail("missing required parameter: integration=<agent> (e.g. integration=claude). "
         "Run 'specify integration list' for valid values.")


def check_preconditions() -> str:
    integration = parse_integration()
    draft = SKILL_ROOT / "docs" / "constitution-draft.md"
    if not draft.is_file():
        fail(f"missing required file: {draft}. Create it with the principles/values "
             "that should be the basis for ratifying the project constitution, then re-run.")
    return integration


def ensure_uv() -> None:
    uv = shutil.which("uv")
    if uv:
        version = subprocess.run([uv, "--version"], capture_output=True, text=True).stdout.strip()
        info(f"uv is installed ({version}); checking for updates...")
        run([uv, "self", "update"])
        return

    info("uv is not installed; installing...")
    installer = "https://astral.sh/uv/install.ps1" if sys.platform == "win32" else "https://astral.sh/uv/install.sh"
    if sys.platform == "win32":
        ok = run(["powershell", "-ExecutionPolicy", "ByPass", "-Command",
                   f"irm {installer} | iex"])
    else:
        ok = run(["sh", "-c", f"curl -LsSf {installer} | sh"])
    if not ok or not shutil.which("uv"):
        fail("uv was installed but is not on PATH; open a new shell and re-run this script")


def ensure_speckit() -> None:
    specify = shutil.which("specify")
    if specify:
        info("specify CLI is installed; checking for updates...")
        if not run([specify, "self", "upgrade"]):
            warn("specify self upgrade failed; trying 'uv tool upgrade specify-cli'...")
            run(["uv", "tool", "upgrade", "specify-cli"])
        return

    info("specify CLI is not installed; installing via uv...")
    if not run(["uv", "tool", "install", "specify-cli",
                "--from", "git+https://github.com/github/spec-kit.git"]):
        fail("specify-cli installation failed")


def ensure_initialized(integration: str) -> None:
    specify_dir = REPO_ROOT / ".specify"
    if specify_dir.is_dir():
        info("speckit is already initialized (.specify/ exists)")
        return

    info(f"speckit is not initialized; initializing in place with integration '{integration}'...")
    if not run(["specify", "init", "--here", "--force", "--non-interactive",
                "--integration", integration]):
        fail("speckit init failed")


def ensure_extensions() -> None:
    for ext in ("assess", "bug"):
        ext_dir = REPO_ROOT / ".specify" / "extensions" / ext
        if ext_dir.is_dir():
            info(f"extension '{ext}' is already installed; checking for updates...")
            run(["specify", "extension", "update", ext])
        else:
            info(f"installing extension '{ext}'...")
            run(["specify", "extension", "add", ext])


# Matches any unresolved bracketed placeholder token, e.g. [PROJECT_NAME], [SECTION_2_NAME]
PLACEHOLDER_RE = re.compile(r"\[[A-Z][A-Z0-9_]*\]")


def check_constitution() -> None:
    constitution = REPO_ROOT / ".specify" / "memory" / "constitution.md"
    draft = SKILL_ROOT / "docs" / "constitution-draft.md"
    if not constitution.is_file():
        warn(f"no constitution found at {constitution}; run '/speckit.constitution' using {draft} as the basis for ratification")
        return

    if PLACEHOLDER_RE.search(constitution.read_text(encoding="utf-8")):
        warn(f"constitution has not been ratified yet (placeholders remain in {constitution})")
        warn(f"run '/speckit.constitution' using {draft} as the basis for ratification")
    else:
        info("constitution is ratified")


def ensure_critical_folders() -> None:
    for name in ("apps", "docs"):
        path = REPO_ROOT / name
        if path.is_dir():
            info(f"folder '{name}/' exists")
        else:
            info(f"creating missing folder '{name}/'...")
            path.mkdir(parents=True, exist_ok=True)


def main() -> None:
    integration = check_preconditions()
    ensure_uv()
    ensure_speckit()
    ensure_initialized(integration)
    ensure_extensions()
    check_constitution()
    ensure_critical_folders()
    info("configure complete")


if __name__ == "__main__":
    main()
