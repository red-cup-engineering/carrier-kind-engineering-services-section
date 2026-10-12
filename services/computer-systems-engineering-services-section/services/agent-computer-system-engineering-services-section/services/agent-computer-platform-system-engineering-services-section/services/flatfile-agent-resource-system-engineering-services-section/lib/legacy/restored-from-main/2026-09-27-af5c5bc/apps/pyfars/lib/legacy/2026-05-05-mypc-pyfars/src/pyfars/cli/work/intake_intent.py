"""``pyfars work intake-intent`` — turn a dispatch-intent into work.

This is the bridge from external message intake to the normal work cycle. It
reads one queued ``kind: dispatch-intent`` record and emits a concrete task
under an operational triage directory. The task can target an intermediate
planner model (default) or a final coding-agent executor.

The command deliberately does not solve the intent itself. It gives the
dispatch/work substrate a first-class task to route through agents, endpoints,
skills, and local tools.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

import yaml

from pyfars.cli._runner import as_directory
from pyfars.cli.work import auto_dispatch as ad_mod
from pyfars.cli.work._emit import now_iso, write_spoke_event
from pyfars.operator.edit.fm_set import set_field
from pyfars.operator.edit.rewrite_fm import apply as apply_fm
from pyfars.substrate.parse.frontmatter import parse as parse_fm


DEFAULT_QUEUE = "operations/engineering/triage/dispatch-intents"
DEFAULT_TASK_DIR = "operations/command/projects/intake/tasks"


def _slugify(value: str, fallback: str) -> str:
    slug = re.sub(r"[^a-z0-9-]+", "-", value.lower()).strip("-")
    return (slug[:96] or fallback).strip("-")


def _resolve_intent(root: Path, queue: str | None, slug_or_path: str) -> Path | None:
    raw = Path(slug_or_path)
    if raw.is_absolute() and raw.is_file():
        return raw
    if ("/" in slug_or_path or slug_or_path.endswith(".md")) and (root / raw).is_file():
        return (root / raw).resolve()
    queue_dir = (root / (queue or DEFAULT_QUEUE)).resolve()
    candidate = queue_dir / f"{slug_or_path}.md"
    if candidate.is_file():
        return candidate
    return None


def _body_section(body: str, heading: str) -> str:
    marker = f"## {heading}"
    _before, found, rest = body.partition(marker)
    if not found:
        return body.strip()
    next_heading = re.search(r"\n##\s+", rest)
    if next_heading:
        rest = rest[:next_heading.start()]
    return rest.strip()


def _intent_text(body: str) -> str:
    return _body_section(body, "Intent")


def _as_list(v: Any) -> list[str]:
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x) for x in v]
    return [str(v)]


def _planner_body(intent_path: Path, intent_fm: dict, intent: str) -> str:
    cited = _as_list(intent_fm.get("cited-slugs"))
    citations = "\n".join(f"- `{s}`" for s in cited) or "- none"
    return f"""Source dispatch-intent: `{intent_path}`

You are a planning model in the PyFARS work cycle. Convert the source intent
into the best next substrate artifact — a task, a note, a skill proposal, or
whatever most directly advances the intent. Do NOT answer the intent directly;
produce a substrate artifact that another agent or the captain can act on.

## Source Intent

{intent}

## Cited Slugs

{citations}

## Output

Reply with exactly two fenced blocks in order. No preamble, no closing remarks,
no other fenced blocks.

First, a yaml block with the artifact's frontmatter. Choose `kind` and
`work-type` to match what the artifact actually is (task, skill, note, etc.):

```yaml
title: "..."
kind: task
type: task
status: open
work-type: generation
requires-capabilities:
  - text-generation
  - instruction-following
prefer-endpoint: groq-llama-3-3-70b-versatile
```

Then a markdown block with the artifact body — include enough context for
the next executor to act without re-reading the source intent:

```markdown
# Title

Body content...
```
"""


def _executor_body(intent_path: Path, intent_fm: dict, intent: str) -> str:
    cited = _as_list(intent_fm.get("cited-slugs"))
    citations = "\n".join(f"- `{s}`" for s in cited) or "- none"
    return f"""You are Codex, operating through PyFARS as a local unix-tool executor.

Work in the repository root supplied by the tool process. Read the relevant
code and corpus context before editing. Do not commit. Keep edits scoped to the
PyFARS dispatch/work/orchestration machinery needed for the intent. Verify with
focused tests.

Source dispatch-intent: `{intent_path}`

## Goal

Implement the repair requested by the source intent.

## Source Intent

{intent}

## Cited Slugs

{citations}

## Expected Closeout

Report changed files and verification results in stdout. If blocked, explain
the blocker and leave the worktree in a reviewable state.
"""


def _task_frontmatter(*, task_slug: str, title: str, stage: str,
                      source_intent: str, cited: list[str],
                      priority: int, prefer: str | None) -> dict[str, Any]:
    if stage == "executor":
        required_caps = ["code-modification", "repository-editing"]
        required_skills = ["write-python"]
        work_type = "procedure"
    else:
        required_caps = ["text-generation", "instruction-following"]
        required_skills = []
        work_type = "generation"
    fm: dict[str, Any] = {
        "title": title,
        "slug": task_slug,
        "type": "task",
        "kind": "task",
        "status": "open",
        "priority": priority,
        "work-type": work_type,
        "source-intent": source_intent,
        "pipeline-stage": stage,
        "requires-capabilities": required_caps,
        "requires-skills": required_skills,
        "cited-slugs": cited,
    }
    if prefer:
        fm["prefer-dispatchable"] = prefer
        # Backward-compatible with work tick's existing field name.
        fm["prefer-endpoint"] = prefer
    return fm


def _write_task(target: Path, fm: dict[str, Any], body: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fm_text = yaml.safe_dump(fm, sort_keys=False,
                             default_flow_style=False, allow_unicode=True)
    target.write_text(f"---\n{fm_text}---\n\n{body.rstrip()}\n", encoding="utf-8")


def _claim_intent(path: Path, task_slug: str, by: str) -> None:
    text = path.read_text(encoding="utf-8")
    fm, _body = parse_fm(text)
    fm = dict(fm or {})
    for k, v in {
        "status": "claimed",
        "claimed-by": by,
        "claimed-at": now_iso(),
        "result-ref": task_slug,
    }.items():
        fm = set_field(fm, k, v)
    apply_fm(path, fm)


def run(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(prog="pyfars work intake-intent")
    ap.add_argument("intent", help="dispatch-intent slug or path")
    ap.add_argument("--root", "-r", default=".", help="corpus root")
    ap.add_argument("--queue", default=None,
                    help=f"intent queue under root (default: {DEFAULT_QUEUE})")
    ap.add_argument("--task-dir", default=DEFAULT_TASK_DIR,
                    help=f"task output directory under root (default: {DEFAULT_TASK_DIR})")
    ap.add_argument("--stage", choices=["planner", "executor"], default="planner",
                    help="planner creates a refinement task; executor creates a coding-agent task")
    ap.add_argument("--prefer", default=None,
                    help="preferred dispatchable slug, e.g. a free endpoint or codex-cli")
    ap.add_argument("--priority", type=int, default=7)
    ap.add_argument("--claim-by", default="pyfars-work-intake-intent")
    ap.add_argument("--no-claim", action="store_true",
                    help="do not mark the source intent claimed")
    ap.add_argument("--dispatch", action="store_true",
                    help="after writing the task, run work auto-dispatch on it")
    ap.add_argument("--dry-run", action="store_true",
                    help="print the task that would be written; do not write")
    args = ap.parse_args(argv)

    root = as_directory(args.root, "pyfars work intake-intent")
    if root is None:
        return 2

    intent_path = _resolve_intent(root, args.queue, args.intent)
    if intent_path is None:
        print(f"pyfars work intake-intent: no dispatch-intent matched {args.intent!r}",
              file=sys.stderr)
        return 1

    text = intent_path.read_text(encoding="utf-8")
    intent_fm, body = parse_fm(text)
    intent_fm = dict(intent_fm or {})
    if intent_fm.get("kind") != "dispatch-intent":
        print(f"pyfars work intake-intent: {intent_path} is not kind: dispatch-intent",
              file=sys.stderr)
        return 1

    intent = _intent_text(body or "")
    if not intent:
        print("pyfars work intake-intent: source intent has no body", file=sys.stderr)
        return 1

    source_slug = intent_path.stem
    title_base = intent_fm.get("title") or source_slug
    task_slug = _slugify(f"task-{source_slug}-{args.stage}", source_slug)
    title = f"{args.stage.title()} dispatch task: {title_base}"
    task_fm = _task_frontmatter(
        task_slug=task_slug,
        title=title,
        stage=args.stage,
        source_intent=source_slug,
        cited=_as_list(intent_fm.get("cited-slugs")),
        priority=args.priority,
        prefer=args.prefer,
    )
    task_body = (_executor_body(intent_path, intent_fm, intent)
                 if args.stage == "executor"
                 else _planner_body(intent_path, intent_fm, intent))
    target = (root / args.task_dir / f"{task_slug}.md").resolve()

    if args.dry_run:
        print(f"# DRY RUN — would write {target}")
        fm_text = yaml.safe_dump(task_fm, sort_keys=False,
                                 default_flow_style=False, allow_unicode=True)
        print(f"---\n{fm_text}---\n\n{task_body}")
        return 0

    _write_task(target, task_fm, task_body)
    if not args.no_claim:
        _claim_intent(intent_path, task_slug, args.claim_by)

    write_spoke_event("plan", task_slug, {
        "at": now_iso(),
        "kind": "intent-task-emission",
        "work-item": task_slug,
        "source-intent": source_slug,
        "pipeline-stage": args.stage,
        "increments": [
            {"e": f"task:{task_slug}", "p": "is-a", "o": "task-cell-system", "v": "t"},
            {"e": f"task:{task_slug}", "p": "source-intent", "o": source_slug, "v": "t"},
            {"e": f"task:{task_slug}", "p": "pipeline-stage", "o": args.stage, "v": "t"},
        ],
    })

    print(f"pyfars work intake-intent: wrote {target}")
    print(f"  slug: {task_slug}")

    if args.dispatch:
        ad_argv = [task_slug, "--root", str(root)]
        if args.prefer:
            ad_argv += ["--prefer", args.prefer]
        return ad_mod.run(ad_argv)
    return 0
