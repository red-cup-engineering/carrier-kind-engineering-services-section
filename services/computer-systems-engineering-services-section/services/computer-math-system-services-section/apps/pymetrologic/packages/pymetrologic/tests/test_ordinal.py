"""The transfinite tree ordinal + four regimes (RelMath.Closure.Ordinal)."""

from __future__ import annotations

import pytest

from pymetrologic import (
    add,
    fund_le_limit,
    is_finite,
    leq,
    limit_is_lub,
    of_nat,
    of_nat_le_omega,
    omega,
    omega_shift,
    regime_of_ord,
    succ,
    to_nat,
    zero,
)
from pymetrologic.ordinal import limit


def test_finite_ordinals_roundtrip() -> None:
    assert to_nat(zero) == 0
    for n in range(10):
        assert to_nat(of_nat(n)) == n
        assert is_finite(of_nat(n))
    assert to_nat(succ(of_nat(4))) == 5


def test_omega_is_not_finite() -> None:
    assert not is_finite(omega)
    with pytest.raises(ValueError):
        to_nat(omega)


def test_ordinal_addition_on_finites() -> None:
    assert to_nat(add(of_nat(2), of_nat(3))) == 5
    assert to_nat(add(of_nat(0), of_nat(7))) == 7
    assert to_nat(add(of_nat(4), zero)) == 4


def test_four_regimes_read_off_kappa() -> None:
    assert regime_of_ord(of_nat(3)) == "strict-finite"
    assert regime_of_ord(omega) == "scott"
    assert regime_of_ord(omega_shift) == "transfinite-bounded"


def test_omega_is_an_upper_bound_of_its_fundamental_sequence() -> None:
    assert all(is_finite(of_nat(n)) and not is_finite(omega) for n in range(5))


def test_brouwer_order_on_finite_ordinals() -> None:
    assert leq(zero, of_nat(3))
    assert leq(of_nat(2), of_nat(5))
    assert leq(succ(of_nat(2)), succ(of_nat(5)))
    assert not leq(of_nat(5), of_nat(2))


def test_fundamental_sequence_terms_sit_below_limit() -> None:
    assert all(fund_le_limit(of_nat, n) for n in range(12))
    assert all(of_nat_le_omega(n) for n in range(12))


def test_limit_is_lub_for_omega_probe() -> None:
    assert limit_is_lub(of_nat, omega, probe=12)
    assert leq(limit(of_nat), omega, probe=12)
    assert not all(leq(of_nat(n), of_nat(5), probe=12) for n in range(13))
    assert not leq(limit(of_nat), of_nat(5), probe=12)


def test_omega_shift_is_higher_limit() -> None:
    assert not is_finite(omega_shift)
    assert regime_of_ord(omega_shift) == "transfinite-bounded"
    assert leq(omega, omega_shift)
    assert all(leq(add(omega, of_nat(n)), omega_shift, probe=12) for n in range(8))
