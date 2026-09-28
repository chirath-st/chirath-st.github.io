#!/usr/bin/env bash
# Put the pre-v2 website back live (the fallback Chirath asked to keep, Sep 27 2026).
# The old built pages are saved on GitHub as branch "gh-pages-v1"; the old source is tag "v1-live".
# Usage: bash site/scripts/rollback-to-v1.sh      (live again in about a minute)
# To return to the newest version afterwards: bash site/scripts/deploy-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git fetch -q origin gh-pages-v1
git push -f origin "origin/gh-pages-v1:refs/heads/gh-pages"
echo "Rolled back: the v1 site will be live at https://chirath-st.github.io in about a minute."
