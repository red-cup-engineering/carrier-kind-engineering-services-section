"""Structured session state with explicit save/resume.

Implements the FARS session-and-memory analysis: "session context is
structured predicates, loaded at start, enriched during session,
consolidated between sessions." Memory is *structured* (named
sections), not free-form prose — Cline's Memory Bank shape
(``product_context``, ``active_context``, ``progress``,
``decision_log``, ``system_patterns``) plus a mutable ``custom`` open
section for per-office extension.

Three memory tiers identified by the analysis already exist elsewhere
in the runtime:
  1. always-loaded — the office/agent fiber loaded at investiture.
  2. searchable — the ``EventLog`` (events.jsonl) keyed by
     channel/origin/operator.
  3. deep-storage — the knowledge graph on disk.

This module fills the missing piece: an explicit, structured
**Session** entity with save/resume so a session's working state
survives disconnection (Bussard's "ship config persists on
filesystem"; ECC's "session save/resume preserves editorial
judgments"; OpenClaw's mutable identity that consolidates between
runs).

Wiring an ``EventLog`` is optional — when set, ``Session.start`` and
``Session.save`` emit witnesses on ``channel="session"``,
``origin=f"session:{id}"`` so the session lifecycle is itself
auditable from the same fiber as everything else.

Consolidation (the OpenClaw "dreaming" pattern,
``respond(observations, observations) → instincts``) is intentionally
out of scope here; this is the storage primitive on which a
consolidator can later operate.
"""
from __future__ import annotations

import json
import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Conservative slug: ASCII alnum, dash, underscore, dot allowed but no
# leading dot and no consecutive dots (rules out '.', '..', '.hidden'
# style traversal). The id flows directly into a filename and into the
# witness ``origin`` field, so this is the choke point.
_VALID_ID = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$")


def _validate_id(value: str) -> str:
    if not isinstance(value, str) or not _VALID_ID.fullmatch(value) \
            or ".." in value:
        raise ValueError(
            f"invalid session id {value!r}: must be a slug "
            "([A-Za-z0-9_.-], no leading dot, no '..', ≤128 chars)"
        )
    return value

from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog

# The five named Memory-Bank sections. Order is the canonical
# read-order at session start; do not reorder casually.
MEMORY_BANK_SECTIONS: tuple[str, ...] = (
    "product_context",
    "active_context",
    "progress",
    "decision_log",
    "system_patterns",
)


@dataclass
class Session:
    """A resumable, structured session.

    Fields:
      id: stable session identifier (slug). Used in the witness
        ``origin`` and in the on-disk filename.
      office: the office slug this session is bound to (Bussard's
        "ship sandbox" — what investiture loaded). ``None`` means
        unassigned.
      sections: the named Memory-Bank sections. Five canonical keys
        plus an optional ``custom`` dict for per-office extension.
      started_at: ISO-8601 UTC timestamp set when the session was
        first started.
      saved_at: ISO-8601 UTC timestamp of the most recent save, or
        ``None`` if never saved.
      event_log: optional event log. When set, ``start`` and ``save``
        emit witnesses on ``channel="session"``.
      agent: optional agent name attribution for emitted witnesses.

    The Memory-Bank sections are *named*, not free-form: a consumer
    asking ``session.sections["active_context"]`` always knows where
    that lives. The ``custom`` open dict is the explicit escape hatch
    for office-specific predicates the bank shape doesn't cover.
    """
    id: str
    office: str | None = None
    sections: dict[str, Any] = field(default_factory=dict)
    started_at: str | None = None
    saved_at: str | None = None
    event_log: EventLog | None = None
    agent: str | None = None

    def __post_init__(self) -> None:
        _validate_id(self.id)
        if "custom" in self.sections and not isinstance(
                self.sections["custom"], Mapping):
            raise TypeError(
                "session 'custom' section must be a mapping "
                f"(got {type(self.sections['custom']).__name__})"
            )
        for key in MEMORY_BANK_SECTIONS:
            self.sections.setdefault(key, "")
        self.sections.setdefault("custom", {})

    # -- lifecycle -------------------------------------------------

    def start(self) -> None:
        """Mark the session started and emit a session-start witness.

        Idempotent on ``started_at``: a re-start preserves the
        original start timestamp (resuming an existing session is not
        the same as starting a new one). The witness is still emitted
        so resume is observable in the audit trail.
        """
        if self.started_at is None:
            self.started_at = _now_iso()
        self._emit_lifecycle("start")

    def save(self, path: Path | None = None) -> Path:
        """Serialize the session to JSON on disk.

        Default path is ``<event_log.root>/.fars/sessions/<id>.json``
        when an event log is wired; otherwise an explicit ``path`` is
        required. Returns the actual path written for callers that
        want to record it.
        """
        target = self._resolve_path(path)
        self.saved_at = _now_iso()
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(self._to_dict(), indent=2,
                                     sort_keys=True),
                          encoding="utf-8")
        self._emit_lifecycle("save")
        return target

    @classmethod
    def load(cls, path: Path, *, event_log: EventLog | None = None,
             agent: str | None = None,
             strict: bool = True) -> "Session":
        """Read a session from disk, restoring all named sections.

        ``event_log`` and ``agent`` are not persisted (they are
        runtime wiring, not session state) — pass them in here so the
        loaded session can emit lifecycle witnesses on subsequent
        save/start.

        With ``strict=True`` (default) the loader validates the
        on-disk shape: ``id`` is required and must be a valid slug,
        ``sections`` must be a mapping, ``custom`` (if present) must
        be a mapping, and any unknown top-level section key raises.
        Use ``strict=False`` to tolerate partial loads during
        migration — but a warning will surface in the resulting
        session by leaving unknown keys quarantined under
        ``sections['custom']['_unknown']`` rather than silently
        promoting them to first-class state.
        """
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(raw, Mapping):
            raise ValueError(f"session file {path} is not a JSON object")
        if "id" not in raw:
            raise ValueError(f"session file {path} missing required 'id'")
        sections_in = raw.get("sections", {})
        if not isinstance(sections_in, Mapping):
            raise ValueError(
                f"session file {path}: 'sections' must be an object"
            )
        if "custom" in sections_in and not isinstance(
                sections_in["custom"], Mapping):
            raise ValueError(
                f"session file {path}: 'sections.custom' must be an "
                f"object (got {type(sections_in['custom']).__name__})"
            )
        allowed = set(MEMORY_BANK_SECTIONS) | {"custom"}
        unknown = {k: v for k, v in sections_in.items()
                   if k not in allowed}
        clean = {k: v for k, v in sections_in.items() if k in allowed}
        if unknown:
            if strict:
                raise ValueError(
                    f"session file {path}: unknown top-level section "
                    f"keys {sorted(unknown)} (allowed: "
                    f"{sorted(allowed)}); use strict=False to "
                    "quarantine them under custom._unknown"
                )
            quarantine = dict(clean.get("custom", {}) or {})
            quarantine.setdefault("_unknown", {}).update(unknown)
            clean["custom"] = quarantine
        return cls(
            id=raw["id"],
            office=raw.get("office"),
            sections=clean,
            started_at=raw.get("started_at"),
            saved_at=raw.get("saved_at"),
            event_log=event_log,
            agent=agent,
        )

    # -- structured-section access ---------------------------------

    def update_section(self, name: str, value: Any) -> None:
        """Replace one named section's value.

        ``name`` must be one of ``MEMORY_BANK_SECTIONS`` or
        ``"custom"``; the analysis is explicit that memory is
        structured, not free-form, so introducing a new top-level
        key would defeat the point. Use ``set_custom`` to extend
        within ``custom``.
        """
        if name not in MEMORY_BANK_SECTIONS and name != "custom":
            raise KeyError(
                f"unknown memory-bank section: {name!r}. "
                f"Valid: {MEMORY_BANK_SECTIONS + ('custom',)}"
            )
        self.sections[name] = value

    def set_custom(self, key: str, value: Any) -> None:
        """Set one entry in the ``custom`` open dict."""
        custom = self.sections.setdefault("custom", {})
        if not isinstance(custom, Mapping):
            raise TypeError("session 'custom' section is not a dict; "
                            "load corrupted state?")
        custom[key] = value

    # -- internals -------------------------------------------------

    def _to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "office": self.office,
            "sections": self.sections,
            "started_at": self.started_at,
            "saved_at": self.saved_at,
        }

    def _resolve_path(self, path: Path | None) -> Path:
        if path is not None:
            return Path(path)
        if self.event_log is None:
            raise ValueError(
                "save() needs an explicit path when no event_log is "
                "wired (no default sessions/ directory to fall back on)"
            )
        return self.event_log.root / ".fars" / "sessions" / f"{self.id}.json"

    def _emit_lifecycle(self, phase: str) -> None:
        if self.event_log is None:
            return
        self.event_log.append(make_witness(
            operator="session",
            target=self.id,
            before_hash=None,
            after_hash=None,
            details={
                "phase": phase,
                "office": self.office,
                "sections_present": sorted(
                    k for k, v in self.sections.items() if v
                ),
            },
            agent=self.agent,
            channel="session",
            origin=f"session:{self.id}",
            truth=1.0,
            evidence=1.0,
        ))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
