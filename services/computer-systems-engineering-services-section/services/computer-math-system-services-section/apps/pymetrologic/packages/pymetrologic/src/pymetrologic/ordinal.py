"""The transfinite settling ordinal — a Brouwer/tree ordinal (RelMath.Closure.Ordinal).

Lean core (and finite Python) has no built-in transfinite ordinal, so the corpus
builds its own, the way ``lib/relating``'s ``settling/ordinal`` does: an ordinal is
``zero | succ(Ord) | limit(ℕ → Ord)`` — a **Brouwer/tree ordinal**, where a limit
carries a ``ℕ``-indexed fundamental sequence whose supremum it is. ``isFinite`` is a
real recursion (not a flag), and the **four regimes** are read off the actual shape
of ``κ``: finite ⇒ *strict-finite*; ``ω`` (a limit of finite ordinals) ⇒ *Scott*
(``κ=ω``); a limit whose terms are themselves transfinite ⇒ *transfinite-bounded*.
(The *aperiodic* ``κ ≥ ω₁`` regime is not representable by a ``ℕ``-indexed tree —
honestly scoped out, exactly as the corpus notes.)
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

__all__ = [
    "Ord",
    "add",
    "fund_le_limit",
    "is_finite",
    "leq",
    "limit",
    "limit_is_lub",
    "of_nat",
    "of_nat_le_omega",
    "omega",
    "omega_shift",
    "regime_of_ord",
    "succ",
    "to_nat",
    "zero",
]


@dataclass(frozen=True)
class Ord:
    """A Brouwer/tree ordinal: ``zero``, a successor, or the limit of a fundamental sequence."""

    kind: str  # "zero" | "succ" | "limit"
    pred: Ord | None = None
    seq: Callable[[int], Ord] | None = None


zero = Ord("zero")


def succ(o: Ord) -> Ord:
    """The successor ordinal ``o + 1``."""
    return Ord("succ", pred=o)


def limit(f: Callable[[int], Ord]) -> Ord:
    """The limit ordinal ``sup_n f(n)`` of an ascending fundamental sequence."""
    return Ord("limit", seq=f)


def of_nat(n: int) -> Ord:
    """The finite ordinal ``n`` — a successor tower over ``zero``."""
    o = zero
    for _ in range(n):
        o = succ(o)
    return o


omega = limit(of_nat)  # ω = sup of the finite ordinals
omega_shift = limit(lambda n: add(omega, of_nat(n)))  # ω · 2 = sup_n (ω+n)


def is_finite(o: Ord) -> bool:
    """A real recursion: ``zero`` is finite, ``succ`` preserves it, a ``limit`` is not finite."""
    while o.kind == "succ":
        assert o.pred is not None
        o = o.pred
    return o.kind == "zero"


def to_nat(o: Ord) -> int:
    """The natural number a finite ordinal denotes (raises on a transfinite ordinal)."""
    n = 0
    while o.kind == "succ":
        assert o.pred is not None
        n += 1
        o = o.pred
    if o.kind != "zero":
        raise ValueError("not a finite ordinal")
    return n


def add(a: Ord, b: Ord) -> Ord:
    """Ordinal addition by recursion on ``b``: ``a+0=a``, ``a+(b+1)=(a+b)+1``, limit-continuous."""
    if b.kind == "zero":
        return a
    if b.kind == "succ":
        assert b.pred is not None
        return succ(add(a, b.pred))
    assert b.seq is not None
    seq = b.seq
    return limit(lambda n: add(a, seq(n)))


def _same_shape(a: Ord, b: Ord) -> bool:
    if a.kind != b.kind:
        return False
    if a.kind == "zero":
        return True
    if a.kind == "succ":
        assert a.pred is not None and b.pred is not None
        return _same_shape(a.pred, b.pred)
    return a.seq is b.seq


def leq(a: Ord, b: Ord, *, probe: int = 16) -> bool:
    """A bounded executable shadow of Lean's Brouwer-ordinal order.

    The Lean relation is inductive and proof-relevant. Python cannot decide
    arbitrary callable limit ordinals extensionally, so this function is a
    finite, sound-enough probe for the canonical carriers used by PyMetroLogic:
    finite ordinals, successors, ``omega``, and named limit constructions.
    """
    if probe < 0:
        raise ValueError("probe must be nonnegative")
    if _same_shape(a, b):
        return True
    if a.kind == "zero":
        return True
    if b.kind == "zero":
        return False
    if a.kind == "succ" and b.kind == "succ":
        assert a.pred is not None and b.pred is not None
        return leq(a.pred, b.pred, probe=probe)
    if b.kind == "succ":
        assert b.pred is not None
        return leq(a, b.pred, probe=probe)
    if b.kind == "limit":
        assert b.seq is not None
        return any(leq(a, b.seq(n), probe=probe) for n in range(probe + 1))
    if a.kind == "limit":
        assert a.seq is not None
        return all(leq(a.seq(n), b, probe=probe) for n in range(probe + 1))
    return False


def fund_le_limit(f: Callable[[int], Ord], n: int, *, probe: int = 16) -> bool:
    """The fundamental-sequence term law ``f(n) <= limit(f)``."""
    if n < 0:
        raise ValueError("fundamental-sequence index must be nonnegative")
    return leq(f(n), limit(f), probe=max(probe, n))


def limit_is_lub(f: Callable[[int], Ord], b: Ord, *, probe: int = 16) -> bool:
    """Bounded executable form of the limit-as-least-upper-bound law.

    If every probed ``f(n)`` lies below ``b``, then the probed limit lies below
    ``b``. If ``b`` is not an upper bound on the probe window, the implication is
    vacuously true.
    """
    if probe < 0:
        raise ValueError("probe must be nonnegative")
    upper_bound = all(leq(f(n), b, probe=probe) for n in range(probe + 1))
    return (not upper_bound) or leq(limit(f), b, probe=probe)


def of_nat_le_omega(n: int, *, probe: int = 16) -> bool:
    """Every finite ordinal ``of_nat(n)`` sits below ``omega``."""
    if n < 0:
        raise ValueError("finite ordinal index must be nonnegative")
    return leq(of_nat(n), omega, probe=max(probe, n))


def regime_of_ord(o: Ord, *, probe: int = 8) -> str:
    """Read the four-regime signature off ``κ``'s shape (the fourth face of the cell)."""
    if is_finite(o):
        return "strict-finite"
    assert o.seq is not None
    if all(is_finite(o.seq(n)) for n in range(probe)):
        return "scott"  # κ = ω
    return "transfinite-bounded"  # κ > ω (aperiodic κ ≥ ω₁ is not ℕ-representable)
