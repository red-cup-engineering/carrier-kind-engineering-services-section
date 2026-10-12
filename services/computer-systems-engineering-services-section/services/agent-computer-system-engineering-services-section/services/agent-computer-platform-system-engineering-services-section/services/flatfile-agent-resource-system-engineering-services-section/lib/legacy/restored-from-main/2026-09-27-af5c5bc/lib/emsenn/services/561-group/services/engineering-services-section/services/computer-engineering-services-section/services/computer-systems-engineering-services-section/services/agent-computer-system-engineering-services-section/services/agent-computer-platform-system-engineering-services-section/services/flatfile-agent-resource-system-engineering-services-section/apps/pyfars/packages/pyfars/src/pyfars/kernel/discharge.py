"""Register C — sigma_t/Delta_t double-settlement discharge (design spec S5C).

Wraps ``pymetrologic.quartet``'s generic ``commutating_pair``/``nuclear_quartet``
over FARS's own fiber, never ``pymetrologic.valuation_quartet_discharge``'s
``Valuation = PredicationCell -> Charge`` fiber — that fiber is yoneda-keyed
to PyMetroLogic's own predication corpus, a type mismatch for Tier B history
(design spec S5C).

``institution.md``'s double-settlement: a proposition is *operative*
(``H*_t``) only once it is both sigma-fixed (recognized: its cited lineage
resolves and content-matches) and Delta-fixed (committed: its downstream
effect has actually fired). ``pymetrologic.quartet.Corner``'s four corners
are institution.md's own four states under a name change (per the mapping
this module was asked to realize):

    Corner.ABSURD    (neither fixed) -> free_shadow  -- dead letter
    Corner.POTENTIAL (sigma only)    -> sat_shadow    -- recognized, forward-fragile
    Corner.ACTIVE    (Delta only)    -> tr_shadow     -- committed, unrecognized
    Corner.STABLE    (both)          -> operative     -- H*_t

sigma_t and Delta_t are realized as genuine ``pymetrologic.closure`` nuclei
over the same knowledge lattice ``kernel.settlement.KNOWLEDGE_LATTICE``
already uses (``BL[int]`` under the knowledge order): each is the
join-toward-a-pole nucleus ``pymetrologic.closure.join_nucleus`` builds --
sigma toward the ``pro`` pole, Delta toward the ``con`` pole -- so both are
provably monotone, inflationary, and idempotent (``is_closure``'s contract)
for every element of the lattice, and provably commute
(``CommutingPair.commutes``) since the two poles act on independent
coordinates of the pair. What is FARS-specific, per the design spec's
residual limitation S14.4, is not the nucleus machinery but what feeds it:
a record's own sigma-bit (do its citations resolve) and Delta-bit (has its
committed effect fired), computed once per record from the record/witness
history below and then read through the shared, proven closure pair.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from enum import Enum
from typing import Any

from pymetrologic.bilattice import BL
from pymetrologic.closure import join_nucleus
from pymetrologic.quartet import (
    CommutingPair,
    Corner,
    commutating_pair,
    corner_of_status,
    nuclear_quartet,
)

from pyfars.kernel.four import BOTH, NEITHER, Four, join_knowledge
from pyfars.kernel.record_types import validate_record
from pyfars.kernel.settlement import KNOWLEDGE_LATTICE
from pyfars.kernel.witness import validate_witness

__all__ = [
    "DELTA_CLOSURE",
    "PAIR",
    "PARTITION",
    "SIGMA_CLOSURE",
    "TERMINAL_TRANSITIONS",
    "DischargeState",
    "delta_holds",
    "discharge",
    "sigma_holds",
]


class DischargeState(Enum):
    """institution.md's four propositional states -- never a boolean."""

    OPERATIVE = "operative"
    SAT_SHADOW = "sat_shadow"
    TR_SHADOW = "tr_shadow"
    FREE_SHADOW = "free_shadow"


_CORNER_TO_STATE: dict[Corner, DischargeState] = {
    Corner.ABSURD: DischargeState.FREE_SHADOW,
    Corner.POTENTIAL: DischargeState.SAT_SHADOW,
    Corner.ACTIVE: DischargeState.TR_SHADOW,
    Corner.STABLE: DischargeState.OPERATIVE,
}

#: sigma_t: the saturation nucleus, join-toward-recognized (the ``pro`` pole).
SIGMA_CLOSURE = join_nucleus(KNOWLEDGE_LATTICE, BL(1, 0))

#: Delta_t: the transfer nucleus, join-toward-committed (the ``con`` pole).
DELTA_CLOSURE = join_nucleus(KNOWLEDGE_LATTICE, BL(0, 1))

#: The recurring coherence 2-cell (design spec S5C): sigma_t and Delta_t
#: commute because their poles act on independent coordinates of the pair.
PAIR: CommutingPair[BL[int]] = commutating_pair(SIGMA_CLOSURE, DELTA_CLOSURE)

#: The nuclear quartet over the whole knowledge lattice: for each corner,
#: the elements already fixed by that corner's operator -- ``STABLE``'s
#: member is exactly ``{BL(1, 1)}``, institution.md's ``H*_t``.
PARTITION: dict[Corner, tuple[BL[int], ...]] = nuclear_quartet(
    PAIR, KNOWLEDGE_LATTICE.elements, KNOWLEDGE_LATTICE.eq
)

#: StatusEvent transitions institution.md's Delta_t reads as a fired,
#: settled lifecycle outcome -- ``correction``/``suspension`` are left open
#: pending further action, so they are deliberately excluded (design spec
#: S14.4: this content is new design work, not itself library-backed).
TERMINAL_TRANSITIONS: frozenset[str] = frozenset(
    {"revocation", "expiry", "reinstatement", "supersession"}
)

#: A record type's sigma-citations -- the backward-facing references its
#: own recognition depends on. Forward-facing fields (``CorrectionRecord``'s
#: ``replacement``, a supersession's ``successor``) are Delta's business,
#: not sigma's -- see ``delta_holds``.
_SIGMA_CITATION_FIELDS: dict[str, tuple[str, ...]] = {
    "Observation": ("witness_id",),
    "CorrectionRecord": ("target",),
    "StatusEvent": ("target", "supersedes"),
    "OfficerInstallation": ("office", "authorizing_act"),
    "Session": ("office",),
}


def _validates(record: Mapping[str, Any]) -> bool:
    try:
        if record.get("type") == "Witness":
            validate_witness(record)
        else:
            validate_record(record)
    except (TypeError, ValueError):
        return False
    return True


def _cited_ids(record: Mapping[str, Any]) -> tuple[Any, ...]:
    record_type = record.get("type")
    fields = _SIGMA_CITATION_FIELDS.get(record_type, ()) if isinstance(record_type, str) else ()
    return tuple(record.get(field) for field in fields)


def sigma_holds(
    record: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    witnesses: Sequence[Mapping[str, Any]] = (),
) -> bool:
    """sigma_t's content: does ``record`` validate on its own shape, and
    does every backward citation it carries resolve to a record actually
    present in ``records``/``witnesses``? Lifts ``record_types``' and
    ``witness``'s ``validate_record``/``validate_witness`` -- the same
    per-record shape check ``verify_records`` runs over a whole collection
    -- rather than re-deriving it; resolution doubles as content-match
    because every Tier B id already is a content digest (design spec
    S2.2) -- a stale or tampered citation simply fails to resolve, there
    is nothing further to check."""
    if not _validates(record):
        return False
    known = {r["id"] for r in records if "id" in r} | {
        w["id"] for w in witnesses if "id" in w
    }
    return all(cited is None or cited in known for cited in _cited_ids(record))


def _status_event_delta(
    record: Mapping[str, Any], records_by_id: Mapping[str, Mapping[str, Any]]
) -> bool:
    if record.get("transition") not in TERMINAL_TRANSITIONS:
        return False
    successor = record.get("successor")
    return successor is None or successor in records_by_id


def _wit_chain_closed(record_id: Any, witnesses: Sequence[Mapping[str, Any]]) -> bool:
    folded = NEITHER
    for witness in witnesses:
        if witness.get("target") != record_id:
            continue
        four_after = witness.get("four_after")
        if four_after is not None:
            folded = join_knowledge(folded, Four(*four_after))
    return folded == BOTH


def delta_holds(
    record: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    witnesses: Sequence[Mapping[str, Any]] = (),
) -> bool:
    """Delta_t's content: has ``record``'s committed downstream effect
    actually fired? A ``StatusEvent`` reaching a terminal transition (with
    any declared successor itself resolved), a ``CorrectionRecord``'s
    replacement actually recorded, or -- the default, applying to every
    other Tier B type -- a WIT chain closed: the witnesses targeting
    ``record``'s id folding, under the knowledge-order join, to ``BOTH``
    (the state from which no further legal WIT is possible)."""
    record_type = record.get("type")
    if record_type == "StatusEvent":
        records_by_id = {r["id"]: r for r in records if "id" in r}
        return _status_event_delta(record, records_by_id)
    if record_type == "CorrectionRecord":
        return record.get("replacement") in {r["id"] for r in records if "id" in r}
    return _wit_chain_closed(record.get("id"), witnesses)


def discharge(
    record: Mapping[str, Any],
    records: Sequence[Mapping[str, Any]],
    witnesses: Sequence[Mapping[str, Any]] = (),
) -> DischargeState:
    """Officium, not debitum (design spec S8): the full sigma_t/Delta_t
    double-settlement for ``record``, read out of the same
    ``commutating_pair``/``nuclear_quartet`` machinery ``PAIR`` and
    ``PARTITION`` are built from -- never coerced to a boolean."""
    x = BL(
        int(sigma_holds(record, records, witnesses)),
        int(delta_holds(record, records, witnesses)),
    )
    sigma_fixed = KNOWLEDGE_LATTICE.eq(PAIR.f(x), x)
    delta_fixed = KNOWLEDGE_LATTICE.eq(PAIR.g(x), x)
    return _CORNER_TO_STATE[corner_of_status(sigma_fixed, delta_fixed)]
