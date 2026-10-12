"""The Collatz settlement (RelMath.Closure.Collatz)."""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    accelerated_reached_quiesces,
    accelerated_reached_quiesces_iff_terminal,
    accelerated_reached_set,
    collatz_settlement,
    collatz_step,
    collatz_trajectory,
    orbit,
    reaches_terminal,
    revisit_witness,
    settlement_accumulates,
    settles_to_one,
    stopping_time,
    syracuse_step,
    syracuse_trajectory,
    v2,
)


def test_collatz_step() -> None:
    assert collatz_step(4) == 2  # even -> halve
    assert collatz_step(3) == 10  # odd -> 3n+1
    assert collatz_step(1) == 4


def test_trajectory_of_six() -> None:
    assert collatz_trajectory(6) == [6, 3, 10, 5, 16, 8, 4, 2, 1]
    assert stopping_time(6) == 8
    assert stopping_time(1) == 0  # already settled


def test_every_small_n_settles_to_one() -> None:
    # The Collatz conjecture, verified up to a bound (the hard part stays open).
    assert all(settles_to_one(n) for n in range(1, 2000))


def test_known_long_stopping_time() -> None:
    assert stopping_time(27) == 111  # the famous spike


def test_step_rejects_nonpositive() -> None:
    with pytest.raises(ValueError):
        collatz_step(0)


def test_syracuse_accelerated_map() -> None:
    assert syracuse_step(3) == 5  # 10 -> 5
    assert syracuse_step(5) == 1  # 16 -> 1
    assert syracuse_step(1) == 1  # fixed
    assert syracuse_trajectory(7) == [7, 11, 17, 13, 5, 1]
    with pytest.raises(ValueError):
        syracuse_step(4)  # even rejected


def test_syracuse_settles_for_small_odds() -> None:
    assert all(syracuse_trajectory(n)[-1] == 1 for n in range(1, 1000, 2))


def test_accelerated_reached_set_accumulates() -> None:
    assert accelerated_reached_set(7, 0) == frozenset()
    assert accelerated_reached_set(7, 5) == frozenset(orbit(7, k) for k in range(5))
    assert collatz_settlement(7, 3) == (
        frozenset(),
        frozenset({7}),
        frozenset({7, 11}),
        frozenset({7, 11, 17}),
    )
    assert all(settlement_accumulates(7, k) for k in range(20))


def test_reached_quiescence_is_exactly_revisit() -> None:
    first_quiescent_stage = 12
    assert accelerated_reached_quiesces(7, first_quiescent_stage)
    prior = revisit_witness(7, first_quiescent_stage)
    assert prior is not None
    assert prior < first_quiescent_stage
    assert orbit(7, prior) == orbit(7, first_quiescent_stage)

    for k in range(first_quiescent_stage):
        assert not accelerated_reached_quiesces(7, k)
        assert revisit_witness(7, k) is None


def test_reached_quiescence_iff_terminal_bounded_shadow() -> None:
    for n in range(1, 500):
        assert accelerated_reached_quiesces_iff_terminal(n, max_stage=500)
        assert reaches_terminal(n, max_steps=500)


def test_two_adic_valuation() -> None:
    assert v2(8) == 3
    assert v2(12) == 2  # 12 = 4·3
    assert v2(7) == 0  # odd
    with pytest.raises(ValueError):
        v2(0)


@given(a=st.integers(1, 10_000), b=st.integers(1, 10_000))
def test_v2_is_a_valuation(a: int, b: int) -> None:
    assert v2(2 * a) == 1 + v2(a)  # v₂(2n) = 1 + v₂(n)
    assert v2(a * b) == v2(a) + v2(b)  # additive on products
    assert v2(a + b) >= min(v2(a), v2(b))  # ultrametric
