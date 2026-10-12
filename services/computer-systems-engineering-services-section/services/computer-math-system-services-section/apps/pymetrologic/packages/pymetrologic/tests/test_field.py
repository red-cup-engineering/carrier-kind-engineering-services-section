"""Field axioms — GF(p) is a field (RelMath.Order.AlgebraHierarchy, boolField)."""

from __future__ import annotations

import pytest

from pymetrologic import is_field


def _gf(p: int) -> bool:
    elems = tuple(range(p))
    return is_field(
        elems,
        add=lambda a, b: (a + b) % p,
        mul=lambda a, b: (a * b) % p,
        zero=0,
        one=1,
        add_inv=lambda a: (-a) % p,
        mul_inv=lambda a: pow(a, p - 2, p),  # Fermat inverse (p prime)
        eq=lambda a, b: a == b,
    )


@pytest.mark.parametrize("p", [2, 3, 5, 7])
def test_gf_p_is_a_field(p: int) -> None:
    assert _gf(p)  # GF(2) is boolField


def test_z_mod_4_is_not_a_field() -> None:
    # ℤ/4 is a commutative ring but NOT a field: 2 has no multiplicative inverse.
    elems = (0, 1, 2, 3)
    assert not is_field(
        elems,
        add=lambda a, b: (a + b) % 4,
        mul=lambda a, b: (a * b) % 4,
        zero=0,
        one=1,
        add_inv=lambda a: (-a) % 4,
        mul_inv=lambda a: a,  # no genuine inverse exists for 2
        eq=lambda a, b: a == b,
    )
