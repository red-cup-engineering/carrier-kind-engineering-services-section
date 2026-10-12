"""Tests for pyfars.runtime.belief — cellwise belief queries."""
from __future__ import annotations

from pathlib import Path

import pytest

from pyfars.operator.witness import make_witness
from pyfars.runtime.belief import (
    BeliefCell,
    belief,
    fold_witnesses,
)
from pyfars.runtime.event_log import EventLog
from pyfars.substrate.bilattice import BilatticeValue


def _w(target, *, truth=1.0, evidence=1.0, key=None,
       operator="fm_set", channel=None):
    details = {"key": key} if key else {}
    return make_witness(operator, target, None, "after",
                        details=details, channel=channel,
                        truth=truth, evidence=evidence)


# -- fold_witnesses (pure, in-memory) -------------------------------


def test_empty_stream_yields_bottom():
    cell = fold_witnesses([], target="x")
    assert cell.value is BilatticeValue.BOTTOM
    assert cell.votes == ()
    assert not cell.is_settled
    assert cell.is_consistent  # bottom is consistent — nothing to disagree


def test_single_true_witness_settles_true():
    cell = fold_witnesses([_w("x", truth=1.0)], target="x")
    assert cell.value is BilatticeValue.TRUE
    assert cell.is_settled
    assert cell.is_consistent
    assert len(cell.supporting) == 1
    assert len(cell.opposing) == 0


def test_single_false_witness_settles_false():
    cell = fold_witnesses([_w("x", truth=0.0)], target="x")
    assert cell.value is BilatticeValue.FALSE


def test_disagreement_yields_top():
    """The structural property the WOAH list depends on: contradictory
    witnesses produce ⊤, not silent overwrite."""
    cell = fold_witnesses(
        [_w("x", truth=1.0), _w("x", truth=0.0)],
        target="x",
    )
    assert cell.value is BilatticeValue.TOP
    assert not cell.is_consistent
    assert cell.is_settled
    assert len(cell.supporting) == 1
    assert len(cell.opposing) == 1


def test_three_agreeing_witnesses_stay_true():
    """Knowledge-join is idempotent on agreement; piling on doesn't toggle."""
    cell = fold_witnesses(
        [_w("x", truth=1.0)] * 3,
        target="x",
    )
    assert cell.value is BilatticeValue.TRUE


def test_target_filter_is_literal_equality():
    cell = fold_witnesses(
        [_w("a", truth=1.0), _w("b", truth=0.0)],
        target="a",
    )
    assert cell.value is BilatticeValue.TRUE
    assert len(cell.votes) == 1


def test_attribute_scope_requires_details_key():
    """An attribute-scoped query only sees witnesses carrying details.key."""
    ws = [
        _w("x", truth=1.0, key="title"),
        _w("x", truth=0.0, key="description"),
        _w("x", truth=0.0),  # no key — must NOT contribute
    ]
    title_cell = fold_witnesses(ws, target="x", attribute="title")
    assert title_cell.value is BilatticeValue.TRUE
    assert len(title_cell.votes) == 1
    desc_cell = fold_witnesses(ws, target="x", attribute="description")
    assert desc_cell.value is BilatticeValue.FALSE


def test_unscoped_query_sees_every_target_witness():
    """Whole-target query collects all witnesses regardless of details.key."""
    ws = [
        _w("x", truth=1.0, key="title"),
        _w("x", truth=0.0, key="description"),
        _w("x", truth=1.0),
    ]
    cell = fold_witnesses(ws, target="x")
    # Two t votes plus one f vote → ⊤.
    assert cell.value is BilatticeValue.TOP
    assert len(cell.votes) == 3


def test_attribute_scope_yields_bottom_when_witnesses_lack_details_key():
    """Conservative-read invariant: an attribute-scoped query returns ⊥
    even when the unscoped query is fully settled, if no witness carries
    the requested ``details.key``. This documents the deliberate
    semantic — a future producer that touches a single attribute MUST
    set ``details["key"]`` to participate in attribute-scoped belief;
    until it does, the cell stays unsettled rather than over-attribute
    a target-wide witness to one specific attribute."""
    ws = [_w("x", truth=1.0), _w("x", truth=1.0)]  # no key on either
    unscoped = fold_witnesses(ws, target="x")
    scoped = fold_witnesses(ws, target="x", attribute="title")
    assert unscoped.value is BilatticeValue.TRUE
    assert scoped.value is BilatticeValue.BOTTOM
    assert scoped.votes == ()


def test_silent_witness_does_not_settle():
    """An evidence=0 witness contributes a ⊥ vote — leaves cell unsettled."""
    cell = fold_witnesses(
        [_w("x", truth=1.0, evidence=0.0)],
        target="x",
    )
    assert cell.value is BilatticeValue.BOTTOM
    assert not cell.is_settled
    # The vote is recorded so audits can show "we saw the witness, it
    # had no evidence" rather than silently dropping it.
    assert len(cell.votes) == 1
    assert cell.votes[0].vote is BilatticeValue.BOTTOM


def test_custom_thresholds_propagate():
    """A stricter evidence threshold reclassifies a previously-true vote."""
    ws = [_w("x", truth=1.0, evidence=0.3)]
    loose = fold_witnesses(ws, target="x")
    strict = fold_witnesses(ws, target="x", evidence_threshold=0.5)
    assert loose.value is BilatticeValue.TRUE
    assert strict.value is BilatticeValue.BOTTOM


# -- monotonicity of join_k under witness append --------------------


def test_belief_is_knowledge_monotone_under_append():
    """Adding witnesses can only move the cell *up* in the knowledge order
    (the dispatch-monotonicity property the WOAH list calls out)."""
    from pyfars.substrate.bilattice import leq_k
    ws = [
        _w("x", truth=1.0),
        _w("x", truth=1.0, evidence=0.0),  # silent — no change
        _w("x", truth=0.0),                 # contradicts — moves to ⊤
        _w("x", truth=1.0),                 # ⊤ is absorbing in knowledge join
    ]
    prev = BilatticeValue.BOTTOM
    for i in range(1, len(ws) + 1):
        cell = fold_witnesses(ws[:i], target="x")
        assert leq_k(prev, cell.value), (
            f"belief moved DOWN in knowledge order at step {i}: "
            f"{prev} -> {cell.value}"
        )
        prev = cell.value


# -- belief() over a real EventLog ----------------------------------


def test_belief_prefixes_are_knowledge_monotone_over_event_log(tmp_path):
    """Integration guard for downstream WOAHs (#3 CRDT, #6 closure-rule
    dispatch): every prefix of the event log produces a cell-state
    that's ≤_k the next prefix. If a future producer ever emits a
    witness whose interpretation moves belief *down* in knowledge,
    this test fires before that producer can compound across the
    foundations the next rounds build on."""
    from pyfars.substrate.bilattice import leq_k
    log = EventLog(tmp_path)
    appended = [
        _w("x", truth=1.0),
        _w("x", truth=1.0, evidence=0.0),
        _w("x", truth=0.0),                   # introduces ⊤
        _w("x", truth=1.0),                   # ⊤ is absorbing
        _w("x", truth=0.0, evidence=0.5),
    ]
    prev = BilatticeValue.BOTTOM
    for w in appended:
        log.append(w)
        cell = belief(log, "x")
        assert leq_k(prev, cell.value), (
            f"event-log belief moved DOWN in knowledge order: "
            f"{prev} -> {cell.value} after appending {w.operator}"
        )
        prev = cell.value


def test_belief_reads_from_event_log(tmp_path):
    log = EventLog(tmp_path)
    log.append(_w("x", truth=1.0))
    log.append(_w("x", truth=0.0))
    cell = belief(log, "x")
    assert cell.value is BilatticeValue.TOP
    assert len(cell.votes) == 2


def test_belief_channel_filter_restricts_witness_stream(tmp_path):
    """Passing channel= scopes belief to one named conduit."""
    log = EventLog(tmp_path)
    log.append(_w("x", truth=1.0, channel="substrate"))
    log.append(_w("x", truth=0.0, channel="governance"))
    sub = belief(log, "x", channel="substrate")
    gov = belief(log, "x", channel="governance")
    assert sub.value is BilatticeValue.TRUE
    assert gov.value is BilatticeValue.FALSE


def test_belief_on_unwitnessed_target_is_bottom(tmp_path):
    log = EventLog(tmp_path)
    log.append(_w("other", truth=1.0))
    cell = belief(log, "x")
    assert cell.value is BilatticeValue.BOTTOM
    assert cell.votes == ()


def test_belief_attribute_scope_via_event_log(tmp_path):
    log = EventLog(tmp_path)
    log.append(_w("x", truth=1.0, key="title"))
    log.append(_w("x", truth=0.0, key="description"))
    title = belief(log, "x", attribute="title")
    desc = belief(log, "x", attribute="description")
    assert title.value is BilatticeValue.TRUE
    assert desc.value is BilatticeValue.FALSE
