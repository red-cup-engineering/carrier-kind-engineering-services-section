"""Exact metallic-root witnesses (RelMath.Aperiodic.StepN.MetallicRoot)."""

from __future__ import annotations

import pytest

from pymetrologic.reals import (
    MetallicRootWitness,
    QuadraticSurd,
    metallic_double_root,
    metallic_root_binomial_expansion,
    metallic_root_constant_identity,
    metallic_root_equation_holds,
    metallic_root_residual,
    metallic_root_rhs,
    metallic_root_square,
    metallic_root_surd,
    metallic_root_witness,
)


def test_quadratic_surd_arithmetic_is_exact() -> None:
    x = QuadraticSurd(2, 1, 8)
    y = QuadraticSurd(3, -1, 8)

    assert x + y == QuadraticSurd(5, 0, 8)
    assert x * y == QuadraticSurd(-2, 1, 8)
    assert x.scale(4) == QuadraticSurd(8, 4, 8)
    assert abs(x.as_float() - (2 + 8**0.5)) < 1e-12


def test_metallic_root_equation_holds_exactly_for_family_samples() -> None:
    for n in range(8):
        witness = metallic_root_witness(n)

        assert isinstance(witness, MetallicRootWitness)
        assert witness.root == QuadraticSurd(n, 1, n * n + 4)
        assert witness.square == metallic_root_square(n)
        assert witness.recurrence_rhs == metallic_root_rhs(n)
        assert witness.holds
        assert witness.equation_holds
        assert metallic_root_equation_holds(n)


def test_metallic_root_special_cases_match_known_roots() -> None:
    assert metallic_root_surd(0) == QuadraticSurd(0, 1, 4)
    assert metallic_root_square(0) == QuadraticSurd(4, 0, 4)
    assert metallic_root_rhs(0) == QuadraticSurd(4, 0, 4)

    assert metallic_root_surd(1) == QuadraticSurd(1, 1, 5)
    assert metallic_root_square(1) == QuadraticSurd(6, 2, 5)
    assert metallic_root_rhs(1) == QuadraticSurd(6, 2, 5)

    assert metallic_root_surd(2) == QuadraticSurd(2, 1, 8)
    assert metallic_root_square(2) == QuadraticSurd(12, 4, 8)
    assert metallic_root_rhs(2) == QuadraticSurd(12, 4, 8)


def test_metallic_root_keeps_numeric_residual_as_float_shadow() -> None:
    assert abs(metallic_double_root(3) - (3 + 13**0.5)) < 1e-12
    assert abs(metallic_root_residual(3)) < 1e-12
    assert metallic_root_constant_identity(5)
    assert metallic_root_binomial_expansion(5)


def test_metallic_root_validation() -> None:
    with pytest.raises(ValueError, match="radicand"):
        QuadraticSurd(0, 1, -1)

    with pytest.raises(ValueError, match="same radicand"):
        _ = QuadraticSurd(1, 1, 2) + QuadraticSurd(1, 1, 3)

    with pytest.raises(ValueError, match="same radicand"):
        _ = QuadraticSurd(1, 1, 2) * QuadraticSurd(1, 1, 3)

    with pytest.raises(ValueError, match="natural"):
        metallic_root_surd(-1)

    with pytest.raises(ValueError, match="natural"):
        metallic_root_constant_identity(-1)
