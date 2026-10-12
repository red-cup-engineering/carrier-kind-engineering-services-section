"""
settle.py — Classify each file and token by relational depth.

From the babble (2026-03-28):
  "Relationlessness went from an absurd prior truth,
   to something that is trying to relate,
   to something that is relating,
   to something that has related."

  Absurd -> Possible -> Necessary -> Determined

For a TOKEN:
  Absurd:     only one file claims it. No corroboration.
  Possible:   multiple files claim it. Starting to relate.
  Necessary:  the files that claim it also share OTHER tokens.
              The connections have structure.
  Determined: those files form a self-referencing neighborhood.
              The token's position is fully constrained.

For a FILE:
  Its position is the position of its least-settled token.
  (From pewpew.py: necessary_settled = ALL generators have partners.
   A file is only as Determined as its weakest link.)

No weights. No clusters. No k. No thresholds.
Just: how deep does the relational structure go?

Reads:  data/graph.json  (output of extract.py)
Writes: data/settle.json (consumed by Hugo via .Site.Data.settle)
"""

import json
import sys
import time
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


def load_graph(path: Path) -> dict:
    raw = json.loads(path.read_text(encoding="utf-8"))
    bases_by_id = {b["id"]: b for b in raw["bases"]}

    file_ids = set(b["id"] for b in raw["bases"] if b["kind"] == "file")
    token_ids = set(b["id"] for b in raw["bases"] if b["kind"] == "token")

    file_tokens = defaultdict(set)
    token_files = defaultdict(set)

    for c in raw["claims"]:
        subj, obj = c["subject"], c["object"]
        if subj in file_ids and obj in token_ids:
            file_tokens[subj].add(obj)
            token_files[obj].add(subj)

    return {
        "bases_by_id": bases_by_id,
        "file_ids": sorted(file_ids),
        "token_ids": sorted(token_ids),
        "file_tokens": dict(file_tokens),
        "token_files": dict(token_files),
        "claims": raw["claims"],
    }


def settle_tokens(graph: dict) -> dict:
    """Classify each token by relational depth.

    Absurd:     1 file claims it.
    Possible:   2+ files claim it.
    Necessary:  the files that claim it share other tokens with each other.
    Determined: the files that claim it form a closed neighborhood
                (every pair shares at least one other token).
    """
    file_tokens = graph["file_tokens"]
    token_files = graph["token_files"]
    positions = {}

    for tid in graph["token_ids"]:
        fids = token_files.get(tid, set())

        if len(fids) <= 1:
            positions[tid] = "absurd"
            continue

        # Possible: multiple files claim it.
        # Now check if those files share OTHER tokens with each other.
        fids_list = list(fids)
        has_shared_other = False
        all_pairs_share = True

        for i in range(len(fids_list)):
            fi_tokens = file_tokens.get(fids_list[i], set()) - {tid}
            paired = False
            for j in range(i + 1, len(fids_list)):
                fj_tokens = file_tokens.get(fids_list[j], set()) - {tid}
                if fi_tokens & fj_tokens:
                    has_shared_other = True
                    paired = True
                else:
                    all_pairs_share = False
            if not paired and len(fids_list) > 1 and i < len(fids_list) - 1:
                all_pairs_share = False

        if all_pairs_share and len(fids_list) >= 2:
            positions[tid] = "determined"
        elif has_shared_other:
            positions[tid] = "necessary"
        else:
            positions[tid] = "possible"

    return positions


def settle_files(graph: dict, token_positions: dict) -> dict:
    """Classify each file by the positions of its tokens.

    A file is only as Determined as its weakest link.
    From pewpew.py: necessary_settled requires ALL generators have partners.
    """
    order = {"absurd": 0, "possible": 1, "necessary": 2, "determined": 3}
    results = {}

    for fid in graph["file_ids"]:
        tokens = graph["file_tokens"].get(fid, set())

        if not tokens:
            results[fid] = "absurd"
            continue

        token_pos = [token_positions.get(tid, "absurd") for tid in tokens]
        min_pos = min(token_pos, key=lambda p: order[p])
        results[fid] = min_pos

    return results


def build_output(graph, token_positions, file_positions):
    bases = graph["bases_by_id"]

    token_counts = Counter(token_positions.values())
    file_counts = Counter(file_positions.values())

    files_out = {}
    for fid in graph["file_ids"]:
        tokens = graph["file_tokens"].get(fid, set())
        token_detail = {}
        for tid in tokens:
            token_detail[bases[tid]["value"]] = token_positions.get(tid, "absurd")

        files_out[fid] = {
            "path": bases[fid]["value"],
            "position": file_positions[fid],
            "tokens": token_detail,
        }

    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "stats": {
            "files": len(graph["file_ids"]),
            "tokens": len(graph["token_ids"]),
            "claims": len(graph["claims"]),
            "file_positions": dict(file_counts),
            "token_positions": dict(token_counts),
        },
        "files": files_out,
    }


def main():
    t0 = time.time()

    base = Path(__file__).resolve().parent.parent / "emsenn-net" / "data"
    graph_path = base / "graph.json"
    out_path = base / "settle.json"

    print("Loading graph...", file=sys.stderr)
    graph = load_graph(graph_path)
    print(f"  {len(graph['file_ids'])} files, {len(graph['token_ids'])} tokens",
          file=sys.stderr)

    print("Settling tokens...", file=sys.stderr)
    token_positions = settle_tokens(graph)
    tc = Counter(token_positions.values())
    for pos in ["absurd", "possible", "necessary", "determined"]:
        print(f"  {pos}: {tc.get(pos, 0)}", file=sys.stderr)

    print("Settling files...", file=sys.stderr)
    file_positions = settle_files(graph, token_positions)
    fc = Counter(file_positions.values())
    for pos in ["absurd", "possible", "necessary", "determined"]:
        print(f"  {pos}: {fc.get(pos, 0)}", file=sys.stderr)

    print("Writing output...", file=sys.stderr)
    output = build_output(graph, token_positions, file_positions)
    out_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    elapsed = time.time() - t0
    print(f"Done in {elapsed:.1f}s -> {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
