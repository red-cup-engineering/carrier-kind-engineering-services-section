"""Optimization is settling (RelMath.Value.Optimization)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    OptimizationProblem,
    is_improvement_operator,
    is_locally_optimal,
    optimum,
    optimum_is_fixed_point,
    optimum_is_least_fixed_point_above,
    optimum_is_reachable,
)


def _ceil_to_multiple_of_3(x: int) -> int:
    """Round up to the nearest multiple of 3 — a closure whose fixed points are the multiples."""
    return ((x + 2) // 3) * 3


# carrier {0..6}, measure = ≤, improvement = ceil to a multiple of 3 (fixed points {0,3,6}).
PROBLEM: OptimizationProblem[int] = OptimizationProblem(
    carrier=tuple(range(7)),
    leq=lambda a, b: a <= b,
    improve=_ceil_to_multiple_of_3,
)


def test_improve_is_a_closure() -> None:
    assert is_improvement_operator(PROBLEM)


def test_optimum_examples() -> None:
    assert optimum(PROBLEM, 0) == 0  # already a fixed point
    assert optimum(PROBLEM, 1) == 3
    assert optimum(PROBLEM, 4) == 6
    assert optimum(PROBLEM, 6) == 6


@given(seed=st.integers(0, 6))
def test_optimum_identifications(seed: int) -> None:
    # The two corpus identifications, over every seed in the carrier.
    assert optimum_is_fixed_point(PROBLEM, seed)  # PRODUCES a fixed point
    assert optimum_is_reachable(PROBLEM, seed)  # seed ≤ optimum (inflation)
    assert is_locally_optimal(PROBLEM, optimum(PROBLEM, seed))  # no small change helps
    assert optimum_is_least_fixed_point_above(PROBLEM, seed)  # best reachable optimum


def test_subset_closure_instance() -> None:
    # A second value category: subsets of {0,1,2} under ⊆, improvement = "saturate to contain 0".
    carrier = tuple(frozenset(s) for s in (set(), {0}, {1}, {2}, {0, 1}, {0, 2}, {1, 2}, {0, 1, 2}))

    def improve(s: frozenset[int]) -> frozenset[int]:
        return s | {0}  # add element 0 — a Moore closure (∪{0} is inflationary/monotone/idempotent)

    prob: OptimizationProblem[frozenset[int]] = OptimizationProblem(
        carrier=carrier,
        leq=lambda a, b: a <= b,  # subset order
        improve=improve,
    )
    assert is_improvement_operator(prob)
    assert optimum(prob, frozenset()) == frozenset({0})
    assert optimum(prob, frozenset({1, 2})) == frozenset({0, 1, 2})
    for seed in carrier:
        assert optimum_is_fixed_point(prob, seed)
        assert optimum_is_reachable(prob, seed)
        assert optimum_is_least_fixed_point_above(prob, seed)
