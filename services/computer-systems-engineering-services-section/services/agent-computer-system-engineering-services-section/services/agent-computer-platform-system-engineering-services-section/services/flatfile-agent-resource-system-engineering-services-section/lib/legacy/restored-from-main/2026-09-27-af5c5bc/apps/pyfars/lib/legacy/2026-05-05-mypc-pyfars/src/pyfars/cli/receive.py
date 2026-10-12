"""``pyfars receive`` — record an inbound message as a substrate artifact.

Closes ``[GAP-1]`` from
``operations/engineering/tools/predication-computer/pypredcomp/docs/dev/decisions/agentic-coordination-gap-analysis.md``:
inbound communication needs to land in the corpus *as a record* before
anything else can route, triage, or respond to it. ``pyfars receive``
writes a single ``type: message`` note under
``operations/command/group/inbox/`` and emits a witness so the action
appears in the event log.

It is deliberately *just* the record — no automatic classification, no
auto-routing. A separate ``triage-message`` skill (next pass) reads the
inbox and decides what work-items to open. Keeping these two
operations separate preserves the substrate's discipline that
**recording** and **interpreting** are different witnessable acts.
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
    name="receive",
    description="Record an inbound message in the substrate inbox.",
    example=(
        'pyfars receive --from persona:emsenn '
        '--content "Please draft an outline of the bilattice section."'
    ),
    notes=(
        "If --content is omitted, reads the message body from stdin. "
        "Emits a `received_message` witness; the inbox lives at "
        "<group>/inbox/ by default. Prints the new path + a hint."
    ),
    output=(
        "Path of the new message record on stdout. "
        "Witness appended to .fars/event-log/."
    ),
    parameters=(
        Parameter(name="from_", kind="flag", default=None,
                  description=("sender slug — persona:<slug>, personnel:<slug>, "
                               "or a free string (e.g. an email address)")),
        Parameter(name="content", kind="flag", default=None,
                  description="message body text (else: read from stdin)"),
        Parameter(name="subject", kind="flag", default=None,
                  description="optional one-line subject (used in the H1)"),
        Parameter(name="root", kind="flag", type=Path, default=Path("."),
                  short="-r", description="corpus root (default: CWD)"),
        Parameter(name="inbox", kind="flag", default=None,
                  description=("inbox directory under root "
                               "(default: operations/command/group/inbox)")),
        Parameter(name="agent", kind="flag", default=None,
                  description=("agent name to record on the witness "
                               "(e.g. claude-code, ci, etc.)")),
        Parameter(name="dry_run", kind="store_true",
                  description="show what would be written; do not write"),
    ),
)


def _slug_for(received_at: datetime, content_hash: str) -> str:
    """Stable, sortable slug: ``msg-<YYYYMMDDHHMMSS>-<6-char-hash>``.

    The timestamp gives chronological order; the hash gives content
    identity (so an identical re-send within the same second is detectable).
    """
    return f"msg-{received_at.strftime('%Y%m%d%H%M%S')}-{content_hash[:6]}"


def _read_content(content_arg: str | None) -> str:
    if content_arg is not None and content_arg != "":
        return content_arg
    if sys.stdin.isatty():
        print("pyfars receive: pass --content or pipe the message on stdin",
              file=sys.stderr)
        return ""
    return sys.stdin.read()


def _render(slug: str, *, sender: str | None, subject: str | None,
            received_at: datetime, content: str, content_hash: str) -> str:
    fm_lines = [
        "---",
        "type: message",
        f'slug: "message:{slug}"',
        f'from: "{sender}"' if sender else 'from: null',
        f'received-at: "{received_at.isoformat()}"',
        f'content-hash: "sha256:{content_hash[:16]}"',
        "status: received",
        "triaged-as: null",
        "prompted-tasks: []",
    ]
    if subject:
        fm_lines.insert(4, f'subject: "{subject.replace(chr(34), chr(39))}"')
    fm_lines.append("---")
    h1 = subject or (
        f"Message from {sender}" if sender else "Anonymous message"
    )
    body_blocks = [
        f"\n# {h1}\n",
        ("Received `" + received_at.isoformat() + "`"
         + (f" from `{sender}`" if sender else "")
         + ".\n"),
        "## Body\n",
        content.rstrip() + "\n",
        "## Triage\n",
        "Status: **received**, awaiting triage.\n",
        "Run the `triage-message` skill (or open work-items by hand) "
        "and update `triaged-as:` + `prompted-tasks:` on this record "
        "when classification is complete.\n",
    ]
    return "\n".join(fm_lines) + "\n".join(body_blocks)


def run(*, from_: str | None = None, content: str | None = None,
        subject: str | None = None, root: Path = Path("."),
        inbox: str | None = None, agent: str | None = None,
        dry_run: bool = False) -> int:
    root_dir = as_directory(root, "pyfars receive")
    if root_dir is None:
        return 2

    body = _read_content(content)
    if not body.strip():
        print("pyfars receive: empty message body; nothing to record",
              file=sys.stderr)
        return 1

    received_at = datetime.now(timezone.utc).replace(microsecond=0)
    content_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
    slug = _slug_for(received_at, content_hash)

    inbox_rel = inbox or "operations/command/group/inbox"
    target = (root_dir / inbox_rel / f"{slug}.md").resolve()

    rendered = _render(slug, sender=from_, subject=subject,
                       received_at=received_at, content=body,
                       content_hash=content_hash)

    if dry_run:
        print(f"# DRY RUN — would write {target}")
        print(rendered)
        return 0

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(rendered, encoding="utf-8")
    after_hash = hash_content(rendered)

    # Witness — the act of receiving is itself an event. Direct Witness
    # construction (timestamp comes from the message's received_at, not
    # now_iso); kind passed explicitly so future classifier changes
    # propagate here automatically and we don't ride the field default.
    try:
        from pyfars.operator.kind import classify
        log = EventLog(root=root_dir)
        log.append(Witness(
            operator="receive_message",
            target=str(target.relative_to(root_dir)),
            before_hash=None,
            after_hash=after_hash,
            details={
                "from": from_ or "",
                "subject": subject or "",
                "content_hash": f"sha256:{content_hash[:16]}",
                "byte_length": len(body.encode("utf-8")),
            },
            timestamp=received_at.isoformat(),
            agent=agent,
            kind=classify("receive_message"),
        ))
    except Exception as e:  # event log is best-effort, never blocks recording
        print(f"pyfars receive: warning — witness append failed: {e}",
              file=sys.stderr)

    print(str(target))
    print(f"  slug:    message:{slug}", file=sys.stderr)
    print(f"  from:    {from_ or '(unspecified)'}", file=sys.stderr)
    print(f"  bytes:   {len(body.encode('utf-8'))}", file=sys.stderr)
    print(f"  next:    triage-message --message message:{slug}", file=sys.stderr)
    return 0


def main(argv: list[str] | None = None) -> int:
    args = make_argparse(SPEC).parse_args(argv)
    return run(
        from_=getattr(args, "from_", None) or getattr(args, "from", None),
        content=args.content, subject=args.subject,
        root=args.root, inbox=args.inbox, agent=args.agent,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
