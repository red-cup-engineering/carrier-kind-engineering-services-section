"""2-adic Collatz valuation witnesses (``RelMath.Closure.Collatz.Valuation``).

The Lean theorem says every positive natural factors as ``2^k * m`` with ``m``
odd, and that for odd ``n`` the Collatz expansion ``3n+1`` has a nonempty run of
halvings ending at an odd shortcut successor. This module makes that theorem
executable over Python integers, reusing the package's Collatz/Syracuse surface.
"""

from __future__ import annotations

from dataclasses import dataclass

from pymetrologic.collatz import syracuse_step, v2

__all__ = [
    "CollatzShortcutWitness",
    "TwoAdicFactor",
    "collatz_saturating_shadow_run",
    "shortcut_odd_part",
    "two_adic_factor",
    "two_adic_valuation_witness",
]


@dataclass(frozen=True, slots=True)
class TwoAdicFactor:
    """A factorization ``value = 2^exponent * odd_part``."""

    value: int
    exponent: int
    odd_part: int

    @property
    def reconstructs(self) -> bool:
        return self.value == (1 << self.exponent) * self.odd_part

    @property
    def odd_part_is_odd(self) -> bool:
        return self.odd_part % 2 == 1

    @property
    def holds(self) -> bool:
        return self.value > 0 and self.exponent >= 0 and self.odd_part_is_odd and self.reconstructs


@dataclass(frozen=True, slots=True)
class CollatzShortcutWitness:
    """The nonempty saturating-shadow run after an odd Collatz expansion."""

    seed: int
    expanded: int
    factor: TwoAdicFactor
    shortcut_successor: int
    halving_run: tuple[int, ...]

    @property
    def run_is_nonempty(self) -> bool:
        return self.factor.exponent >= 1

    @property
    def shortcut_is_odd(self) -> bool:
        return self.shortcut_successor % 2 == 1

    @property
    def shortcut_matches_syracuse(self) -> bool:
        return self.shortcut_successor == syracuse_step(self.seed)

    @property
    def run_collapses_expansion(self) -> bool:
        if not self.halving_run or self.halving_run[0] != self.expanded:
            return False
        if self.halving_run[-1] != self.shortcut_successor:
            return False
        return all(
            left == 2 * right
            for left, right in zip(self.halving_run, self.halving_run[1:], strict=False)
        )

    @property
    def holds(self) -> bool:
        return (
            self.seed > 0
            and self.seed % 2 == 1
            and self.expanded == 3 * self.seed + 1
            and self.factor.value == self.expanded
            and self.factor.holds
            and self.run_is_nonempty
            and self.shortcut_is_odd
            and self.shortcut_matches_syracuse
            and self.run_collapses_expansion
        )


def two_adic_factor(value: int) -> TwoAdicFactor:
    """Factor a positive integer as a power of two times an odd integer."""
    if value <= 0:
        raise ValueError("two-adic factorization is defined for positive integers")
    exponent = v2(value)
    odd_part = value // (2**exponent)
    return TwoAdicFactor(value=value, exponent=exponent, odd_part=odd_part)


def collatz_saturating_shadow_run(seed: int) -> tuple[int, ...]:
    """The full halving run after the odd Collatz expansion ``3*seed + 1``."""
    if seed <= 0 or seed % 2 == 0:
        raise ValueError("the saturating shadow run is defined for positive odd seeds")
    value = 3 * seed + 1
    run = [value]
    while value % 2 == 0:
        value //= 2
        run.append(value)
    return tuple(run)


def shortcut_odd_part(seed: int) -> CollatzShortcutWitness:
    """For odd ``seed``, factor ``3*seed+1`` as ``2^k * m`` with ``1 <= k`` and ``m`` odd."""
    if seed <= 0 or seed % 2 == 0:
        raise ValueError("shortcut odd-part witness is defined for positive odd seeds")
    expanded = 3 * seed + 1
    factor = two_adic_factor(expanded)
    return CollatzShortcutWitness(
        seed=seed,
        expanded=expanded,
        factor=factor,
        shortcut_successor=factor.odd_part,
        halving_run=collatz_saturating_shadow_run(seed),
    )


def two_adic_valuation_witness(seed: int) -> CollatzShortcutWitness:
    """Named witness for ``two-adic-valuation-is-saturating-depth``."""
    return shortcut_odd_part(seed)
