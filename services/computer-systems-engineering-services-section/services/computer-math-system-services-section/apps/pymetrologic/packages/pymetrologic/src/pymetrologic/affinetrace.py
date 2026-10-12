"""Collatz affine traces (RelMath.Closure.Collatz.AffineTrace).

The accelerated (shortcut) Collatz map ``T(n) = n/2`` (n even) ``= (3n+1)/2`` (n odd),
read as the arithmetic shadow of a strict-finite settlement. Once a finite parity word
``w`` is fixed, the iterate obeys a single affine relation

    ``B * T^|w|(n) = A * n + C``     with  ``A = 3^oddCount(w)``,  ``B = 2^|w|``.

Fixing the parity word linearizes the branching dynamics — the first lawful finite probe
of the orbit. Nothing here proves Collatz; the descent obstruction is built on top.

Realizes ``branch``, ``step`` (as ``accel_step``), ``parityWord``, the ``AffineTrace``
bundle ``⟨A,B,C⟩`` with ``comp``, ``traceOfWord``, the closed forms, the keystone
``affine_trace_parityWord``, and the descent equivalence ``descent_iff_coeff``.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from enum import Enum

__all__ = [
    "AffineTrace",
    "Branch",
    "accel_step",
    "branch",
    "descends_below",
    "descent_matches_coeff",
    "even_trace",
    "falls_below_self",
    "is_terminal",
    "odd_count",
    "odd_trace",
    "orbit",
    "parity_word",
    "reaches_terminal",
    "trace_of_word",
    "trace_step",
]


class Branch(Enum):
    """The parity alphabet: ``E`` the even branch ``n ↦ n/2``, ``O`` the odd branch
    ``n ↦ (3n+1)/2``."""

    E = "E"
    O = "O"


def accel_step(n: int) -> int:
    """The accelerated (shortcut) Collatz map ``T``: halve if even, else ``(3n+1)/2``."""
    if n < 0:
        raise ValueError("the accelerated Collatz map is defined on natural numbers")
    return n // 2 if n % 2 == 0 else (3 * n + 1) // 2


def branch(n: int) -> Branch:
    """The branch taken from ``n``."""
    return Branch.E if n % 2 == 0 else Branch.O


def orbit(n: int, k: int) -> int:
    """The orbit ``T^k(n)``."""
    for _ in range(k):
        n = accel_step(n)
    return n


def parity_word(n: int, k: int) -> list[Branch]:
    """The parity word of the first ``k`` steps of the orbit of ``n``."""
    word: list[Branch] = []
    for _ in range(k):
        word.append(branch(n))
        n = accel_step(n)
    return word


def odd_count(word: Sequence[Branch]) -> int:
    """The number of odd (``O``) branches in a word."""
    return sum(1 for b in word if b is Branch.O)


@dataclass(frozen=True)
class AffineTrace:
    """An affine trace ``⟨A, B, C⟩`` encoding the relation ``B * y = A * x + C``."""

    A: int
    B: int
    C: int

    def comp(self, f: AffineTrace) -> AffineTrace:
        """``self.comp(f)`` realizes "``f`` then ``self``"."""
        return AffineTrace(self.A * f.A, self.B * f.B, self.A * f.C + f.B * self.C)


even_trace = AffineTrace(1, 2, 0)
"""The even branch trace: ``2*y = 1*x + 0``."""
odd_trace = AffineTrace(3, 2, 1)
"""The odd branch trace: ``2*y = 3*x + 1``."""


def trace_step(t: AffineTrace, b: Branch) -> AffineTrace:
    """One letter advances a trace: ``E`` doubles ``B``; ``O`` triples ``A``, doubles
    ``B``, and pumps ``C``."""
    if b is Branch.E:
        return AffineTrace(t.A, 2 * t.B, t.C)
    return AffineTrace(3 * t.A, 2 * t.B, 3 * t.C + t.B)


def trace_of_word(word: Sequence[Branch]) -> AffineTrace:
    """The affine trace accumulated along a parity word, read left to right."""
    t = AffineTrace(1, 1, 0)
    for b in word:
        t = trace_step(t, b)
    return t


def descends_below(n: int, k: int) -> bool:
    """Whether the orbit drops strictly below the seed in ``k`` steps: ``T^k(n) < n``."""
    return orbit(n, k) < n


def descent_matches_coeff(n: int, k: int) -> bool:
    """The descent equivalence ``descent_iff_coeff``: ``T^k(n) < n`` agrees with the
    affine coefficient surplus going negative ``A*n + C < B*n``."""
    t = trace_of_word(parity_word(n, k))
    return (orbit(n, k) < n) == (t.A * n + t.C < t.B * n)


def falls_below_self(n: int, *, max_steps: int = 100_000) -> bool:
    """Whether ``n`` eventually drops strictly below itself (the descent obligation)."""
    return any(orbit(n, k) < n for k in range(1, max_steps + 1))


def is_terminal(n: int) -> bool:
    """The accelerated map's terminal cycle ``1 → 2 → 1``."""
    return n in (1, 2)


def reaches_terminal(n: int, *, max_steps: int = 100_000) -> bool:
    """Whether ``n`` reaches the terminal cycle ``{1, 2}`` under the accelerated map."""
    for _ in range(max_steps):
        if is_terminal(n):
            return True
        n = accel_step(n)
    return is_terminal(n)
