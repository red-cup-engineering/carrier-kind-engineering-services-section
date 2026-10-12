"""Factorization — FTA + epi-mono (RelMath.Order.Factorization)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    euclid_lemma_holds,
    factors_through,
    fta_reconstructs,
    gcd,
    gcd_recurrence_holds,
    image_factorization,
    is_injective,
    is_prime,
    is_surjective_onto,
    prime_factorization,
)


def test_prime_factorization_examples() -> None:
    assert prime_factorization(12) == [2, 2, 3]
    assert prime_factorization(2) == [2]
    assert prime_factorization(97) == [97]  # prime
    assert is_prime(97)
    assert not is_prime(91)  # 7 * 13


@given(n=st.integers(2, 5000))
def test_fta_existence_and_canonicality(n: int) -> None:
    assert fta_reconstructs(n)  # primes that multiply to n
    factors = prime_factorization(n)
    assert factors == sorted(factors)  # canonical ascending order


def test_gcd_examples_and_recurrence() -> None:
    assert gcd(12, 18) == 6
    assert gcd(17, 5) == 1  # coprime
    assert gcd(0, 7) == 7
    assert gcd(48, 36) == 12


@given(a=st.integers(0, 5000), b=st.integers(0, 5000))
def test_gcd_recurrence_and_meet(a: int, b: int) -> None:
    assert gcd_recurrence_holds(a, b)


@given(p=st.integers(2, 200), a=st.integers(1, 3000), b=st.integers(1, 3000))
def test_euclid_lemma(p: int, a: int, b: int) -> None:
    assert euclid_lemma_holds(p, a, b)


def test_euclid_lemma_witness() -> None:
    # 7 | 14·5 and 7 | 14 (true antecedent, left disjunct).
    assert euclid_lemma_holds(7, 14, 5)
    # A composite p can fail the lemma: 6 | 4·9 = 36 but 6∤4 and 6∤9 — so it is not prime.
    assert (36 % 6 == 0) and (4 % 6 != 0) and (9 % 6 != 0)
    assert not is_prime(6)


def test_factors_through() -> None:
    domain = (0, 1, 2, 3)

    def g(x: int) -> int:
        return x % 2

    def h(y: int) -> int:
        return y * 10

    def f(x: int) -> int:
        return (x % 2) * 10  # = h(g(x))

    assert factors_through(f, g, h, domain)

    def not_h(y: int) -> int:
        return y + 1

    assert not factors_through(f, g, not_h, domain)


def test_image_factorization_is_epi_then_mono() -> None:
    domain = (0, 1, 2, 3, 4, 5)

    def f(x: int) -> int:
        return x % 3  # image = {0, 1, 2}

    e, image, iota = image_factorization(f, domain)
    assert image == (0, 1, 2)
    assert is_surjective_onto(e, domain, image)  # e is epi onto the image
    assert is_injective(iota, image)  # ι is mono
    assert factors_through(f, e, iota, domain)  # f = ι ∘ e
