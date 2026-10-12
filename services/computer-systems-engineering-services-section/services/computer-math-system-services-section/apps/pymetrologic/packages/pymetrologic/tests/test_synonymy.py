from __future__ import annotations

from pymetrologic.classification import (
    AperiodicSettling,
    H1Class,
)
from pymetrologic.regimes import (
    ClosureRegime,
)
from pymetrologic.synonymy import (
    FIRING_TYPES,
    FiringType,
    StrongSettling,
    antonymy,
    antonymy_symmetric_laws,
    firing_flip,
    firing_flip_is_involution,
    firing_flip_nontrivial,
    neg_twist,
    negation_invisible_to_synonymy,
    strong_mld,
    strong_mld_equivalence_laws,
    strong_mld_respects_neg_twist,
    synonymy,
    synonymy_equivalence_laws,
)


def settling(coord: int) -> AperiodicSettling:
    return AperiodicSettling(ClosureRegime.aperiodic, H1Class(coord))


def test_synonymy_is_cohomological_equivalence() -> None:
    first = settling(2)
    same = settling(2)
    other = settling(3)

    assert synonymy(first, same)
    assert not synonymy(first, other)
    assert synonymy_equivalence_laws(first, same, settling(2)) == (True, True, True)


def test_firing_flip_is_involutive_and_nontrivial() -> None:
    assert (
        FiringType.truth_only,
        FiringType.falsity_only,
        FiringType.both,
    ) == FIRING_TYPES
    assert firing_flip(FiringType.truth_only) is FiringType.falsity_only
    assert firing_flip(FiringType.falsity_only) is FiringType.truth_only
    assert firing_flip(FiringType.both) is FiringType.both
    assert firing_flip_is_involution()
    assert firing_flip_nontrivial()


def test_negation_twist_is_invisible_to_synonymy_but_not_strong_mld() -> None:
    strong = StrongSettling(settling(5), FiringType.truth_only)
    twisted = neg_twist(strong)

    assert twisted.base == strong.base
    assert twisted.tau is FiringType.falsity_only
    assert neg_twist(twisted) == strong
    assert negation_invisible_to_synonymy(strong)
    assert synonymy(strong.base, twisted.base)
    assert not strong_mld(strong, twisted)


def test_strong_mld_is_equivalence_and_respects_negation_twist() -> None:
    first = StrongSettling(settling(7), FiringType.both)
    same = StrongSettling(settling(7), FiringType.both)
    other_tau = StrongSettling(settling(7), FiringType.truth_only)

    assert strong_mld(first, same)
    assert not strong_mld(first, other_tau)
    assert strong_mld_equivalence_laws(first, same, StrongSettling(settling(7), FiringType.both))
    assert strong_mld_respects_neg_twist(first, same)
    assert strong_mld_respects_neg_twist(first, other_tau)


def test_antonymy_is_symmetric_and_refines_synonymy() -> None:
    truth = StrongSettling(settling(9), FiringType.truth_only)
    falsity = StrongSettling(settling(9), FiringType.falsity_only)
    both = StrongSettling(settling(9), FiringType.both)

    assert antonymy(truth, falsity)
    assert antonymy(falsity, truth)
    assert antonymy_symmetric_laws(truth, falsity) == (True, True, True)
    assert antonymy(both, both)
    assert synonymy(truth.base, falsity.base)
