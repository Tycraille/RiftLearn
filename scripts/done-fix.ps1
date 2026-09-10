<#
.SYNOPSIS
  Removes the worktree and local branch created by new-fix.ps1, once the PR is merged.
.EXAMPLE
  .\scripts\done-fix.ps1 -Issue 12
  .\scripts\done-fix.ps1 -Issue 12 -Force   # discard uncommitted changes in the worktree
#>
param(
  [Parameter(Mandatory = $true)][int]$Issue,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$wt = Join-Path (Split-Path -Parent $repo) "riftlearn-wt\$Issue"

if (-not (Test-Path $wt)) { throw "Worktree not found: $wt" }

$branch = git -C $wt rev-parse --abbrev-ref HEAD

if ($Force) { git -C $repo worktree remove --force $wt } else { git -C $repo worktree remove $wt }
git -C $repo branch -D $branch
git -C $repo fetch --prune

Write-Host "Removed worktree $wt and local branch $branch"
