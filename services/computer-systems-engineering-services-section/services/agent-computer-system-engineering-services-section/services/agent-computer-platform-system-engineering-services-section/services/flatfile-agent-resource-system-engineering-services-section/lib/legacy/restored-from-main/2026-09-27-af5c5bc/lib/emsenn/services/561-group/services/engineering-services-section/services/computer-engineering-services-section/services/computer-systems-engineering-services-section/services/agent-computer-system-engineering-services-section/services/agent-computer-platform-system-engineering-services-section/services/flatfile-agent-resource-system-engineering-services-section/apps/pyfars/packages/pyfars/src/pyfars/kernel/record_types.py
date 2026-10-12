"""Tier B: the closed, seven-member enumeration of kernel
institutional-fact records (design spec section 3). This module owns
six of them — Observation, CorrectionRecord, StatusEvent, Office,
OfficerInstallation, Session. ``Witness`` is the seventh and lives in
``kernel/witness.py``; it is referenced here only by id and type — a
foreign record trusted to have been validated where it was appended,
never re-validated by this module. Append-only, never mutated in place;
each type is content-identified the same way as any other record
(``kernel.identity.identity_of_record``).

Each type is a frozen dataclass with a ``to_record()`` wire form (a
plain, JSON-shaped mapping carrying a ``"type"`` discriminator, mirroring
``academy.mjs``'s record shape). ``validate_record``/``verify_records``
operate on that wire form and split the same way ``academy.mjs`` does:
independent per-record shape validation, then cross-validation of a
record's citations against the rest of the collection.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass, replace
from typing import Any

from pyfars.kernel.identity import identity_of_record, is_ni_uri

STATUS_TRANSITIONS: tuple[str, ...] = (
    "correction",
    "suspension",
    "revocation",
    "expiry",
    "reinstatement",
    "supersession",
)

MEMORY_BANK_SECTIONS: tuple[str, ...] = (
    "product_context",
    "active_context",
    "progress",
    "decision_log",
    "system_patterns",
)

TIER_B_RECORD_TYPES: tuple[str, ...] = (
    "Observation",
    "CorrectionRecord",
    "StatusEvent",
    "Office",
    "OfficerInstallation",
    "Session",
)

FOREIGN_TIER_B_TYPES: frozenset[str] = frozenset({"Witness"})


@dataclass(frozen=True)
class Observation:
    """Grounds a proposition in a named Accord, citing the Witness that
    evidences it."""

    id: str
    accord: str
    proposition: str
    witness_id: str
    agent: str | None

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "Observation",
            "id": self.id,
            "accord": self.accord,
            "proposition": self.proposition,
            "witness_id": self.witness_id,
            "agent": self.agent,
        }


def make_observation(
    *, accord: str, proposition: str, witness_id: str, agent: str | None
) -> Observation:
    provisional = Observation(
        id="",
        accord=accord,
        proposition=proposition,
        witness_id=witness_id,
        agent=agent,
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


@dataclass(frozen=True)
class CorrectionRecord:
    """Append-only supersession of a prior record. Never deletes the
    prior record — only marks it invalid-for-use by pointing at it.
    ``invalidates_prior_for_use`` is always ``True``."""

    id: str
    target: str
    replacement: str
    reason: str
    invalidates_prior_for_use: bool = True

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "CorrectionRecord",
            "id": self.id,
            "target": self.target,
            "replacement": self.replacement,
            "reason": self.reason,
            "invalidates_prior_for_use": self.invalidates_prior_for_use,
        }


def make_correction_record(
    *, target: str, replacement: str, reason: str
) -> CorrectionRecord:
    provisional = CorrectionRecord(
        id="", target=target, replacement=replacement, reason=reason
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


@dataclass(frozen=True)
class StatusEvent:
    """A typed lifecycle transition against a target record.
    ``conveys_authority`` is always ``False`` — a status change is never
    itself a grant."""

    id: str
    target: str
    transition: str
    supersedes: str | None
    successor: str | None
    conveys_authority: bool = False

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "StatusEvent",
            "id": self.id,
            "target": self.target,
            "transition": self.transition,
            "supersedes": self.supersedes,
            "successor": self.successor,
            "conveys_authority": self.conveys_authority,
        }


def make_status_event(
    *,
    target: str,
    transition: str,
    supersedes: str | None = None,
    successor: str | None = None,
) -> StatusEvent:
    provisional = StatusEvent(
        id="",
        target=target,
        transition=transition,
        supersedes=supersedes,
        successor=successor,
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


@dataclass(frozen=True)
class Office:
    """A Hohfeldian duty/power/privilege/immunity profile. Describing an
    office is not installing an officer: ``conveys_incumbency`` is
    always ``False``."""

    id: str
    slug: str
    duties: tuple[str, ...]
    powers: tuple[str, ...]
    privileges: tuple[str, ...]
    immunities: tuple[str, ...]
    scope: str
    conveys_incumbency: bool = False

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "Office",
            "id": self.id,
            "slug": self.slug,
            "duties": list(self.duties),
            "powers": list(self.powers),
            "privileges": list(self.privileges),
            "immunities": list(self.immunities),
            "scope": self.scope,
            "conveys_incumbency": self.conveys_incumbency,
        }


def make_office(
    *,
    slug: str,
    scope: str,
    duties: Sequence[str] = (),
    powers: Sequence[str] = (),
    privileges: Sequence[str] = (),
    immunities: Sequence[str] = (),
) -> Office:
    provisional = Office(
        id="",
        slug=slug,
        duties=tuple(duties),
        powers=tuple(powers),
        privileges=tuple(privileges),
        immunities=tuple(immunities),
        scope=scope,
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


@dataclass(frozen=True)
class OfficerInstallation:
    """A status-function declaration D=(X,Y,C,A): officer X installed as
    role Y under constitution C by authorizing act A. The sole Tier B
    type permitted to set ``conveys_authority`` to ``True``."""

    id: str
    office: str
    officer: str
    as_role: str
    constitution: str
    authorizing_act: str
    conveys_authority: bool = True

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "OfficerInstallation",
            "id": self.id,
            "office": self.office,
            "officer": self.officer,
            "as_role": self.as_role,
            "constitution": self.constitution,
            "authorizing_act": self.authorizing_act,
            "conveys_authority": self.conveys_authority,
        }


def make_officer_installation(
    *,
    office: str,
    officer: str,
    as_role: str,
    constitution: str,
    authorizing_act: str,
) -> OfficerInstallation:
    provisional = OfficerInstallation(
        id="",
        office=office,
        officer=officer,
        as_role=as_role,
        constitution=constitution,
        authorizing_act=authorizing_act,
    )
    return replace(provisional, id=identity_of_record(provisional.to_record()))


@dataclass(frozen=True)
class Session:
    """Agent-workspace memory-bank state, Cline Memory Bank shaped: the
    five named sections plus an open ``custom`` section."""

    id: str
    office: str | None
    sections: Mapping[str, Any]

    def to_record(self) -> dict[str, Any]:
        return {
            "type": "Session",
            "id": self.id,
            "office": self.office,
            "sections": dict(self.sections),
        }


def make_session(
    *, office: str | None = None, sections: Mapping[str, Any] | None = None
) -> Session:
    merged: dict[str, Any] = {key: "" for key in MEMORY_BANK_SECTIONS}
    merged["custom"] = {}
    if sections:
        merged.update(sections)
    provisional = Session(id="", office=office, sections=merged)
    return replace(provisional, id=identity_of_record(provisional.to_record()))


def _require(record: Mapping[str, Any], key: str, owner: str) -> Any:
    if key not in record:
        raise ValueError(f"{owner}: required field {key!r} is missing")
    return record[key]


def _nonempty_str(value: Any, owner: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{owner}: required non-empty string")
    return value


def _optional_str(value: Any, owner: str) -> str | None:
    if value is not None and not isinstance(value, str):
        raise ValueError(f"{owner}: must be a string or null")
    return value


def _uri(value: Any, owner: str) -> str:
    if not is_ni_uri(value):
        raise ValueError(f"{owner}: required content identity")
    return value


def _optional_uri(value: Any, owner: str) -> str | None:
    if value is not None and not is_ni_uri(value):
        raise ValueError(f"{owner}: must be a content identity or null")
    return value


def _bool(value: Any, owner: str) -> bool:
    if not isinstance(value, bool):
        raise TypeError(f"{owner}: required boolean")
    return value


def _string_list(value: Any, owner: str) -> list[str]:
    if not isinstance(value, list) or not all(
        isinstance(item, str) and item for item in value
    ):
        raise ValueError(f"{owner}: must be a list of non-empty strings")
    return value


def _validate_observation(record: Mapping[str, Any]) -> None:
    _nonempty_str(_require(record, "accord", "Observation"), "Observation.accord")
    _nonempty_str(
        _require(record, "proposition", "Observation"), "Observation.proposition"
    )
    _uri(_require(record, "witness_id", "Observation"), "Observation.witness_id")
    _optional_str(_require(record, "agent", "Observation"), "Observation.agent")


def _validate_correction_record(record: Mapping[str, Any]) -> None:
    _uri(_require(record, "target", "CorrectionRecord"), "CorrectionRecord.target")
    _uri(
        _require(record, "replacement", "CorrectionRecord"),
        "CorrectionRecord.replacement",
    )
    _nonempty_str(
        _require(record, "reason", "CorrectionRecord"), "CorrectionRecord.reason"
    )
    invalidates = _require(record, "invalidates_prior_for_use", "CorrectionRecord")
    if not _bool(invalidates, "CorrectionRecord.invalidates_prior_for_use"):
        raise ValueError("CorrectionRecord.invalidates_prior_for_use: must be True")


def _validate_status_event(record: Mapping[str, Any]) -> None:
    _uri(_require(record, "target", "StatusEvent"), "StatusEvent.target")
    transition = _nonempty_str(
        _require(record, "transition", "StatusEvent"), "StatusEvent.transition"
    )
    if transition not in STATUS_TRANSITIONS:
        raise ValueError(f"StatusEvent.transition: invalid {transition!r}")
    _optional_uri(
        _require(record, "supersedes", "StatusEvent"), "StatusEvent.supersedes"
    )
    successor = _optional_uri(
        _require(record, "successor", "StatusEvent"), "StatusEvent.successor"
    )
    if transition == "supersession" and successor is None:
        raise ValueError("StatusEvent: supersession requires a successor")
    if _bool(
        _require(record, "conveys_authority", "StatusEvent"),
        "StatusEvent.conveys_authority",
    ):
        raise ValueError("StatusEvent.conveys_authority: must be False")


def _validate_office(record: Mapping[str, Any]) -> None:
    _nonempty_str(_require(record, "slug", "Office"), "Office.slug")
    for field in ("duties", "powers", "privileges", "immunities"):
        _string_list(_require(record, field, "Office"), f"Office.{field}")
    _nonempty_str(_require(record, "scope", "Office"), "Office.scope")
    if _bool(
        _require(record, "conveys_incumbency", "Office"), "Office.conveys_incumbency"
    ):
        raise ValueError("Office.conveys_incumbency: must be False")


def _validate_officer_installation(record: Mapping[str, Any]) -> None:
    _uri(
        _require(record, "office", "OfficerInstallation"),
        "OfficerInstallation.office",
    )
    _nonempty_str(
        _require(record, "officer", "OfficerInstallation"),
        "OfficerInstallation.officer",
    )
    _nonempty_str(
        _require(record, "as_role", "OfficerInstallation"),
        "OfficerInstallation.as_role",
    )
    _nonempty_str(
        _require(record, "constitution", "OfficerInstallation"),
        "OfficerInstallation.constitution",
    )
    _uri(
        _require(record, "authorizing_act", "OfficerInstallation"),
        "OfficerInstallation.authorizing_act",
    )
    if not _bool(
        _require(record, "conveys_authority", "OfficerInstallation"),
        "OfficerInstallation.conveys_authority",
    ):
        raise ValueError("OfficerInstallation.conveys_authority: must be True")


def _validate_session(record: Mapping[str, Any]) -> None:
    _optional_str(_require(record, "office", "Session"), "Session.office")
    sections = _require(record, "sections", "Session")
    if not isinstance(sections, dict):
        raise TypeError("Session.sections: required object")
    missing = [key for key in MEMORY_BANK_SECTIONS if key not in sections]
    if missing:
        raise ValueError(f"Session.sections: missing section(s) {missing}")
    allowed = set(MEMORY_BANK_SECTIONS) | {"custom"}
    unknown = [key for key in sections if key not in allowed]
    if unknown:
        raise ValueError(f"Session.sections: unknown section key(s) {unknown}")
    if not isinstance(sections.get("custom", {}), dict):
        raise TypeError("Session.sections.custom: must be an object")


_VALIDATORS: dict[str, Callable[[Mapping[str, Any]], None]] = {
    "Observation": _validate_observation,
    "CorrectionRecord": _validate_correction_record,
    "StatusEvent": _validate_status_event,
    "Office": _validate_office,
    "OfficerInstallation": _validate_officer_installation,
    "Session": _validate_session,
}


def _check_authority_boundary(record_type: str, record: Mapping[str, Any]) -> None:
    if record.get("conveys_authority") is True and record_type != "OfficerInstallation":
        raise ValueError(
            f"{record_type}: only OfficerInstallation may set conveys_authority to True"
        )


def _check_identity(record_type: str, record: Mapping[str, Any]) -> None:
    record_id = _require(record, "id", record_type)
    if not isinstance(record_id, str) or not record_id:
        raise ValueError(f"{record_type}: id must be a non-empty string")
    expected = identity_of_record(dict(record))
    if record_id != expected:
        raise ValueError(f"{record_type} {record_id}: content identity mismatch")


def validate_record(record: Mapping[str, Any]) -> Mapping[str, Any]:
    """Independent per-record shape check: required fields, enum
    membership, and (mirroring ``academy.mjs``) the id-round-trip
    against the record's own content. Raises ``ValueError`` on the
    first violation found; returns ``record`` unchanged on success."""
    record_type = record.get("type")
    if not isinstance(record_type, str) or record_type not in _VALIDATORS:
        raise ValueError(f"{record_type!r}: not a Tier B record type")
    _VALIDATORS[record_type](record)
    _check_authority_boundary(record_type, record)
    _check_identity(record_type, record)
    return record


def _index(records: Sequence[Mapping[str, Any]]) -> dict[str, Mapping[str, Any]]:
    index: dict[str, Mapping[str, Any]] = {}
    for record in records:
        record_type = record.get("type")
        if record_type in FOREIGN_TIER_B_TYPES:
            record_id = _require(record, "id", record_type)
            if not isinstance(record_id, str) or not record_id:
                raise ValueError(f"{record_type}: id must be a non-empty string")
        else:
            validate_record(record)
            record_id = record["id"]
        if record_id in index:
            raise ValueError(f"{record_id}: duplicate content identity")
        index[record_id] = record
    return index


def _resolve(
    index: Mapping[str, Mapping[str, Any]],
    record_id: Any,
    expected_type: str | None,
    owner: str,
) -> Mapping[str, Any]:
    target = index.get(record_id) if isinstance(record_id, str) else None
    if target is None or (
        expected_type is not None and target["type"] != expected_type
    ):
        wanted = expected_type or "a record"
        raise ValueError(f"{owner}: unresolved {wanted} {record_id!r}")
    return target


def _status_event_ancestors(
    index: Mapping[str, Mapping[str, Any]], record: Mapping[str, Any]
) -> None:
    """Walk ``record``'s ``supersedes`` chain, rejecting a cycle. Each hop
    is already known to resolve to a StatusEvent on the same target (the
    per-record cross-validation above); this asserts the chain as a
    whole is forward-only — it never revisits a StatusEvent it has
    already passed through."""
    seen = {record["id"]}
    current = record
    for _ in range(len(index) + 1):
        supersedes = current.get("supersedes")
        if supersedes is None:
            return
        if supersedes in seen:
            raise ValueError(
                f"{record['id']}: supersedes chain is not acyclic at {supersedes!r}"
            )
        seen.add(supersedes)
        current = index[supersedes]
    raise ValueError(f"{record['id']}: supersedes chain exceeds record count")


def verify_records(records: Sequence[Mapping[str, Any]]) -> Mapping[str, Any]:
    """Cross-validation over a whole collection: every record is
    individually valid (``validate_record``), cited ids resolve to a
    record of the expected type, and an ``OfficerInstallation``'s
    authorizing act is a guard- or accounting-kind ``Witness``. Mirrors
    ``academy.mjs``'s ``verifyRecords``."""
    index = _index(records)
    for record in records:
        record_type = record["type"]
        if record_type == "Observation":
            _resolve(index, record["witness_id"], "Witness", record["id"])
        elif record_type == "CorrectionRecord":
            target = _resolve(index, record["target"], None, record["id"])
            replacement = _resolve(index, record["replacement"], None, record["id"])
            if target["type"] != replacement["type"]:
                raise ValueError(
                    f"{record['id']}: correction target and replacement are not "
                    "the same type"
                )
        elif record_type == "StatusEvent":
            _resolve(index, record["target"], None, record["id"])
            if record.get("supersedes") is not None:
                superseded = _resolve(
                    index, record["supersedes"], "StatusEvent", record["id"]
                )
                if superseded["target"] != record["target"]:
                    raise ValueError(
                        f"{record['id']}: supersedes must resolve to a prior "
                        "StatusEvent on the same target"
                    )
                _status_event_ancestors(index, record)
            if record.get("successor") is not None:
                _resolve(index, record["successor"], None, record["id"])
        elif record_type == "OfficerInstallation":
            _resolve(index, record["office"], "Office", record["id"])
            act = _resolve(index, record["authorizing_act"], "Witness", record["id"])
            if act["kind"] not in ("guard", "accounting"):
                raise ValueError(
                    f"{record['id']}: authorizing_act must be a guard or "
                    "accounting Witness"
                )
        elif record_type == "Session" and record.get("office") is not None:
            _resolve(index, record["office"], "Office", record["id"])
    by_type: dict[str, int] = {}
    for record in records:
        by_type[record["type"]] = by_type.get(record["type"], 0) + 1
    return {"ok": True, "records": len(records), "by_type": by_type}


__all__ = [
    "FOREIGN_TIER_B_TYPES",
    "MEMORY_BANK_SECTIONS",
    "STATUS_TRANSITIONS",
    "TIER_B_RECORD_TYPES",
    "CorrectionRecord",
    "Observation",
    "Office",
    "OfficerInstallation",
    "Session",
    "StatusEvent",
    "make_correction_record",
    "make_observation",
    "make_office",
    "make_officer_installation",
    "make_session",
    "make_status_event",
    "validate_record",
    "verify_records",
]
