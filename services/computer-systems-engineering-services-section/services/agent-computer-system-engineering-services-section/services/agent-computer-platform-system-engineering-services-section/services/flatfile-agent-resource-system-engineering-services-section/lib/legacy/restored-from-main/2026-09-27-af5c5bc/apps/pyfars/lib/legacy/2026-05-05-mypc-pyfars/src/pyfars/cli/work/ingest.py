"""``pyfars work ingest <execution-event-slug>`` — land an endpoint reply as a draft artifact.

Reads an execution-event's ``## Completion`` section, extracts the two-block
reply per the reply contract (see ``docs/reply-contract.md``), and writes
the produced artifact to ``<root>/.fars/drafts/<stamp>-<slug>.md``.

The reply contract is fixed:

  - At least one fenced ` ```yaml ` block, taken as the artifact's frontmatter
    (must parse with ``yaml.safe_load`` to a mapping; first block wins).
  - At least one fenced ` ```markdown ` block, taken as the artifact's body
    verbatim (first block wins).

If either block is missing or malformed, ingest emits an
``ingest-failure`` observation against the source assignment and exits
non-zero. The execution-event itself is never modified.

Drafts get three injected frontmatter keys so a captain reviewing them can
trace provenance:

  - ``produced-by: dispatch-ingest``
  - ``produced-from: <execution-event-slug>``
  - ``produced-at: <iso-timestamp>``
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

import yaml

from pyfars.cli._runner import as_directory
from pyfars.cli.work._emit import (
    SPOKE_DIR,
    mint_slug,
    now_iso,
    write_workitem,
)
from pyfars.cli.work._resolve import load, resolve
from pyfars.substrate.parse.frontmatter import parse as parse_fm

YAML_BLOCK_RE = re.compile(r"```yaml\n(.*?)\n```", re.DOTALL)
MD_BLOCK_RE = re.compile(r"```markdown\n(.*?)\n```", re.DOTALL)
COMPLETION_HEADING = "## Completion"


class IngestError(Exception):
    """Reply did not satisfy the contract."""


def _completion_text(body: str) -> str:
    """Return the body slice after the ``## Completion`` heading.

    Falls back to the whole body when the heading is absent — execute.py
    has historically always emitted it, but a future variant might not.
    """
    head, _, tail = body.partition(COMPLETION_HEADING)
    return tail if tail else head


def parse_reply(completion_body: str) -> tuple[dict, str]:
    """Extract (frontmatter-dict, body-text) from a completion per the contract.

    Raises ``IngestError`` if the contract is not satisfied.
    """
    text = _completion_text(completion_body)
    y = YAML_BLOCK_RE.search(text)
    if y is None:
        raise IngestError("missing fenced ```yaml block")
    m = MD_BLOCK_RE.search(text)
    if m is None:
        raise IngestError("missing fenced ```markdown block")
    if y.start() > m.start():
        raise IngestError("yaml block must come before markdown block")
    try:
        fm = yaml.safe_load(y.group(1))
    except yaml.YAMLError as e:
        raise IngestError(f"yaml block did not parse: {e}") from e
    if not isinstance(fm, dict):
        raise IngestError("yaml block did not produce a mapping")
    body = m.group(1).rstrip() + "\n"
    return fm, body


def _slugify(s: str, fallback: str) -> str:
    base = re.sub(r"[^a-z0-9-]+", "-", str(s).lower()).strip("-")
    return (base[:80] or fallback)


def _drafts_dir(root: Path) -> Path:
    return root / ".fars" / "drafts"


def _emit_ingest_failure(execution_event_slug: str,
                         under_assignment: str | None,
                         concerns_task: str | None,
                         reason: str) -> Path:
    obs_slug = mint_slug(f"observation-ingest-failure-{execution_event_slug}")
    fm: dict[str, Any] = {
        "title": f"Ingest-failure observation: {execution_event_slug}",
        "type": "workitem",
        "kind": "observation",
        "is-a": "observation",
        "observes": execution_event_slug,
        "observed-at": now_iso(),
        "method": "reply-contract-extraction",
        "observed-via": "pyfars-work-ingest",
        "value": {"reason": reason},
        "scale": "nominal",
    }
    if under_assignment:
        fm["under-assignment"] = under_assignment
    if concerns_task:
        fm["concerns-task"] = concerns_task
    body = (
        f"Ingest of `{execution_event_slug}` failed: {reason}\n\n"
        f"The execution-event was left untouched. Either correct the reply "
        f"in place and re-run `pyfars work ingest`, or treat the failure as a "
        f"signal to revise the source task's `## Output` instructions.\n"
    )
    return write_workitem("track", obs_slug, fm, body)


def ingest(execution_event_slug: str, root: Path) -> dict[str, Any]:
    """Run one ingest. Returns a result dict.

    Result keys:
      - ``ok``: bool
      - ``draft``: Path written (when ok)
      - ``failure``: Path of failure observation (when not ok)
      - ``reason``: str (when not ok)
      - ``concerns-task``: str | None
    """
    sub = load(root)
    note = resolve(sub, execution_event_slug)
    if note is None:
        return {"ok": False, "reason": f"execution-event {execution_event_slug!r} not found"}

    fm = note.fm
    if fm.get("kind") != "execution-event":
        return {
            "ok": False,
            "reason": f"{execution_event_slug} is kind={fm.get('kind')!r}, not execution-event",
        }

    concerns_task = fm.get("concerns-task")
    under_assignment = fm.get("under-assignment")

    # Read the original file text to get the body (note.body may be a parsed
    # representation; we want the raw markdown).
    text = Path(note.path).read_text(encoding="utf-8")
    _fm, body = parse_fm(text)

    try:
        artifact_fm, artifact_body = parse_reply(body or "")
    except IngestError as e:
        failure_path = _emit_ingest_failure(
            execution_event_slug, under_assignment, concerns_task, str(e)
        )
        return {
            "ok": False,
            "reason": str(e),
            "failure": failure_path,
            "concerns-task": concerns_task,
        }

    # Inject provenance.
    artifact_fm["produced-by"] = "dispatch-ingest"
    artifact_fm["produced-from"] = execution_event_slug
    artifact_fm["produced-at"] = now_iso()

    # Land the draft.
    title = artifact_fm.get("title") or concerns_task or execution_event_slug
    slug = _slugify(title, fallback=execution_event_slug)
    stamp = now_iso().replace(":", "").replace("-", "")[:15]
    drafts = _drafts_dir(root)
    drafts.mkdir(parents=True, exist_ok=True)
    out = drafts / f"{stamp}-{slug}.md"
    fm_text = yaml.safe_dump(artifact_fm, sort_keys=False,
                             default_flow_style=False, allow_unicode=True)
    out.write_text(f"---\n{fm_text}---\n\n{artifact_body}", encoding="utf-8")
    return {
        "ok": True,
        "draft": out,
        "concerns-task": concerns_task,
    }


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work ingest")
    ap.add_argument("execution_event",
                    help="execution-event slug to ingest")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work ingest")
    if root is None:
        return 2

    result = ingest(args.execution_event, root)
    if not result["ok"]:
        print(f"pyfars work ingest: {result['reason']}", file=sys.stderr)
        if "failure" in result:
            print(f"  failure record: {result['failure']}", file=sys.stderr)
        return 1

    print(f"pyfars work ingest: wrote {result['draft']}")
    return 0
