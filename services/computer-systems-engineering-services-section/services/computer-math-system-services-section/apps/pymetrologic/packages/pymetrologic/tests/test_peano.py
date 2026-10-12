"""ℕ as the initial successor algebra — the recursion principle (RelMath number theory)."""

from __future__ import annotations

from pymetrologic import SuccAlgebra, is_homomorphism, rec

NAT = SuccAlgebra(zero=0, succ=lambda n: n + 1)
PARITY = SuccAlgebra(zero=False, succ=lambda b: not b)
DOUBLE = SuccAlgebra(zero=0, succ=lambda n: n + 2)


def test_rec_into_nat_is_the_identity() -> None:
    for n in range(10):
        assert rec(NAT, n) == n


def test_rec_into_parity_is_oddness() -> None:
    assert rec(PARITY, 0) is False
    assert rec(PARITY, 1) is True
    assert rec(PARITY, 4) is False
    assert rec(DOUBLE, 5) == 10  # succ^5(0) = 2*5


def test_rec_is_a_homomorphism() -> None:
    for alg in (NAT, PARITY, DOUBLE):
        assert is_homomorphism(alg, lambda n: rec(alg, n), 8)  # noqa: B023


def test_initiality_uniqueness() -> None:
    # Any homomorphism h : ℕ → A equals rec (uniqueness of the initial morphism).
    # A wrong map that is not a homomorphism is detected.
    assert not is_homomorphism(NAT, lambda n: n + 1, 5)  # h(0)=1 ≠ zero
    # The genuine morphism agrees with rec everywhere.
    for n in range(8):
        assert rec(DOUBLE, n) == 2 * n
