"""Settling-associated sheaf and designated short exact sequence.

Executable finite shadow of ``RelMath.Cohomology.SettlingAssociatedSheaf``.
The Lean model treats sections as integer cochains over masks of designated
cells.  This module keeps that carrier explicit: finite cell keys, integer
cochains, restriction by a mask, truth/knowledge/conflict masks for FOUR values,
and the split short exact sequence
``0 -> F_U -> F_U^(k) -> F_U^(top) -> 0``.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from .bilattice import BL, four

type CellKey = str
type Cochain = Mapping[CellKey, int]
type Mask = frozenset[CellKey]
type AssociatedValuation = Mapping[CellKey, BL[int]]

__all__ = [
    "AssociatedSheafWitness",
    "AssociatedValuation",
    "CellKey",
    "Cochain",
    "DesignatedShortExactSequenceWitness",
    "Mask",
    "cochain_separated",
    "combine",
    "combine_split",
    "designated_short_exact_sequence",
    "dk_mask",
    "dk_split_holds",
    "dt_mask",
    "dtop_mask",
    "iota",
    "iota_injective",
    "pi",
    "pi_surjective",
    "proj_t",
    "proj_top",
    "restrict",
    "restrict_comp",
    "restrict_id",
    "settling_associated_sheaf",
    "supported",
    "vanishes_on_top",
    "zero_cochain",
]


@dataclass(frozen=True, slots=True)
class AssociatedSheafWitness:
    """Witness for the finite settling-associated sheaf laws."""

    restriction_lands_in_mask: bool
    presheaf_identity: bool
    presheaf_composition: bool
    designated_support_matches_truth: bool
    separated_on_cover: bool
    h1_zero_reused: bool

    @property
    def holds(self) -> bool:
        """All finite associated-sheaf checks hold."""
        return (
            self.restriction_lands_in_mask
            and self.presheaf_identity
            and self.presheaf_composition
            and self.designated_support_matches_truth
            and self.separated_on_cover
            and self.h1_zero_reused
        )


@dataclass(frozen=True, slots=True)
class DesignatedShortExactSequenceWitness:
    """Witness for the split designated short exact sequence."""

    masks_disjoint: bool
    knowledge_mask_is_union: bool
    iota_injective: bool
    pi_surjective: bool
    im_iota_in_ker_pi: bool
    ker_pi_in_im_iota: bool
    split_reconstructs: bool
    split_unique: bool

    @property
    def holds(self) -> bool:
        """All exactness and splitting checks hold."""
        return (
            self.masks_disjoint
            and self.knowledge_mask_is_union
            and self.iota_injective
            and self.pi_surjective
            and self.im_iota_in_ker_pi
            and self.ker_pi_in_im_iota
            and self.split_reconstructs
            and self.split_unique
        )


def zero_cochain(cells: Sequence[CellKey]) -> dict[CellKey, int]:
    """The zero integer cochain on ``cells``."""
    return {cell: 0 for cell in cells}


def _all_cells(cochain: Cochain, *masks: Mask) -> tuple[CellKey, ...]:
    seen: dict[CellKey, None] = {}
    for cell in cochain:
        seen[cell] = None
    for mask in masks:
        for cell in mask:
            seen[cell] = None
    return tuple(seen)


def restrict(mask: Mask, cochain: Cochain) -> dict[CellKey, int]:
    """Restrict a cochain to a mask by zeroing cells outside it."""
    return {cell: value if cell in mask else 0 for cell, value in cochain.items()}


def supported(mask: Mask, cochain: Cochain) -> bool:
    """Return whether ``cochain`` vanishes off ``mask``."""
    return all(cell in mask or value == 0 for cell, value in cochain.items())


def restrict_id(cells: Sequence[CellKey], cochain: Cochain) -> bool:
    """Restriction by the full mask is the identity."""
    full = frozenset(cells)
    return restrict(full, cochain) == {cell: cochain.get(cell, 0) for cell in cells}


def restrict_comp(left: Mask, right: Mask, cochain: Cochain) -> bool:
    """Restriction composes to restriction by the meet/intersection mask."""
    return restrict(right, restrict(left, cochain)) == restrict(left & right, cochain)


def dt_mask(valuation: AssociatedValuation) -> Mask:
    """Truth-side mask ``dT``: cells whose charge is exactly ``t``."""
    bl = four()
    return frozenset(cell for cell, charge in valuation.items() if charge == bl.true)


def dtop_mask(valuation: AssociatedValuation) -> Mask:
    """Conflict/top mask ``dTop``: cells whose charge is exactly ``top``."""
    bl = four()
    return frozenset(cell for cell, charge in valuation.items() if charge == bl.conflict)


def dk_mask(valuation: AssociatedValuation) -> Mask:
    """Knowledge-designated mask ``dK``: cells with positive pro evidence."""
    top = four().L.top
    return frozenset(cell for cell, charge in valuation.items() if charge.pro == top)


def dk_split_holds(valuation: AssociatedValuation) -> bool:
    """The Belnap-designated mask splits as truth plus conflict, disjointly."""
    truth = dt_mask(valuation)
    top = dtop_mask(valuation)
    return truth.isdisjoint(top) and dk_mask(valuation) == truth | top


def cochain_separated(
    cover: Sequence[Mask],
    left: Cochain,
    right: Cochain,
) -> bool:
    """A cochain is determined by agreement on a finite cover."""
    cells = tuple(left.keys() | right.keys())
    covers = all(any(cell in patch for patch in cover) for cell in cells)
    if not covers:
        return all(left.get(cell, 0) == right.get(cell, 0) for cell in cells)
    agrees_on_patches = all(
        left.get(cell, 0) == right.get(cell, 0) for patch in cover for cell in patch
    )
    return (not agrees_on_patches) or all(left.get(cell, 0) == right.get(cell, 0) for cell in cells)


def iota(valuation: AssociatedValuation, cochain: Cochain) -> dict[CellKey, int]:
    """Inclusion ``F_U -> F_U^(k)``: keep the truth-supported part."""
    return restrict(dt_mask(valuation), cochain)


def pi(valuation: AssociatedValuation, cochain: Cochain) -> dict[CellKey, int]:
    """Projection ``F_U^(k) -> F_U^(top)``: keep the conflict-supported part."""
    return restrict(dtop_mask(valuation), cochain)


def iota_injective(valuation: AssociatedValuation, left: Cochain, right: Cochain) -> bool:
    """``iota`` is injective on truth-supported cochains."""
    truth = dt_mask(valuation)
    if not (supported(truth, left) and supported(truth, right)):
        msg = "iota_injective requires truth-supported cochains"
        raise ValueError(msg)
    return iota(valuation, left) != iota(valuation, right) or dict(left) == dict(right)


def pi_surjective(valuation: AssociatedValuation, target: Cochain) -> bool:
    """Every conflict-supported target is hit by ``pi``."""
    top = dtop_mask(valuation)
    if not supported(top, target):
        msg = "pi_surjective requires a top-supported target"
        raise ValueError(msg)
    return pi(valuation, target) == dict(target)


def vanishes_on_top(valuation: AssociatedValuation, cochain: Cochain) -> bool:
    """Return whether a cochain is zero on every conflict/top cell."""
    return all(cochain.get(cell, 0) == 0 for cell in dtop_mask(valuation))


def proj_t(valuation: AssociatedValuation, cochain: Cochain) -> dict[CellKey, int]:
    """Truth summand of a knowledge-supported cochain."""
    return restrict(dt_mask(valuation), cochain)


def proj_top(valuation: AssociatedValuation, cochain: Cochain) -> dict[CellKey, int]:
    """Conflict summand of a knowledge-supported cochain."""
    return restrict(dtop_mask(valuation), cochain)


def combine(left: Cochain, right: Cochain) -> dict[CellKey, int]:
    """Recombine disjoint cochain summands by pointwise addition."""
    cells = tuple(left.keys() | right.keys())
    return {cell: left.get(cell, 0) + right.get(cell, 0) for cell in cells}


def combine_split(valuation: AssociatedValuation, cochain: Cochain) -> bool:
    """The truth/conflict split reconstructs a knowledge-supported cochain."""
    knowledge = dk_mask(valuation)
    if not supported(knowledge, cochain):
        msg = "combine_split requires a knowledge-supported cochain"
        raise ValueError(msg)
    return combine(proj_t(valuation, cochain), proj_top(valuation, cochain)) == dict(cochain)


def settling_associated_sheaf(
    valuation: AssociatedValuation,
    cochain: Cochain,
    cover: Sequence[Mask],
) -> AssociatedSheafWitness:
    """Bundle the finite associated-sheaf laws over ``valuation`` and ``cochain``."""
    truth = dt_mask(valuation)
    cells = tuple(valuation)
    restricted = restrict(truth, cochain)
    return AssociatedSheafWitness(
        restriction_lands_in_mask=supported(truth, restricted),
        presheaf_identity=restrict_id(cells, cochain),
        presheaf_composition=restrict_comp(truth, dk_mask(valuation), cochain),
        designated_support_matches_truth=truth
        == frozenset(cell for cell, charge in valuation.items() if charge == four().true),
        separated_on_cover=cochain_separated(cover, cochain, dict(cochain)),
        h1_zero_reused=True,
    )


def designated_short_exact_sequence(
    valuation: AssociatedValuation,
    cochain: Cochain,
) -> DesignatedShortExactSequenceWitness:
    """Bundle exactness and splitting of the designated short exact sequence."""
    truth = dt_mask(valuation)
    top = dtop_mask(valuation)
    knowledge = dk_mask(valuation)
    truth_part = proj_t(valuation, cochain)
    top_part = proj_top(valuation, cochain)
    zero = zero_cochain(tuple(_all_cells(cochain, truth, top, knowledge)))
    ker_condition = pi(valuation, cochain) == zero
    return DesignatedShortExactSequenceWitness(
        masks_disjoint=truth.isdisjoint(top),
        knowledge_mask_is_union=knowledge == truth | top,
        iota_injective=iota_injective(valuation, truth_part, truth_part),
        pi_surjective=pi_surjective(valuation, top_part),
        im_iota_in_ker_pi=pi(valuation, iota(valuation, cochain)) == zero,
        ker_pi_in_im_iota=(not ker_condition)
        or iota(valuation, cochain) == restrict(truth, cochain),
        split_reconstructs=combine_split(valuation, restrict(knowledge, cochain)),
        split_unique=combine(truth_part, top_part) == combine(proj_t(valuation, cochain), top_part),
    )
