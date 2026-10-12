from __future__ import annotations

from fractions import Fraction
from itertools import pairwise

import pytest

from pymetrologic.logarithms import (
    GoldenLogConvergenceWitness,
    bernoulli_power_bound_holds,
    cassini_holds,
    floor_log,
    golden_fib,
    golden_log_bishop_bracket,
    golden_log_bracket,
    golden_log_convergence_witness,
    golden_log_convergent_log2,
    golden_log_convergent_ratio,
    log2_lipschitz_gap,
    log2_ratio,
    log2_ratio_monotone,
    log_additivity_defect,
    log_seq,
    log_step_bound_holds,
)


def test_floor_log_is_exact_on_powers_and_floors_between_powers() -> None:
    assert floor_log(2, 1) == 0
    assert floor_log(2, 8) == 3
    assert floor_log(2, 15) == 3
    assert floor_log(3, 81) == 4

    with pytest.raises(ValueError, match="base"):
        floor_log(1, 8)
    with pytest.raises(ValueError, match="positive"):
        floor_log(2, 0)


def test_log_seq_is_floor_log_real_approximant() -> None:
    assert log_seq(2, 2, 4) == Fraction(1)
    assert log_seq(2, 8, 2) == Fraction(3)
    assert log_seq(2, 3, 2) == Fraction(4, 3)


def test_log_additivity_defect_is_bounded_by_one_denominator_step() -> None:
    for level in range(8):
        defect = log_additivity_defect(2, 3, 5, level)
        assert Fraction(0) <= defect <= Fraction(1, level + 1)


def test_log2_ratio_is_well_defined_under_scaling_and_monotone() -> None:
    assert abs(log2_ratio(8, 5) - log2_ratio(16, 10)) < 1e-12
    assert log2_ratio_monotone(Fraction(8, 5), Fraction(13, 8))

    with pytest.raises(ValueError, match="left <= right"):
        log2_ratio_monotone(Fraction(5, 3), Fraction(13, 8))


def test_bernoulli_power_bound_and_step_lipschitz_shadow() -> None:
    assert bernoulli_power_bound_holds(10, 4)
    assert log_step_bound_holds(10, 4)
    assert log2_lipschitz_gap(10) <= Fraction(1, 5)

    with pytest.raises(ValueError, match=r"2 \* n <= m"):
        bernoulli_power_bound_holds(5, 4)
    with pytest.raises(ValueError, match=r"2 \* \(k \+ 1\) <= m"):
        log_step_bound_holds(5, 4)


def test_golden_log_bracket_matches_the_lean_convergent_interval() -> None:
    bracket = golden_log_bracket(5)

    assert bracket.lower == Fraction(8, 5)
    assert bracket.upper == Fraction(13, 8)
    assert bracket.width == Fraction(1, 40)
    assert bracket.lower_log2 <= bracket.upper_log2

    with pytest.raises(ValueError, match="odd"):
        golden_log_bracket(4)


def test_golden_log_fibonacci_and_cassini_identity() -> None:
    assert [golden_fib(index) for index in range(8)] == [1, 1, 2, 3, 5, 8, 13, 21]
    assert all(cassini_holds(index) for index in range(12))

    with pytest.raises(ValueError, match="natural"):
        golden_fib(-1)
    with pytest.raises(ValueError, match="natural"):
        cassini_holds(-1)


def test_golden_log_convergent_ratios_have_even_odd_bracketing() -> None:
    lower = [golden_log_convergent_ratio(2 * i + 2) for i in range(5)]
    upper = [golden_log_convergent_ratio(2 * i + 1) for i in range(5)]

    assert lower == [
        Fraction(3, 2),
        Fraction(8, 5),
        Fraction(21, 13),
        Fraction(55, 34),
        Fraction(144, 89),
    ]
    assert all(left <= right for left, right in pairwise(lower))
    assert all(right <= left for left, right in pairwise(upper))
    assert all(lo <= hi for lo, hi in zip(lower, upper, strict=True))
    assert golden_log_convergent_log2(4) == log2_ratio(8, 5)


def test_golden_log_bishop_brackets_shrink_with_cassini_width() -> None:
    bracket = golden_log_bishop_bracket(1)
    next_bracket = golden_log_bishop_bracket(2)

    assert bracket.lower == Fraction(8, 5)
    assert bracket.upper == Fraction(5, 3)
    assert bracket.width == Fraction(1, 15)
    assert bracket.lower <= next_bracket.lower <= next_bracket.upper <= bracket.upper
    assert bracket.upper_log2 - bracket.lower_log2 <= Fraction(1, 2)

    with pytest.raises(ValueError, match="natural"):
        golden_log_bishop_bracket(-1)


def test_golden_log_convergence_witness_bundles_the_regular_cauchy_shadow() -> None:
    witness = golden_log_convergence_witness(5)

    assert isinstance(witness, GoldenLogConvergenceWitness)
    assert witness.holds
    assert witness.cassini
    assert witness.even_monotone
    assert witness.odd_antitone
    assert witness.nested_brackets
    assert witness.width_bound
    assert witness.log_width < 0.01
    assert 0.69 < witness.approximate_log2_phi < 0.7

    with pytest.raises(ValueError, match="at least 1"):
        golden_log_convergence_witness(0)
