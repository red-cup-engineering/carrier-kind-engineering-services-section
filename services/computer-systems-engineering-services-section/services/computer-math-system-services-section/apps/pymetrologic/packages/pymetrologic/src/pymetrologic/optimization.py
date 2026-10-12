"""Optimization is settling — the optimum IS the closure fixed point (RelMath.Value.Optimization).

The corpus's received-math node says optimization "finds a point where no small change helps,
which is a FIXED POINT of the optimization process … requires measure, constraint; PRODUCES a
fixed-point." That fixed point is exactly the settling / closure fixed point, so optimization is
the settling dynamics under a measure-and-constraint gloss.

The dictionary, against the settling hub:

* a **measure** = an order ``≤_V`` on a finite value set (*better = higher*);
* **constraints** = the carrier — the allowed set the operator acts within;
* an **improvement** operator = a monotone, inflationary, idempotent endo (a closure):
  ``x ≤_V improve x`` (improving never retracts), monotone, idempotent (improvement saturates).

So an ``OptimizationProblem`` is literally a value order paired with such a closure; its
``optimum(seed)`` is the settled value. Proven: ``optimum_is_fixed_point`` (the optimum is a fixed
point — corpus's "PRODUCES a fixed point") and ``settling_is_optimization`` — the optimum is
reachable (``seed ≤_V optimum``), locally optimal (a fixed point, no improving move remains), and
the least fixed point above the seed (the best reachable optimum).
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Generic, TypeVar

V = TypeVar("V")

__all__ = [
    "OptimizationProblem",
    "is_improvement_operator",
    "is_locally_optimal",
    "optimum",
    "optimum_is_fixed_point",
    "optimum_is_least_fixed_point_above",
    "optimum_is_reachable",
]


@dataclass
class OptimizationProblem(Generic[V]):
    """A measure + constraint + improvement triple: the value order ``leq`` (the measure, *better =
    higher*), the finite ``carrier`` (the constraint set), and the ``improve`` operator (a closure
    whose fixed point is the optimum)."""

    carrier: tuple[V, ...]
    leq: Callable[[V, V], bool]
    improve: Callable[[V], V]


def is_improvement_operator(p: OptimizationProblem[V]) -> bool:
    """Whether ``improve`` is a value-category closure over the carrier: ``≤_V``-inflationary
    (``x ≤ improve x``), ``≤_V``-monotone, and idempotent (improvement saturates)."""
    infl = all(p.leq(x, p.improve(x)) for x in p.carrier)
    mono = all(
        p.leq(p.improve(x), p.improve(y)) for x in p.carrier for y in p.carrier if p.leq(x, y)
    )
    idem = all(p.improve(p.improve(x)) == p.improve(x) for x in p.carrier)
    return infl and mono and idem


def optimum(p: OptimizationProblem[V], seed: V, *, max_iter: int = 100_000) -> V:
    """The optimum reached from ``seed``: iterate ``improve`` to its fixed point (the settled
    value). On a finite carrier with an inflationary ``improve`` this always converges."""
    x = seed
    for _ in range(max_iter):
        nx = p.improve(x)
        if nx == x:
            return x
        x = nx
    raise RuntimeError("improvement did not settle — improve is not a finite-carrier closure")


def optimum_is_fixed_point(p: OptimizationProblem[V], seed: V) -> bool:
    """The optimum is a fixed point of the improvement (the corpus's "PRODUCES a fixed point"):
    ``improve(optimum) = optimum``."""
    opt = optimum(p, seed)
    return p.improve(opt) == opt


def optimum_is_reachable(p: OptimizationProblem[V], seed: V) -> bool:
    """Reachability: the optimum sits above the seed in the measure, ``seed ≤_V optimum`` — an
    improving move never retracts."""
    return p.leq(seed, optimum(p, seed))


def is_locally_optimal(p: OptimizationProblem[V], x: V) -> bool:
    """Local optimality: no small change helps — ``x`` is a fixed point of ``improve``."""
    return p.improve(x) == x


def optimum_is_least_fixed_point_above(p: OptimizationProblem[V], seed: V) -> bool:
    """The optimum is the LEAST fixed point above the seed: every fixed point ``y`` with
    ``seed ≤_V y`` satisfies ``optimum ≤_V y`` — the best reachable optimum."""
    opt = optimum(p, seed)
    return all(p.leq(opt, y) for y in p.carrier if is_locally_optimal(p, y) and p.leq(seed, y))
