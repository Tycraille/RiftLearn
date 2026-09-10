<#
.SYNOPSIS
  Creates a git worktree and branch for a GitHub issue, ready for a coding session.
.DESCRIPTION
  Reads the issue with `gh`, derives the branch name (fix/<n>-<slug> for bugs,
  feat/<n>-<slug> for enhancements), creates ../riftlearn-wt/<n> from origin/main and
  installs dependencies there.
.EXAMPLE
  .\scripts\new-fix.ps1 -Issue 12
#>
param(
  [Parameter(Mandatory = $true)][int]$Issue
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$wtRoot = Join-Path (Split-Path -Parent $repo) 'riftlearn-wt'
$wt = Join-Path $wtRoot "$Issue"

if (Test-Path $wt) { throw "Worktree already exists: $wt" }

$issueJson = gh issue view $Issue --json title,labels
if (-not $issueJson) { throw "Issue #$Issue not found (is gh authenticated?)" }
$info = $issueJson | ConvertFrom-Json

$labels = @($info.labels | ForEach-Object { $_.name })
$prefix = 'fix'
if ($labels -contains 'enhancement') { $prefix = 'feat' }

$slug = ($info.title.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40).TrimEnd('-') }
$branch = "$prefix/$Issue-$slug"

New-Item -ItemType Directory -Force $wtRoot | Out-Null
git -C $repo fetch origin
git -C $repo worktree add $wt -b $branch origin/main

Push-Location $wt
try { npm ci } finally { Pop-Location }

Write-Host ''
Write-Host "Worktree ready: $wt"
Write-Host "Branch:         $branch"
Write-Host ''
Write-Host 'Next:'
Write-Host "  cd `"$wt`""
Write-Host '  claude'
Write-Host "  > Work on issue #$Issue following CLAUDE.md"
