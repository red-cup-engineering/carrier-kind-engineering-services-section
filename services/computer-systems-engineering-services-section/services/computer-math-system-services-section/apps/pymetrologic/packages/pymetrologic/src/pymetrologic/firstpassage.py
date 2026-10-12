"""Collatz first-passage words and parent barriers (RelMath.Closure.Collatz.FirstPassage).

A parity word is *coefficient-contracting* when its affine trace satisfies ``A < B``
(``3^oddCount < 2^len``): the divide-by-two coefficient has overtaken the multiply-by-three
coefficient. A *first-passage word* is the first prefix at which this happens — every proper
prefix is still noncontracting. The structural backbone:

* a first-passage word always ends in ``E`` (the crossing letter);
* ``w = p + [E]`` is first-passage iff ``p`` is a *parent barrier* (``B <= A < 2B`` with
  every proper prefix noncontracting);
* the crossing pins the exponents: ``2^(len-1) <= 3^oddCount < 2^len``.

These are the lawful finite cells on which the descent obstruction (the semigroup gap) is
stated. Nothing here proves Collatz.
"""

from __future__ import annotations

from collections.abc import Sequence

from .affinetrace import Branch, odd_count, trace_of_word

__all__ = [
    "is_coeff_contracting",
    "is_coeff_noncontracting",
    "is_first_passage_word",
    "is_parent_barrier",
    "power_bounds_hold",
]


def is_coeff_contracting(word: Sequence[Branch]) -> bool:
    """The word's trace is contracting: ``A < B``."""
    t = trace_of_word(word)
    return t.A < t.B


def is_coeff_noncontracting(word: Sequence[Branch]) -> bool:
    """The word's trace is noncontracting: ``B <= A``."""
    t = trace_of_word(word)
    return t.B <= t.A


def is_first_passage_word(word: Sequence[Branch]) -> bool:
    """A first-passage word: contracting, with every proper prefix noncontracting."""
    w = list(word)
    if not is_coeff_contracting(w):
        return False
    return all(is_coeff_noncontracting(w[:k]) for k in range(len(w)))


def is_parent_barrier(p: Sequence[Branch]) -> bool:
    """A parent barrier ``p``: noncontracting with ``A < 2B``, every proper prefix
    noncontracting. Then ``p + [E]`` is exactly the first-passage word it generates."""
    pp = list(p)
    t = trace_of_word(pp)
    if not (t.B <= t.A < 2 * t.B):
        return False
    return all(is_coeff_noncontracting(pp[:k]) for k in range(len(pp)))


def power_bounds_hold(word: Sequence[Branch]) -> bool:
    """The crossing exponent sandwich ``2^(len-1) <= 3^oddCount < 2^len`` for a nonempty
    first-passage word (vacuously ``True`` otherwise)."""
    w = list(word)
    if not (len(w) > 0 and is_first_passage_word(w)):
        return True
    lo: bool = 2 ** (len(w) - 1) <= 3 ** odd_count(w)
    hi: bool = 3 ** odd_count(w) < 2 ** len(w)
    return lo and hi
