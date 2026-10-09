#!/bin/bash
# House session start: give every Claude Code cloud session in this repository what it needs to test and
# merge its own work the way the machines receive it. Idempotent; only stdout is the hook's JSON answer.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
HOUSE="$HOME/.cache/561-group"
mkdir -p "$HOUSE"
# This repository as OWNER/REPO, read from its remote (a proxy URL keeps the path's last two segments).
repository=$(git -C "$CLAUDE_PROJECT_DIR" remote get-url origin 2>/dev/null | sed -E 's#\.git$##; s#^.*[/:]([^/:]+/[^/]+)$#\1#')

# Node 24: the house packages need 22.18 or later, and the cloud image ships 24 under nvm.
node_bin=$(ls -d /opt/nvm/versions/node/v24.*/bin 2>/dev/null | sort -V | tail -1 || true)
if [ -n "$node_bin" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$node_bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

# House package scopes resolve anonymously from the Group's registry.
for scope in 561-group causeway-services coesite-operations emsenn emsweb harmonious-union koios-news \
             lenticule-science red-cup-engineering red-cup-science rsc-quiescent turntide-islands union-officer-academy; do
  grep -qs "^@$scope:registry=" "$HOME/.npmrc" || echo "@$scope:registry=https://registry.561.group/" >> "$HOME/.npmrc"
done

# The release controller (its change test) and the machine snapshot it composes against, when this
# session can read them. A repository the session was not started with is reported, not fatal.
missing=""
fetch() {
  if [ -d "$2/.git" ]; then
    { git -C "$2" fetch -q --depth=50 origin main && git -C "$2" checkout -q --detach FETCH_HEAD; } >&2 2>&1 || true
  elif ! git clone -q --depth=50 "https://github.com/$1.git" "$2" >&2 2>&1; then
    missing="$missing $1"
  fi
}
fetch red-cup-engineering/guix-machine-release-service "$HOUSE/controller"
fetch emsenn/cold-red-gate "$HOUSE/cold-red-gate"

context="561 Group house rules for ${repository:-this repository}.
- You receive your own work. Test the exact commit for real, record the result on the pull request, and merge it; no office will do it for you. Cold Red Gate's release controller then receives the merged commit (sealed-store tests, probe, live health, automatic recovery), and a failed receipt reopens the work. Never wait on a receiving office.
- Test with the real dependencies, never stand-ins: commit, then run
  node $HOUSE/controller/scripts/test-change.mjs $HOUSE/cold-red-gate $HOUSE/test-change ${repository:-OWNER/REPO}=$CLAUDE_PROJECT_DIR
  It composes the machine's workspace with your commit, installs from https://registry.561.group/, builds, and reports only the failures your change introduced. Node 24 is on PATH.
- Only real-money risk, credentials and calls the founder has reserved go to the founder: name them once and keep working on everything else.
- Report in plain terms: what you did, what is next, and what is blocked on whom."
if [ -n "$missing" ]; then
  context="$context
- This session cannot read:$missing. Attach them (add_repo) before running the change test."
fi
"${node_bin:+$node_bin/}node" -e 'process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:process.argv[1]}}))' "$context"
