#!/usr/bin/env bash
set -e

MSG="${1:-Manual Snapshot $(date +'%Y-%m-%d %H:%M:%S')}"
TAG="snapshot-$(date +'%Y%m%d-%H%M%S')"

cd "$(dirname "$0")/.."
git add .
if git diff --staged --quiet; then
  echo "⚠️ No changes to commit. Working directory is clean."
  echo "Current commit: $(git rev-parse --short HEAD)"
  git log -n 5 --oneline --decorate
  exit 0
fi

git commit -m "$MSG"
git tag -a "$TAG" -m "$MSG"
echo "✅ Snapshot created successfully!"
echo "Tag: $TAG"
echo "Commit: $(git rev-parse --short HEAD)"
git log -n 5 --oneline --decorate
