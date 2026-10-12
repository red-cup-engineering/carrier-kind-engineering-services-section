"""Knaster–Tarski fixed points and closure operators — settling's theoretical home.

Transcribed from ``RelMath.Order.KnasterTarskiStandalone`` and
``RelMath.Closure.ClosureMonad`` (lean/):

* On a (finite, here) complete lattice, a monotone ``f`` has a **least fixed
  point** ``lfp f = ⊓ {x : f x ≤ x}`` and a **greatest** ``gfp f = ⊔ {x : x ≤ f
  x}``, both genuine fixed points, with ``lfp`` least among fixed points and
  ``lfp ≤ gfp`` (Knaster–Tarski).
* A **closure operator** is monotone, inflationary (``v ≤ c v``), and idempotent.
  Its fixed points are the *closed* elements; ``lfp c = c ⊥`` is the least one.
* Settling is the closure monad's Kleisli step ``settleStep c u v = (c v) ∨ u``:
  inflationary and monotone, so on a finite lattice it never cycles — it climbs
  to a fixed point (``no_periodic_orbits``). This is exactly :func:`pymetrologic.settle`.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from itertools import combinations
from typing import Generic, TypeVar

from .bilattice import BL, BoundedLattice, bilattice

E = TypeVar("E")

__all__ = [
    "FiniteLattice",
    "closure_step",
    "fixed_points",
    "gfp",
    "is_closure",
    "is_directed",
    "is_monotone",
    "is_nucleus",
    "is_scott_continuous",
    "iterate_to_fixpoint",
    "join_nucleus",
    "knowledge_lattice",
    "lfp",
]


@dataclass(frozen=True)
class FiniteLattice(Generic[E]):
    """A finite bounded lattice given by its carrier and order/operations.

    ``sinf``/``ssup`` are the complete-lattice arbitrary meet/join used by the
    Knaster–Tarski construction; on a finite carrier they fold ``meet``/``join``.
    """

    elements: tuple[E, ...]
    leq: Callable[[E, E], bool]
    join: Callable[[E, E], E]
    meet: Callable[[E, E], E]
    bot: E
    top: E

    def sinf(self, predicate: Callable[[E], bool]) -> E:
        """``⊓ {x : predicate x}`` (``⊤`` if the set is empty)."""
        acc = self.top
        for x in self.elements:
            if predicate(x):
                acc = self.meet(acc, x)
        return acc

    def ssup(self, predicate: Callable[[E], bool]) -> E:
        """``⊔ {x : predicate x}`` (``⊥`` if the set is empty)."""
        acc = self.bot
        for x in self.elements:
            if predicate(x):
                acc = self.join(acc, x)
        return acc

    def eq(self, x: E, y: E) -> bool:
        return self.leq(x, y) and self.leq(y, x)


def knowledge_lattice(base: BoundedLattice[E]) -> FiniteLattice[BL[E]]:
    """The bilattice ``L^⋈`` under its **knowledge** order, as a finite lattice.

    The carrier is finite only when ``base`` is (Boolean, a chain) — settling and
    closure live in the knowledge order, so this is the lattice they act on.
    """
    bl = bilattice(base)
    vals = base.sample(0)
    elements = tuple(BL(p, c) for p in vals for c in vals)
    return FiniteLattice(
        elements=elements,
        leq=bl.leq_k,
        join=bl.join_k,
        meet=bl.meet_k,
        bot=bl.none,
        top=bl.conflict,
    )


def lfp(lat: FiniteLattice[E], f: Callable[[E], E]) -> E:
    """Knaster–Tarski least fixed point ``⊓ {x : f x ≤ x}`` (``f`` must be monotone)."""
    return lat.sinf(lambda x: lat.leq(f(x), x))


def gfp(lat: FiniteLattice[E], f: Callable[[E], E]) -> E:
    """Knaster–Tarski greatest fixed point ``⊔ {x : x ≤ f x}``."""
    return lat.ssup(lambda x: lat.leq(x, f(x)))


def is_monotone(lat: FiniteLattice[E], f: Callable[[E], E]) -> bool:
    """``x ≤ y ⟹ f x ≤ f y`` checked over the whole (finite) carrier."""
    return all(lat.leq(f(x), f(y)) for x in lat.elements for y in lat.elements if lat.leq(x, y))


def is_closure(lat: FiniteLattice[E], f: Callable[[E], E]) -> bool:
    """A closure operator: monotone, inflationary (``x ≤ f x``), and idempotent."""
    if not is_monotone(lat, f):
        return False
    return all(lat.leq(x, f(x)) and lat.eq(f(f(x)), f(x)) for x in lat.elements)


def is_nucleus(lat: FiniteLattice[E], j: Callable[[E], E]) -> bool:
    """A **nucleus**: a closure that also preserves meets, ``j(a ∧ b) = j a ∧ j b``.

    The extra meet-preservation (over :func:`is_closure`) is what makes the fixed
    points a sub-*Heyting-algebra*, not merely a sub-lattice
    (``RelMath.Positing.Nucleus``).
    """
    if not is_closure(lat, j):
        return False
    return all(
        lat.eq(j(lat.meet(a, b)), lat.meet(j(a), j(b))) for a in lat.elements for b in lat.elements
    )


def join_nucleus(lat: FiniteLattice[E], c: E) -> Callable[[E], E]:
    """The nucleus ``x ↦ x ∨ c`` — meet-preserving on a distributive lattice."""
    return lambda x: lat.join(x, c)


def is_directed(lat: FiniteLattice[E], subset: Sequence[E]) -> bool:
    """A subset is **directed**: every pair has an upper bound *within* the subset."""
    return all(any(lat.leq(a, c) and lat.leq(b, c) for c in subset) for a in subset for b in subset)


def is_scott_continuous(lat: FiniteLattice[E], f: Callable[[E], E]) -> bool:
    """``f`` preserves directed suprema: ``f(⊔D) = ⊔ f(D)`` for every directed ``D``.

    On a finite lattice this is equivalent to monotonicity — the strict-finite
    (``κ < ω``) regime, where every directed set already contains its supremum.
    """

    def sup(xs: Sequence[E]) -> E:
        acc = lat.bot
        for x in xs:
            acc = lat.join(acc, x)
        return acc

    elems = lat.elements
    for r in range(1, len(elems) + 1):
        for subset in combinations(elems, r):
            if is_directed(lat, subset) and not lat.eq(f(sup(subset)), sup([f(x) for x in subset])):
                return False
    return True


def fixed_points(lat: FiniteLattice[E], f: Callable[[E], E]) -> tuple[E, ...]:
    """The fixed points of ``f`` (the closed elements, when ``f`` is a closure)."""
    return tuple(x for x in lat.elements if lat.eq(f(x), x))


def closure_step(lat: FiniteLattice[E], c: Callable[[E], E], increment: E) -> Callable[[E], E]:
    """The settling step ``settleStep c u v = (c v) ∨ u`` (closure with increment)."""
    return lambda v: lat.join(c(v), increment)


def iterate_to_fixpoint(
    lat: FiniteLattice[E], f: Callable[[E], E], start: E, *, max_iter: int = 10_000
) -> tuple[E, int]:
    """Climb ``f`` from ``start`` to a fixed point (``f`` monotone + inflationary).

    On a finite lattice the orbit is non-decreasing and bounded, so it converges
    with no periodic cycle (``no_periodic_orbits``). Returns the fixed point and
    the number of steps.
    """
    x = start
    for i in range(max_iter):
        nxt = f(x)
        if lat.eq(nxt, x):
            return x, i
        x = nxt
    raise RuntimeError("iterate_to_fixpoint did not converge; is f inflationary & monotone?")
