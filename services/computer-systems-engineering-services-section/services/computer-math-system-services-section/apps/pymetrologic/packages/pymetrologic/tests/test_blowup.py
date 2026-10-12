from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.blowup import (
    BlowupFiringType,
    blowup_classified,
    blowup_is_identity,
    blowup_local_data,
    blowup_nontrivial,
    blowup_trivial,
    cell_failure,
    cell_firing_type,
    reconstruct_cell,
    reconstruct_valuation,
)

bl = four()


def test_cell_firing_type_reads_the_increment_table() -> None:
    assert cell_firing_type(bl.none, bl.true, bl=bl) is BlowupFiringType.truth_side
    assert cell_firing_type(bl.none, bl.false, bl=bl) is BlowupFiringType.falsity_side
    assert cell_firing_type(bl.none, bl.conflict, bl=bl) is BlowupFiringType.top
    assert cell_firing_type(bl.true, bl.conflict, bl=bl) is BlowupFiringType.top
    assert cell_firing_type(bl.false, bl.conflict, bl=bl) is BlowupFiringType.top
    assert cell_firing_type(bl.true, bl.true, bl=bl) is None


def test_cell_reconstruction_and_failure_source() -> None:
    assert reconstruct_cell(bl.none, BlowupFiringType.truth_side, bl=bl) == bl.true
    assert reconstruct_cell(bl.none, BlowupFiringType.falsity_side, bl=bl) == bl.false
    assert reconstruct_cell(bl.true, BlowupFiringType.top, bl=bl) == bl.conflict
    assert reconstruct_cell(bl.false, None, bl=bl) == bl.false

    assert cell_failure(bl.true, bl.conflict, bl=bl) == bl.true
    assert cell_failure(bl.none, bl.true, bl=bl) is None


def test_local_blowup_data_classifies_and_reconstructs_actual() -> None:
    predecessor = {
        "truth": bl.none,
        "truth_failure": bl.true,
        "stable_failure": bl.false,
        "unchanged": bl.conflict,
    }
    actual = {
        "truth": bl.true,
        "truth_failure": bl.conflict,
        "stable_failure": bl.conflict,
        "unchanged": bl.conflict,
    }

    local_data = blowup_local_data(predecessor, actual, bl=bl)
    assert local_data.incidence == frozenset({"truth", "truth_failure", "stable_failure"})
    assert local_data.firing_types["truth"] is BlowupFiringType.truth_side
    assert local_data.firing_types["truth_failure"] is BlowupFiringType.top
    assert local_data.firing_types["stable_failure"] is BlowupFiringType.top
    assert local_data.consistency_failures == {
        "truth_failure": bl.true,
        "stable_failure": bl.false,
    }
    assert reconstruct_valuation(predecessor, local_data, bl=bl) == actual

    blowup = blowup_classified(predecessor, actual, bl=bl)
    assert blowup.local_data == local_data
    assert blowup.actual == actual
    assert blowup_nontrivial(predecessor, actual)
    assert not blowup_is_identity(blowup)


def test_trivial_blowup_is_the_identity_arrow() -> None:
    predecessor = {"cell": bl.true, "other": bl.conflict}
    actual = dict(predecessor)

    blowup = blowup_classified(predecessor, actual, bl=bl)
    assert blowup_trivial(predecessor, actual)
    assert not blowup_nontrivial(predecessor, actual)
    assert blowup_is_identity(blowup)
    assert blowup.local_data.incidence == frozenset()
    assert blowup.local_data.firing_types == {}


def test_blowup_rejects_non_increment_and_mismatched_cells() -> None:
    with pytest.raises(ValueError, match="above predecessor"):
        blowup_local_data({"cell": bl.true}, {"cell": bl.none}, bl=bl)

    with pytest.raises(ValueError, match="same cells"):
        blowup_local_data({"left": bl.none}, {"right": bl.true}, bl=bl)

    with pytest.raises(ValueError, match="firing-table increment"):
        cell_firing_type(bl.true, bl.false, bl=bl)
