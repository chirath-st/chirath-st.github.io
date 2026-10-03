#!/usr/bin/env bash
# Publish the built site to the gh-pages branch (GitHub Pages serves that branch).
# Usage (from anywhere): bash scripts/deploy-pages.sh
# Builds with scripts/build_locked.py, then pushes the contents of dist/ as a single commit to gh-pages.
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$SITE"
python3 scripts/build_locked.py >/dev/null
SHA="$(git rev-parse --short HEAD)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R dist/. "$TMP/"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$SITE" config user.name || echo 'Chirath Soithong')" \
    -c user.email="$(git -C "$SITE" config user.email || echo 'chirath.st@gmail.com')" \
    commit -q -m "Deploy ${SHA}"
git push -q -f "$(git -C "$SITE" remote get-url origin)" gh-pages
echo "Deployed ${SHA} to gh-pages"
