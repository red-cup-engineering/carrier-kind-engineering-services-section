"""``pyfars intents <action>`` — drain the dispatch-intent queue.

Inbox-side counterpart to :mod:`pyfars.cli.queue_intent`. Lists, claims,
resolves, and rejects ``kind: dispatch-intent`` entities — the records
external principals queue via the OAuth-gated MCP endpoint.

Actions:
  list                   — list intents, optionally filtered by status
  show <slug>            — print one intent (frontmatter + body)
  claim <slug>           — mark status=claimed, set claimed-by/at
  resolve <slug> ...     — mark status=resolved, resolved-as=done
  reject <slug> ...      — mark status=resolved, resolved-as=rejected

Each state transition emits a witness on the dispatch channel so the
event log carries the full lifecycle of every queued intent.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.operator.edit.fm_set import set_field
from pyfars.operator.edit.rewrite_fm import apply as apply_fm
from pyfars.operator.witness import Witness, hash_content
from pyfars.runtime.event_log import EventLog
from pyfars.spec import Parameter, VerbSpec, make_argparse
from pyfars.substrate.parse.frontmatter import parse as parse_fm


SPEC = VerbSpec(
    name="intents",
    description="List, claim, resolve, or reject queued dispatch-intent entries.",
    example="pyfars intents list --status pending",
    notes=(
        "Operates on kind: dispatch-intent entities (created by `pyfars "
        "queue-intent`). Each transition writes a witness on the "
        "dispatch channel."
    ),
    output=(
        "list: one line per intent. show: full frontmatter + body. "
        "claim/resolve/reject: writes the file, prints the path."
    ),
    parameters=(
        Parameter(name="action", kind="positional", required=True,
                  description="list | show | claim | resolve | reject"),
        Parameter(name="slug", kind="positional", required=False, default=None,
                  description="intent slug (required for show/claim/resolve/reject)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="status", kind="flag", default=None,
                  description="list filter: pending | claimed | resolved"),
        Parameter(name="by", kind="flag", default=None,
                  description="claim: claimant identifier (agent or operator)"),
        Parameter(name="result_ref", kind="flag", default=None,
                  description="resolve: slug or path of the resolution artifact"),
        Parameter(name="note", kind="flag", default=None,
                  description="resolve/reject: short free-text note"),
        Parameter(name="reason", kind="flag", default=None,
                  description="reject: rejection reason (required for reject)"),
        Parameter(name="queue", kind="flag", default=None,
                  description=("queue directory under root (default: "
                               "operations/engineering/triage/dispatch-intents)")),
        Parameter(name="agent", kind="flag", default=None,
                  description="agent name to record on the witness"),
    ),
)


_VALID_ACTIONS = ("list", "show", "claim", "resolve", "reject")

DEFAULT_QUEUE = "operations/engineering/triage/dispatch-intents"


def _queue_dir(root: Path, queue: str | None) -> Path:
    return (root / (queue or DEFAULT_QUEUE)).resolve()


def _walk_intents(queue_dir: Path) -> list[tuple[Path, dict]]:
    """Read each .md in the queue dir; return [(path, fm)].

    The default Substrate loader skips ``triage/`` paths by design, so the
    inbox walks the directory itself rather than going through the graph
    index. Frontmatter is parsed per-file with the same parser the rest of
    pyfars uses.
    """
    if not queue_dir.is_dir():
        return []
    rows: list[tuple[Path, dict]] = []
    for path in sorted(queue_dir.glob("*.md")):
        if path.name.startswith("_"):
            continue
        try:
            fm, _ = parse_fm(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not fm or fm.get("kind") != "dispatch-intent":
            continue
        rows.append((path, fm))
    return rows


def _resolve_one(queue_dir: Path, slug: str) -> Path | None:
    if "/" in slug or slug.endswith(".md"):
        candidate = Path(slug)
        if not candidate.is_absolute():
            candidate = (queue_dir.parent.parent.parent.parent / slug).resolve()
        if candidate.is_file():
            return candidate
    direct = (queue_dir / f"{slug}.md").resolve()
    if direct.is_file():
        return direct
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _emit_witness(*, root: Path, target: Path, operator: str,
                  before_hash: str | None, after_hash: str,
                  details: dict, agent: str | None) -> None:
    try:
        from pyfars.operator.kind import classify
        log = EventLog(root=root)
        log.append(Witness(
            operator=operator,
            target=str(target.relative_to(root)),
            before_hash=before_hash,
            after_hash=after_hash,
            details={k: str(v) for k, v in details.items()},
            timestamp=_now_iso(),
            agent=agent,
            kind=classify(operator),
        ))
    except Exception as e:
        print(f"pyfars intents: warning — witness append failed: {e}",
              file=sys.stderr)


def _do_list(queue_dir: Path, status_filter: str | None) -> int:
    rows = []
    for path, fm in _walk_intents(queue_dir):
        st = fm.get("status") or "?"
        if status_filter and st != status_filter:
            continue
        title = fm.get("title") or "(untitled)"
        rby = fm.get("requested-by") or "—"
        rat = fm.get("received-at") or "—"
        rows.append((rat, path.stem, st, rby, title))
    rows.sort(key=lambda r: r[0])
    if not rows:
        print("# no dispatch-intents matched")
        return 0
    print(f"{'received-at':<27}  {'slug':<35}  {'status':<10}  {'from':<24}  title")
    print(f"{'-' * 27}  {'-' * 35}  {'-' * 10}  {'-' * 24}  {'-' * 30}")
    for rat, slug, st, rby, title in rows:
        title_short = title if len(title) <= 60 else title[:57] + "..."
        print(f"{rat:<27}  {slug:<35}  {st:<10}  {rby:<24}  {title_short}")
    return 0


def _do_show(file_path: Path) -> int:
    sys.stdout.write(file_path.read_text(encoding="utf-8"))
    return 0


def _mutate(file_path: Path, root: Path, mutations: dict, *,
            operator: str, agent: str | None,
            extra_details: dict | None = None) -> int:
    text_before = file_path.read_text(encoding="utf-8")
    before_hash = hash_content(text_before)
    fm, _ = parse_fm(text_before)
    fm = dict(fm or {})
    for k, v in mutations.items():
        fm = set_field(fm, k, v)
    apply_fm(file_path, fm)
    after_hash = hash_content(file_path.read_text(encoding="utf-8"))
    details = dict(mutations)
    if extra_details:
        details.update(extra_details)
    _emit_witness(
        root=root, target=file_path, operator=operator,
        before_hash=before_hash, after_hash=after_hash,
        details=details, agent=agent,
    )
    print(str(file_path))
    return 0


def _do_claim(file_path: Path, root: Path, *, by: str | None,
              agent: str | None) -> int:
    if not by:
        print("pyfars intents claim: --by <claimant> is required", file=sys.stderr)
        return 64
    return _mutate(file_path, root, {
        "status": "claimed",
        "claimed-by": by,
        "claimed-at": _now_iso(),
    }, operator="claim_intent", agent=agent)


def _do_resolve(file_path: Path, root: Path, *, result_ref: str | None,
                note: str | None, agent: str | None) -> int:
    if not result_ref:
        print("pyfars intents resolve: --result-ref is required", file=sys.stderr)
        return 64
    mutations = {
        "status": "resolved",
        "resolved-as": "done",
        "resolved-at": _now_iso(),
        "result-ref": result_ref,
    }
    return _mutate(file_path, root, mutations,
                   operator="resolve_intent", agent=agent,
                   extra_details={"note": note or ""})


def _do_reject(file_path: Path, root: Path, *, reason: str | None,
               agent: str | None) -> int:
    if not reason:
        print("pyfars intents reject: --reason is required", file=sys.stderr)
        return 64
    mutations = {
        "status": "resolved",
        "resolved-as": "rejected",
        "resolved-at": _now_iso(),
        "result-ref": f"rejected: {reason}",
    }
    return _mutate(file_path, root, mutations,
                   operator="reject_intent", agent=agent)


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    if args.action not in _VALID_ACTIONS:
        print(f"pyfars intents: unknown action {args.action!r}; "
              f"expected one of {', '.join(_VALID_ACTIONS)}", file=sys.stderr)
        return 64

    rooted = as_directory(args.root, "pyfars intents")
    if rooted is None:
        return 2
    queue_dir = _queue_dir(rooted, args.queue)

    if args.action == "list":
        return _do_list(queue_dir, args.status)

    if not args.slug:
        print(f"pyfars intents {args.action}: <slug> is required", file=sys.stderr)
        return 64

    file_path = _resolve_one(queue_dir, args.slug)
    if file_path is None:
        print(f"pyfars intents: no dispatch-intent matched {args.slug!r} "
              f"under {queue_dir}", file=sys.stderr)
        return 1

    if args.action == "show":
        return _do_show(file_path)
    if args.action == "claim":
        return _do_claim(file_path, rooted, by=args.by, agent=args.agent)
    if args.action == "resolve":
        return _do_resolve(file_path, rooted, result_ref=args.result_ref,
                           note=args.note, agent=args.agent)
    if args.action == "reject":
        return _do_reject(file_path, rooted, reason=args.reason,
                          agent=args.agent)
    return 64


if __name__ == "__main__":
    sys.exit(main())
