from __future__ import annotations

import pytest

from pymetrologic import four, join_nucleus, knowledge_lattice
from pymetrologic.nsc_firing import (
    all_directed_families,
    directed_sup,
    forall_antecedent_is_nsc,
    forall_antecedent_operator,
    has_nsc_firing,
    is_directed_family,
    is_nsc_firing,
    no_nsc_firing_for_closure,
    nsc_firing_source_witness,
    nsc_regime,
    nsc_stage_prefix,
)
from pymetrologic.regimes import (
    ClosureRegime,
)

bl = four()
lat = knowledge_lattice(bl.L)


def test_bot_top_prefix_is_directed_and_joins_to_top() -> None:
    prefix = nsc_stage_prefix(lat)

    assert prefix == (lat.bot, lat.top)
    assert is_directed_family(lat, prefix)
    assert directed_sup(lat, prefix) == lat.top
    assert prefix in all_directed_families(lat)


def test_forall_antecedent_operator_witnesses_nsc_firing() -> None:
    op = forall_antecedent_operator(lat)
    prefix = nsc_stage_prefix(lat)

    assert op(lat.bot) == lat.top
    assert op(lat.top) == lat.bot
    assert is_nsc_firing(lat, op, prefix)
    assert forall_antecedent_is_nsc(lat)
    assert has_nsc_firing(lat, op)


def test_nsc_firing_requires_a_directed_family() -> None:
    op = forall_antecedent_operator(lat)
    nondirected = (bl.true, bl.false)

    assert not is_directed_family(lat, nondirected)
    with pytest.raises(ValueError, match="directed family"):
        is_nsc_firing(lat, op, nondirected)


def test_genuine_closures_have_no_finite_nsc_firing() -> None:
    def identity(value):
        return value

    add_true = join_nucleus(lat, bl.true)
    add_conflict = join_nucleus(lat, bl.conflict)

    for closure in (identity, add_true, add_conflict):
        assert no_nsc_firing_for_closure(lat, closure)
        assert not has_nsc_firing(lat, closure)


def test_nonclosure_rejection_keeps_the_theorem_honest() -> None:
    op = forall_antecedent_operator(lat)

    with pytest.raises(ValueError, match="must be a closure"):
        no_nsc_firing_for_closure(lat, op)


def test_nsc_firing_source_lands_in_curved_nonvanishing_regime() -> None:
    witness = nsc_firing_source_witness(lat)

    assert nsc_regime() is ClosureRegime.transfinite_bounded
    assert witness.source_is_nsc
    assert witness.regime is ClosureRegime.transfinite_bounded
    assert witness.cohomology_nonvanishing
    assert witness.regime_is_curved
