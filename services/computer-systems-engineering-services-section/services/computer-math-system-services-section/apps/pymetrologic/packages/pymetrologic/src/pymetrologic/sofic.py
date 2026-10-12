"""Finite sofic-shift shadows for ``RelMath.Aperiodic.SoficShift``.

Lean presents a 1-step shift of finite type as a transition graph whose
admissible words are directed walks.  A sofic shift is a one-block factor image
of such an SFT.  This module keeps the finite executable layer: admissible-word
checks, finite image enumeration, factor-map composition, the golden-mean shift,
and the Fibonacci substitution's golden admissibility.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping, Sequence
from dataclasses import dataclass
from itertools import pairwise, product
from typing import Generic, TypeVar

A = TypeVar("A", bound=Hashable)
B = TypeVar("B", bound=Hashable)
C = TypeVar("C", bound=Hashable)

Word = tuple[A, ...]
Transition = tuple[A, A]


@dataclass(frozen=True)
class ShiftOfFiniteType(Generic[A]):
    """A finite 1-step SFT: alphabet plus allowed adjacent pairs."""

    alphabet: tuple[A, ...]
    allowed: frozenset[Transition[A]]

    def __post_init__(self) -> None:
        if len(set(self.alphabet)) != len(self.alphabet):
            msg = "alphabet entries must be unique"
            raise ValueError(msg)
        outside = [
            pair
            for pair in self.allowed
            if pair[0] not in self.alphabet or pair[1] not in self.alphabet
        ]
        if outside:
            msg = f"transition {outside[0]!r} is outside the alphabet"
            raise ValueError(msg)

    def is_path(self, word: Sequence[A]) -> bool:
        """Return whether ``word`` is an admissible directed walk."""

        return all((left, right) in self.allowed for left, right in pairwise(word))


__all__ = [
    "ShiftOfFiniteType",
    "Transition",
    "Word",
    "decorated_fibonacci_shift",
    "factor_words",
    "fibonacci_substitute",
    "fibonacci_substitution_golden",
    "forget_fibonacci_decoration",
    "golden_mean_shift",
    "golden_mean_words",
    "is_sofic_image_word",
    "project_word",
    "sofic_image_words",
    "substitute_word",
]


def project_word(word: Sequence[A], projection: Mapping[A, B]) -> tuple[B, ...]:
    """Apply a one-block factor map to a word."""

    return tuple(projection[symbol] for symbol in word)


def sofic_image_words(
    sft: ShiftOfFiniteType[A],
    projection: Mapping[A, B],
    length: int,
) -> frozenset[tuple[B, ...]]:
    """Enumerate length-``n`` words in the sofic image of ``sft`` under ``projection``."""

    if length < 0:
        msg = "length must be natural"
        raise ValueError(msg)
    _validate_projection(sft.alphabet, projection)
    return frozenset(
        project_word(word, projection)
        for word in product(sft.alphabet, repeat=length)
        if sft.is_path(word)
    )


def is_sofic_image_word(
    sft: ShiftOfFiniteType[A],
    projection: Mapping[A, B],
    word: Sequence[B],
) -> bool:
    """Return whether ``word`` has an admissible source word mapping to it."""

    return tuple(word) in sofic_image_words(sft, projection, len(word))


def factor_words(
    words: set[tuple[B, ...]] | frozenset[tuple[B, ...]], factor: Mapping[B, C]
) -> frozenset[tuple[C, ...]]:
    """Relabel a finite language, the executable shadow of sofic closure under factors."""

    alphabet = {symbol for word in words for symbol in word}
    _validate_projection(tuple(alphabet), factor)
    return frozenset(project_word(word, factor) for word in words)


def golden_mean_shift() -> ShiftOfFiniteType[str]:
    """Return the golden-mean SFT over ``a,b`` with the single forbidden pair ``bb``."""

    alphabet = ("a", "b")
    return ShiftOfFiniteType(
        alphabet=alphabet,
        allowed=frozenset(
            (left, right) for left in alphabet for right in alphabet if (left, right) != ("b", "b")
        ),
    )


def golden_mean_words(length: int) -> frozenset[tuple[str, ...]]:
    """Enumerate golden-mean words of a fixed length."""

    shift = golden_mean_shift()
    return sofic_image_words(shift, {"a": "a", "b": "b"}, length)


def substitute_word(word: Sequence[A], rule: Mapping[A, Sequence[B]]) -> tuple[B, ...]:
    """Apply a finite substitution rule letterwise and concatenate."""

    output: list[B] = []
    for symbol in word:
        output.extend(rule[symbol])
    return tuple(output)


def fibonacci_substitute(word: Sequence[str]) -> tuple[str, ...]:
    """Apply the Fibonacci substitution ``a -> ab, b -> a``."""

    return substitute_word(word, {"a": ("a", "b"), "b": ("a",)})


def fibonacci_substitution_golden(word: Sequence[str]) -> bool:
    """Return whether the Fibonacci substitution image is golden-mean admissible."""

    return golden_mean_shift().is_path(fibonacci_substitute(word))


def decorated_fibonacci_shift() -> ShiftOfFiniteType[tuple[str, int]]:
    """Return the decorated SFT used by the finite Fibonacci sofic cover."""

    a0 = ("a", 0)
    b0 = ("b", 0)
    a1 = ("a", 1)
    return ShiftOfFiniteType(
        alphabet=(a0, b0, a1),
        allowed=frozenset(
            {
                (a0, b0),
                (b0, a0),
                (b0, a1),
                (a1, a0),
            }
        ),
    )


def forget_fibonacci_decoration(word: Sequence[tuple[str, int]]) -> tuple[str, ...]:
    """Forget the decoration coordinate of a decorated Fibonacci word."""

    return tuple(symbol for symbol, _decoration in word)


def _validate_projection(alphabet: Sequence[A], projection: Mapping[A, object]) -> None:
    missing = [symbol for symbol in alphabet if symbol not in projection]
    if missing:
        msg = f"projection is missing {missing[0]!r}"
        raise ValueError(msg)
