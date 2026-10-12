from __future__ import annotations

from fractions import Fraction

import pytest

from pymetrologic.stochastic import (
    FiniteMarkovKernel,
    advance_distribution,
    identity_kernel,
    is_doubly_stochastic,
    is_stationary,
    is_stochastic,
    iterate_distribution,
    real_unit_interval_is_value_category,
    real_unit_interval_stoch_vc,
    rzero_le_one,
    stationary_is_closure_fixpoint,
    uniform_distribution,
    unit_real,
    unit_real_zero,
)


def test_identity_kernel_has_uniform_stationary_fixed_point() -> None:
    kernel = identity_kernel(("left", "right"))
    uniform = uniform_distribution(kernel.states)

    assert is_stochastic(kernel)
    assert is_doubly_stochastic(kernel)
    assert advance_distribution(kernel, uniform) == uniform
    assert is_stationary(kernel, uniform)
    assert stationary_is_closure_fixpoint(kernel, uniform)


def test_doubly_stochastic_kernel_preserves_uniform_distribution() -> None:
    kernel = FiniteMarkovKernel(
        states=("a", "b"),
        transitions={
            ("a", "a"): Fraction(1, 4),
            ("a", "b"): Fraction(3, 4),
            ("b", "a"): Fraction(3, 4),
            ("b", "b"): Fraction(1, 4),
        },
    )
    uniform = uniform_distribution(kernel.states)

    assert is_doubly_stochastic(kernel)
    assert advance_distribution(kernel, uniform) == uniform
    assert iterate_distribution(kernel, uniform, 5) == uniform


def test_nonstationary_distribution_advances_to_next_settling_state() -> None:
    kernel = FiniteMarkovKernel(
        states=("a", "b"),
        transitions={
            ("a", "a"): Fraction(1, 2),
            ("a", "b"): Fraction(1, 2),
            ("b", "a"): Fraction(0),
            ("b", "b"): Fraction(1),
        },
    )
    seed = {"a": Fraction(1), "b": Fraction(0)}

    assert is_stochastic(kernel)
    assert not is_doubly_stochastic(kernel)
    assert advance_distribution(kernel, seed) == {"a": Fraction(1, 2), "b": Fraction(1, 2)}
    assert not is_stationary(kernel, seed)
    assert stationary_is_closure_fixpoint(kernel, seed)


def test_real_unit_interval_is_a_sampled_stochastic_value_category() -> None:
    samples = (unit_real(Fraction(1, 3)), unit_real(Fraction(2, 3)), unit_real(1))
    category = real_unit_interval_stoch_vc(samples)
    witness = real_unit_interval_is_value_category(samples)

    assert rzero_le_one()
    assert category.bot == unit_real_zero()
    assert category.lattice.bot == unit_real_zero()
    assert category.lattice.top == unit_real(1)
    assert category.lattice.leq(unit_real(Fraction(1, 3)), unit_real(Fraction(2, 3)))
    assert category.lattice.join(unit_real(Fraction(1, 3)), unit_real(Fraction(2, 3))) == unit_real(
        Fraction(2, 3)
    )
    assert witness.holds
    assert witness.antisymmetric


def test_kernel_and_distribution_validation() -> None:
    with pytest.raises(ValueError, match="missing"):
        FiniteMarkovKernel(states=("a", "b"), transitions={("a", "a"): Fraction(1)})

    kernel = identity_kernel(("a", "b"))
    with pytest.raises(ValueError, match="support"):
        advance_distribution(kernel, {"a": Fraction(1)})
    with pytest.raises(ValueError, match="sum to 1"):
        advance_distribution(kernel, {"a": Fraction(1), "b": Fraction(1)})
    with pytest.raises(ValueError, match="non-negative"):
        advance_distribution(kernel, {"a": Fraction(2), "b": Fraction(-1)})
    with pytest.raises(ValueError, match="steps"):
        iterate_distribution(kernel, uniform_distribution(kernel.states), -1)

    with pytest.raises(ValueError, match=r"\[0, 1\]"):
        unit_real(Fraction(3, 2))
