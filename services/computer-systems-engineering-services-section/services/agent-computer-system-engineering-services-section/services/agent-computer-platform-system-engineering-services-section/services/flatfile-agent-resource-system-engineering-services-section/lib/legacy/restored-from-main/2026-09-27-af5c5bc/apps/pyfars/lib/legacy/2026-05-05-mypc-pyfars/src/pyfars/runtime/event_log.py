"""Append-only event log of operator witnesses.

The event log is the audit primitive of a running FARS instance. Every
mutation by an ``pyfars.operator.*`` operator emits a ``Witness`` (see
``pyfars.operator.witness``); the ``EventLog`` writes those witnesses to
a JSONL file under ``<root>/.fars/event-log/``. An auditor replaying
the log reconstructs the substrate's state evolution.

The on-disk format is one ``Witness`` per line, JSON-encoded. Files are
named ``<YYYY-MM-DD>.jsonl`` so a day's events live in one file and
older files can be archived without affecting the current write.

This module is intentionally minimal:
  - ``EventLog.append(w)`` writes one witness.
  - ``EventLog.read_all()`` iterates the entire log (across all daily
    files, in timestamp order if filenames sort correctly).
  - ``EventLog.tail(n)`` returns the last n witnesses.

No locking; the JSONL append-line semantics are atomic enough on POSIX
for single-writer use. Multi-writer setups would need a more careful
implementation.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Iterator

from pyfars.operator.witness import Witness


def _normalize_filter(
    want: str | Iterable[str] | None,
) -> frozenset[str] | None:
    """Collapse a filter spec to a frozenset, or ``None`` for "any".

    Done once per API call so that one-shot iterables (generators)
    are not silently consumed on the first witness — the bug the
    naive per-witness ``set(want)`` would have. Mirrors the
    "normalize at the boundary" shape of
    ``pyfars.runtime.ledger.filter_postings``.
    """
    if want is None:
        return None
    if isinstance(want, str):
        return frozenset((want,))
    return frozenset(want)


def _matches(
    w: Witness,
    *,
    channel: frozenset[str] | None,
    origin: frozenset[str] | None,
    operator: frozenset[str] | None,
    kind: frozenset[str] | None,
) -> bool:
    """Exact-match routing predicate; ``None`` means don't filter."""
    if channel is not None and w.channel not in channel:
        return False
    if origin is not None and w.origin not in origin:
        return False
    if operator is not None and w.operator not in operator:
        return False
    if kind is not None and w.kind not in kind:
        return False
    return True


@dataclass
class EventLog:
    """Append-only JSONL event log under ``root``.

    The log lives at ``<root>/.fars/event-log/<YYYY-MM-DD>.jsonl``,
    one file per UTC day. ``root`` is the FARS instance root, typically
    the repo root.
    """
    root: Path

    @property
    def log_dir(self) -> Path:
        return self.root / ".fars" / "event-log"

    def _today_path(self) -> Path:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.log_dir / f"{date}.jsonl"

    def append(self, witness: Witness) -> None:
        """Append a witness to today's log file."""
        path = self._today_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as f:
            f.write(witness.to_json())
            f.write("\n")

    def read_all(
        self,
        *,
        channel: str | Iterable[str] | None = None,
        origin: str | Iterable[str] | None = None,
        operator: str | Iterable[str] | None = None,
        kind: str | Iterable[str] | None = None,
    ) -> Iterator[Witness]:
        """Iterate witnesses in chronological order (filename sort).

        Daily files sort lexicographically and their internal order is
        append-order, so the concatenation is chronological for any
        single-writer log.

        Optional ``channel`` / ``origin`` / ``operator`` / ``kind``
        filters give the bussard-derived "named conduit" view of the
        log without making consumers re-implement the predicate
        match. Each may be a single string or an iterable of strings;
        ``None`` means "do not filter on this dimension." ``kind``
        filters by AOP operation-kind tag (Round 14) — pass e.g.
        ``"learning"`` to read only diagnoses + lessons + future
        learning operators in one query, regardless of operator name.
        """
        ch = _normalize_filter(channel)
        org = _normalize_filter(origin)
        op = _normalize_filter(operator)
        kd = _normalize_filter(kind)
        if not self.log_dir.exists():
            return
        for path in sorted(self.log_dir.glob("*.jsonl")):
            with path.open("r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    w = Witness.from_dict(json.loads(line))
                    if _matches(w, channel=ch, origin=org, operator=op, kind=kd):
                        yield w

    def tail(
        self,
        n: int,
        *,
        channel: str | Iterable[str] | None = None,
        origin: str | Iterable[str] | None = None,
        operator: str | Iterable[str] | None = None,
        kind: str | Iterable[str] | None = None,
    ) -> list[Witness]:
        """Return the last n witnesses in chronological order.

        Reads the entire log; for very long logs this is wasteful but
        adequate for the early bootstrap. Optimize later if it bites.

        Filters apply *before* the tail slice so ``tail(5, channel="x")``
        returns the last five witnesses on channel ``x``, not the
        channel-``x`` witnesses among the last five overall.
        """
        all_witnesses = list(self.read_all(
            channel=channel, origin=origin, operator=operator, kind=kind,
        ))
        return all_witnesses[-n:] if n > 0 else []

    def count(
        self,
        *,
        channel: str | Iterable[str] | None = None,
        origin: str | Iterable[str] | None = None,
        operator: str | Iterable[str] | None = None,
        kind: str | Iterable[str] | None = None,
    ) -> int:
        """Number of witnesses in the log, optionally filtered."""
        return sum(1 for _ in self.read_all(
            channel=channel, origin=origin, operator=operator, kind=kind,
        ))

    def kinds(self) -> dict[str, int]:
        """Operation-kind histogram across the log.

        Returns a dict mapping each AOP operation-kind tag present in
        the log to its witness count, in the canonical kind ordering
        (observation, guard, accounting, query, mutation, analysis,
        learning). Kinds with zero witnesses are omitted. The
        substrate-level "what shape of work has the platform been
        doing?" summary, parameterizing audit/cost reports by kind
        per *operation-kinds-completeness*.
        """
        from pyfars.operator.kind import OPERATION_KINDS
        counts: dict[str, int] = {}
        for w in self.read_all():
            counts[w.kind] = counts.get(w.kind, 0) + 1
        # Re-key in canonical order so the result is order-stable.
        return {k: counts[k] for k in OPERATION_KINDS if k in counts}

    def channels(self) -> list[str]:
        """Distinct non-null channel values present in the log, sorted.

        The "named conduit" inventory: lists every channel that has
        ever carried a witness in this log. Per the FARS messaging-
        and-events synthesis, knowing which channels exist is the
        first move when you want to read from one.
        """
        return sorted({w.channel for w in self.read_all() if w.channel})
