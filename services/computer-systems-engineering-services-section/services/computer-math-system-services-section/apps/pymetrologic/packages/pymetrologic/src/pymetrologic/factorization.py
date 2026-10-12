"""Factorization — both faces (RelMath.Order.Factorization).

The corpus node carries one idea with two faces:

* the **categorical** primitive ``factors-through`` (``f = h ∘ g`` — a process passes
  through a waypoint), whose canonical instance is the **epi–mono / image**
  factorization: every map is a surjection onto its image followed by an injection;
* its **arithmetic** shadow, the **Fundamental Theorem of Arithmetic**: every
  ``n ≥ 2`` is a product of primes, uniquely up to order.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from math import prod
from typing import TypeVar

A = TypeVar("A")
B = TypeVar("B")
C = TypeVar("C")

__all__ = [
    "euclid_lemma_holds",
    "factors_through",
    "fta_reconstructs",
    "gcd",
    "gcd_recurrence_holds",
    "image_factorization",
    "is_injective",
    "is_prime",
    "is_surjective_onto",
    "prime_factorization",
]


# --- arithmetic face: the Fundamental Theorem of Arithmetic ----------------- #
def is_prime(n: int) -> bool:
    """``n`` is prime: ``≥ 2`` with no divisor in ``2 … ⌊√n⌋``."""
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True


def prime_factorization(n: int) -> list[int]:
    """The canonical (ascending) prime factorization of ``n ≥ 2``."""
    if n < 2:
        raise ValueError("prime factorization is defined for n ≥ 2")
    factors: list[int] = []
    m, d = n, 2
    while d * d <= m:
        while m % d == 0:
            factors.append(d)
            m //= d
        d += 1
    if m > 1:
        factors.append(m)
    return factors


def fta_reconstructs(n: int) -> bool:
    """Existence + canonicality: the prime factors are all prime and multiply to ``n``."""
    factors = prime_factorization(n)
    return all(is_prime(p) for p in factors) and prod(factors) == n


def gcd(a: int, b: int) -> int:
    """The greatest common divisor via the Euclidean recurrence ``gcd(a,b)=gcd(b, a mod b)``."""
    a, b = abs(a), abs(b)
    while b:
        a, b = b, a % b
    return a


def gcd_recurrence_holds(a: int, b: int) -> bool:
    """The Euclidean step ``gcd(a,b) = gcd(b, a mod b)`` (``b > 0``), and ``gcd`` is the meet
    under divisibility: it divides both arguments."""
    if b <= 0:
        return gcd(a, 0) == abs(a)
    g = gcd(a, b)
    step = g == gcd(b, a % b)
    divides_both = g != 0 and a % g == 0 and b % g == 0
    return step and divides_both


def euclid_lemma_holds(p: int, a: int, b: int) -> bool:
    """Euclid's lemma: if ``p`` is prime and ``p ∣ a·b`` then ``p ∣ a`` or ``p ∣ b``.

    Returns ``True`` when the implication holds (vacuously when ``p`` is not prime or
    ``p ∤ a·b``) — the seed of unique factorization.
    """
    if not (is_prime(p) and (a * b) % p == 0):
        return True
    return a % p == 0 or b % p == 0


# --- categorical face: factors-through and the image factorization ---------- #
def factors_through(
    f: Callable[[A], C], g: Callable[[A], B], h: Callable[[B], C], domain: Sequence[A]
) -> bool:
    """``f = h ∘ g`` on ``domain`` — ``f`` factors through the waypoint ``g``/``h``."""
    return all(f(x) == h(g(x)) for x in domain)


def is_surjective_onto(f: Callable[[A], B], domain: Sequence[A], codomain: Sequence[B]) -> bool:
    """``f`` hits every element of ``codomain``."""
    return {f(x) for x in domain} == set(codomain)


def is_injective(f: Callable[[A], B], domain: Sequence[A]) -> bool:
    """``f`` is injective on ``domain``."""
    return len({f(x) for x in domain}) == len(list(domain))


def image_factorization(
    f: Callable[[A], B], domain: Sequence[A]
) -> tuple[Callable[[A], B], tuple[B, ...], Callable[[B], B]]:
    """The epi–mono factorization ``f = ι ∘ e``: ``e`` onto the image, ``ι`` the inclusion.

    Returns ``(e, image, ι)``. ``e`` (here ``f`` corestricted) surjects onto ``image``;
    ``ι`` (the identity inclusion) is injective; and ``f = ι ∘ e``.
    """
    image = tuple(sorted({f(x) for x in domain}))  # type: ignore[type-var]
    return f, image, lambda y: y
