"""Negative-paraconsistent sheaf masks over Belnap FOUR.

Executable shadow of ``RelMath.Cohomology.NegativeParaconsistentSheaf``.  The
negative mask selects the falsity-designated cells ``{f, top}``, mirrors the
positive ``{t, top}`` mask under bilattice negation, and splits as the disjoint
sum of an ``f``-only part plus the shared ``top`` seam.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Mapping, Sequence
from dataclasses import dataclass

from pymetrologic.bilattice import BL, four
from pymetrologic.orderswap import FOUR_CHARGES

Cell = str
Valuation = Mapping[Cell, BL[int]]
Cochain = Mapping[Cell, int]
Mask = Callable[[Cell], bool]

__all__ = [
    "Cell",
    "Cochain",
    "Mask",
    "NegativeMirrorWitness",
    "NegativeSplitWitness",
    "Valuation",
    "combine_cochains",
    "d_f_only",
    "d_k",
    "d_neg",
    "d_t",
    "d_top",
    "is_negative_section",
    "negate_valuation",
    "negative_paraconsistent_split",
    "negative_sheaf_is_negation_mirror",
    "proj_f",
    "proj_top_neg",
    "restrict_cochain",
    "restrict_neg",
    "vanishes",
]

_FOUR = four()


@dataclass(frozen=True, slots=True)
class NegativeMirrorWitness:
    """Finite check that the negative sheaf is the negation mirror."""

    dneg_eq_dk_negate: bool
    dfonly_eq_dt_negate: bool
    dtop_negate_fixed: bool
    swaps_truth_poles: bool
    mirror_involutive: bool

    @property
    def holds(self) -> bool:
        """All negation-mirror checks hold."""
        return (
            self.dneg_eq_dk_negate
            and self.dfonly_eq_dt_negate
            and self.dtop_negate_fixed
            and self.swaps_truth_poles
            and self.mirror_involutive
        )


@dataclass(frozen=True, slots=True)
class NegativeSplitWitness:
    """Finite check of the negative direct-sum split."""

    disjoint_split: bool
    union_split: bool
    shared_top_seam: bool
    f_only_lies_in_dneg: bool
    reconstructs: bool
    unique_decomposition: bool

    @property
    def holds(self) -> bool:
        """All direct-sum split checks hold."""
        return (
            self.disjoint_split
            and self.union_split
            and self.shared_top_seam
            and self.f_only_lies_in_dneg
            and self.reconstructs
            and self.unique_decomposition
        )


def _require_four_charge(charge: BL[int]) -> BL[int]:
    if charge not in FOUR_CHARGES:
        msg = "valuation charge is not one of Belnap FOUR's corners"
        raise ValueError(msg)
    return charge


def _charge(valuation: Valuation, cell: Cell) -> BL[int]:
    return _require_four_charge(valuation[cell])


def _cells_from(
    valuation: Valuation | None = None,
    cochain: Cochain | None = None,
    cells: Iterable[Cell] | None = None,
) -> tuple[Cell, ...]:
    if cells is not None:
        return tuple(cells)
    ordered: list[Cell] = []
    seen: set[Cell] = set()
    for source in (valuation, cochain):
        if source is None:
            continue
        for cell in source:
            if cell not in seen:
                seen.add(cell)
                ordered.append(cell)
    return tuple(ordered)


def d_k(valuation: Valuation, cell: Cell) -> bool:
    """Positive Belnap mask ``{t, top}``."""
    charge = _charge(valuation, cell)
    return charge == _FOUR.true or charge == _FOUR.conflict


def d_t(valuation: Valuation, cell: Cell) -> bool:
    """Truth-only mask ``{t}``."""
    return _charge(valuation, cell) == _FOUR.true


def d_top(valuation: Valuation, cell: Cell) -> bool:
    """Conflict/top-only mask ``{top}``."""
    return _charge(valuation, cell) == _FOUR.conflict


def d_neg(valuation: Valuation, cell: Cell) -> bool:
    """Negative Belnap mask ``{f, top}``."""
    charge = _charge(valuation, cell)
    return charge == _FOUR.false or charge == _FOUR.conflict


def d_f_only(valuation: Valuation, cell: Cell) -> bool:
    """Falsity-only mask ``{f}``."""
    return _charge(valuation, cell) == _FOUR.false


def negate_valuation(valuation: Valuation) -> dict[Cell, BL[int]]:
    """Pointwise bilattice negation of a FOUR-valued valuation."""
    return {cell: _FOUR.neg(_require_four_charge(charge)) for cell, charge in valuation.items()}


def restrict_cochain(
    mask: Mask,
    cochain: Cochain,
    cells: Iterable[Cell] | None = None,
) -> dict[Cell, int]:
    """Restrict a finite cochain by zeroing cells outside ``mask``."""
    support = _cells_from(cochain=cochain, cells=cells)
    return {cell: cochain.get(cell, 0) if mask(cell) else 0 for cell in support}


def vanishes(mask: Mask, cochain: Cochain, cells: Iterable[Cell] | None = None) -> bool:
    """Whether ``cochain`` vanishes outside ``mask``."""
    support = _cells_from(cochain=cochain, cells=cells)
    return all(mask(cell) or cochain.get(cell, 0) == 0 for cell in support)


def restrict_neg(
    valuation: Valuation,
    cochain: Cochain,
    cells: Iterable[Cell] | None = None,
) -> dict[Cell, int]:
    """Restrict a cochain to the negative mask of ``valuation``."""
    return restrict_cochain(lambda cell: d_neg(valuation, cell), cochain, cells)


def is_negative_section(
    valuation: Valuation,
    cochain: Cochain,
    cells: Iterable[Cell] | None = None,
) -> bool:
    """Whether ``cochain`` is supported on the negative mask."""
    return vanishes(lambda cell: d_neg(valuation, cell), cochain, cells)


def combine_cochains(
    left: Cochain,
    right: Cochain,
    cells: Iterable[Cell] | None = None,
) -> dict[Cell, int]:
    """Pointwise sum of two finite integer cochains."""
    support = tuple(dict.fromkeys((*left.keys(), *right.keys()))) if cells is None else tuple(cells)
    return {cell: left.get(cell, 0) + right.get(cell, 0) for cell in support}


def proj_f(
    valuation: Valuation,
    cochain: Cochain,
    cells: Iterable[Cell] | None = None,
) -> dict[Cell, int]:
    """The falsity-only summand of a negative cochain."""
    return restrict_cochain(lambda cell: d_f_only(valuation, cell), cochain, cells)


def proj_top_neg(
    valuation: Valuation,
    cochain: Cochain,
    cells: Iterable[Cell] | None = None,
) -> dict[Cell, int]:
    """The shared top/conflict summand of a negative cochain."""
    return restrict_cochain(lambda cell: d_top(valuation, cell), cochain, cells)


def _default_valuations() -> tuple[dict[Cell, BL[int]], ...]:
    return (
        *({f"cell_{index}": charge} for index, charge in enumerate(FOUR_CHARGES)),
        {
            "none": _FOUR.none,
            "truth": _FOUR.true,
            "false": _FOUR.false,
            "top": _FOUR.conflict,
        },
    )


def _truth_pole_swap_holds(valuation: Valuation, cells: Iterable[Cell]) -> bool:
    negated = negate_valuation(valuation)
    return all(
        (_charge(valuation, cell) != _FOUR.true or negated[cell] == _FOUR.false)
        and (_charge(valuation, cell) != _FOUR.false or negated[cell] == _FOUR.true)
        and (_charge(valuation, cell) != _FOUR.conflict or negated[cell] == _FOUR.conflict)
        and (_charge(valuation, cell) != _FOUR.none or negated[cell] == _FOUR.none)
        for cell in cells
    )


def negative_sheaf_is_negation_mirror(
    valuations: Sequence[Valuation] | None = None,
) -> NegativeMirrorWitness:
    """Check the finite mask correspondences induced by bilattice negation."""
    samples = tuple(valuations) if valuations is not None else _default_valuations()
    return NegativeMirrorWitness(
        dneg_eq_dk_negate=all(
            d_neg(valuation, cell) == d_k(negate_valuation(valuation), cell)
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        dfonly_eq_dt_negate=all(
            d_f_only(valuation, cell) == d_t(negate_valuation(valuation), cell)
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        dtop_negate_fixed=all(
            d_top(negate_valuation(valuation), cell) == d_top(valuation, cell)
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        swaps_truth_poles=all(
            _truth_pole_swap_holds(valuation, _cells_from(valuation=valuation))
            for valuation in samples
        ),
        mirror_involutive=all(
            negate_valuation(negate_valuation(valuation)) == dict(valuation)
            for valuation in samples
        ),
    )


def _supported_cochain_samples(valuation: Valuation) -> tuple[dict[Cell, int], ...]:
    cells = _cells_from(valuation=valuation)
    zero = {cell: 0 for cell in cells}
    falsity = {cell: (2 if d_f_only(valuation, cell) else 0) for cell in cells}
    top = {cell: (-3 if d_top(valuation, cell) else 0) for cell in cells}
    both = {cell: falsity[cell] + top[cell] for cell in cells}
    return zero, falsity, top, both


def _reconstructs(valuation: Valuation, cochain: Cochain, cells: Iterable[Cell]) -> bool:
    support = tuple(cells)
    return is_negative_section(valuation, cochain, support) and combine_cochains(
        proj_f(valuation, cochain, support),
        proj_top_neg(valuation, cochain, support),
        support,
    ) == {cell: cochain.get(cell, 0) for cell in support}


def _unique_decomposition(valuation: Valuation, samples: Sequence[Cochain]) -> bool:
    cells = _cells_from(valuation=valuation)
    for left in samples:
        for right in samples:
            if (
                is_negative_section(valuation, left, cells)
                and is_negative_section(valuation, right, cells)
                and proj_f(valuation, left, cells) == proj_f(valuation, right, cells)
                and proj_top_neg(valuation, left, cells) == proj_top_neg(valuation, right, cells)
                and {cell: left.get(cell, 0) for cell in cells}
                != {cell: right.get(cell, 0) for cell in cells}
            ):
                return False
    return True


def negative_paraconsistent_split(
    valuations: Sequence[Valuation] | None = None,
) -> NegativeSplitWitness:
    """Check the negative split ``dNeg = dFonly or dTop`` and cochain projections."""
    samples = tuple(valuations) if valuations is not None else _default_valuations()
    return NegativeSplitWitness(
        disjoint_split=all(
            not (d_f_only(valuation, cell) and d_top(valuation, cell))
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        union_split=all(
            d_neg(valuation, cell) == (d_f_only(valuation, cell) or d_top(valuation, cell))
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        shared_top_seam=all(
            not d_top(valuation, cell) or (d_neg(valuation, cell) and d_k(valuation, cell))
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        f_only_lies_in_dneg=all(
            not d_f_only(valuation, cell) or d_neg(valuation, cell)
            for valuation in samples
            for cell in _cells_from(valuation=valuation)
        ),
        reconstructs=all(
            _reconstructs(valuation, cochain, _cells_from(valuation=valuation))
            for valuation in samples
            for cochain in _supported_cochain_samples(valuation)
        ),
        unique_decomposition=all(
            _unique_decomposition(valuation, _supported_cochain_samples(valuation))
            for valuation in samples
        ),
    )
