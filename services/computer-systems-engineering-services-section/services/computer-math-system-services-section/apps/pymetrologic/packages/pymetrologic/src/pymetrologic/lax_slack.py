"""Lax-idempotence slack diagnosis (RelMath.Closure.LaxSlackDiagnosis).

The Lean result isolates why Kock-Zoeberlein-style lax idempotence collapses to
strict idempotence in the current valuation carrier: antisymmetry. If ``f`` is
inflationary and ``f(f(x)) <= f(x)``, antisymmetry plus inflation at ``f(x)``
forces ``f(f(x)) = f(x)``. A genuine lax cell therefore witnesses that the
carrier is non-thin: two distinct values are mutually related.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

from pymetrologic.closure import FiniteLattice, is_closure

E = TypeVar("E")

__all__ = [
    "FiniteRelation",
    "KZStrictWitness",
    "LaxSlackWitness",
    "closure_no_lax_slack",
    "has_lax_slack",
    "is_antisymmetric",
    "is_inflationary_relation",
    "kz_iff_strict_of_antisymm",
    "kz_inequality_at",
    "lax_slack_witness",
    "strict_idempotent_at",
]


@dataclass(frozen=True)
class FiniteRelation(Generic[E]):
    """A finite carrier with a bare relation ``<=``.

    This intentionally does not require antisymmetry. That lets the executable
    model show the Lean theorem's contrapositive: real lax slack can exist only
    when the relation is not thin.
    """

    elements: tuple[E, ...]
    leq: Callable[[E, E], bool]

    def related_both_ways(self, left: E, right: E) -> bool:
        """Return whether ``left <= right`` and ``right <= left``."""
        return self.leq(left, right) and self.leq(right, left)


@dataclass(frozen=True)
class KZStrictWitness(Generic[E]):
    """The local KZ/strict-idempotence comparison at one point."""

    point: E
    once: E
    twice: E
    kz_inequality: bool
    inflation_at_once: bool
    strict_idempotent: bool
    forced_by_antisymmetry: bool


@dataclass(frozen=True)
class LaxSlackWitness(Generic[E]):
    """A genuine lax cell, therefore a witnessed antisymmetry failure."""

    point: E
    once: E
    twice: E
    kz_inequality: bool
    inflation_at_once: bool
    distinct: bool
    antisymmetry_failure: bool

    @property
    def holds(self) -> bool:
        """All legs of the lax-slack diagnosis hold."""
        return (
            self.kz_inequality
            and self.inflation_at_once
            and self.distinct
            and self.antisymmetry_failure
        )


def is_antisymmetric(rel: FiniteRelation[E]) -> bool:
    """Check antisymmetry over the finite carrier."""
    return all(
        left == right or not rel.related_both_ways(left, right)
        for left in rel.elements
        for right in rel.elements
    )


def is_inflationary_relation(rel: FiniteRelation[E], f: Callable[[E], E]) -> bool:
    """Check ``x <= f(x)`` over the finite carrier."""
    return all(rel.leq(x, f(x)) for x in rel.elements)


def kz_inequality_at(rel: FiniteRelation[E], f: Callable[[E], E], point: E) -> bool:
    """The local KZ inequality ``f(f(point)) <= f(point)``."""
    return rel.leq(f(f(point)), f(point))


def strict_idempotent_at(f: Callable[[E], E], point: E) -> bool:
    """The local strict-idempotence equation ``f(f(point)) = f(point)``."""
    return f(f(point)) == f(point)


def kz_iff_strict_of_antisymm(
    rel: FiniteRelation[E], f: Callable[[E], E]
) -> tuple[KZStrictWitness[E], ...]:
    """Compare KZ and strict idempotence on an inflationary antisymmetric carrier."""

    if not is_antisymmetric(rel):
        msg = "KZ collapses to strict idempotence only on an antisymmetric relation"
        raise ValueError(msg)
    if not is_inflationary_relation(rel, f):
        msg = "KZ/strict comparison requires an inflationary map"
        raise ValueError(msg)
    return tuple(
        KZStrictWitness(
            point=x,
            once=f(x),
            twice=f(f(x)),
            kz_inequality=kz_inequality_at(rel, f, x),
            inflation_at_once=rel.leq(f(x), f(f(x))),
            strict_idempotent=strict_idempotent_at(f, x),
            forced_by_antisymmetry=kz_inequality_at(rel, f, x) == strict_idempotent_at(f, x),
        )
        for x in rel.elements
    )


def lax_slack_witness(rel: FiniteRelation[E], f: Callable[[E], E], point: E) -> LaxSlackWitness[E]:
    """Return the local witness that genuine lax slack is antisymmetry failure."""

    once = f(point)
    twice = f(once)
    return LaxSlackWitness(
        point=point,
        once=once,
        twice=twice,
        kz_inequality=rel.leq(twice, once),
        inflation_at_once=rel.leq(once, twice),
        distinct=twice != once,
        antisymmetry_failure=twice != once and rel.related_both_ways(twice, once),
    )


def has_lax_slack(rel: FiniteRelation[E], f: Callable[[E], E]) -> bool:
    """Return whether any point carries a genuine lax cell."""
    return any(lax_slack_witness(rel, f, point).holds for point in rel.elements)


def closure_no_lax_slack(lat: FiniteLattice[E], closure: Callable[[E], E]) -> bool:
    """A genuine closure on a finite lattice has no lax slack."""
    if not is_closure(lat, closure):
        msg = "operator must be a closure"
        raise ValueError(msg)
    rel = FiniteRelation(lat.elements, lat.leq)
    return not has_lax_slack(rel, closure)
