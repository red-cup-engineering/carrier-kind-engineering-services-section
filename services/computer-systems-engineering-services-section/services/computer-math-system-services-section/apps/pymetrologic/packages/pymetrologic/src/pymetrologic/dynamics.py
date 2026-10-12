"""Closure-flow dynamics — the orbit as a trajectory (RelMath.Flow.ClosureFlowDynamics).

The closure orbit is read as a flow with two kinds of step: **smooth** (a no-op —
the value is already fixed) and **singular** (a *firing* — the value changes). The
number of singular steps to the fixed point is the **firing count** ``κ`` (the
closure ordinal); for a monotone, inflationary closure the singular steps come
first and then the flow is smooth forever — **smooth is terminal**
(``smooth_is_terminal``: firings stop at the closure ordinal).
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

from .closure import FiniteLattice

E = TypeVar("E")

__all__ = [
    "closure_orbit",
    "drive_monotone",
    "drive_step_inflationary",
    "driven_flow",
    "firing_count",
    "is_singular_step",
    "is_smooth_step",
    "smooth_is_terminal",
]


def closure_orbit(
    lat: FiniteLattice[E], f: Callable[[E], E], start: E, *, steps: int
) -> tuple[E, ...]:
    """The closure-flow trajectory ``orbit f start n`` through ``steps`` transitions."""

    if steps < 0:
        msg = "steps must be nonnegative"
        raise ValueError(msg)
    del lat
    values = [start]
    x = start
    for _ in range(steps):
        x = f(x)
        values.append(x)
    return tuple(values)


def driven_flow(
    lat: FiniteLattice[E], closure: Callable[[E], E], increments: Sequence[E], seed: E
) -> tuple[E, ...]:
    """The increment-driven flow ``drive(n+1) = cl(drive(n) ∨ u_n)``."""

    values = [seed]
    x = seed
    for increment in increments:
        x = closure(lat.join(x, increment))
        values.append(x)
    return tuple(values)


def drive_step_inflationary(
    lat: FiniteLattice[E], closure: Callable[[E], E], increments: Sequence[E], seed: E
) -> bool:
    """Check ``drive n ≤ drive(n+1)`` across a finite increment sequence."""

    flow = driven_flow(lat, closure, increments, seed)
    return all(lat.leq(flow[i], flow[i + 1]) for i in range(len(flow) - 1))


def drive_monotone(
    lat: FiniteLattice[E], closure: Callable[[E], E], increments: Sequence[E], seed: E
) -> bool:
    """Check ``m ≤ n → drive m ≤ drive n`` over a finite driven-flow prefix."""

    flow = driven_flow(lat, closure, increments, seed)
    return all(lat.leq(flow[i], flow[j]) for i in range(len(flow)) for j in range(i, len(flow)))


def is_singular_step(lat: FiniteLattice[E], f: Callable[[E], E], x: E) -> bool:
    """A **singular** (firing) step: ``f x ≠ x`` (the value changes)."""
    return not lat.eq(f(x), x)


def is_smooth_step(lat: FiniteLattice[E], f: Callable[[E], E], x: E) -> bool:
    """A **smooth** (no-op) step: ``f x = x`` (already at a fixed point)."""
    return lat.eq(f(x), x)


def firing_count(
    lat: FiniteLattice[E], f: Callable[[E], E], start: E, *, max_iter: int = 10_000
) -> int:
    """The firing count ``κ`` — the number of singular steps from ``start`` to the fixed point."""
    x = start
    for k in range(max_iter):
        nxt = f(x)
        if lat.eq(nxt, x):
            return k
        x = nxt
    raise RuntimeError("flow did not reach a fixed point; is f monotone & inflationary?")


def smooth_is_terminal(
    lat: FiniteLattice[E], f: Callable[[E], E], start: E, *, steps: int = 12
) -> bool:
    """Once a step is smooth, every later step is smooth — firings stop at the closure ordinal."""
    x = start
    fired_after_smooth = False
    seen_smooth = False
    for _ in range(steps):
        if is_smooth_step(lat, f, x):
            seen_smooth = True
        elif seen_smooth:
            fired_after_smooth = True
        x = f(x)
    return not fired_after_smooth
