"""Finite predication-fibration witnesses.

Executable shadow of ``RelMath.Predicating.PredicationFibration``.  Lean proves
that the predication fiber is the valuation algebra
``PredicationCell -> Charge`` and that every base reindexing is strict
precomposition.  Because the fiber operations are pointwise lifts of the FOUR
operations, precomposition preserves knowledge meet/join, truth meet/join,
negation, the integral truth fusion, and the truth residual.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import product

from pymetrologic import BL, four

from .predication_hyperdoctrine import (
    CellMap,
    HyperValuation,
    compose_cell_maps,
    reindex_comp,
    reindex_id,
    reindex_mono_k,
    reindex_valuation_k,
    valuation_eq,
    valuation_meet_k,
)
from .yoneda import PredicationCell

PredicateMap = Callable[[str], str]

__all__ = [
    "BilatticeHomWitness",
    "FibrationGeneratorWitness",
    "GrothendieckTransposeWitness",
    "PredicateMap",
    "PredicationFibrationTheoremWitness",
    "PredicationFibrationWitness",
    "converse_cell_map",
    "fibration_fusion",
    "fibration_generator_action_witness",
    "fibration_join_k",
    "fibration_join_t",
    "fibration_meet_k",
    "fibration_meet_t",
    "fibration_negate",
    "fibration_residual",
    "fibration_specialization",
    "fibration_specialization_map",
    "fibration_witness",
    "grothendieck_transpose_witness",
    "object_projection_cell_map",
    "predication_fibration_witness",
    "reindex_is_bilattice_homomorphism",
    "reindex_preserves_fusion",
    "reindex_preserves_join_k",
    "reindex_preserves_join_t",
    "reindex_preserves_meet_k",
    "reindex_preserves_meet_t",
    "reindex_preserves_negate",
    "reindex_preserves_residual",
    "sample_fibration_cells",
    "sample_fibration_valuations",
    "subject_projection_cell_map",
]

_FOUR = four()
_CHARGES = (_FOUR.none, _FOUR.true, _FOUR.false, _FOUR.conflict)


@dataclass(frozen=True, slots=True)
class FibrationGeneratorWitness:
    """Finite witness that the four predicate generators act cellwise."""

    converse: bool
    subject_projection: bool
    object_projection: bool
    specialization: bool

    @property
    def holds(self) -> bool:
        """All generator actions agree with precomposition."""

        return (
            self.converse
            and self.subject_projection
            and self.object_projection
            and self.specialization
        )


@dataclass(frozen=True, slots=True)
class PredicationFibrationWitness:
    """Finite witness for the cloven valuation fibration."""

    fiber_uniformity: bool
    reindex_identity: bool
    reindex_composition: bool
    reindex_monotone: bool
    generator_action: bool

    @property
    def holds(self) -> bool:
        """All finite fibration checks hold."""

        return (
            self.fiber_uniformity
            and self.reindex_identity
            and self.reindex_composition
            and self.reindex_monotone
            and self.generator_action
        )


@dataclass(frozen=True, slots=True)
class BilatticeHomWitness:
    """Finite witness that one reindexing preserves the fiber operations."""

    meet_k: bool
    join_k: bool
    meet_t: bool
    join_t: bool
    negate: bool
    fusion: bool
    residual: bool

    @property
    def holds(self) -> bool:
        """All bilattice-residuated homomorphism checks hold."""

        return (
            self.meet_k
            and self.join_k
            and self.meet_t
            and self.join_t
            and self.negate
            and self.fusion
            and self.residual
        )


@dataclass(frozen=True, slots=True)
class GrothendieckTransposeWitness:
    """Finite witness for the strict Grothendieck transpose."""

    fiber_uniformity: bool
    transpose_id: bool
    transpose_comp: bool
    transpose_hom: bool

    @property
    def holds(self) -> bool:
        """The transpose is a strict contravariant bilattice-valued functor."""

        return (
            self.fiber_uniformity
            and self.transpose_id
            and self.transpose_comp
            and self.transpose_hom
        )


@dataclass(frozen=True, slots=True)
class PredicationFibrationTheoremWitness:
    """Bundle for the Lean theorem's A1, A2, A3, and transpose content."""

    fibration: PredicationFibrationWitness
    generators: FibrationGeneratorWitness
    bilattice_hom: BilatticeHomWitness
    transpose: GrothendieckTransposeWitness

    @property
    def holds(self) -> bool:
        """All finite predication-fibration checks hold."""

        return (
            self.fibration.holds
            and self.generators.holds
            and self.bilattice_hom.holds
            and self.transpose.holds
        )


def _require_same_support(
    left: HyperValuation,
    right: HyperValuation,
) -> tuple[PredicationCell, ...]:
    if set(left) != set(right):
        msg = "valuations must have the same finite cell support"
        raise ValueError(msg)
    return tuple(left)


def _map_unary(
    op: Callable[[BL[int]], BL[int]],
    valuation: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    return {cell: op(charge) for cell, charge in valuation.items()}


def _map_binary(
    op: Callable[[BL[int], BL[int]], BL[int]],
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    cells = _require_same_support(left, right)
    return {cell: op(left[cell], right[cell]) for cell in cells}


def _charge_residual(left: BL[int], right: BL[int]) -> BL[int]:
    """Lean's finite truth-Heyting implication on FOUR."""

    return BL((1 - left.pro) | right.pro, (1 - left.con) & right.con)


def fibration_meet_k(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise knowledge meet ``and_k`` on the valuation fiber."""

    return valuation_meet_k(left, right)


def fibration_join_k(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise knowledge join ``or_k`` on the valuation fiber."""

    return _map_binary(_FOUR.join_k, left, right)


def fibration_meet_t(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth meet on the valuation fiber."""

    return _map_binary(_FOUR.meet_t, left, right)


def fibration_join_t(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth join on the valuation fiber."""

    return _map_binary(_FOUR.join_t, left, right)


def fibration_negate(valuation: HyperValuation) -> dict[PredicationCell, BL[int]]:
    """Pointwise truth negation on the valuation fiber."""

    return _map_unary(_FOUR.neg, valuation)


def fibration_fusion(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Lean's integral fiber fusion, realized here as pointwise truth meet."""

    return fibration_meet_t(left, right)


def fibration_residual(
    left: HyperValuation,
    right: HyperValuation,
) -> dict[PredicationCell, BL[int]]:
    """Pointwise right residual adjoint to the integral truth fusion."""

    return _map_binary(_charge_residual, left, right)


def _cell_map_from_function(
    cells: Sequence[PredicationCell],
    transform: Callable[[PredicationCell], PredicationCell],
) -> dict[PredicationCell, PredicationCell]:
    support = set(cells)
    mapping = {cell: transform(cell) for cell in cells}
    missing = [value for value in mapping.values() if value not in support]
    if missing:
        msg = f"cell map lands outside the finite support: {missing!r}"
        raise ValueError(msg)
    return mapping


def converse_cell_map(cells: Sequence[PredicationCell]) -> dict[PredicationCell, PredicationCell]:
    """The converse generator on a converse-closed finite support."""

    return _cell_map_from_function(cells, lambda cell: cell.converse())


def subject_projection_cell_map(
    cells: Sequence[PredicationCell],
) -> dict[PredicationCell, PredicationCell]:
    """The subject-projection generator ``(s,p,o) |-> (s,p,s)``."""

    return _cell_map_from_function(
        cells,
        lambda cell: PredicationCell(cell.subject, cell.predicate, cell.subject),
    )


def object_projection_cell_map(
    cells: Sequence[PredicationCell],
) -> dict[PredicationCell, PredicationCell]:
    """The object-projection generator ``(s,p,o) |-> (o,p,o)``."""

    return _cell_map_from_function(
        cells,
        lambda cell: PredicationCell(cell.object, cell.predicate, cell.object),
    )


def fibration_specialization(predicate: str) -> str:
    """A sample idempotent predicate specialization used by the finite witness."""

    return "addresses:specialized" if predicate.startswith("addresses") else predicate


def fibration_specialization_map(
    cells: Sequence[PredicationCell],
    predicate_map: PredicateMap = fibration_specialization,
) -> dict[PredicationCell, PredicationCell]:
    """The specialization generator, identity on entities and refining predicates."""

    return _cell_map_from_function(
        cells,
        lambda cell: PredicationCell(cell.subject, predicate_map(cell.predicate), cell.object),
    )


def _operation_preserved(
    cell_map: CellMap,
    operation: Callable[[HyperValuation, HyperValuation], dict[PredicationCell, BL[int]]],
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    return valuation_eq(
        reindex_valuation_k(cell_map, operation(left, right), cells),
        operation(
            reindex_valuation_k(cell_map, left, cells),
            reindex_valuation_k(cell_map, right, cells),
        ),
        cells,
    )


def reindex_preserves_meet_k(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise knowledge meet."""

    return _operation_preserved(cell_map, fibration_meet_k, left, right, cells)


def reindex_preserves_join_k(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise knowledge join."""

    return _operation_preserved(cell_map, fibration_join_k, left, right, cells)


def reindex_preserves_meet_t(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise truth meet."""

    return _operation_preserved(cell_map, fibration_meet_t, left, right, cells)


def reindex_preserves_join_t(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise truth join."""

    return _operation_preserved(cell_map, fibration_join_t, left, right, cells)


def reindex_preserves_negate(
    cell_map: CellMap,
    valuation: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves pointwise truth negation."""

    return valuation_eq(
        reindex_valuation_k(cell_map, fibration_negate(valuation), cells),
        fibration_negate(reindex_valuation_k(cell_map, valuation, cells)),
        cells,
    )


def reindex_preserves_fusion(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves the integral fiber fusion."""

    return _operation_preserved(cell_map, fibration_fusion, left, right, cells)


def reindex_preserves_residual(
    cell_map: CellMap,
    left: HyperValuation,
    right: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    """Reindexing preserves the pointwise right residual."""

    return _operation_preserved(cell_map, fibration_residual, left, right, cells)


def reindex_is_bilattice_homomorphism(
    cell_map: CellMap,
    valuations: Sequence[HyperValuation] | None = None,
) -> BilatticeHomWitness:
    """Bundle the seven pointwise homomorphism laws for one reindexing."""

    samples = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(samples[0]) if samples else sample_fibration_cells()
    pairs = tuple(product(samples, repeat=2))
    return BilatticeHomWitness(
        meet_k=all(reindex_preserves_meet_k(cell_map, v, w, cells) for v, w in pairs),
        join_k=all(reindex_preserves_join_k(cell_map, v, w, cells) for v, w in pairs),
        meet_t=all(reindex_preserves_meet_t(cell_map, v, w, cells) for v, w in pairs),
        join_t=all(reindex_preserves_join_t(cell_map, v, w, cells) for v, w in pairs),
        negate=all(reindex_preserves_negate(cell_map, v, cells) for v in samples),
        fusion=all(reindex_preserves_fusion(cell_map, v, w, cells) for v, w in pairs),
        residual=all(reindex_preserves_residual(cell_map, v, w, cells) for v, w in pairs),
    )


def _generator_action(
    cell_map: CellMap,
    transform: Callable[[PredicationCell], PredicationCell],
    valuation: HyperValuation,
    cells: Sequence[PredicationCell],
) -> bool:
    expected = {cell: valuation[transform(cell)] for cell in cells}
    return reindex_valuation_k(cell_map, valuation, cells) == expected


def fibration_generator_action_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> FibrationGeneratorWitness:
    """Check that all four generator reindexings are cellwise precomposition."""

    samples = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(samples[0]) if samples else sample_fibration_cells()
    converse = converse_cell_map(cells)
    subject = subject_projection_cell_map(cells)
    object_ = object_projection_cell_map(cells)
    specialize = fibration_specialization_map(cells)
    return FibrationGeneratorWitness(
        converse=all(
            _generator_action(converse, PredicationCell.converse, v, cells) for v in samples
        ),
        subject_projection=all(
            _generator_action(
                subject,
                lambda cell: PredicationCell(cell.subject, cell.predicate, cell.subject),
                v,
                cells,
            )
            for v in samples
        ),
        object_projection=all(
            _generator_action(
                object_,
                lambda cell: PredicationCell(cell.object, cell.predicate, cell.object),
                v,
                cells,
            )
            for v in samples
        ),
        specialization=all(
            _generator_action(
                specialize,
                lambda cell: PredicationCell(
                    cell.subject,
                    fibration_specialization(cell.predicate),
                    cell.object,
                ),
                v,
                cells,
            )
            for v in samples
        ),
    )


def fibration_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> PredicationFibrationWitness:
    """Bundle A1 plus the strict cleavage laws on a finite closed support."""

    samples = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(samples[0]) if samples else sample_fibration_cells()
    converse = converse_cell_map(cells)
    specialize = fibration_specialization_map(cells)
    composed = compose_cell_maps(converse, specialize, cells)
    return PredicationFibrationWitness(
        fiber_uniformity=all(set(sample) == set(cells) for sample in samples),
        reindex_identity=all(reindex_id(valuation) for valuation in samples),
        reindex_composition=all(
            reindex_comp(converse, specialize, valuation, cells) for valuation in samples
        )
        and set(composed) == set(cells),
        reindex_monotone=all(
            reindex_mono_k(converse, left, right, cells)
            for left, right in product(samples, repeat=2)
        ),
        generator_action=fibration_generator_action_witness(samples).holds,
    )


def grothendieck_transpose_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> GrothendieckTransposeWitness:
    """Bundle the strict ``C^op`` functor into bilattice fiber algebras."""

    samples = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(samples[0]) if samples else sample_fibration_cells()
    converse = converse_cell_map(cells)
    specialize = fibration_specialization_map(cells)
    maps = (
        converse,
        subject_projection_cell_map(cells),
        object_projection_cell_map(cells),
        specialize,
    )
    return GrothendieckTransposeWitness(
        fiber_uniformity=all(set(sample) == set(cells) for sample in samples),
        transpose_id=all(reindex_id(valuation) for valuation in samples),
        transpose_comp=all(
            reindex_comp(converse, specialize, valuation, cells) for valuation in samples
        ),
        transpose_hom=all(
            reindex_is_bilattice_homomorphism(cell_map, samples).holds for cell_map in maps
        ),
    )


def predication_fibration_witness(
    valuations: Sequence[HyperValuation] | None = None,
) -> PredicationFibrationTheoremWitness:
    """Bundle the finite executable shadow of ``fibration_grothendieck_transpose``."""

    samples = tuple(valuations if valuations is not None else sample_fibration_valuations())
    cells = tuple(samples[0]) if samples else sample_fibration_cells()
    converse = converse_cell_map(cells)
    return PredicationFibrationTheoremWitness(
        fibration=fibration_witness(samples),
        generators=fibration_generator_action_witness(samples),
        bilattice_hom=reindex_is_bilattice_homomorphism(converse, samples),
        transpose=grothendieck_transpose_witness(samples),
    )


def sample_fibration_cells() -> tuple[PredicationCell, ...]:
    """A finite support closed under the four predication generator classes."""

    entities = ("speaker", "listener")
    predicates = ("addresses", "addresses:specialized")
    return tuple(
        PredicationCell(subject, predicate, object_)
        for subject in entities
        for predicate in predicates
        for object_ in entities
    )


def sample_fibration_valuations(
    cells: Sequence[PredicationCell] | None = None,
) -> tuple[dict[PredicationCell, BL[int]], ...]:
    """A compact generating family of FOUR-valued valuations over the support."""

    support = tuple(cells if cells is not None else sample_fibration_cells())
    none = {cell: _FOUR.none for cell in support}
    true = {cell: _FOUR.true for cell in support}
    false = {cell: _FOUR.false for cell in support}
    conflict = {cell: _FOUR.conflict for cell in support}
    oriented = {
        cell: (_FOUR.true if cell.subject == "speaker" else _FOUR.false) for cell in support
    }
    specialized = {
        cell: (_FOUR.conflict if cell.predicate.endswith("specialized") else _FOUR.none)
        for cell in support
    }
    diagonal = {
        cell: (_FOUR.true if cell.subject == cell.object else _FOUR.none) for cell in support
    }
    return (none, true, false, conflict, oriented, specialized, diagonal)
