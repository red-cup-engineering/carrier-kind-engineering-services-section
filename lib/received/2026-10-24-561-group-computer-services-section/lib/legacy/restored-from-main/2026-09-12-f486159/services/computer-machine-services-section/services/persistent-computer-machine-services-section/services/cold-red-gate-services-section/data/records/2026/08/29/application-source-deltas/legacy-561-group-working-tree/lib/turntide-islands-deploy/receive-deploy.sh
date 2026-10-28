#!/usr/bin/env bash
set -euo pipefail
TARGET=/home/emsenn/561-group/lib/turntide-islands
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
tar xzf - -C "$TMP"
mkdir -p "$TARGET/data"
rsync -a --delete --exclude=data --exclude=.env "$TMP"/ "$TARGET"/
systemctl --user restart turntide-islands.service
echo "deployed $(date -u +%FT%TZ)"
