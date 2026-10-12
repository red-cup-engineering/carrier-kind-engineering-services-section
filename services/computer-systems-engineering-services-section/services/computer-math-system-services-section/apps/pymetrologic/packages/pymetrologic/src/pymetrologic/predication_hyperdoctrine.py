"""Finite predication-hyperdoctrine witnesses.

Executable shadow of ``RelMath.Predicating.Hyperdoctrine``.  Lean proves the
unconditional bijection case of the predication hyperdoctrine: reindexing along a
base isomorphism has the inverse reindexing as its Galois adjoint.  The converse
generator is an involution on predication cells, so ``converse*`` is its own
left/right adjoint, preserves knowledge-meets, satisfies Frobenius reciprocity,
and gives the Beck-Chevalley comparison for commuting base maps.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four

from .yoneda import PredicationCell

HyperValuation = Mapping[PredicationCell, BL[int]]
CellMap = Mapping[PredicationCell, PredicationCell]

__all__ = [
    "BaseIso",
    "CellMap",
    "ConverseHyperdoctrineWitness",
    "HyperValuation",
    "beck_chevalley",
    "cell_maps_commute",
    "compose_cell_maps",
    "converse_base_iso",
    "converse_frobenius",
    "converse_hyperdoctrine_witness",
    "converse_reindex_self_inverse",
    "galois_reindex",
    "identity_cell_map",
    "reindex_comp",
    "reindex_id",
    "reindex_meet_k",
    "reindex_mono_k",
    "reindex_valuation_k",
    "sample_hyperdoctrine_cells",
    "sample_hyperdoctrine_valuations",
    "valuation_eq",
    "valuation_le_k",
    "valuation_meet_k",
]

_FOUR = four()
_CHARGES = (_FOUR.none, _FOUR.true, _FOUR.false, _FOUR.conflict)


@dataclass(frozen=True, slots=True)
class BaseIso:
    """A finite base isomorphism packaged by forward and backward maps."""

    cells: tuple[PredicationCell, ...]
    fwd: CellMap
    bwd: CellMap

    def __post_init__(self) -> None:
        cell_set = set(self.cells)
        if set(self.fwd) != cell_set or set(self.bwd) != cell_set:
            msg = "base isomorphism maps must be defined on exactly the finite support"
            raise ValueError(msg)
        if set(self.fwd.values()) != cell_set or set(self.bwd.values()) != cell_set:
            msg = "base isomorphism maps must land inside the finite support"
            raise ValueError(msg)
        if not self.left_inverse or not self.right_inverse:
            msg = "base maps are not inverse on the finite support"
            raise ValueError(msg)

    @property
    def left_inverse(self) -> bool:
        """``bwd(fwd(phi)) = phi`` for every sampled cell."""

        return all(self.bwd[self.fwd[cell]] == cell for cell in self.cells)

    @property
    def right_inverse(self) -> bool:
        """``fwd(bwd(phi)) = phi`` for every sampled cell."""

        return all(self.fwd[self.bwd[cell]] == cell for cell in self.cells)

    @property
    def valid(self) -> bool:
        """The two maps are inverse bijections on the finite support."""

        return self.left_inverse and self.right_inverse


@dataclass(frozen=True, slots=True)
class ConverseHyperdoctrineWitness:
    """Witness bundle for the converse-quantifier adjoint system."""

    base_iso: bool
    reindex_identity: bool
    reindex_composition: bool
    reindex_monotone: bool
    reindex_meet_preserving: bool
    converse_adjunction: bool
    converse_self_inverse: bool
    converse_frobenius: bool
    beck_chevalley: bool

    @property
    def holds(self) -> bool:
        """All finite hyperdoctrine checks hold."""

        return (
            self.base_iso
            and self.reindex_identity
            and self.reindex_composition
            and self.reindex_monotone
            and self.reindex_meet_preserving
            and self.converse_adjunction
            and self.converse_self_inverse
            and self.converse_frobenius
            and self.beck_chevalley
        )


def _require_support(valuation: HyperValuation, cells: Sequence[PredicationCell]) -> None:
    missing = [cell for cell in cells if cell not in valuation]
    if missing:
        msg = f"valuation missing cells: {missing!r}"
        raise ValueError(msg)


def valuation_eq(
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> bool:
    """Extensional equality of finite valuations over ``cells``."""

    if cells is None:
        if set(left) != set(right):
            return False
        cells = tuple(left)
    return all(left[cell] == right[cell] for cell in cells)


def valuation_le_k(
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> bool:
    """Pointwise FOUR knowledge order on finite valuations."""

    if cells is None:
        if set(left) != set(right):
            msg = "valuations must have the same finite cell support"
            raise ValueError(msg)
        cells = tuple(left)
    return all(_FOUR.leq_k(left[cell], right[cell]) for cell in cells)


def valuation_meet_k(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise knowledge meet of valuations."""

    if set(left) != set(right):
        msg = "valuations must have the same finite cell support"
        raise ValueError(msg)
    return {cell: _FOUR.meet_k(left[cell], right[cell]) for cell in left}


def identity_cell_map(cells: Sequence[PredicationCell]) -> dict[PredicationCell, PredicationCell]:
    """The identity base map on a finite support."""

    return {cell: cell for cell in cells}


def compose_cell_maps(
    left: CellMap,
    right: CellMap,
    cells: Sequence[PredicationCell],
) -> dict[PredicationCell, PredicationCell]:
    """Composition in Lean's order: ``right ∘ left``."""

    missing = [cell for cell in cells if cell not in left or left[cell] not in right]
    if missing:
        msg = f"cell map composition missing support: {missing!r}"
        raise ValueError(msg)
    return {cell: right[left[cell]] for cell in cells}


def reindex_valuation_k(
    cell_map: CellMap,
    valuation: HyperValuation,
    cells: Sequence[PredicationCell] | None = None,
) -> dict[PredicationCell, BL[int]]:
    """Reindexing along a base map: ``r* v = v ∘ r``."""

    domain = tuple(cells if cells is not None else cell_map)
    missing = [cell for cell in domain if cell not in cell_map]
    if missing:
        msg = f"cell map missing domain cells: {missing!r}"
        raise ValueError(msg)
    _require_support(valuation, tuple(cell_map[cell] for cell in domain))
    return {cell: valuation[cell_map[cell]] for cell in domain}


def reindex_id(valuation: HyperValuation) -> bool:
    """``id* v = v``."""

    cells = tuple(valuation)
    return valuation_eq(
        reindex_valuation_k(identity_cell_map(cells), valuation, cells),
        valuation,
        cells,
    )


def reindex_comp(
    left: CellMap,
    right: CellMap,
    valuation: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Contravariant functoriality: ``r*(s* v) = (s ∘ r)* v``."""

    composed = compose_cell_maps(left, right, cells)
    return valuation_eq(
        reindex_valuation_k(left, reindex_valuation_k(right, valuation, cells), cells),
        reindex_valuation_k(composed, valuation, cells),
        cells,
    )


def reindex_mono_k(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing is monotone in the knowledge order."""

    if not valuation_le_k(left, right, cells):
        return True
    return valuation_le_k(
        reindex_valuation_k(cell_map, left, cells),
        reindex_valuation_k(cell_map, right, cells),
        cells,
    )


def reindex_meet_k(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise knowledge meet."""

    return valuation_eq(
        reindex_valuation_k(cell_map, valuation_meet_k(left, right), cells),
        valuation_meet_k(
            reindex_valuation_k(cell_map, left, cells),
            reindex_valuation_k(cell_map, right, cells),
        ),
        cells,
    )


def galois_reindex(
    base_iso: BaseIso,
    left: HyperValuation,
    right: HyperValuation,
) -> bool:
    """Finite check of ``fwd* ⊣ bwd*`` in the knowledge order."""

    cells = base_iso.cells
    lhs = valuation_le_k(reindex_valuation_k(base_iso.fwd, left, cells), right, cells)
    rhs = valuation_le_k(left, reindex_valuation_k(base_iso.bwd, right, cells), cells)
    return lhs == rhs


def converse_base_iso(cells: Sequence[PredicationCell]) -> BaseIso:
    """The converse involution as a base isomorphism over a converse-closed support."""

    support = tuple(cells)
    mapping = {cell: cell.converse() for cell in support}
    return BaseIso(support, mapping, mapping)


def converse_reindex_self_inverse(valuation: HyperValuation) -> bool:
    """``converse* (converse* v) = v``."""

    cells = tuple(valuation)
    iso = converse_base_iso(cells)
    return valuation_eq(
        reindex_valuation_k(iso.fwd, reindex_valuation_k(iso.fwd, valuation, cells), cells),
        valuation,
        cells,
    )


def converse_frobenius(
    alpha: HyperValuation,
    phi: HyperValuation,
) -> bool:
    """Frobenius reciprocity for the converse quantifier."""

    cells = tuple(alpha)
    if set(alpha) != set(phi):
        msg = "valuations must have the same finite cell support"
        raise ValueError(msg)
    iso = converse_base_iso(cells)
    return valuation_eq(
        reindex_valuation_k(
            iso.fwd,
            valuation_meet_k(reindex_valuation_k(iso.fwd, alpha, cells), phi),
            cells,
        ),
        valuation_meet_k(alpha, reindex_valuation_k(iso.fwd, phi, cells)),
        cells,
    )


def cell_maps_commute(
    left: CellMap,
    right: CellMap,
    cells: Sequence[PredicationCell],
) -> bool:
    """Whether two finite base maps commute on the sampled support."""

    return compose_cell_maps(left, right, cells) == compose_cell_maps(right, left, cells)


def beck_chevalley(
    left: CellMap,
    right: CellMap,
    valuation: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Beck-Chevalley comparison for commuting reindexings."""

    if not cell_maps_commute(left, right, cells):
        return True
    return valuation_eq(
        reindex_valuation_k(left, reindex_valuation_k(right, valuation, cells), cells),
        reindex_valuation_k(right, reindex_valuation_k(left, valuation, cells), cells),
        cells,
    )


def sample_hyperdoctrine_cells() -> tuple[PredicationCell, PredicationCell]:
    """A finite converse-closed predication support."""

    cell = PredicationCell("speaker", "addresses", "listener")
    return (cell, cell.converse())


def sample_hyperdoctrine_valuations(
    cells: Sequence[PredicationCell] | None = None,
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    """All FOUR-valued valuations over a finite support."""

    support = tuple(cells if cells is not None else sample_hyperdoctrine_cells())
    return tuple(
        dict(zip(support, charges, strict=True))
        for charges in product(_CHARGES, repeat=len(support))
    )


def converse_hyperdoctrine_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> ConverseHyperdoctrineWitness:
    """Bundle the finite converse hyperdoctrine laws."""

    samples = tuple(valuations if valuations is not None else sample_hyperdoctrine_valuations())
    cells = tuple(samples[0]) if samples else sample_hyperdoctrine_cells()
    iso = converse_base_iso(cells)
    identity = identity_cell_map(cells)
    return ConverseHyperdoctrineWitness(
        base_iso=iso.valid,
        reindex_identity=all(reindex_id(v) for v in samples),
        reindex_composition=all(reindex_comp(iso.fwd, iso.bwd, v, cells) for v in samples),
        reindex_monotone=all(
            reindex_mono_k(iso.fwd, v, w, cells) for v, w in product(samples, repeat=2)
        ),
        reindex_meet_preserving=all(
            reindex_meet_k(iso.fwd, v, w, cells) for v, w in product(samples, repeat=2)
        ),
        converse_adjunction=all(galois_reindex(iso, v, w) for v, w in product(samples, repeat=2)),
        converse_self_inverse=all(converse_reindex_self_inverse(v) for v in samples),
        converse_frobenius=all(converse_frobenius(v, w) for v, w in product(samples, repeat=2)),
        beck_chevalley=all(beck_chevalley(identity, iso.fwd, v, cells) for v in samples),
    )
