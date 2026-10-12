"""Root positing carrier (``RelMath.Positing``).

Positing admits value on predication cells.  In Lean the root charge is the same
four-point object as the articulation corner: ``Charge := Corner``.  This module
keeps that identity explicit and exposes the Boolean-slot operations used by the
later bilattice, truth-order, valuation, and fibration realizations.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass

from .predicating import PredicationCell
from .quartet import CORNERS, Corner, corner_of_status, status_of_corner

Charge = Corner
Valuation = Mapping[PredicationCell, Charge]

__all__ = [
    "Charge",
    "PositingRootWitness",
    "Valuation",
    "charge_join_k",
    "charge_join_t",
    "charge_le_k",
    "charge_le_t",
    "charge_meet_k",
    "charge_meet_t",
    "charge_neg",
    "charge_negate",
    "charge_negation_laws_hold",
    "charge_of_slots",
    "charge_pos",
    "charge_slot_roundtrip_holds",
    "charge_truth_poles_swap_holds",
    "charge_with_knowledge_poles_hold",
    "knowledge_least",
    "positing_root_witness",
    "valuation_join_k",
    "valuation_knowledge_least",
    "valuation_le_k",
]


@dataclass(frozen=True, slots=True)
class PositingRootWitness:
    """Executable witness for the root positing laws."""

    charge_is_corner: bool
    slot_roundtrip: bool
    knowledge_poles: bool
    knowledge_lattice_laws: bool
    truth_lattice_laws: bool
    negation_laws: bool
    knowledge_least_seed: bool
    valuation_join: bool

    @property
    def holds(self) -> bool:
        return (
            self.charge_is_corner
            and self.slot_roundtrip
            and self.knowledge_poles
            and self.knowledge_lattice_laws
            and self.truth_lattice_laws
            and self.negation_laws
            and self.knowledge_least_seed
            and self.valuation_join
        )


def charge_pos(charge: Charge) -> bool:
    """The evidence-for slot of a charge."""
    return status_of_corner(charge)[0]


def charge_neg(charge: Charge) -> bool:
    """The evidence-against slot of a charge."""
    return status_of_corner(charge)[1]


def charge_of_slots(positive: bool, negative: bool) -> Charge:
    """Build a charge from its two Boolean slots."""
    return corner_of_status(positive, negative)


knowledge_least = Corner.ABSURD
"""The knowledge-bottom charge seeded before assertion."""


def charge_join_k(left: Charge, right: Charge) -> Charge:
    """Knowledge join: presence-union of both slots."""
    return charge_of_slots(
        charge_pos(left) or charge_pos(right),
        charge_neg(left) or charge_neg(right),
    )


def charge_meet_k(left: Charge, right: Charge) -> Charge:
    """Knowledge meet: presence-intersection of both slots."""
    return charge_of_slots(
        charge_pos(left) and charge_pos(right),
        charge_neg(left) and charge_neg(right),
    )


def charge_join_t(left: Charge, right: Charge) -> Charge:
    """Truth join: positive union, negative intersection."""
    return charge_of_slots(
        charge_pos(left) or charge_pos(right),
        charge_neg(left) and charge_neg(right),
    )


def charge_meet_t(left: Charge, right: Charge) -> Charge:
    """Truth meet: positive intersection, negative union."""
    return charge_of_slots(
        charge_pos(left) and charge_pos(right),
        charge_neg(left) or charge_neg(right),
    )


def charge_le_k(left: Charge, right: Charge) -> bool:
    """Knowledge order: both slots increase."""
    return (not charge_pos(left) or charge_pos(right)) and (
        not charge_neg(left) or charge_neg(right)
    )


def charge_le_t(left: Charge, right: Charge) -> bool:
    """Truth order: positive increases and negative decreases."""
    return (not charge_pos(left) or charge_pos(right)) and (
        not charge_neg(right) or charge_neg(left)
    )


def charge_negate(charge: Charge) -> Charge:
    """Truth negation: swap positive and negative slots."""
    return charge_of_slots(charge_neg(charge), charge_pos(charge))


def valuation_knowledge_least(cells: tuple[PredicationCell, ...]) -> dict[PredicationCell, Charge]:
    """The bottom valuation over a finite predication support."""
    return {cell: knowledge_least for cell in cells}


def valuation_le_k(left: Valuation, right: Valuation) -> bool:
    """Pointwise knowledge order on finite valuations."""
    return set(left) == set(right) and all(charge_le_k(left[cell], right[cell]) for cell in left)


def valuation_join_k(left: Valuation, right: Valuation) -> dict[PredicationCell, Charge]:
    """Pointwise knowledge join of finite valuations."""
    if set(left) != set(right):
        msg = "valuations must have the same finite support"
        raise ValueError(msg)
    return {cell: charge_join_k(left[cell], right[cell]) for cell in left}


def charge_slot_roundtrip_holds() -> bool:
    """Charges round-trip through their Boolean slots."""
    return all(
        charge_of_slots(charge_pos(charge), charge_neg(charge)) is charge for charge in CORNERS
    )


def charge_with_knowledge_poles_hold() -> bool:
    """Knowledge-bottom/top are least/greatest in the knowledge order."""
    return all(charge_le_k(Corner.ABSURD, c) and charge_le_k(c, Corner.STABLE) for c in CORNERS)


def charge_truth_poles_swap_holds() -> bool:
    """Truth negation swaps truth poles and fixes knowledge poles."""
    return (
        charge_negate(Corner.POTENTIAL) is Corner.ACTIVE
        and charge_negate(Corner.ACTIVE) is Corner.POTENTIAL
        and charge_negate(Corner.ABSURD) is Corner.ABSURD
        and charge_negate(Corner.STABLE) is Corner.STABLE
    )


def charge_negation_laws_hold() -> bool:
    """Negation is self-inverse, knowledge-preserving, and truth-reversing."""
    return all(
        charge_negate(charge_negate(a)) is a
        and all(
            charge_le_k(charge_negate(a), charge_negate(b)) == charge_le_k(a, b)
            and charge_le_t(charge_negate(a), charge_negate(b)) == charge_le_t(b, a)
            for b in CORNERS
        )
        for a in CORNERS
    )


def _lattice_laws(
    join: Callable[[Charge, Charge], Charge],
    meet: Callable[[Charge, Charge], Charge],
    bottom: Charge,
    top: Charge,
) -> bool:
    return all(
        join(a, b) is join(b, a)
        and meet(a, b) is meet(b, a)
        and join(join(a, b), c) is join(a, join(b, c))
        and meet(meet(a, b), c) is meet(a, meet(b, c))
        and join(a, a) is a
        and meet(a, a) is a
        and join(a, bottom) is a
        and meet(a, top) is a
        for a in CORNERS
        for b in CORNERS
        for c in CORNERS
    )


def positing_root_witness() -> PositingRootWitness:
    """Bundle executable checks for ``RelMath.Positing``."""
    from .articulating_primitives import Mark

    cells = (
        PredicationCell(Mark("s"), Mark("p"), Mark("o")),
        PredicationCell(Mark("o"), Mark("p"), Mark("s")),
    )
    least = valuation_knowledge_least(cells)
    sample = {cells[0]: Corner.POTENTIAL, cells[1]: Corner.ACTIVE}
    joined = valuation_join_k(least, sample)
    return PositingRootWitness(
        charge_is_corner=set(CORNERS) == set(Charge),
        slot_roundtrip=charge_slot_roundtrip_holds(),
        knowledge_poles=charge_with_knowledge_poles_hold(),
        knowledge_lattice_laws=_lattice_laws(
            charge_join_k,
            charge_meet_k,
            Corner.ABSURD,
            Corner.STABLE,
        ),
        truth_lattice_laws=_lattice_laws(
            charge_join_t, charge_meet_t, Corner.ACTIVE, Corner.POTENTIAL
        ),
        negation_laws=charge_negation_laws_hold() and charge_truth_poles_swap_holds(),
        knowledge_least_seed=valuation_le_k(least, sample),
        valuation_join=joined == sample,
    )
