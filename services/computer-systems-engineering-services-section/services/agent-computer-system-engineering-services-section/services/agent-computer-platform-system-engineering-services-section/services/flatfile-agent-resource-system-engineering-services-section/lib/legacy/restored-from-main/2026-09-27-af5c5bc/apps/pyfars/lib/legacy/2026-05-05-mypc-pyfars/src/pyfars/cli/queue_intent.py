"""``pyfars queue-intent`` — record a parsed intent from an external principal.

Sibling to :mod:`pyfars.cli.receive` but for a different shape of inbound:
``receive`` records human-authored messages awaiting human triage;
``queue-intent`` records *already-parsed* intent dispatched by an external
agent (e.g. a free-tier web LLM acting as a parser front-end), awaiting
pickup by an in-substrate operator (typically the captain's Claude Code
session).

The intent lands as a single ``kind: dispatch-intent`` entity under
``operations/engineering/triage/dispatch-intents/``. ``pyfars intents`` is
the inbox-side verb that lists, claims, and resolves these.

Identity: ``--from`` carries the OAuth subject identifier (e.g.
``google:117...``); ``--principal`` optionally names a substrate
``external-principal`` entity that the auth layer has already mapped the
subject to. The MCP transport's auth middleware fills these in; called
from the CLI directly, both are free-form.
"""
from __future__ import annotations

import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

from pyfars.cli._runner import as_directory
from pyfars.operator.witness import Witness, hash_content
from pyfars.runtime.event_log import EventLog
from pyfars.spec import Parameter, VerbSpec, make_argparse


SPEC = VerbSpec(
    name="queue-intent",
    description="Record a parsed intent from an external principal in the dispatch queue.",
    example=(
        'pyfars queue-intent --from "google:117xxx" '
        '--intent "Add a theorem stating closure-2-monad is lax-idempotent."'
    ),
    notes=(
        "If --intent is omitted, reads the intent body from stdin. "
        "Writes a dispatch-intent entity under "
        "operations/engineering/triage/dispatch-intents/ and emits a "
        "queue_intent witness. Prints the new path on stdout."
    ),
    output=(
        "Path of the new dispatch-intent record on stdout. "
        "Witness appended to .fars/event-log/."
    ),
    parameters=(
        Parameter(name="from_", kind="flag", default=None,
                  description=("requesting principal — typically an OAuth "
                               "subject identifier like 'google:117xxx'")),
        Parameter(name="intent", kind="flag", default=None,
                  description="parsed intent text (else: read from stdin)"),
        Parameter(name="title", kind="flag", default=None,
                  description="optional one-line title (default: derived from intent)"),
        Parameter(name="principal", kind="flag", default=None,
                  description=("substrate slug of the external-principal entity "
                               "the auth layer mapped --from to (optional)")),
        Parameter(name="cite", kind="flag", default=None,
                  description=("comma-separated slugs the intent cites as "
                               "context (optional)")),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="queue", kind="flag", default=None,
                  description=("queue directory under root (default: "
                               "operations/engineering/triage/dispatch-intents)")),
        Parameter(name="agent", kind="flag", default=None,
                  description="agent name to record on the witness"),
        Parameter(name="dry_run", kind="store_true",
                  description="show what would be written; do not write"),
    ),
)


DEFAULT_QUEUE = "operations/engineering/triage/dispatch-intents"


def _slug_for(received_at: datetime, content_hash: str) -> str:
    """Stable, sortable slug: ``intent-<YYYYMMDDHHMMSS>-<6-char-hash>``."""
    return f"intent-{received_at.strftime('%Y%m%d%H%M%S')}-{content_hash[:6]}"


def _read_intent(intent_arg: str | None) -> str:
    if intent_arg is not None and intent_arg != "":
        return intent_arg
    if sys.stdin.isatty():
        print("pyfars queue-intent: pass --intent or pipe text on stdin",
              file=sys.stderr)
        return ""
    return sys.stdin.read()


def _derive_title(intent: str) -> str:
    first = intent.strip().splitlines()[0] if intent.strip() else ""
    if len(first) > 80:
        first = first[:77].rstrip() + "..."
    return first or "Untitled intent"


def _parse_cites(cite_arg: str | None) -> list[str]:
    if not cite_arg:
        return []
    return [s.strip() for s in cite_arg.split(",") if s.strip()]


def _render(*, title: str, requested_by: str | None, principal: str | None,
            received_at: datetime, content_hash: str, cited_slugs: list[str],
            intent: str) -> str:
    quoted_title = title.replace('"', "'")
    fm_lines = [
        "---",
        f'title: "{quoted_title}"',
        "kind: dispatch-intent",
        "status: pending",
        f'received-at: "{received_at.isoformat()}"',
        f'requested-by: "{requested_by}"' if requested_by else 'requested-by: null',
        f'principal: "{principal}"' if principal else 'principal: null',
        f'content-hash: "sha256:{content_hash[:16]}"',
    ]
    if cited_slugs:
        fm_lines.append("cited-slugs:")
        for s in cited_slugs:
            fm_lines.append(f'  - "{s}"')
    else:
        fm_lines.append("cited-slugs: []")
    fm_lines.extend([
        "claimed-by: null",
        "claimed-at: null",
        "resolved-as: null",
        "resolved-at: null",
        "result-ref: null",
        "---",
    ])
    body_lines = [
        "",
        f"# {title}",
        "",
        ("Received `" + received_at.isoformat() + "`"
         + (f" from `{requested_by}`" if requested_by else "")
         + "."),
        "",
        "## Intent",
        "",
        intent.rstrip(),
        "",
    ]
    if cited_slugs:
        body_lines.extend(["## Citations", ""])
        body_lines.extend(f"- `{s}`" for s in cited_slugs)
        body_lines.append("")
    body_lines.extend([
        "## Status",
        "",
        "**pending** — awaiting claim by an in-substrate operator.",
        "",
    ])
    return "\n".join(fm_lines) + "\n".join(body_lines)


def run(*, from_: str | None = None, intent: str | None = None,
        title: str | None = None, principal: str | None = None,
        cite: str | None = None, root: Path = Path("."),
        queue: str | None = None, agent: str | None = None,
        dry_run: bool = False) -> int:
    root_dir = as_directory(root, "pyfars queue-intent")
    if root_dir is None:
        return 2

    body = _read_intent(intent)
    if not body.strip():
        print("pyfars queue-intent: empty intent; nothing to record",
              file=sys.stderr)
        return 1

    received_at = datetime.now(timezone.utc).replace(microsecond=0)
    content_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
    slug = _slug_for(received_at, content_hash)
    resolved_title = title or _derive_title(body)
    cited_slugs = _parse_cites(cite)

    queue_rel = queue or DEFAULT_QUEUE
    target = (root_dir / queue_rel / f"{slug}.md").resolve()

    rendered = _render(
        title=resolved_title, requested_by=from_, principal=principal,
        received_at=received_at, content_hash=content_hash,
        cited_slugs=cited_slugs, intent=body,
    )

    if dry_run:
        print(f"# DRY RUN — would write {target}")
        print(rendered)
        return 0

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered, encoding="utf-8")
    after_hash = hash_content(rendered)
    print(str(target))

    try:
        from pyfars.operator.kind import classify
        log = EventLog(root=root_dir)
        log.append(Witness(
            operator="queue_intent",
            target=str(target.relative_to(root_dir)),
            before_hash=None,
            after_hash=after_hash,
            details={
                "from": from_ or "",
                "principal": principal or "",
                "title": resolved_title,
                "content_hash": f"sha256:{content_hash[:16]}",
                "byte_length": len(body.encode("utf-8")),
                "cited_count": str(len(cited_slugs)),
            },
            timestamp=received_at.isoformat(),
            agent=agent,
            kind=classify("queue_intent"),
        ))
    except Exception as e:
        print(f"pyfars queue-intent: warning — witness append failed: {e}",
              file=sys.stderr)

    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(
        from_=args.from_, intent=args.intent, title=args.title,
        principal=args.principal, cite=args.cite, root=args.root,
        queue=args.queue, agent=args.agent, dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
