#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PARENT_DIR="$(dirname "$ROOT_DIR")"
WORKTREE_ROOT="${WORKTREE_ROOT:-$PARENT_DIR/miralo-worktrees}"

mkdir -p "$WORKTREE_ROOT"

create_lane() {
  local branch="$1"
  local folder="$2"

  if git -C "$ROOT_DIR" show-ref --verify --quiet "refs/heads/$branch"; then
    git -C "$ROOT_DIR" worktree add "$WORKTREE_ROOT/$folder" "$branch"
  else
    git -C "$ROOT_DIR" worktree add -b "$branch" "$WORKTREE_ROOT/$folder"
  fi
}

create_lane "codex/t-001-foundation-backend" "foundation-backend"
create_lane "codex/t-006-intake-ui" "intake-ui"
create_lane "codex/t-007-session-ui" "session-ui"
create_lane "codex/t-004-openai-adapter" "openai-adapter"
create_lane "codex/t-009-devex-qa" "devex-qa"

echo "Worktrees created under: $WORKTREE_ROOT"
