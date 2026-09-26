#!/usr/bin/env pwsh
# Configure the local environment for Spec-Driven Development on this project.
# See docs/configure-command-plan.md for the behavior this script implements.
#
# Usage: configure.ps1 integration=<agent>   (e.g. integration=claude)
$ErrorActionPreference = 'Stop'

$SkillRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = (Get-Location).Path

function Write-Info { param([string]$Message) Write-Host "[configure] $Message" }
function Write-Warn { param([string]$Message) Write-Warning "[configure] $Message" }
function Write-Fail { param([string]$Message) Write-Error "[configure] $Message"; exit 1 }

# --- 0. required parameters and preconditions --------------------------------
$Integration = $null
foreach ($a in $args) {
    if ($a -match '^integration=(.+)$') { $Integration = $Matches[1] }
}
if (-not $Integration) {
    Write-Fail "missing required parameter: integration=<agent> (e.g. integration=claude). Run 'specify integration list' for valid values."
}

$Draft = Join-Path $SkillRoot 'docs\constitution-draft.md'
if (-not (Test-Path -LiteralPath $Draft -PathType Leaf)) {
    Write-Fail "missing required file: $Draft. Create it with the principles/values that should be the basis for ratifying the project constitution, then re-run."
}

# --- 1. uv -------------------------------------------------------------------
if (Get-Command uv -ErrorAction SilentlyContinue) {
    Write-Info "uv is installed ($(uv --version)); checking for updates..."
    try { uv self update } catch { Write-Warn "uv self update failed; continuing with the current version" }
} else {
    Write-Info "uv is not installed; installing..."
    try {
        Invoke-Expression (Invoke-RestMethod https://astral.sh/uv/install.ps1)
    } catch {
        Write-Fail "uv installation failed: $_"
    }
    if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
        Write-Fail "uv was installed but is not on PATH; open a new shell and re-run this script"
    }
}

# --- 2. speckit (specify CLI) -------------------------------------------------
if (Get-Command specify -ErrorAction SilentlyContinue) {
    Write-Info "specify CLI is installed; checking for updates..."
    try {
        specify self upgrade
    } catch {
        Write-Warn "specify self upgrade failed; trying 'uv tool upgrade specify-cli'..."
        try { uv tool upgrade specify-cli } catch { Write-Warn "uv tool upgrade specify-cli also failed; continuing with the current version" }
    }
} else {
    Write-Info "specify CLI is not installed; installing via uv..."
    try { uv tool install specify-cli --from git+https://github.com/github/spec-kit.git } catch { Write-Fail "specify-cli installation failed: $_" }
}

# --- 3. speckit project initialization ---------------------------------------
$SpecifyDir = Join-Path $RepoRoot '.specify'
if (Test-Path -LiteralPath $SpecifyDir -PathType Container) {
    Write-Info "speckit is already initialized (.specify/ exists)"
} else {
    Write-Info "speckit is not initialized; initializing in place with integration '$Integration'..."
    try { specify init --here --force --non-interactive --integration $Integration } catch { Write-Fail "speckit init failed: $_" }
}

# --- 4. required extensions ---------------------------------------------------
foreach ($ext in @('assess', 'bug')) {
    $extDir = Join-Path $SpecifyDir "extensions\$ext"
    if (Test-Path -LiteralPath $extDir -PathType Container) {
        Write-Info "extension '$ext' is already installed; checking for updates..."
        try { specify extension update $ext } catch { Write-Warn "failed to update extension '$ext': $_" }
    } else {
        Write-Info "installing extension '$ext'..."
        try { specify extension add $ext } catch { Write-Warn "failed to install extension '$ext': $_" }
    }
}

# --- 5. constitution ratification check --------------------------------------
# Matches any unresolved bracketed placeholder token, e.g. [PROJECT_NAME], [SECTION_2_NAME]
$Constitution = Join-Path $SpecifyDir 'memory\constitution.md'
if (Test-Path -LiteralPath $Constitution) {
    $content = Get-Content -LiteralPath $Constitution -Raw
    if ($content -match '\[[A-Z][A-Z0-9_]*\]') {
        Write-Warn "constitution has not been ratified yet (placeholders remain in $Constitution)"
        Write-Warn "run '/speckit.constitution' using $Draft as the basis for ratification"
    } else {
        Write-Info "constitution is ratified"
    }
} else {
    Write-Warn "no constitution found at $Constitution; run '/speckit.constitution' using $Draft as the basis for ratification"
}

# --- 6. critical project folders ----------------------------------------------
foreach ($dir in @('apps', 'docs')) {
    $path = Join-Path $RepoRoot $dir
    if (Test-Path -LiteralPath $path -PathType Container) {
        Write-Info "folder '$dir/' exists"
    } else {
        Write-Info "creating missing folder '$dir/'..."
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

Write-Info "configure complete"
