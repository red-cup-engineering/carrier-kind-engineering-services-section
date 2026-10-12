"""Probability as the posit made quantitative (RelMath.Probability.Measure).

A probability is a **valuation**: graded charge over the events of a sample space, the
certain event weighted maximally, the impossible event 0, disjoint events adding. With no
reals in the corpus, the value is the **finite counting measure** ``measure(A) = |A ∩ Ω|``
— the number of listed outcomes at which the event's predicate holds. ``P(A) = measure(A) /
total`` is tracked as the pair ``(measure(A), total)``.

Events form the Boolean algebra of predicates ``Ω → bool`` (intersection ∩, union ∪,
complement, subset). The proven spine: the impossible event measures 0, the certain event
measures the full count, disjoint events add, the measure is monotone under subset, the
complement law ``measure(compl A) = total − measure(A)`` holds, and conditioning is
restriction — ``P(A|B)`` is ``measure(A ∩ B)``, with the symmetric Bayes numerator
``measure(A ∩ B) = measure(B ∩ A)`` the fiber-adjoint making conditioning a restriction.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

T = TypeVar("T")

Event = Callable[[T], bool]

__all__ = [
    "Event",
    "additivity_holds",
    "bayes_symmetry_holds",
    "complement_law_holds",
    "cond_measure",
    "event_compl",
    "event_empty",
    "event_inter",
    "event_union",
    "event_univ",
    "is_disjoint_event",
    "is_subset_event",
    "measure",
    "monotone_holds",
    "total_mass",
]


def event_empty(x: object) -> bool:
    """The impossible event: false at every outcome."""
    return False


def event_univ(x: object) -> bool:
    """The certain event: true at every outcome."""
    return True


def event_inter(a: Event[T], b: Event[T]) -> Event[T]:
    """The event intersection ``A ∩ B``."""
    return lambda x: a(x) and b(x)


def event_union(a: Event[T], b: Event[T]) -> Event[T]:
    """The event union ``A ∪ B``."""
    return lambda x: a(x) or b(x)


def event_compl(a: Event[T]) -> Event[T]:
    """The event complement."""
    return lambda x: not a(x)


def measure(outcomes: Sequence[T], event: Event[T]) -> int:
    """The counting measure ``measure(A) = |A ∩ Ω|`` — outcomes where the event holds."""
    return sum(1 for x in outcomes if event(x))


def total_mass(outcomes: Sequence[T]) -> int:
    """The total mass ``measure(Ω) = |Ω|`` (the counting analogue of ``P(Ω) = 1``)."""
    return len(outcomes)


def is_disjoint_event(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> bool:
    """Whether ``A`` and ``B`` are disjoint over the sample space: no outcome in both."""
    return all(not (a(x) and b(x)) for x in outcomes)


def is_subset_event(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> bool:
    """Whether ``A ⊆ B`` over the sample space: every ``A``-outcome is a ``B``-outcome."""
    return all(b(x) for x in outcomes if a(x))


def cond_measure(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> int:
    """Conditioning as restriction: the Bayes numerator ``measure(A ∩ B)`` (``P(A|B)`` is
    the pair ``(cond_measure, measure(B))``)."""
    return measure(outcomes, event_inter(a, b))


def additivity_holds(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> bool:
    """Finite additivity on disjoint events: if ``A ∩ B = ∅`` then
    ``measure(A ∪ B) = measure(A) + measure(B)`` (vacuously true if not disjoint)."""
    if not is_disjoint_event(outcomes, a, b):
        return True
    return measure(outcomes, event_union(a, b)) == measure(outcomes, a) + measure(outcomes, b)


def monotone_holds(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> bool:
    """Monotonicity: if ``A ⊆ B`` then ``measure(A) ≤ measure(B)`` (vacuous otherwise)."""
    if not is_subset_event(outcomes, a, b):
        return True
    return measure(outcomes, a) <= measure(outcomes, b)


def complement_law_holds(outcomes: Sequence[T], a: Event[T]) -> bool:
    """The complement law ``measure(compl A) = total − measure(A)`` (so the two add to total)."""
    return measure(outcomes, event_compl(a)) == total_mass(outcomes) - measure(outcomes, a)


def bayes_symmetry_holds(outcomes: Sequence[T], a: Event[T], b: Event[T]) -> bool:
    """The symmetric Bayes numerator ``measure(A ∩ B) = measure(B ∩ A)``."""
    return cond_measure(outcomes, a, b) == cond_measure(outcomes, b, a)
