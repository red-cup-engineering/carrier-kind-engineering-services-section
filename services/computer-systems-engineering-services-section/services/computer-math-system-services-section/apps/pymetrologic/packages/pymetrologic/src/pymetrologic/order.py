"""Finite order infrastructure from ``RelMath.Order.OrderInfra``.

Lean derives the order-theory scaffold used by later RelMath modules:
preorders, partial orders, algebraic lattices whose order is ``a <= b`` iff
``a meet b = a``, bounded/distributive refinements, complete lattices, and
monotone maps.  PyMetroLogic keeps the finite executable shadow.
"""

from __future__ import annotations

from collections.abc import Callable, Hashable, Iterable
from dataclasses import dataclass
from itertools import chain, combinations
from typing import Generic, TypeVar

T = TypeVar("T", bound=Hashable)
U = TypeVar("U", bound=Hashable)

__all__ = [
    "AlgebraicLattice",
    "BoundedAlgebraicLattice",
    "FiniteCompleteLattice",
    "FinitePartialOrder",
    "FinitePreorder",
    "MonotoneMap",
    "powerset_complete_lattice",
]


@dataclass(frozen=True, slots=True)
class FinitePreorder(Generic[T]):
    """A finite preorder: reflexive and transitive."""

    elements: tuple[T, ...]
    leq: Callable[[T, T], bool]

    def __post_init__(self) -> None:
        _validate_unique(self.elements)

    def is_reflexive(self) -> bool:
        """Every element is below itself."""

        return all(self.leq(element, element) for element in self.elements)

    def is_transitive(self) -> bool:
        """The order relation composes."""

        return all(
            not (self.leq(a, b) and self.leq(b, c)) or self.leq(a, c)
            for a in self.elements
            for b in self.elements
            for c in self.elements
        )

    @property
    def holds(self) -> bool:
        """Whether the finite relation satisfies the preorder laws."""

        return self.is_reflexive() and self.is_transitive()


@dataclass(frozen=True, slots=True)
class FinitePartialOrder(Generic[T]):
    """A finite partial order: preorder plus antisymmetry."""

    elements: tuple[T, ...]
    leq: Callable[[T, T], bool]

    def __post_init__(self) -> None:
        _validate_unique(self.elements)

    def preorder(self) -> FinitePreorder[T]:
        """Forget antisymmetry."""

        return FinitePreorder(self.elements, self.leq)

    def is_antisymmetric(self) -> bool:
        """Mutual comparability forces equality."""

        return all(
            not (self.leq(a, b) and self.leq(b, a)) or a == b
            for a in self.elements
            for b in self.elements
        )

    @property
    def holds(self) -> bool:
        """Whether the finite relation satisfies the partial-order laws."""

        return self.preorder().holds and self.is_antisymmetric()


@dataclass(frozen=True, slots=True)
class MonotoneMap(Generic[T, U]):
    """A monotone map between finite preorders."""

    domain: FinitePreorder[T]
    codomain: FinitePreorder[U]
    map: Callable[[T], U]

    @property
    def holds(self) -> bool:
        """Whether ``a <= b`` implies ``f a <= f b``."""

        return all(
            not self.domain.leq(a, b) or self.codomain.leq(self.map(a), self.map(b))
            for a in self.domain.elements
            for b in self.domain.elements
        )


@dataclass(frozen=True, slots=True)
class AlgebraicLattice(Generic[T]):
    """A finite algebraic lattice with order derived from meet."""

    elements: tuple[T, ...]
    meet: Callable[[T, T], T]
    join: Callable[[T, T], T]

    def __post_init__(self) -> None:
        _validate_unique(self.elements)

    def leq(self, left: T, right: T) -> bool:
        """The derived order: ``left <= right`` iff ``left meet right = left``."""

        return self.meet(left, right) == left

    def partial_order(self) -> FinitePartialOrder[T]:
        """The partial order derived from the lattice operations."""

        return FinitePartialOrder(self.elements, self.leq)

    def is_lattice(self) -> bool:
        """Check commutativity, associativity, idempotence, and absorption."""

        return (
            _binary_commutative(self.elements, self.meet)
            and _binary_commutative(self.elements, self.join)
            and _binary_associative(self.elements, self.meet)
            and _binary_associative(self.elements, self.join)
            and all(self.meet(a, a) == a and self.join(a, a) == a for a in self.elements)
            and all(
                self.meet(a, self.join(a, b)) == a and self.join(a, self.meet(a, b)) == a
                for a in self.elements
                for b in self.elements
            )
        )

    def meet_is_glb(self) -> bool:
        """The meet operation is the greatest lower bound."""

        return all(
            self.leq(self.meet(a, b), a)
            and self.leq(self.meet(a, b), b)
            and (not (self.leq(c, a) and self.leq(c, b)) or self.leq(c, self.meet(a, b)))
            for a in self.elements
            for b in self.elements
            for c in self.elements
        )

    def join_is_lub(self) -> bool:
        """The join operation is the least upper bound."""

        return all(
            self.leq(a, self.join(a, b))
            and self.leq(b, self.join(a, b))
            and (not (self.leq(a, c) and self.leq(b, c)) or self.leq(self.join(a, b), c))
            for a in self.elements
            for b in self.elements
            for c in self.elements
        )

    def meet_order_matches_join_order(self) -> bool:
        """The derived meet-order agrees with ``a join b = b``."""

        return all(
            self.leq(a, b) == (self.join(a, b) == b) for a in self.elements for b in self.elements
        )

    def is_distributive(self) -> bool:
        """Check ``a meet (b join c) = (a meet b) join (a meet c)``."""

        return all(
            self.meet(a, self.join(b, c)) == self.join(self.meet(a, b), self.meet(a, c))
            for a in self.elements
            for b in self.elements
            for c in self.elements
        )

    @property
    def holds(self) -> bool:
        """Whether the finite operations satisfy the Lean lattice consequences."""

        return (
            self.is_lattice()
            and self.partial_order().holds
            and self.meet_is_glb()
            and self.join_is_lub()
            and self.meet_order_matches_join_order()
        )


@dataclass(frozen=True, slots=True)
class BoundedAlgebraicLattice(Generic[T]):
    """A finite bounded algebraic lattice with explicit top and bottom."""

    lattice: AlgebraicLattice[T]
    bot: T
    top: T

    def leq(self, left: T, right: T) -> bool:
        """Use the underlying lattice order."""

        return self.lattice.leq(left, right)

    def bot_le(self) -> bool:
        """The bottom element is below everything."""

        return all(self.leq(self.bot, element) for element in self.lattice.elements)

    def le_top(self) -> bool:
        """Every element is below top."""

        return all(self.leq(element, self.top) for element in self.lattice.elements)

    @property
    def holds(self) -> bool:
        """Whether the bounded lattice laws hold."""

        return (
            self.lattice.holds
            and all(
                self.lattice.meet(element, self.top) == element
                and self.lattice.join(element, self.bot) == element
                for element in self.lattice.elements
            )
            and self.bot_le()
            and self.le_top()
        )


@dataclass(frozen=True, slots=True)
class FiniteCompleteLattice(Generic[T]):
    """A finite complete lattice given by order and arbitrary suprema."""

    elements: tuple[T, ...]
    leq: Callable[[T, T], bool]
    sup: Callable[[frozenset[T]], T]

    def __post_init__(self) -> None:
        _validate_unique(self.elements)

    def partial_order(self) -> FinitePartialOrder[T]:
        """The underlying partial order."""

        return FinitePartialOrder(self.elements, self.leq)

    def s_inf(self, subset: Iterable[T]) -> T:
        """Infimum as the supremum of lower bounds."""

        targets = frozenset(subset)
        lower_bounds = frozenset(
            candidate
            for candidate in self.elements
            if all(self.leq(candidate, target) for target in targets)
        )
        return self.sup(lower_bounds)

    def top(self) -> T:
        """The supremum of the full carrier."""

        return self.sup(frozenset(self.elements))

    def bot(self) -> T:
        """The supremum of the empty set."""

        return self.sup(frozenset())

    def sup_laws_hold(self) -> bool:
        """Check the universal property of finite suprema."""

        return all(
            all(self.leq(member, self.sup(subset)) for member in subset)
            and all(
                not all(self.leq(member, bound) for member in subset)
                or self.leq(self.sup(subset), bound)
                for bound in self.elements
            )
            for subset in _subsets(self.elements)
        )

    def inf_laws_hold(self) -> bool:
        """Check the derived universal property of finite infima."""

        return all(
            all(self.leq(self.s_inf(subset), member) for member in subset)
            and all(
                not all(self.leq(bound, member) for member in subset)
                or self.leq(bound, self.s_inf(subset))
                for bound in self.elements
            )
            for subset in _subsets(self.elements)
        )

    @property
    def holds(self) -> bool:
        """Whether the finite complete-lattice laws hold."""

        return self.partial_order().holds and self.sup_laws_hold() and self.inf_laws_hold()


def powerset_complete_lattice(universe: Iterable[T]) -> FiniteCompleteLattice[frozenset[T]]:
    """The finite powerset lattice ordered by subset inclusion."""

    base = tuple(universe)
    _validate_unique(base)
    elements = tuple(frozenset(subset) for subset in _subsets(base))
    return FiniteCompleteLattice(
        elements=elements,
        leq=lambda left, right: left.issubset(right),
        sup=lambda subsets: frozenset().union(*subsets) if subsets else frozenset(),
    )


def _validate_unique(values: tuple[Hashable, ...]) -> None:
    if len(set(values)) != len(values):
        msg = "finite carriers must have unique elements"
        raise ValueError(msg)


def _binary_commutative(values: tuple[T, ...], op: Callable[[T, T], T]) -> bool:
    return all(op(a, b) == op(b, a) for a in values for b in values)


def _binary_associative(values: tuple[T, ...], op: Callable[[T, T], T]) -> bool:
    return all(op(op(a, b), c) == op(a, op(b, c)) for a in values for b in values for c in values)


def _subsets(values: tuple[T, ...]) -> tuple[frozenset[T], ...]:
    return tuple(
        frozenset(subset)
        for subset in chain.from_iterable(combinations(values, r) for r in range(len(values) + 1))
    )
