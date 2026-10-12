#!/usr/bin/env bash
# push-ops-data.sh — push the ops.561.group v0 control-plane's OPS_DATA_DIR content (world.eavt +
# records/) to cold-red-gate. This package's routes (/world, /records) only ever READ that
# directory; this script is the one place that writes it, and it is the OWNER's to run, not this
# session's or any agent's — it makes a real remote connection and a real remote write.
#
# Sources (repo-side, read-only from here):
#   - the LAGOON app's own world.eavt (its data/state custody)
#   - the two 561-group records: the goal-stack roadmap (PM records custody) and org-machines
#     (561-group-services-section records custody)
#
# Destination: cold-red-gate:~/.local/state/ops-561-group/data/{world.eavt,records/}. The `~`
# is expanded by the REMOTE shell rsync invokes over ssh, so it resolves to the operator account's
# home on cold-red-gate, not this machine's. The destination directory must already exist on
# cold-red-gate (the deploy runbook creates it) — this script does not create remote directories.
#
# Usage:
#   scripts/push-ops-data.sh            # dry run (DEFAULT): echoes the exact scope, transfers nothing
#   scripts/push-ops-data.sh --apply    # the real rsync, after printing the same scope
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

LAGOON_WORLD_EAVT="$REPO_ROOT/lib/emsenn/services/561-group/services/engineering-services-section/services/computer-engineering-services-section/services/computer-systems-engineering-services-section/services/agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/apps/lagoon/data/state/world.eavt"
GOAL_STACK_ROADMAP="$REPO_ROOT/lib/emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-enterprise-services-section/services/561-group-enterprise-project-management-services-section/data/records/2026-08-30-goal-stack-roadmap.json"
ORG_MACHINES="$REPO_ROOT/lib/emsenn/services/561-group/services/561-group-services-section/data/records/2026-08-30-org-machines.json"

DEST_HOST="cold-red-gate"
DEST_DIR="~/.local/state/ops-561-group/data"

for f in "$LAGOON_WORLD_EAVT" "$GOAL_STACK_ROADMAP" "$ORG_MACHINES"; do
  if [ ! -f "$f" ]; then
    echo "push-ops-data.sh: missing source file: $f" >&2
    exit 1
  fi
done

echo "push-ops-data.sh: scope"
echo "  world.eavt          <- $LAGOON_WORLD_EAVT"
echo "  records/<basename>  <- $GOAL_STACK_ROADMAP"
echo "  records/<basename>  <- $ORG_MACHINES"
echo "  target              -> $DEST_HOST:$DEST_DIR/{world.eavt,records/}"

RSYNC_OPTS=(-av)
if [ "${1:-}" = "--apply" ]; then
  echo "push-ops-data.sh: APPLYING (real transfer)"
else
  RSYNC_OPTS+=(--dry-run)
  echo "push-ops-data.sh: DRY RUN (pass --apply to actually transfer)"
fi

rsync "${RSYNC_OPTS[@]}" -e 'ssh -o BatchMode=yes' \
  "$LAGOON_WORLD_EAVT" "$DEST_HOST:$DEST_DIR/world.eavt"
rsync "${RSYNC_OPTS[@]}" -e 'ssh -o BatchMode=yes' \
  "$GOAL_STACK_ROADMAP" "$ORG_MACHINES" "$DEST_HOST:$DEST_DIR/records/"
