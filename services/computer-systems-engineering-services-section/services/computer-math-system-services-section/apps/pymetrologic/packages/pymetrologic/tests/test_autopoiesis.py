"""Nuclear autopoiesis cells (RelMath.Aperiodic.Autopoiesis)."""

from __future__ import annotations

from pymetrologic import Corner, four, knowledge_lattice, nuclear_quartet
from pymetrologic.autopoiesis import (
    HistoryNuclearPair,
    autopoietic_core,
    autopoietic_core_iff,
    charge_nuclear_pair,
    default_autopoiesis_pair,
    history_filtration_distinct_from_value_order,
    history_separating,
    history_separation_aperiodicity,
    nuclear_autopoiesis_cell,
    varying_family,
)
from pymetrologic.classification import (
    H1Class,
)

FOUR = four()
LAT = knowledge_lattice(FOUR.L)
CHARGES = LAT.elements


def test_charge_nuclear_pair_is_two_commuting_join_nuclei() -> None:
    pair = default_autopoiesis_pair()
    assert isinstance(pair, HistoryNuclearPair)
    assert pair.saturating_target == FOUR.true
    assert pair.transferring_target == FOUR.false
    assert pair.commuting_pair().commutes(CHARGES, LAT.eq)

    for charge in CHARGES:
        assert LAT.eq(pair.saturating(charge), LAT.join(charge, FOUR.true))
        assert LAT.eq(pair.transferring(charge), LAT.join(charge, FOUR.false))
        assert LAT.eq(pair.pi(charge), pair.saturating(pair.transferring(charge)))


def test_autopoietic_core_is_joint_fixed_layer() -> None:
    pair = default_autopoiesis_pair()
    core = {charge for charge in CHARGES if autopoietic_core(pair, charge)}

    assert core == {FOUR.conflict}
    assert all(autopoietic_core_iff(pair, charge) for charge in CHARGES)
    for charge in core:
        assert LAT.eq(pair.saturating(charge), charge)
        assert LAT.eq(pair.transferring(charge), charge)


def test_nuclear_autopoiesis_cell_witness_holds() -> None:
    witness = nuclear_autopoiesis_cell()

    assert witness.holds
    assert witness.nuclei
    assert witness.commutating
    assert witness.self_production
    assert witness.joint_is_intersection


def test_autopoiesis_quartet_has_four_history_filtration_corners() -> None:
    pair = default_autopoiesis_pair()
    quartet = nuclear_quartet(pair.commuting_pair(), CHARGES, LAT.eq)

    assert set(quartet) == set(Corner)
    assert set(quartet[Corner.ABSURD]) == set(CHARGES)
    assert set(quartet[Corner.POTENTIAL]) == {FOUR.true, FOUR.conflict}
    assert set(quartet[Corner.ACTIVE]) == {FOUR.false, FOUR.conflict}
    assert set(quartet[Corner.STABLE]) == {FOUR.conflict}


def test_varying_family_separates_histories() -> None:
    family = varying_family()
    constant = (default_autopoiesis_pair(), default_autopoiesis_pair())

    assert len(family) == 2
    assert history_separating(family)
    assert not history_separating(constant)
    assert family[0].action_table() != family[1].action_table()


def test_history_separation_aperiodicity_witness_holds() -> None:
    witness = history_separation_aperiodicity()

    assert witness.holds
    assert witness.varying_family_exists
    assert witness.separated_regime_aperiodic
    assert witness.separated_clinv_nonzero
    assert witness.flat_baseline_vanishes
    assert witness.constant_family_invisible
    assert witness.varying_family_visible


def test_constant_family_does_not_create_aperiodicity_claim() -> None:
    constant = (default_autopoiesis_pair(), default_autopoiesis_pair())
    witness = history_separation_aperiodicity(constant)

    assert not witness.holds
    assert not witness.varying_family_exists
    assert witness.constant_family_invisible


def test_history_filtration_and_value_order_share_quartet_law_but_not_data() -> None:
    witness = history_filtration_distinct_from_value_order()

    assert witness.holds
    assert witness.history_quartet_law
    assert witness.value_order_quartet_law
    assert witness.presentations_distinct


def test_arbitrary_commuting_targets_still_have_self_production_law() -> None:
    pair = charge_nuclear_pair(FOUR.none, FOUR.conflict)

    assert nuclear_autopoiesis_cell(pair).holds
    assert all(autopoietic_core_iff(pair, charge) for charge in CHARGES)
    assert {charge for charge in CHARGES if autopoietic_core(pair, charge)} == {FOUR.conflict}
    assert H1Class(1) != H1Class(0)
