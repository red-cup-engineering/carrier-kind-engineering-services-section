"""Finite temporal 2-category witnesses from ``Predicating.TemporalTwoCategory``.

Lean packages ``T(C, lambda)`` as two axes: a predicate-category arrow and a
settling-step inequality.  In the strict/Scott regime the settling leg is
proof-irrelevant, so the executable shadow can check the predicate leg with a
finite ``SmallCategory`` and keep the ordinal leg as integer inequalities.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from dataclasses import dataclass

from .yoneda import Arrow, Object, SmallCategory, knowledge_presheaf_category

TemporalValuation = Mapping[Object, Hashable]

__all__ = [
    "TemporalBeckChevalleySquare",
    "TemporalBeckChevalleyWitness",
    "TemporalCategoryWitness",
    "TemporalOneCell",
    "TemporalTwoCell",
    "TemporalValuation",
    "TemporalZeroCell",
    "opposite_category",
    "reindex_valuation",
    "sample_temporal_bc_square",
    "temporal_beck_chevalley",
    "temporal_compose",
    "temporal_identity",
    "temporal_one_cells",
    "temporal_two_category",
    "twocell_category",
    "twocell_identity",
    "twocell_vcompose",
]


@dataclass(frozen=True, slots=True)
class TemporalZeroCell:
    """A 0-cell ``(tau, A)``: settling step plus predicate-category object."""

    tau: int
    obj: Object

    def __post_init__(self) -> None:
        if self.tau < 0:
            msg = "tau must be a natural number"
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class TemporalOneCell:
    """A 1-cell ``(f, h)`` with predicate arrow and settling-axis advance."""

    source: TemporalZeroCell
    target: TemporalZeroCell
    arrow: Arrow

    def __post_init__(self) -> None:
        if self.arrow.source != self.source.obj or self.arrow.target != self.target.obj:
            msg = "arrow endpoints must match the temporal 1-cell endpoints"
            raise ValueError(msg)
        if not self.target.tau <= self.source.tau:
            msg = "target tau must be less than or equal to source tau"
            raise ValueError(msg)

    @property
    def settling_closes(self) -> bool:
        """The lambda-op settling leg exists."""

        return self.target.tau <= self.source.tau


@dataclass(frozen=True, slots=True)
class TemporalTwoCell:
    """A strict-regime 2-cell: equality of parallel predicate legs."""

    source: TemporalOneCell
    target: TemporalOneCell

    def __post_init__(self) -> None:
        if self.source.source != self.target.source or self.source.target != self.target.target:
            msg = "2-cells require parallel 1-cells"
            raise ValueError(msg)
        if self.source.arrow != self.target.arrow:
            msg = "strict temporal 2-cells require equal predicate arrows"
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class TemporalCategoryWitness:
    """Bundled witness for the category laws of temporal 1-cells and 2-cells."""

    left_identity: bool
    right_identity: bool
    associative: bool
    twocell_left_identity: bool
    twocell_right_identity: bool
    twocell_associative: bool

    @property
    def holds(self) -> bool:
        """All sampled temporal category laws hold."""

        return (
            self.left_identity
            and self.right_identity
            and self.associative
            and self.twocell_left_identity
            and self.twocell_right_identity
            and self.twocell_associative
        )


@dataclass(frozen=True, slots=True)
class TemporalBeckChevalleySquare:
    """A finite temporal pseudo-pullback square for reindexing valuations."""

    objects: tuple[Object, ...]
    r: Mapping[Object, Object]
    s: Mapping[Object, Object]
    tau_p: int
    tau_a: int
    tau_b: int
    tau_c: int

    def __post_init__(self) -> None:
        if len(set(self.objects)) != len(self.objects):
            msg = "duplicate objects"
            raise ValueError(msg)
        object_set = set(self.objects)
        for name, base_map in (("r", self.r), ("s", self.s)):
            has_bad_codomain = any(value not in object_set for value in base_map.values())
            if set(base_map) != object_set or has_bad_codomain:
                msg = f"{name} must be an endomap of the square objects"
                raise ValueError(msg)
        if min(self.tau_p, self.tau_a, self.tau_b, self.tau_c) < 0:
            msg = "settling levels must be natural numbers"
            raise ValueError(msg)
        if not (self.tau_p <= self.tau_a <= self.tau_c and self.tau_p <= self.tau_b <= self.tau_c):
            msg = "settling levels must close through the square"
            raise ValueError(msg)
        if not self.predicate_axis_commutes:
            msg = "predicate-axis maps must commute"
            raise ValueError(msg)

    @property
    def predicate_axis_commutes(self) -> bool:
        """The two base reindexing maps commute."""

        return all(self.s[self.r[obj]] == self.r[self.s[obj]] for obj in self.objects)

    @property
    def settling_axis_closes(self) -> bool:
        """The temporal corner advances to the comparison corner."""

        return self.tau_p <= self.tau_c


@dataclass(frozen=True, slots=True)
class TemporalBeckChevalleyWitness:
    """Bundled witness that the temporal Beck-Chevalley square commutes."""

    predicate_axis: bool
    settling_axis: bool
    dual_predicate_axis: bool
    invertible_comparison: bool

    @property
    def holds(self) -> bool:
        """The finite temporal Beck-Chevalley witness holds."""

        return (
            self.predicate_axis
            and self.settling_axis
            and self.dual_predicate_axis
            and self.invertible_comparison
        )


def temporal_identity(category: SmallCategory, cell: TemporalZeroCell) -> TemporalOneCell:
    """The identity temporal 1-cell ``(id_C, le_refl)``."""

    if cell.obj not in category.objects:
        msg = "cell object must belong to the category"
        raise ValueError(msg)
    return TemporalOneCell(cell, cell, category.identity(cell.obj))


def temporal_compose(
    category: SmallCategory,
    first: TemporalOneCell,
    second: TemporalOneCell,
) -> TemporalOneCell:
    """Compose temporal 1-cells in diagrammatic order: ``first`` then ``second``."""

    if first.target != second.source:
        msg = "temporal composition requires first.target == second.source"
        raise ValueError(msg)
    return TemporalOneCell(
        source=first.source,
        target=second.target,
        arrow=category.compose(first.arrow, second.arrow),
    )


def temporal_one_cells(
    category: SmallCategory,
    cells: tuple[TemporalZeroCell, ...],
) -> tuple[TemporalOneCell, ...]:
    """Enumerate all temporal 1-cells among sampled zero-cells."""

    return tuple(
        TemporalOneCell(source, target, arrow)
        for source in cells
        for target in cells
        if target.tau <= source.tau
        for arrow in category.hom(source.obj, target.obj)
    )


def twocell_identity(cell: TemporalOneCell) -> TemporalTwoCell:
    """The identity temporal 2-cell."""

    return TemporalTwoCell(cell, cell)


def twocell_vcompose(first: TemporalTwoCell, second: TemporalTwoCell) -> TemporalTwoCell:
    """Vertically compose temporal 2-cells in diagrammatic order."""

    if first.target != second.source:
        msg = "vertical composition requires first.target == second.source"
        raise ValueError(msg)
    return TemporalTwoCell(first.source, second.target)


def _parallel_twocells(one_cells: tuple[TemporalOneCell, ...]) -> tuple[TemporalTwoCell, ...]:
    return tuple(
        TemporalTwoCell(left, right)
        for left in one_cells
        for right in one_cells
        if left.source == right.source and left.target == right.target and left.arrow == right.arrow
    )


def twocell_category(one_cells: tuple[TemporalOneCell, ...]) -> tuple[bool, bool, bool]:
    """Check identity and associativity laws for strict temporal 2-cells."""

    two_cells = _parallel_twocells(one_cells)
    left_identity = all(
        twocell_vcompose(alpha, twocell_identity(alpha.target)) == alpha for alpha in two_cells
    )
    right_identity = all(
        twocell_vcompose(twocell_identity(alpha.source), alpha) == alpha for alpha in two_cells
    )
    associative = all(
        twocell_vcompose(twocell_vcompose(alpha, beta), gamma)
        == twocell_vcompose(alpha, twocell_vcompose(beta, gamma))
        for alpha in two_cells
        for beta in two_cells
        for gamma in two_cells
        if alpha.target == beta.source and beta.target == gamma.source
    )
    return left_identity, right_identity, associative


def temporal_two_category(
    category: SmallCategory,
    cells: tuple[TemporalZeroCell, ...],
) -> TemporalCategoryWitness:
    """Check the finite strict temporal 2-category laws on sampled cells."""

    one_cells = temporal_one_cells(category, cells)
    left_identity = all(
        temporal_compose(category, temporal_identity(category, cell.source), cell) == cell
        for cell in one_cells
    )
    right_identity = all(
        temporal_compose(category, cell, temporal_identity(category, cell.target)) == cell
        for cell in one_cells
    )
    associative = all(
        temporal_compose(category, temporal_compose(category, first, second), third)
        == temporal_compose(category, first, temporal_compose(category, second, third))
        for first in one_cells
        for second in one_cells
        for third in one_cells
        if first.target == second.source and second.target == third.source
    )
    two_left, two_right, two_assoc = twocell_category(one_cells)
    return TemporalCategoryWitness(
        left_identity=left_identity,
        right_identity=right_identity,
        associative=associative,
        twocell_left_identity=two_left,
        twocell_right_identity=two_right,
        twocell_associative=two_assoc,
    )


def opposite_category(category: SmallCategory) -> SmallCategory:
    """Return the finite opposite category ``C^op``."""

    op_by_arrow = {
        arrow: Arrow(f"{arrow.name}^op", arrow.target, arrow.source) for arrow in category.arrows
    }
    original_by_op = {op: arrow for arrow, op in op_by_arrow.items()}
    arrows = tuple(op_by_arrow[arrow] for arrow in category.arrows)
    identities = {obj: op_by_arrow[category.identity(obj)] for obj in category.objects}
    composition = {
        (left_op, right_op): op_by_arrow[
            category.compose(original_by_op[right_op], original_by_op[left_op])
        ]
        for left_op in arrows
        for right_op in arrows
        if left_op.target == right_op.source
    }
    return SmallCategory(category.objects, arrows, identities, composition)


def reindex_valuation(
    base_map: Mapping[Object, Object],
    valuation: TemporalValuation,
) -> dict[Object, Hashable]:
    """Reindex a finite valuation by precomposition with ``base_map``."""

    missing = set(base_map.values()) - set(valuation)
    if missing:
        msg = f"valuation missing mapped objects: {sorted(missing, key=str)!r}"
        raise ValueError(msg)
    return {obj: valuation[target] for obj, target in base_map.items()}


def temporal_beck_chevalley(
    square: TemporalBeckChevalleySquare,
    valuation: TemporalValuation,
) -> TemporalBeckChevalleyWitness:
    """Check the finite temporal Beck-Chevalley comparison."""

    sr = reindex_valuation(square.s, reindex_valuation(square.r, valuation))
    rs = reindex_valuation(square.r, reindex_valuation(square.s, valuation))
    return TemporalBeckChevalleyWitness(
        predicate_axis=sr == rs,
        settling_axis=square.settling_axis_closes,
        dual_predicate_axis=rs == sr,
        invertible_comparison=sr == rs and rs == sr,
    )


def sample_temporal_bc_square() -> TemporalBeckChevalleySquare:
    """A small commuting temporal square over the FOUR knowledge objects."""

    objects = knowledge_presheaf_category().objects
    to_top: dict[Object, Object] = {obj: "conflict" for obj in objects}
    keep_top: dict[Object, Object] = {
        "none": "none",
        "true": "conflict",
        "false": "conflict",
        "conflict": "conflict",
    }
    return TemporalBeckChevalleySquare(
        objects=objects,
        r=to_top,
        s=keep_top,
        tau_p=0,
        tau_a=1,
        tau_b=2,
        tau_c=3,
    )
