#!/usr/bin/env python3
"""
measure.py — Grow the orbit graph from spec/ and print geometry.
"""

import re
import sys
from pathlib import Path

from relational_order import Event, RelationalOrder

REPO_ROOT = Path(__file__).resolve().parents[3]
SPEC_DIR  = REPO_ROOT / "spec"


try:
    import yaml
    def parse_frontmatter(text: str) -> dict:
        if not text.startswith("---"):
            return {}
        try:
            end = text.index("---", 3)
        except ValueError:
            return {}
        try:
            result = yaml.safe_load(text[3:end].strip())
            return result if isinstance(result, dict) else {}
        except Exception:
            return {}
except ImportError:
    def parse_frontmatter(text: str) -> dict:
        if not text.startswith("---"):
            return {}
        try:
            end = text.index("---", 3)
        except ValueError:
            return {}
        block = text[3:end]
        result: dict = {}
        current_key: str | None = None
        current_lines: list[str] = []
        def flush():
            if current_key is not None:
                raw = " ".join(current_lines).strip()
                if (raw.startswith('"') and raw.endswith('"')) or \
                   (raw.startswith("'") and raw.endswith("'")):
                    raw = raw[1:-1]
                result[current_key] = raw
        for line in block.splitlines():
            if line.startswith("  ") or line.startswith("\t"):
                current_lines.append(line.strip())
                continue
            m = re.match(r'^([A-Za-z0-9_-]+)\s*:(.*)', line)
            if m:
                flush()
                current_key = m.group(1)
                current_lines = [m.group(2).strip()]
            else:
                current_lines.append(line.strip())
        flush()
        return result


def flatten_value(v) -> str:
    if isinstance(v, str):
        return v
    if isinstance(v, list):
        return " ".join(flatten_value(x) for x in v)
    if isinstance(v, dict):
        return " ".join(f"{k} {flatten_value(vv)}" for k, vv in v.items())
    return str(v)


def collect() -> tuple[list[tuple[str, Event]], int]:
    file_events: list[tuple[str, Event]] = []
    file_count = 0
    for path in sorted(SPEC_DIR.rglob("*.md")):
        text = path.read_text(encoding="utf-8", errors="replace")
        rel  = str(path.relative_to(REPO_ROOT))
        file_count += 1
        for key, raw in parse_frontmatter(text).items():
            file_events.append((rel, Event(key=key, value=flatten_value(raw))))
    return file_events, file_count


def eid(e: Event) -> str:
    return e.key + '\x00' + e.value


def main():
    file_events, file_count = collect()
    all_events = frozenset(e for _, e in file_events)

    print(f"files={file_count}  file-events={len(file_events)}  unique-events={len(all_events)}")

    ro = RelationalOrder(all_events)
    geo = ro.build_geometry()

    grafts = geo.grafts(file_events)

    print(f"rings={len(geo.rings)}  grafted-tiles={len(grafts)}")
    for i, changed in enumerate(geo.rings):
        print(f"  ring {i}: {len(changed)} events grew")

    # Strata: feed held orderings back as new events, same math
    layer = all_events
    for n in range(5):
        ro2 = RelationalOrder(layer)
        geo2 = ro2.build_geometry()
        held = frozenset(
            Event(key=eid(e), value=eid(f))
            for e in layer
            for f in geo2.descending[e]
        )
        grew = sum(len(r) for r in geo2.rings[:-1])
        print(f"  stratum {n}: events={len(layer)}  held-orderings={len(held)}  grew={grew}")
        if not held:
            print("  (empty — fixed point)")
            break
        layer = held


if __name__ == "__main__":
    main()
