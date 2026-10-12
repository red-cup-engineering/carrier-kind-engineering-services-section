"""Causal sets and the Myrheim–Meyer ordering fraction (RelMath.Lorentzian.MyrheimMeyer).

A causal set is a finite set of events with a (strict) precedence order ``≺``. Its
**ordering fraction** ``r = (number of related pairs) / C(N, 2)`` is the
Myrheim–Meyer dimension estimator's input: ``r = 1`` for a total order (a 1-d
chain), ``r = 0`` for an antichain, and intermediate for a partial order. This
realizes the corpus' ``orderingFraction`` / ``pairCount = choose N 2`` over an
explicit precedence relation.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from fractions import Fraction
from itertools import combinations, permutations
from math import gamma
from typing import TypeVar

from .causal import causal_closure, causal_laplacian_theory, is_harmonic_section
from .combinatorics import choose

E = TypeVar("E")

__all__ = [
    "DiamondSpectralPortraitWitness",
    "MyrheimMeyerRealShadowWitness",
    "apex_count",
    "diamond_events",
    "diamond_myrheim_meyer_real_shadow",
    "diamond_ordering_fraction_internal_rational",
    "diamond_ordering_fraction_real",
    "diamond_prec",
    "diamond_spectral_spacetime_portrait",
    "euler_characteristic",
    "mm_dimension_function",
    "nsc_count",
    "ordering_fraction",
    "pair_count",
    "relation_count",
]


@dataclass(frozen=True, slots=True)
class DiamondSpectralPortraitWitness:
    """The four-event diamond's causal, spectral, and Myrheim-Meyer invariants."""

    ordering_fraction_is_five_sixths: bool
    euler_characteristic_is_five: bool
    strict_classifying_invariant_zero: bool
    middle_pair_spacelike: bool
    closed_futures_harmonic: bool
    causal_diffusion_gap_one: bool

    @property
    def holds(self) -> bool:
        """All parts of the diamond spectral portrait hold."""
        return (
            self.ordering_fraction_is_five_sixths
            and self.euler_characteristic_is_five
            and self.strict_classifying_invariant_zero
            and self.middle_pair_spacelike
            and self.closed_futures_harmonic
            and self.causal_diffusion_gap_one
        )


@dataclass(frozen=True, slots=True)
class MyrheimMeyerRealShadowWitness:
    """Exact shadow of the diamond ordering fraction inside InternalReals."""

    apex_count: int
    ordered_pair_count: int
    internal_rational: Fraction
    internal_real: Fraction
    expected: Fraction = Fraction(5, 6)

    @property
    def internal_rational_eq_five_sixths(self) -> bool:
        """The internal rational is exactly ``5/6``."""

        return self.internal_rational == self.expected

    @property
    def internal_real_eq_five_sixths(self) -> bool:
        """The internal-real embedding preserves the exact rational value."""

        return self.internal_real == self.expected

    @property
    def cross_multiplication_holds(self) -> bool:
        """The Lean quotient proof's arithmetic core: ``10*6 = 5*12``."""

        return (2 * self.apex_count) * self.expected.denominator == (
            self.expected.numerator * self.ordered_pair_count
        )

    @property
    def holds(self) -> bool:
        """Both headline equalities and their arithmetic witness hold."""

        return (
            self.internal_rational_eq_five_sixths
            and self.internal_real_eq_five_sixths
            and self.cross_multiplication_holds
        )


def relation_count(events: Sequence[E], prec: Callable[[E, E], bool]) -> int:
    """The number of comparable (related) unordered pairs under ``prec``."""
    return sum(1 for a, b in combinations(events, 2) if prec(a, b) or prec(b, a))


def apex_count(events: Sequence[E], prec: Callable[[E, E], bool]) -> int:
    """The Apex count ``|Apex|``: ordered pairs ``(e₁,e₂)``, ``e₁≠e₂``, with ``prec e₁ e₂`` — the
    strictly-causally-ordered pairs the Myrheim–Meyer estimator reads. For a strict order this
    equals ``relation_count`` (each comparable pair contributes one ordered relation)."""
    return sum(1 for a, b in permutations(events, 2) if prec(a, b))


def nsc_count(events: Sequence[E], prec: Callable[[E, E], bool]) -> int:
    """``|L_ns|`` — the non-Scott-continuous (antisymmetry-violating) firing count: ordered pairs
    with both ``prec a b`` and ``prec b a``. ``0`` in the strict regime (a finite causal set
    settles strictly, ``H¹=0``, no NSC firings)."""
    return sum(1 for a, b in permutations(events, 2) if prec(a, b) and prec(b, a))


def euler_characteristic(events: Sequence[E], prec: Callable[[E, E], bool]) -> int:
    """The settling Gauss–Bonnet identity ``χ = |Apex| − |L_ns|``; in the strict regime
    (``|L_ns| = 0``) this is exactly the apex count."""
    return apex_count(events, prec) - nsc_count(events, prec)


def mm_dimension_function(d: float) -> float:
    """The corpus's Myrheim–Meyer calibration ``f(d) = Γ(d+1)²/(2·Γ(2d+1))·d``, whose inverse
    ``d_MM = f⁻¹(r)`` recovers the dimension from the ordering fraction. Lean core has no reals
    or ``Γ`` and scopes ``d_MM`` out; with ``math.gamma`` the lab computes ``f`` directly.

    Note the corpus's own real-valued discrepancy: this formula gives ``f(2) = 1/6`` while the
    node text states ``f(2) = 1/4``. We reproduce the formula as written and flag, not resolve,
    the mismatch (it lives in the real-valued layer the corpus left unsettled).
    """
    return gamma(d + 1) ** 2 / (2 * gamma(2 * d + 1)) * d


def pair_count(n: int) -> int:
    """``C(N, 2)`` — the number of unordered pairs of ``N`` events."""
    return choose(n, 2)


def ordering_fraction(events: Sequence[E], prec: Callable[[E, E], bool]) -> Fraction:
    """The Myrheim-Meyer ordering fraction ``r = relations / C(N, 2)`` (``0`` if ``N < 2``)."""
    n = len(events)
    if n < 2:
        return Fraction(0)
    return Fraction(relation_count(events, prec), pair_count(n))


def diamond_ordering_fraction_internal_rational() -> Fraction:
    """The diamond's internal rational ``2*apex/ordered-pairs = 10/12 = 5/6``."""

    events = diamond_events()
    return Fraction(2 * apex_count(events, diamond_prec), len(events) * (len(events) - 1))


def diamond_ordering_fraction_real() -> Fraction:
    """The internal-real embedding of the diamond ordering fraction."""

    return Fraction(diamond_ordering_fraction_internal_rational())


def diamond_myrheim_meyer_real_shadow() -> MyrheimMeyerRealShadowWitness:
    """Bundle the exact real-shadow result from ``MyrheimMeyerRealShadow``."""

    events = diamond_events()
    ordered_pairs = len(events) * (len(events) - 1)
    internal_rational = diamond_ordering_fraction_internal_rational()
    return MyrheimMeyerRealShadowWitness(
        apex_count=apex_count(events, diamond_prec),
        ordered_pair_count=ordered_pairs,
        internal_rational=internal_rational,
        internal_real=Fraction(internal_rational),
    )


def diamond_events() -> tuple[str, str, str, str]:
    """The canonical four-event diamond ``a < b,c < d``."""
    return ("a", "b", "c", "d")


def diamond_prec(left: str, right: str) -> bool:
    """The settled strict order of the canonical four-event diamond."""
    return (left, right) in {
        ("a", "b"),
        ("a", "c"),
        ("a", "d"),
        ("b", "d"),
        ("c", "d"),
    }


def diamond_spectral_spacetime_portrait() -> DiamondSpectralPortraitWitness:
    """Bundle the canonical diamond's Myrheim-Meyer and causal-Laplacian portrait."""
    events = diamond_events()
    order = causal_closure(
        events,
        frozenset(
            {
                ("a", "b"),
                ("a", "c"),
                ("a", "d"),
                ("b", "d"),
                ("c", "d"),
            }
        ),
    )
    return DiamondSpectralPortraitWitness(
        ordering_fraction_is_five_sixths=ordering_fraction(events, diamond_prec) == Fraction(5, 6),
        euler_characteristic_is_five=euler_characteristic(events, diamond_prec) == 5,
        strict_classifying_invariant_zero=nsc_count(events, diamond_prec) == 0,
        middle_pair_spacelike=not diamond_prec("b", "c") and not diamond_prec("c", "b"),
        closed_futures_harmonic=all(
            is_harmonic_section(
                events,
                order,
                {right for right in events if event == right or (event, right) in order},
            )
            for event in events
        ),
        causal_diffusion_gap_one=causal_laplacian_theory(events, order).idempotent,
    )
