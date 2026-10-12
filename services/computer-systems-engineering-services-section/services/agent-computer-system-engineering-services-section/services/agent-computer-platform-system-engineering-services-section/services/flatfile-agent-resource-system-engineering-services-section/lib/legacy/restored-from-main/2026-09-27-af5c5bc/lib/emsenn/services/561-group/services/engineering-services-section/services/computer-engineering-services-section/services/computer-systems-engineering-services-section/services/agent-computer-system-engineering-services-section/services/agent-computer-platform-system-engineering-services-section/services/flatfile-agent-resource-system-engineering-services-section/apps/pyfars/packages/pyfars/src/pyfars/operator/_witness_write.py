"""The append-only write-path guard, shared by every Tier A edit wrapper
in ``insertion.py``/``relocation.py``/``retraction.py`` (design spec
S3.1, S5): the witness is minted and appended *before* the target file
is touched, so a rejected gate or a failed append leaves it byte-
identical — nothing is written until the append has already succeeded.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

from pyfars.kernel.event_log import EventLog
from pyfars.kernel.witness import Witness, record_witness

__all__ = ["witnessed_delete", "witnessed_write"]


def witnessed_write(
    path: Path,
    new_text: str,
    *,
    operator: str,
    event_log: EventLog,
    agent: str | None,
    timestamp: str,
    channel: str,
    details: Mapping[str, Any],
    prior_witnesses: Sequence[Witness] = (),
) -> Witness:
    old_text = path.read_text(encoding="utf-8") if path.exists() else None
    kwargs: dict[str, Any] = dict(
        event_log=event_log,
        operator=operator,
        target=str(path),
        after=new_text,
        four_after=(True, False),
        details=details,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
        prior_witnesses=prior_witnesses,
    )
    if old_text is not None:
        kwargs["before"] = old_text
    witness = record_witness(**kwargs)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(new_text, encoding="utf-8")
    return witness


def witnessed_delete(
    path: Path,
    *,
    operator: str,
    event_log: EventLog,
    agent: str | None,
    timestamp: str,
    channel: str,
    details: Mapping[str, Any],
) -> Witness:
    old_text = path.read_text(encoding="utf-8")
    witness = record_witness(
        event_log=event_log,
        operator=operator,
        target=str(path),
        before=old_text,
        after=None,
        four_after=(True, False),
        details=details,
        agent=agent,
        timestamp=timestamp,
        channel=channel,
    )
    path.unlink()
    return witness
