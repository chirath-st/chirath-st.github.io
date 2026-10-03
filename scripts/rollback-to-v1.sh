#!/usr/bin/env bash
# Put the previous (v1) website back live.
# The old built pages are saved on GitHub as branch "gh-pages-v1"; the old source is tag "v1-live".
# Usage: bash scripts/rollback-to-v1.sh      (live again in about a minute)
# To return to the newest version afterwards: bash scripts/deploy-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch -q origin gh-pages-v1
git push -f origin "origin/gh-pages-v1:refs/heads/gh-pages"
echo "Rolled back: the v1 site will be live at https://chirath-st.github.io in about a minute."
