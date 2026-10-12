"""The finite FCA-Lambek-residuated-settling circle.

Executable shadow of ``RelMath.Order.LambekCalculus`` and
``RelMath.Order.FCALambekCircle``.  Lean proves the abstract algebraic edges;
the lab realizes them on finite data:

* FCA's derivation closure is an extensive, monotone, idempotent settling
  closure;
* concepts of a finite context form a complete lattice;
* the Boolean integral commutative residuated lattice is a commutative Lambek
  algebra, with one implication serving as both residuals;
* commutativity collapses the two Lambek residuals into a single implication.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from itertools import combinations

from pymetrologic import Context, close_extent, concepts, powerset, prime_attrs

Element = str
Concept = tuple[frozenset[str], frozenset[str]]

__all__ = [
    "Concept",
    "FCALambekCircleWitness",
    "LambekAlgebra",
    "LambekBiresiduationWitness",
    "LambekCollapseWitness",
    "boolean_lambek_algebra",
    "concept_lattice_is_complete",
    "fca_closure_is_settling_closure",
    "fca_lambek_circle",
    "lambek_biresiduation",
    "lambek_commutative_collapse",
    "sample_context",
]


@dataclass(frozen=True, slots=True)
class LambekAlgebra:
    """A finite lattice-ordered monoid with left and right residuals."""

    elements: tuple[Element, ...]
    order: frozenset[tuple[Element, Element]]
    dot_table: Mapping[tuple[Element, Element], Element]
    lres_table: Mapping[tuple[Element, Element], Element]
    rres_table: Mapping[tuple[Element, Element], Element]
    unit: Element

    def __post_init__(self) -> None:
        element_set = set(self.elements)
        if len(element_set) != len(self.elements):
            msg = "duplicate Lambek elements"
            raise ValueError(msg)
        if self.unit not in element_set:
            msg = "Lambek unit is not in the carrier"
            raise ValueError(msg)
        for left, right in self.order:
            if left not in element_set or right not in element_set:
                msg = "Lambek order references an element outside the carrier"
                raise ValueError(msg)
        for table in (self.dot_table, self.lres_table, self.rres_table):
            for (left, right), value in table.items():
                if left not in element_set or right not in element_set or value not in element_set:
                    msg = "Lambek operation table references an element outside the carrier"
                    raise ValueError(msg)

    def leq(self, left: Element, right: Element) -> bool:
        """The lattice order."""
        return (left, right) in self.order

    def dot(self, left: Element, right: Element) -> Element:
        """The Lambek product."""
        return self.dot_table[(left, right)]

    def lres(self, denominator: Element, numerator: Element) -> Element:
        """The left residual ``denominator \\ numerator``."""
        return self.lres_table[(denominator, numerator)]

    def rres(self, numerator: Element, denominator: Element) -> Element:
        """The right residual ``numerator / denominator``."""
        return self.rres_table[(numerator, denominator)]

    @property
    def associative(self) -> bool:
        """The product is associative."""
        return all(
            self.dot(self.dot(a, b), c) == self.dot(a, self.dot(b, c))
            for a in self.elements
            for b in self.elements
            for c in self.elements
        )

    @property
    def unit_laws(self) -> bool:
        """The unit is two-sided."""
        return all(
            self.dot(self.unit, element) == element and self.dot(element, self.unit) == element
            for element in self.elements
        )

    @property
    def commutative(self) -> bool:
        """The product is commutative."""
        return all(
            self.dot(left, right) == self.dot(right, left)
            for left in self.elements
            for right in self.elements
        )


@dataclass(frozen=True, slots=True)
class LambekBiresiduationWitness:
    """The finite Lambek laws derived from biresiduation."""

    left_adjunction: bool
    right_adjunction: bool
    left_modus_ponens: bool
    right_modus_ponens: bool
    dot_mono_left: bool
    dot_mono_right: bool
    lres_mono_numerator: bool
    lres_antitone_denominator: bool
    rres_mono_numerator: bool
    rres_antitone_denominator: bool
    unit_residuals: bool

    @property
    def holds(self) -> bool:
        """All finite Lambek biresiduation checks hold."""
        return (
            self.left_adjunction
            and self.right_adjunction
            and self.left_modus_ponens
            and self.right_modus_ponens
            and self.dot_mono_left
            and self.dot_mono_right
            and self.lres_mono_numerator
            and self.lres_antitone_denominator
            and self.rres_mono_numerator
            and self.rres_antitone_denominator
            and self.unit_residuals
        )


@dataclass(frozen=True, slots=True)
class LambekCollapseWitness:
    """The commutative collapse of Lambek's two residuals."""

    commutative: bool
    residuals_coincide: bool
    single_adjunction: bool

    @property
    def holds(self) -> bool:
        """The commutative collapse checks hold."""
        return self.commutative and self.residuals_coincide and self.single_adjunction


@dataclass(frozen=True, slots=True)
class FCALambekCircleWitness:
    """The three proved finite edges of the FCA-Lambek circle."""

    fca_closure_extensive: bool
    fca_closure_monotone: bool
    fca_closure_idempotent: bool
    concept_lattice_complete: bool
    lambek_biresiduation: LambekBiresiduationWitness
    lambek_commutative_collapse: LambekCollapseWitness
    wurm_completeness_documented_not_formalized: bool

    @property
    def holds(self) -> bool:
        """All finite algebraic circle checks hold."""
        return (
            self.fca_closure_extensive
            and self.fca_closure_monotone
            and self.fca_closure_idempotent
            and self.concept_lattice_complete
            and self.lambek_biresiduation.holds
            and self.lambek_commutative_collapse.holds
            and self.wurm_completeness_documented_not_formalized
        )


def boolean_lambek_algebra() -> LambekAlgebra:
    """The two-element Boolean residuated lattice as a commutative Lambek algebra."""
    elements = ("0", "1")
    order = frozenset({("0", "0"), ("0", "1"), ("1", "1")})

    def leq(left: Element, right: Element) -> bool:
        return (left, right) in order

    def dot(left: Element, right: Element) -> Element:
        return "1" if left == "1" and right == "1" else "0"

    def imp(denominator: Element, numerator: Element) -> Element:
        return "1" if leq(denominator, numerator) else numerator

    return LambekAlgebra(
        elements=elements,
        order=order,
        dot_table={(left, right): dot(left, right) for left in elements for right in elements},
        lres_table={(left, right): imp(left, right) for left in elements for right in elements},
        rres_table={(right, left): imp(left, right) for left in elements for right in elements},
        unit="1",
    )


def lambek_biresiduation(algebra: LambekAlgebra | None = None) -> LambekBiresiduationWitness:
    """Check the finite Lambek biresiduation laws."""
    alg = boolean_lambek_algebra() if algebra is None else algebra
    elems = alg.elements
    return LambekBiresiduationWitness(
        left_adjunction=all(
            alg.leq(alg.dot(a, b), c) == alg.leq(b, alg.lres(a, c))
            for a in elems
            for b in elems
            for c in elems
        ),
        right_adjunction=all(
            alg.leq(alg.dot(a, b), c) == alg.leq(a, alg.rres(c, b))
            for a in elems
            for b in elems
            for c in elems
        ),
        left_modus_ponens=all(alg.leq(alg.dot(a, alg.lres(a, c)), c) for a in elems for c in elems),
        right_modus_ponens=all(
            alg.leq(alg.dot(alg.rres(c, b), b), c) for b in elems for c in elems
        ),
        dot_mono_left=all(
            alg.leq(alg.dot(a, b), alg.dot(ap, b))
            for a in elems
            for ap in elems
            for b in elems
            if alg.leq(a, ap)
        ),
        dot_mono_right=all(
            alg.leq(alg.dot(a, b), alg.dot(a, bp))
            for a in elems
            for b in elems
            for bp in elems
            if alg.leq(b, bp)
        ),
        lres_mono_numerator=all(
            alg.leq(alg.lres(a, c), alg.lres(a, cp))
            for a in elems
            for c in elems
            for cp in elems
            if alg.leq(c, cp)
        ),
        lres_antitone_denominator=all(
            alg.leq(alg.lres(ap, c), alg.lres(a, c))
            for a in elems
            for ap in elems
            for c in elems
            if alg.leq(a, ap)
        ),
        rres_mono_numerator=all(
            alg.leq(alg.rres(c, b), alg.rres(cp, b))
            for b in elems
            for c in elems
            for cp in elems
            if alg.leq(c, cp)
        ),
        rres_antitone_denominator=all(
            alg.leq(alg.rres(c, bp), alg.rres(c, b))
            for b in elems
            for bp in elems
            for c in elems
            if alg.leq(b, bp)
        ),
        unit_residuals=all(
            alg.leq(alg.unit, alg.lres(a, a))
            and alg.leq(alg.unit, alg.rres(a, a))
            and alg.lres(alg.unit, a) == a
            and alg.rres(a, alg.unit) == a
            for a in elems
        ),
    )


def lambek_commutative_collapse(algebra: LambekAlgebra | None = None) -> LambekCollapseWitness:
    """Check that commutativity collapses left/right residuals to one implication."""
    alg = boolean_lambek_algebra() if algebra is None else algebra
    elems = alg.elements
    return LambekCollapseWitness(
        commutative=alg.commutative,
        residuals_coincide=all(alg.lres(a, c) == alg.rres(c, a) for a in elems for c in elems),
        single_adjunction=all(
            alg.leq(alg.dot(a, b), c) == alg.leq(b, alg.lres(a, c))
            for a in elems
            for b in elems
            for c in elems
        ),
    )


def sample_context() -> Context:
    """A small FCA context with four formal concepts."""
    return Context(
        objects=("a", "b", "c"),
        attributes=("x", "y"),
        incidence=frozenset({("a", "x"), ("a", "y"), ("b", "x"), ("c", "y")}),
    )


def fca_closure_is_settling_closure(ctx: Context | None = None) -> tuple[bool, bool, bool]:
    """FCA derivation closure has the settling closure laws."""
    actual = sample_context() if ctx is None else ctx
    subsets = powerset(actual.objects)
    extensive = all(extent <= close_extent(actual, extent) for extent in subsets)
    monotone = all(
        close_extent(actual, left) <= close_extent(actual, right)
        for left in subsets
        for right in subsets
        if left <= right
    )
    idempotent = all(
        close_extent(actual, close_extent(actual, extent)) == close_extent(actual, extent)
        for extent in subsets
    )
    return extensive, monotone, idempotent


def _concept_powerset(items: tuple[Concept, ...]) -> tuple[tuple[Concept, ...], ...]:
    return tuple(
        tuple(combo) for size in range(len(items) + 1) for combo in combinations(items, size)
    )


def _concept_for_extent(ctx: Context, extent: frozenset[str]) -> Concept:
    closed = close_extent(ctx, extent)
    return closed, prime_attrs(ctx, closed)


def concept_lattice_is_complete(ctx: Context | None = None) -> bool:
    """Finite complete-lattice check for the formal concepts of a context."""
    actual = sample_context() if ctx is None else ctx
    concept_tuple = concepts(actual)
    concept_set = set(concept_tuple)
    for selected in _concept_powerset(concept_tuple):
        if selected:
            join_seed = frozenset().union(*(extent for extent, _intent in selected))
            meet_seed = frozenset(actual.objects).intersection(
                *(extent for extent, _intent in selected)
            )
        else:
            join_seed = frozenset()
            meet_seed = frozenset(actual.objects)
        if _concept_for_extent(actual, join_seed) not in concept_set:
            return False
        if _concept_for_extent(actual, meet_seed) not in concept_set:
            return False
    return True


def fca_lambek_circle(
    ctx: Context | None = None,
    algebra: LambekAlgebra | None = None,
) -> FCALambekCircleWitness:
    """Assemble the finite FCA-Lambek-residuated-settling circle witness."""
    actual_ctx = sample_context() if ctx is None else ctx
    actual_alg = boolean_lambek_algebra() if algebra is None else algebra
    extensive, monotone, idempotent = fca_closure_is_settling_closure(actual_ctx)
    return FCALambekCircleWitness(
        fca_closure_extensive=extensive,
        fca_closure_monotone=monotone,
        fca_closure_idempotent=idempotent,
        concept_lattice_complete=concept_lattice_is_complete(actual_ctx),
        lambek_biresiduation=lambek_biresiduation(actual_alg),
        lambek_commutative_collapse=lambek_commutative_collapse(actual_alg),
        wurm_completeness_documented_not_formalized=True,
    )
