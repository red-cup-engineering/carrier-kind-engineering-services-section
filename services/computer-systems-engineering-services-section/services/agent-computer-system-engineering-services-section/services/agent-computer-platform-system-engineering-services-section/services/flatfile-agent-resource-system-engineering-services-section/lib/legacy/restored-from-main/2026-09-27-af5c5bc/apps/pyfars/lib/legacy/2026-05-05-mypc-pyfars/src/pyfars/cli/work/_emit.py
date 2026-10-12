"""Shared helpers: timestamping, slug minting, frontmatter rendering, file writing."""
from __future__ import annotations

import datetime as _dt
import json
import secrets
from pathlib import Path
from typing import Any

import yaml

# Records dir naming follows the six-spoke channel decomposition
# (plan, dispatch, execute, track, review, feedback). Each work verb
# writes its emission to the spoke directory named for the action's
# work-cycle stage. See `concepts/six-spoke-channel-decomposition.md`.
SPOKE_DIR = {
    "assign":   "dispatch",
    "execute":  "execute",
    "track":    "track",
    "review":   "review",
    "feedback": "feedback",
}


def _repo_root(start: Path | None = None) -> Path:
    """Walk up from CWD (or `start`) to find the corpus root.

    The corpus root is the first ancestor with `.git` or `flake.nix` —
    the polity's repository top. This replaces a brittle
    `Path(__file__).parents[N]` computation that depended on the package
    being editable-installed at a specific path; the new logic resolves
    correctly whether pyfars is run from the Nix store, a development
    checkout, or another packaged install.
    """
    cur = (start or Path.cwd()).resolve()
    for parent in [cur] + list(cur.parents):
        if (parent / ".git").exists() or (parent / "flake.nix").exists():
            return parent
    return cur


def _records_base() -> Path:
    return _repo_root() / "operations" / "engineering" / "records" / "work"


def now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def mint_slug(prefix: str) -> str:
    """Generate a sortable, mostly-unique slug: <prefix>-<YYYYMMDDHHMMSS>-<rand>."""
    ts = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%d%H%M%S")
    rand = secrets.token_hex(2)
    return f"{prefix}-{ts}-{rand}"


def write_workitem(spoke: str, slug: str, frontmatter: dict[str, Any],
                   body: str = "") -> Path:
    """Write a workitem markdown file under the spoke's records directory."""
    target_dir = _records_base() / SPOKE_DIR[spoke]
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{slug}.md"
    fm_text = yaml.safe_dump(frontmatter, sort_keys=False,
                             default_flow_style=False, allow_unicode=True)
    content = f"---\n{fm_text}---\n\n{body}".rstrip() + "\n"
    target.write_text(content, encoding="utf-8")
    return target


def write_spoke_event(spoke: str, work_item_slug: str,
                      payload: dict[str, Any]) -> Path:
    """Append one JSON line to .fars/logs/work/<spoke>/<work_item_slug>.jsonl.

    Realizes the structural axis of the substrate's six-spoke channel
    decomposition (concept: six-spoke-channel-decomposition). Where
    `write_workitem` produces a human-readable rendered record, this
    function writes the substrate-primary increment u_τ as one JSONL
    line keyed by work-item slug — the per-work-item per-spoke event
    log a downstream consumer walks to derive task state via the
    referencing-entity pattern.

    `spoke` is one of plan / dispatch / execute / track / review /
    feedback. `payload` should at minimum carry `at`, `kind`, and
    `increments` (predication-cell triples) but is otherwise free-form;
    the caller is responsible for shaping it to the entity-kind being
    emitted (assignment / execution-event / observation / finding /
    adjustment / task-cell-system).
    """
    spoke_dir = _repo_root() / ".fars" / "logs" / "work" / spoke
    spoke_dir.mkdir(parents=True, exist_ok=True)
    target = spoke_dir / f"{work_item_slug}.jsonl"
    line = json.dumps(payload, default=str, ensure_ascii=False)
    with target.open("a", encoding="utf-8") as f:
        f.write(line + "\n")
    return target
