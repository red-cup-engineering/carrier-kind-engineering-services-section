"""Quantale-enriched sheaf core over Belnap FOUR.

Executable shadow of ``RelMath.Cohomology.QuantaleEnrichedSheaf``.  The concrete
quantale is FOUR with knowledge order, multiplication ``meet_k``, unit
``top/conflict``, and suprema computed by finite ``join_k``.  We also model
finite Q-categories, Q-functors, q-fuzzy equivalence composition, and the
degree-0 Laplacian fixed-point witness.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from pymetrologic.bilattice import BL, four
from pymetrologic.orderswap import FOUR_CHARGES

QObject = str

__all__ = [
    "ChargeQuantaleWitness",
    "H0LaplacianWitness",
    "QCatWitness",
    "QCategory",
    "QFunctor",
    "QFuzzyEquivalence",
    "QFuzzyEquivalenceWitness",
    "QObject",
    "charge_mul_img",
    "charge_quantale_laws",
    "charge_s_sup",
    "discrete_qcat",
    "h0_laplacian_fixed_points",
    "identity_qfunctor",
    "one_obj_qcat",
    "q_fuzzy_equivalence_composes",
    "q_laplacian",
    "qcat_is_quantale_category",
    "qfunctor_compose",
]

_FOUR = four()
_BOTTOM = _FOUR.none
_UNIT = _FOUR.conflict


@dataclass(frozen=True, slots=True)
class ChargeQuantaleWitness:
    """Finite witness that FOUR with ``meet_k`` is a commutative unital quantale."""

    assoc: bool
    commutative: bool
    unit: bool
    s_sup_upper: bool
    s_sup_least: bool
    mul_s_sup_distributes: bool
    mul_mono: bool

    @property
    def holds(self) -> bool:
        """All checked quantale laws hold."""
        return (
            self.assoc
            and self.commutative
            and self.unit
            and self.s_sup_upper
            and self.s_sup_least
            and self.mul_s_sup_distributes
            and self.mul_mono
        )


@dataclass(frozen=True, slots=True)
class QCategory:
    """A finite category enriched in the concrete FOUR quantale."""

    objects: tuple[QObject, ...]
    homs: Mapping[tuple[QObject, QObject], BL[int]]

    def hom(self, source: QObject, target: QObject) -> BL[int]:
        """Return the Q-valued hom for an ordered object pair."""
        if source not in self.objects or target not in self.objects:
            msg = "QCategory hom requested for an object outside the category"
            raise ValueError(msg)
        return self.homs.get((source, target), _BOTTOM)

    @property
    def reflexive(self) -> bool:
        """The unit is below each self-hom."""
        return all(_FOUR.leq_k(_UNIT, self.hom(obj, obj)) for obj in self.objects)

    @property
    def compositional(self) -> bool:
        """Composition inequality ``hom(x,y) * hom(y,z) <= hom(x,z)``."""
        return all(
            _FOUR.leq_k(
                _FOUR.meet_k(self.hom(x, y), self.hom(y, z)),
                self.hom(x, z),
            )
            for x in self.objects
            for y in self.objects
            for z in self.objects
        )

    @property
    def valid(self) -> bool:
        """The finite Q-category laws hold."""
        return self.reflexive and self.compositional


@dataclass(frozen=True, slots=True)
class QFunctor:
    """A finite Q-functor preserving homs upward in knowledge order."""

    source: QCategory
    target: QCategory
    object_map: Mapping[QObject, QObject]

    def map(self, obj: QObject) -> QObject:
        """Map an object of the source category."""
        if obj not in self.object_map:
            msg = "QFunctor has no image for object"
            raise ValueError(msg)
        return self.object_map[obj]

    @property
    def preserves_homs(self) -> bool:
        """Whether ``hom_C(x,y) <= hom_D(Fx,Fy)`` for all objects."""
        return all(
            _FOUR.leq_k(
                self.source.hom(x, y),
                self.target.hom(self.map(x), self.map(y)),
            )
            for x in self.source.objects
            for y in self.source.objects
        )


@dataclass(frozen=True, slots=True)
class QCatWitness:
    """Structural witness for the concrete Q-category theory."""

    quantale: ChargeQuantaleWitness
    one_object_qcat: bool
    discrete_qcat: bool
    identity_functor: bool
    composition_functor: bool

    @property
    def holds(self) -> bool:
        """All Q-category structural checks hold."""
        return (
            self.quantale.holds
            and self.one_object_qcat
            and self.discrete_qcat
            and self.identity_functor
            and self.composition_functor
        )


@dataclass(frozen=True, slots=True)
class QFuzzyEquivalence:
    """A q-fuzzy equivalence between finite FOUR-enriched categories."""

    grade: BL[int]
    source: QCategory
    target: QCategory
    fwd: QFunctor
    bwd: QFunctor

    @property
    def unit_source_left(self) -> bool:
        """``grade <= hom_C(GF x, x)``."""
        return all(
            _FOUR.leq_k(self.grade, self.source.hom(self.bwd.map(self.fwd.map(x)), x))
            for x in self.source.objects
        )

    @property
    def unit_source_right(self) -> bool:
        """``grade <= hom_C(x, GF x)``."""
        return all(
            _FOUR.leq_k(self.grade, self.source.hom(x, self.bwd.map(self.fwd.map(x))))
            for x in self.source.objects
        )

    @property
    def unit_target_left(self) -> bool:
        """``grade <= hom_D(FG y, y)``."""
        return all(
            _FOUR.leq_k(self.grade, self.target.hom(self.fwd.map(self.bwd.map(y)), y))
            for y in self.target.objects
        )

    @property
    def unit_target_right(self) -> bool:
        """``grade <= hom_D(y, FG y)``."""
        return all(
            _FOUR.leq_k(self.grade, self.target.hom(y, self.fwd.map(self.bwd.map(y))))
            for y in self.target.objects
        )

    @property
    def valid(self) -> bool:
        """All q-fuzzy round-trip bounds and functor laws hold."""
        return (
            self.fwd.preserves_homs
            and self.bwd.preserves_homs
            and self.unit_source_left
            and self.unit_source_right
            and self.unit_target_left
            and self.unit_target_right
        )


@dataclass(frozen=True, slots=True)
class QFuzzyEquivalenceWitness:
    """Witness that q-fuzzy equivalences compose with multiplicative grade."""

    composite_valid: bool
    composite_grade: BL[int]
    expected_grade: BL[int]
    grade_one_strict_source: bool
    grade_one_strict_target: bool

    @property
    def holds(self) -> bool:
        """All q-fuzzy equivalence composition checks hold."""
        return (
            self.composite_valid
            and self.composite_grade == self.expected_grade
            and self.grade_one_strict_source
            and self.grade_one_strict_target
        )


@dataclass(frozen=True, slots=True)
class H0LaplacianWitness:
    """Degree-0 Q-enriched cohomology as Laplacian fixed points."""

    weight: BL[int]
    fixed_points: tuple[BL[int], ...]
    idempotent: bool
    fixed_points_closed_under_join: bool
    fixed_points_are_below_weight: bool

    @property
    def holds(self) -> bool:
        """The degree-0 fixed-point witness holds."""
        return (
            self.idempotent
            and self.fixed_points_closed_under_join
            and self.fixed_points_are_below_weight
        )


def _charge(charge: BL[int]) -> BL[int]:
    if charge not in FOUR_CHARGES:
        msg = "charge is not one of Belnap FOUR's corners"
        raise ValueError(msg)
    return charge


def _charge_subsets() -> tuple[tuple[BL[int], ...], ...]:
    charges = tuple(FOUR_CHARGES)
    return tuple(
        tuple(charge for index, charge in enumerate(charges) if mask & (1 << index))
        for mask in range(1 << len(charges))
    )


def charge_s_sup(selected: Iterable[BL[int]]) -> BL[int]:
    """Knowledge supremum of a finite subset of FOUR charges."""
    acc = _BOTTOM
    for charge in selected:
        acc = _FOUR.join_k(acc, _charge(charge))
    return acc


def charge_mul_img(left: BL[int], selected: Iterable[BL[int]]) -> tuple[BL[int], ...]:
    """Image of a selected subset under ``left * -`` where ``* = meet_k``."""
    seen: dict[BL[int], None] = {}
    for right in selected:
        seen[_FOUR.meet_k(_charge(left), _charge(right))] = None
    return tuple(seen)


def charge_quantale_laws() -> ChargeQuantaleWitness:
    """Check the concrete FOUR quantale laws by finite exhaustion."""
    subsets = _charge_subsets()
    return ChargeQuantaleWitness(
        assoc=all(
            _FOUR.meet_k(_FOUR.meet_k(a, b), c) == _FOUR.meet_k(a, _FOUR.meet_k(b, c))
            for a in FOUR_CHARGES
            for b in FOUR_CHARGES
            for c in FOUR_CHARGES
        ),
        commutative=all(
            _FOUR.meet_k(a, b) == _FOUR.meet_k(b, a) for a in FOUR_CHARGES for b in FOUR_CHARGES
        ),
        unit=all(_FOUR.meet_k(_UNIT, charge) == charge for charge in FOUR_CHARGES),
        s_sup_upper=all(
            _FOUR.leq_k(charge, charge_s_sup(subset)) for subset in subsets for charge in subset
        ),
        s_sup_least=all(
            not all(_FOUR.leq_k(charge, bound) for charge in subset)
            or _FOUR.leq_k(charge_s_sup(subset), bound)
            for subset in subsets
            for bound in FOUR_CHARGES
        ),
        mul_s_sup_distributes=all(
            _FOUR.meet_k(left, charge_s_sup(subset)) == charge_s_sup(charge_mul_img(left, subset))
            for left in FOUR_CHARGES
            for subset in subsets
        ),
        mul_mono=all(
            not (_FOUR.leq_k(a, a2) and _FOUR.leq_k(b, b2))
            or _FOUR.leq_k(_FOUR.meet_k(a, b), _FOUR.meet_k(a2, b2))
            for a in FOUR_CHARGES
            for a2 in FOUR_CHARGES
            for b in FOUR_CHARGES
            for b2 in FOUR_CHARGES
        ),
    )


def one_obj_qcat() -> QCategory:
    """The one-object Q-category with self-hom the quantale unit."""
    return QCategory(objects=("unit",), homs={("unit", "unit"): _UNIT})


def discrete_qcat(objects: Iterable[QObject]) -> QCategory:
    """The discrete Q-category: unit on identities, bottom off identities."""
    objs = tuple(dict.fromkeys(objects))
    return QCategory(
        objects=objs,
        homs={(x, y): (_UNIT if x == y else _BOTTOM) for x in objs for y in objs},
    )


def identity_qfunctor(category: QCategory) -> QFunctor:
    """The identity Q-functor."""
    return QFunctor(category, category, {obj: obj for obj in category.objects})


def qfunctor_compose(outer: QFunctor, inner: QFunctor) -> QFunctor:
    """Compose Q-functors ``outer after inner``."""
    if inner.target != outer.source:
        msg = "QFunctor composition requires inner.target == outer.source"
        raise ValueError(msg)
    return QFunctor(
        source=inner.source,
        target=outer.target,
        object_map={obj: outer.map(inner.map(obj)) for obj in inner.source.objects},
    )


def qcat_is_quantale_category() -> QCatWitness:
    """Check the concrete Q-category structural theory."""
    one = one_obj_qcat()
    discrete = discrete_qcat(("x", "y"))
    id_discrete = identity_qfunctor(discrete)
    composed = qfunctor_compose(id_discrete, id_discrete)
    return QCatWitness(
        quantale=charge_quantale_laws(),
        one_object_qcat=one.valid,
        discrete_qcat=discrete.valid,
        identity_functor=id_discrete.preserves_homs,
        composition_functor=composed.preserves_homs,
    )


def _identity_equiv(category: QCategory, grade: BL[int]) -> QFuzzyEquivalence:
    identity = identity_qfunctor(category)
    return QFuzzyEquivalence(
        grade=grade,
        source=category,
        target=category,
        fwd=identity,
        bwd=identity,
    )


def _compose_equivalence(
    left: QFuzzyEquivalence,
    right: QFuzzyEquivalence,
) -> QFuzzyEquivalence:
    if left.target != right.source:
        msg = "QFuzzyEquivalence composition requires left.target == right.source"
        raise ValueError(msg)
    return QFuzzyEquivalence(
        grade=_FOUR.meet_k(left.grade, right.grade),
        source=left.source,
        target=right.target,
        fwd=qfunctor_compose(right.fwd, left.fwd),
        bwd=qfunctor_compose(left.bwd, right.bwd),
    )


def q_fuzzy_equivalence_composes() -> QFuzzyEquivalenceWitness:
    """Check q-fuzzy equivalence composition on finite FOUR-enriched examples."""
    category = discrete_qcat(("x", "y"))
    left = _identity_equiv(category, _FOUR.true)
    right = _identity_equiv(category, _FOUR.false)
    composite = _compose_equivalence(left, right)
    strict = _identity_equiv(category, _UNIT)
    return QFuzzyEquivalenceWitness(
        composite_valid=composite.valid,
        composite_grade=composite.grade,
        expected_grade=_FOUR.meet_k(left.grade, right.grade),
        grade_one_strict_source=all(
            _FOUR.leq_k(_UNIT, category.hom(strict.bwd.map(strict.fwd.map(x)), x))
            for x in category.objects
        ),
        grade_one_strict_target=all(
            _FOUR.leq_k(_UNIT, category.hom(strict.fwd.map(strict.bwd.map(y)), y))
            for y in category.objects
        ),
    )


def q_laplacian(weight: BL[int], charge: BL[int]) -> BL[int]:
    """Degree-0 Lawvere-Laplacian ``L_s(x) = meet_k(x, s)``."""
    return _FOUR.meet_k(_charge(charge), _charge(weight))


def h0_laplacian_fixed_points(weight: BL[int]) -> H0LaplacianWitness:
    """Check that degree-0 Q-cohomology is the Laplacian fixed-point set."""
    w = _charge(weight)
    fixed = tuple(charge for charge in FOUR_CHARGES if q_laplacian(w, charge) == charge)
    return H0LaplacianWitness(
        weight=w,
        fixed_points=fixed,
        idempotent=all(
            q_laplacian(w, q_laplacian(w, charge)) == q_laplacian(w, charge)
            for charge in FOUR_CHARGES
        ),
        fixed_points_closed_under_join=all(
            q_laplacian(w, _FOUR.join_k(x, y)) == _FOUR.join_k(x, y) for x in fixed for y in fixed
        ),
        fixed_points_are_below_weight=all(_FOUR.leq_k(charge, w) for charge in fixed),
    )
