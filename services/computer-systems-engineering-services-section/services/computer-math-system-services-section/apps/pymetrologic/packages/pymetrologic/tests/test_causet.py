"""Causal sets — the Myrheim–Meyer ordering fraction (RelMath.Lorentzian.MyrheimMeyer)."""

from __future__ import annotations

from fractions import Fraction
from math import gamma

from pymetrologic import (
    MyrheimMeyerRealShadowWitness,
    apex_count,
    diamond_events,
    diamond_myrheim_meyer_real_shadow,
    diamond_ordering_fraction_internal_rational,
    diamond_ordering_fraction_real,
    diamond_prec,
    diamond_spectral_spacetime_portrait,
    euler_characteristic,
    mm_dimension_function,
    nsc_count,
    ordering_fraction,
    pair_count,
    relation_count,
)

EVENTS = (0, 1, 2, 3)


def chain(a: int, b: int) -> bool:
    return a < b


def antichain(a: int, b: int) -> bool:
    return False


# A diamond: 0 below 1 and 2, both below 3; 1 and 2 incomparable.
_DIAMOND = frozenset({(0, 1), (0, 2), (0, 3), (1, 3), (2, 3)})


def diamond(a: int, b: int) -> bool:
    return (a, b) in _DIAMOND


def test_pair_count_is_choose_n_2() -> None:
    assert pair_count(4) == 6
    assert pair_count(5) == 10


def test_chain_has_ordering_fraction_one() -> None:
    assert relation_count(EVENTS, chain) == 6
    assert ordering_fraction(EVENTS, chain) == Fraction(1)


def test_antichain_has_ordering_fraction_zero() -> None:
    assert relation_count(EVENTS, antichain) == 0
    assert ordering_fraction(EVENTS, antichain) == Fraction(0)


def test_diamond_is_intermediate() -> None:
    # 5 of the 6 pairs are related (1 and 2 are incomparable).
    assert relation_count(EVENTS, diamond) == 5
    assert ordering_fraction(EVENTS, diamond) == Fraction(5, 6)


def test_canonical_diamond_spectral_portrait() -> None:
    witness = diamond_spectral_spacetime_portrait()

    assert diamond_events() == ("a", "b", "c", "d")
    assert relation_count(diamond_events(), diamond_prec) == 5
    assert ordering_fraction(diamond_events(), diamond_prec) == Fraction(5, 6)
    assert witness.holds
    assert witness.ordering_fraction_is_five_sixths
    assert witness.euler_characteristic_is_five
    assert witness.strict_classifying_invariant_zero
    assert witness.middle_pair_spacelike
    assert witness.closed_futures_harmonic
    assert witness.causal_diffusion_gap_one


def test_diamond_myrheim_meyer_real_shadow_is_exact() -> None:
    witness = diamond_myrheim_meyer_real_shadow()

    assert isinstance(witness, MyrheimMeyerRealShadowWitness)
    assert witness.apex_count == 5
    assert witness.ordered_pair_count == 12
    assert diamond_ordering_fraction_internal_rational() == Fraction(5, 6)
    assert diamond_ordering_fraction_real() == Fraction(5, 6)
    assert witness.cross_multiplication_holds
    assert witness.internal_rational_eq_five_sixths
    assert witness.internal_real_eq_five_sixths
    assert witness.holds


def test_degenerate_small_causets() -> None:
    assert ordering_fraction((), chain) == Fraction(0)
    assert ordering_fraction((0,), chain) == Fraction(0)


def test_apex_count_and_strict_regime_nsc() -> None:
    # |Apex| = the directed relations; for a strict order this equals relation_count.
    assert apex_count(EVENTS, diamond) == 5  # the corpus's five ordered pairs
    assert apex_count(EVENTS, chain) == 6  # C(4,2), the 4-chain causal order
    assert apex_count(EVENTS, antichain) == 0
    # |L_ns| = 0 in the strict regime (no antisymmetry violations).
    for prec in (diamond, chain, antichain):
        assert nsc_count(EVENTS, prec) == 0


def test_gauss_bonnet_diamond() -> None:
    # χ = |Apex| − |L_ns| = 5 − 0 = 5 on the diamond in the strict regime.
    assert euler_characteristic(EVENTS, diamond) == 5
    assert euler_characteristic(EVENTS, chain) == 6
    assert euler_characteristic(EVENTS, antichain) == 0


def test_geometry_independent_of_topology() -> None:
    # Diamond, chain, antichain share classifying data (strict regime, |L_ns| = 0) yet have
    # DIFFERENT ordering fractions — geometry ⊥ topology, the corpus's independence claim.
    fractions = {ordering_fraction(EVENTS, p) for p in (diamond, chain, antichain)}
    assert fractions == {Fraction(5, 6), Fraction(1), Fraction(0)}
    for prec in (diamond, chain, antichain):
        assert nsc_count(EVENTS, prec) == 0  # identical topology/classifying data


def test_mm_dimension_function_and_corpus_discrepancy() -> None:
    # The lab computes f(d) (Lean core could not — no reals / Γ).
    assert mm_dimension_function(1) == 0.25  # f(1) = 1/4
    # The corpus's own formula gives f(2) = 1/6, while its text claims 1/4 — we reproduce the
    # formula as written and flag (not resolve) the mismatch.
    assert abs(mm_dimension_function(2) - 1 / 6) < 1e-12
    assert abs(mm_dimension_function(2) - gamma(3) ** 2 / (2 * gamma(5)) * 2) < 1e-12
