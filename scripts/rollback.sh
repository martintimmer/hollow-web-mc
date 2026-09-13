#!/usr/bin/env bash
set -e

TARGET="${1}"

if [ -z "$TARGET" ]; then
  echo "Usage: ./scripts/rollback.sh <tag-or-commit-hash>"
  echo ""
  echo "Available Tags & Recent Commits:"
  cd "$(dirname "$0")/.."
  git tag -l
  echo ""
  git log -n 10 --oneline --decorate
  exit 1
fi

cd "$(dirname "$0")/.."
echo "🔄 Rolling back repository to: $TARGET ..."

# Save any uncommitted changes to stash just in case
git stash save "Autostash before rollback to $TARGET $(date +'%Y-%m-%d %H:%M:%S')" || true

# Checkout target
git checkout "$TARGET"

# Rebuild project
echo "🔨 Rebuilding Vite production bundle..."
npm run build

echo "✅ Successfully rolled back and rebuilt project at $TARGET!"
echo "Current HEAD is now at:"
git log -n 1 --oneline --decorate
