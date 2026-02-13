#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
REPO_NAME=$(basename "$ROOT_DIR")
BASE_PATH="/${REPO_NAME}/"
WORKTREE_DIR="/tmp/${REPO_NAME}-gh-pages"

cd "$ROOT_DIR/web"
echo "Building with BASE_PATH=${BASE_PATH}"
BASE_PATH="$BASE_PATH" npm run build

cd "$ROOT_DIR"

if [[ -d "$WORKTREE_DIR" ]]; then
  git worktree remove "$WORKTREE_DIR" --force || true
  rm -rf "$WORKTREE_DIR"
  git worktree prune || true
fi

git worktree add "$WORKTREE_DIR" gh-pages

rsync -a --delete --exclude .git "$ROOT_DIR/web/dist/" "$WORKTREE_DIR/"

cd "$WORKTREE_DIR"
if git status --porcelain | grep -q .; then
  git add -A
  git commit -m "Deploy web app"
  git push origin gh-pages
  echo "Deployed to gh-pages."
else
  echo "No changes to deploy."
fi
