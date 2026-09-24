Tool logos for the "Built with" bands on the case pages (main edition).

Source: Simple Icons, https://simpleicons.org, package simple-icons@16.32.0,
downloaded Sep 24, 2026 from https://cdn.jsdelivr.net/npm/simple-icons@16.32.0/icons/<slug>.svg
Licence: CC0 1.0 (the icon files). Trademarks belong to their owners; using a mark here
only names the tool that was used, and implies no endorsement.

Files (unchanged downloads): canva, claude, cursor, databricks, figma, jira, openai,
pandas, python, scikitlearn, slack (.svg).

tools.svg collects the same paths, one <symbol> each. The partials src/partials/builtwith-<case>.html
carry inline copies of the symbols they need (id "bwl-<slug>"), drawn in the text colour (currentColor),
never brand colours.
It also holds two plain generic glyphs that are NOT logos, drawn for this site:
  sql         a database cylinder (there is no official SQL logo)
  assistants  two speech bubbles (the company's own AI assistants, no brand shown)
The Codex chip uses the OpenAI mark (Codex is an OpenAI product; Simple Icons has no Codex icon).

To add a tool: copy the <path> elements of <slug>.svg into a new <symbol id="slug" viewBox="0 0 24 24">
in tools.svg, then paste that symbol (renamed bwl-<slug>) into the partial's <svg class="bw__defs">.
