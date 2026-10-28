#!/bin/sh
# Keep each aagaard substrate log under 200MB by retaining its last 100MB.
# Substrate snapshots are re-fetchable public Hive data; only recency matters.
set -u
LIMIT=209715200; KEEP=104857600
for f in "$HOME"/aagaard/data/logs/*-substrate.jsonl; do
  [ -f "$f" ] || continue
  size=$(stat -c %s "$f")
  [ "$size" -gt "$LIMIT" ] || continue
  dd if="$f" of="$f.rot" bs=1M skip=$(( (size - KEEP) / 1048576 )) 2>/dev/null
  sed -i "1d" "$f.rot" && mv "$f.rot" "$f"
done
