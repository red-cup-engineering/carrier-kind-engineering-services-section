"""Tests for kernel.settlement — the dedicated settling-monotonicity gate
(design spec S5, step 7), distinct from and additional to Register B's WIT
gate (kernel.four.witness_bit)."""

from __future__ import annotations

from itertools import pairwise
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import BOTH, FALSE, NEITHER, TRUE, Four, four
from pyfars.kernel.settlement import (
    CellSettlement,
    SettlingMonotonicityViolation,
    guard_settling_monotone,
    settled_write,
)
from pyfars.kernel.witness import make_witness, record_witness

_four_values = st.builds(four, st.booleans(), st.booleans())


# -- guard_settling_monotone / settled_write ------------------------------


def test_guard_accepts_a_forward_move():
    guard_settling_monotone(NEITHER, TRUE)
    guard_settling_monotone(TRUE, BOTH)
    guard_settling_monotone(FALSE, BOTH)


def test_guard_accepts_a_no_op():
    guard_settling_monotone(TRUE, TRUE)
    guard_settling_monotone(NEITHER, NEITHER)


def test_guard_rejects_a_decrement():
    with pytest.raises(SettlingMonotonicityViolation, match="backward"):
        guard_settling_monotone(TRUE, NEITHER)
    with pytest.raises(SettlingMonotonicityViolation, match="backward"):
        guard_settling_monotone(BOTH, TRUE)


def test_guard_rejects_an_incomparable_move():
    with pytest.raises(SettlingMonotonicityViolation):
        guard_settling_monotone(TRUE, FALSE)


def test_settled_write_is_the_knowledge_order_join():
    assert settled_write(NEITHER, TRUE) == TRUE
    assert settled_write(TRUE, FALSE) == BOTH
    assert settled_write(TRUE, TRUE) == TRUE


# -- CellSettlement ---------------------------------------------------------


def test_cell_settlement_starts_at_neither():
    ledger = CellSettlement()
    assert ledger.value_of("x") == NEITHER


def test_cell_settlement_write_advances_and_commits():
    ledger = CellSettlement()
    ledger.write("x", TRUE)
    assert ledger.value_of("x") == TRUE
    ledger.write("x", BOTH)
    assert ledger.value_of("x") == BOTH


def test_cell_settlement_write_rejects_a_backward_move_and_does_not_commit():
    ledger = CellSettlement()
    ledger.write("x", TRUE)
    with pytest.raises(SettlingMonotonicityViolation):
        ledger.write("x", NEITHER)
    assert ledger.value_of("x") == TRUE


def test_cell_settlement_tracks_cells_independently():
    ledger = CellSettlement()
    ledger.write("x", TRUE)
    assert ledger.value_of("y") == NEITHER
    ledger.write("y", FALSE)
    assert ledger.value_of("x") == TRUE
    assert ledger.value_of("y") == FALSE


# -- wired into the witness pipeline's named seam (record_witness) ---------


def test_record_witness_commits_a_legal_write_to_the_ledger(tmp_path: Path):
    log = EventLog(root=tmp_path)
    ledger = CellSettlement()
    record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        after="body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
        settlement=ledger,
    )
    assert ledger.value_of("concepts/alpha.md") == TRUE


def test_record_witness_refuses_a_write_that_moves_the_ledgers_cell_backward(
    tmp_path: Path,
):
    """The dedicated gate catches what Register B's self-consistency check
    cannot: a caller can only fold the ``prior_witnesses`` it happens to
    pass, but the ledger remembers every write it has ever guarded. Here a
    first call commits ``concepts/alpha.md`` to TRUE; a second call, given
    no ``prior_witnesses`` of its own, claims a WIT-legal 0->1 transition
    from Register B's point of view (NEITHER -> FALSE) that is nonetheless
    backward relative to the ledger's real accumulated state — and it is
    the ledger, not Register B, that refuses it."""
    log = EventLog(root=tmp_path)
    ledger = CellSettlement()
    record_witness(
        event_log=log,
        operator="fm_add",
        target="x",
        after="body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
        settlement=ledger,
    )
    with pytest.raises(SettlingMonotonicityViolation):
        record_witness(
            event_log=log,
            operator="fm_add",
            target="x",
            after="body",
            four_after=(False, True),
            timestamp="2026-08-19T00:00:01Z",
            channel="substrate",
            settlement=ledger,
        )
    lines = list(log.read_channel("substrate"))
    assert len(lines) == 1


def test_record_witness_without_settlement_is_unaffected(tmp_path: Path):
    log = EventLog(root=tmp_path)
    witness = record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        after="body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    assert witness.four_after == (True, False)


# -- property: legal sequences never decrease knowledge order --------------


@given(writes=st.lists(_four_values, min_size=1, max_size=12))
def test_forced_write_sequences_that_pass_the_gate_never_decrease(writes: list[Four]):
    ledger = CellSettlement()
    seen = [NEITHER]
    for candidate in writes:
        joined = four(
            seen[-1].pos or candidate.pos,
            seen[-1].neg or candidate.neg,
        )
        committed = ledger.write("cell", joined)
        assert committed == joined
        seen.append(joined)
    for before, after in pairwise(seen):
        assert guard_settling_monotone(before, after) is None


@given(before=_four_values, after=_four_values)
def test_guard_raises_exactly_when_after_does_not_dominate_before(
    before: Four, after: Four
):
    dominates = (not before.pos or after.pos) and (not before.neg or after.neg)
    if dominates:
        guard_settling_monotone(before, after)
    else:
        with pytest.raises(SettlingMonotonicityViolation):
            guard_settling_monotone(before, after)


def test_make_witness_still_uses_register_b_when_no_ledger_is_given():
    # A genuine backward move is still rejected before minting anything —
    # unchanged from before this milestone wired the settlement seam in.
    from pyfars.kernel.four import NotOneWitError

    with pytest.raises(NotOneWitError):
        make_witness(
            operator="fm_add",
            target="x",
            before_digest=None,
            after_digest=None,
            details={},
            agent=None,
            timestamp="2026-08-19T00:00:00Z",
            kind="mutation",
            four_before=(True, False),
            four_after=(False, False),
            channel="substrate",
        )
