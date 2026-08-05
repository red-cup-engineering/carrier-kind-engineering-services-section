#!/usr/bin/env bash
set -euo pipefail

REPO_PATH="${1:-.}"
cd "$REPO_PATH"

# Basic repo info
HEAD_COMMIT="$(git rev-parse HEAD)"
BRANCH_NAME="$(git symbolic-ref --quiet --short HEAD || echo null)"

# Canonical j = annotated tags
ANNOTATED_TAGS="$(git tag -l --annotated)"

STABLE_COMMITS="$(git rev-list --annotated || true)"
STABLE_COUNT="$(echo "$STABLE_COMMITS" | grep -c . || true)"

ALL_COMMITS="$(git rev-list --all)"
ALL_COUNT="$(echo "$ALL_COMMITS" | grep -c . || true)"

PROVISIONAL_COUNT="$((ALL_COUNT - STABLE_COUNT))"

# Latest annotated tag (if any)
LATEST_TAG="$(git describe --tags --abbrev=0 2>/dev/null || echo null)"

if [ "$LATEST_TAG" != "null" ]; then
  DELTA_COUNT="$(git rev-list HEAD --not "$LATEST_TAG" | wc -l | tr -d ' ')"
else
  DELTA_COUNT=0
fi

# Branch fragment sizes
BRANCH_CONES_JSON="$(
  git for-each-ref --format='%(refname:short)' refs/heads | while read -r br; do
    count="$(git rev-list "$br" | wc -l | tr -d ' ')"
    printf '"%s": %s\n' "$br" "$count"
  done | paste -sd, -
)"

# Fusion check: is HEAD already modally stable?
HEAD_PROVISIONAL_COUNT="$(git rev-list HEAD --not $(git tag -l --annotated) | wc -l | tr -d ' ')"
if [ "$HEAD_PROVISIONAL_COUNT" -eq 0 ]; then
  HEAD_STABLE=true
else
  HEAD_STABLE=false
fi

# Emit JSON
jq -n \
  --arg path "$(pwd)" \
  --arg head "$HEAD_COMMIT" \
  --arg branch "$BRANCH_NAME" \
  --argjson stable_count "$STABLE_COUNT" \
  --argjson provisional_count "$PROVISIONAL_COUNT" \
  --argjson delta_count "$DELTA_COUNT" \
  --arg latest_tag "$LATEST_TAG" \
  --argjson head_stable "$HEAD_STABLE" \
  --argjson branch_cones "{${BRANCH_CONES_JSON}}" \
  --argjson stable_tags "$(printf '%s\n' $ANNOTATED_TAGS | jq -R . | jq -s .)" \
  '
{
  repo: {
    path: $path,
    head: $head,
    branch: ($branch == "null" ? null : $branch)
  },
  stability: {
    canonical_j: "annotated-tags",
    stable_commit_count: $stable_count,
    provisional_commit_count: $provisional_count,
    stable_tags: $stable_tags
  },
  delta: {
    latest_tag: ($latest_tag == "null" ? null : $latest_tag),
    since_latest_tag_commit_count: $delta_count
  },
  fragments: {
    branch_cones: $branch_cones
  },
  fusion: {
    head_is_modally_stable: $head_stable
  }
}
'
