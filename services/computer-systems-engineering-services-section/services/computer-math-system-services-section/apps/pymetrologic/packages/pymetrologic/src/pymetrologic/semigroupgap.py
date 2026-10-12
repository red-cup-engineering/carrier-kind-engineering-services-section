"""Collatz parent-barrier semigroup gap (RelMath.Closure.Collatz.{SemigroupGap,ResidueGap}).

For a parent barrier ``p`` with affine trace ``(A, B, C)``, the first-passage word ``p + [E]``
has trace ``(A, 2B, C)``. Writing ``D = 2B - A`` and ``M = 2B``, the affine relation
``M*y = A*n + C`` turns **non-descent** (``y >= n``) of the first-passage word into a numerical
statement: ``y >= n`` exactly when ``C`` lies in the two-generator semigroup ``⟨D, M⟩``, i.e.
``C = D*n + M*d`` for some ``d`` (the *semigroup certificate*).

Since ``D`` is odd and ``M`` a power of two, ``gcd(D, M) = 1``: there is no gcd obstruction, and
membership sharpens to a single modular inequality. With ``r = C * D^{-1} mod M`` the least residue,

    ``C ∈ ⟨D, M⟩  ⟺  D*r <= C``     (``residue_characterization``).

The *conjectural* content is that for every nontrivial parent barrier ``C ∉ ⟨D, M⟩`` (the descent
obstruction) — the form the corpus's Python search verified (1.16M barriers, zero representations).
This module realizes the proven characterizations and reproduces that search; it does not prove the
gap.
"""

from __future__ import annotations

from collections.abc import Sequence
from math import gcd

from .affinetrace import Branch, trace_of_word

__all__ = [
    "has_semigroup_certificate",
    "in_two_gen_semigroup",
    "is_trivial_parent_barrier",
    "least_residue",
    "membership_matches_residue",
    "parent_a",
    "parent_b",
    "parent_c",
    "parent_d",
    "parent_d_coprime_parent_m",
    "parent_m",
    "residue_gap_holds",
    "residue_gap_margin",
]


def in_two_gen_semigroup(x: int, a: int, b: int) -> bool:
    """Whether ``x`` lies in the two-generator numerical semigroup ``⟨a, b⟩``: ``x = a*m + b*n``
    for some naturals ``m, n``."""
    if x < 0:
        return False
    if a == 0 and b == 0:
        return x == 0
    if a == 0:
        return x % b == 0
    if b == 0:
        return x % a == 0
    return any((x - b * n) % a == 0 for n in range(x // b + 1))


def parent_a(p: Sequence[Branch]) -> int:
    """The parent expansion coefficient ``A = 3^oddCount(p)``."""
    return trace_of_word(p).A


def parent_b(p: Sequence[Branch]) -> int:
    """The parent halving coefficient ``B = 2^len(p)``."""
    return trace_of_word(p).B


def parent_c(p: Sequence[Branch]) -> int:
    """The parent offset ``C``."""
    return trace_of_word(p).C


def parent_d(p: Sequence[Branch]) -> int:
    """The first gap generator ``D = 2B - A`` (positive at a barrier)."""
    return 2 * parent_b(p) - parent_a(p)


def parent_m(p: Sequence[Branch]) -> int:
    """The gap modulus ``M = 2B`` (a power of two)."""
    return 2 * parent_b(p)


def is_trivial_parent_barrier(p: Sequence[Branch]) -> bool:
    """The terminal-adjacent exceptions ``p = []`` or ``p = [O]``."""
    pp = list(p)
    return pp == [] or pp == [Branch.O]


def least_residue(c: int, d: int, m: int) -> int:
    """The least residue ``r < m`` with ``D*r ≡ C (mod m)`` — i.e. ``r = C * D^{-1} mod m``,
    for ``gcd(d, m) = 1`` and ``m > 0``."""
    if m <= 0:
        raise ValueError("the modulus must be positive")
    if gcd(d % m, m) != 1:
        raise ValueError("d must be invertible mod m (coprime)")
    inv = pow(d % m, -1, m)
    return (c % m) * inv % m


def membership_matches_residue(c: int, d: int, m: int) -> bool:
    """The residue characterization ``C ∈ ⟨D, M⟩ ⟺ D*r <= C`` for coprime ``d, m`` (``m > 0``)."""
    r = least_residue(c, d, m)
    return in_two_gen_semigroup(c, d, m) == (d * r <= c)


def residue_gap_margin(c: int, d: int, m: int) -> int:
    """The residue-gap margin ``D*r - C`` for ``r = C * D^{-1} mod M``.

    Positive margin is exactly the nonmembership inequality ``C < D*r`` from
    ``RelMath.Closure.Collatz.ResidueGap``.
    """
    r = least_residue(c, d, m)
    return d * r - c


def residue_gap_holds(c: int, d: int, m: int) -> bool:
    """Whether the sharp residue nonmembership inequality ``C < D*r`` holds."""
    return residue_gap_margin(c, d, m) > 0


def parent_d_coprime_parent_m(p: Sequence[Branch]) -> bool:
    """For a parent barrier, ``D`` is odd and ``M = 2B`` is a power of two, hence coprime."""
    return gcd(parent_d(p), parent_m(p)) == 1


def has_semigroup_certificate(c: int, d: int, m: int, n: int) -> bool:
    """The non-descent certificate ``∃ d': C = D*n + M*d'`` — equivalently ``C - D*n`` is a
    nonnegative multiple of ``M``."""
    base = c - d * n
    return base >= 0 and base % m == 0
