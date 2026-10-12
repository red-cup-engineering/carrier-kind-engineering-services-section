"""Tests for kernel.replay — deterministic replay (design spec S4, S11;
Addendum ruling 5). Folding belief per proposition via
kernel.four.join_knowledge over four_after in trace order, recovering
the Tier B record registry from witnessed record-creation events,
detecting corruption and causal reordering rather than skipping it,
and the byte-identical-twice-from-empty-state determinism guarantee."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from pyfars.kernel.event_log import EventLog
from pyfars.kernel.four import BOTH, FALSE, NEITHER, TRUE, Four
from pyfars.kernel.identity import identity
from pyfars.kernel.record_types import make_observation
from pyfars.kernel.replay import (
    EMPTY_STATE,
    CausalOrderViolation,
    CorruptedLogLineError,
    channels_of,
    replay_event_log,
    serialize_state,
)
from pyfars.kernel.seavt import log_path_for
from pyfars.kernel.witness import make_witness, record_witness


def _witness(
    *,
    target: str,
    before_digest: str | None,
    after_digest: str | None,
    four_before: tuple[bool, bool],
    four_after: tuple[bool, bool],
    timestamp: str,
    operator: str = "fm_add",
    details: dict | None = None,
    channel: str = "substrate",
):
    return make_witness(
        operator=operator,
        target=target,
        before_digest=before_digest,
        after_digest=after_digest,
        details=details or {},
        agent="morgan",
        timestamp=timestamp,
        kind="mutation",
        four_before=four_before,
        four_after=four_after,
        channel=channel,
    )


# -- empty log --------------------------------------------------------------


def test_replay_of_an_empty_log_is_the_empty_state(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    assert replay_event_log(log) == EMPTY_STATE
    assert serialize_state(replay_event_log(log)) == serialize_state(EMPTY_STATE)


# -- belief folding -----------------------------------------------------


def test_belief_folds_independent_targets_separately(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    w1 = _witness(
        target="concepts/alpha.md",
        before_digest=None,
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
    )
    w2 = _witness(
        target="concepts/beta.md",
        before_digest=None,
        after_digest="d2",
        four_before=(False, False),
        four_after=(False, True),
        timestamp="2026-08-19T00:00:01Z",
    )
    log.append("substrate", w1.to_record())
    log.append("substrate", w2.to_record())
    state = replay_event_log(log)
    assert state.belief == {"concepts/alpha.md": TRUE, "concepts/beta.md": FALSE}
    assert state.records == {}


def test_belief_folds_a_target_across_two_witnesses_by_knowledge_join(
    tmp_path: Path,
) -> None:
    log = EventLog(root=tmp_path)
    w1 = _witness(
        target="x",
        before_digest=None,
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
    )
    w2 = _witness(
        target="x",
        before_digest="d1",
        after_digest="d2",
        four_before=(True, False),
        four_after=(True, True),
        timestamp="2026-08-19T00:00:01Z",
    )
    log.append("substrate", w1.to_record())
    log.append("substrate", w2.to_record())
    state = replay_event_log(log)
    assert state.belief == {"x": BOTH}


def test_belief_folds_across_channels(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    w1 = _witness(
        target="x",
        before_digest=None,
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    w2 = _witness(
        target="y",
        before_digest=None,
        after_digest="d2",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:01Z",
        channel="learning",
    )
    log.append("substrate", w1.to_record())
    log.append("learning", w2.to_record())
    assert set(channels_of(tmp_path)) == {"substrate", "learning"}
    state = replay_event_log(log)
    assert state.belief == {"x": TRUE, "y": TRUE}


def test_replay_accepts_an_explicit_channel_subset(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    w1 = _witness(
        target="x",
        before_digest=None,
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
    )
    w2 = _witness(
        target="y",
        before_digest=None,
        after_digest="d2",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:01Z",
        channel="learning",
    )
    log.append("substrate", w1.to_record())
    log.append("learning", w2.to_record())
    state = replay_event_log(log, channels=["substrate"])
    assert state.belief == {"x": TRUE}


# -- record registry ------------------------------------------------------


def test_record_creation_witness_registers_the_record(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    guard = _witness(
        target="offices/librarian",
        before_digest=None,
        after_digest=None,
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        operator="dispatch",
        channel="governance",
    )
    log.append("governance", guard.to_record())
    observation = make_observation(
        accord="memory",
        proposition="alpha exists",
        witness_id=guard.id,
        agent="morgan",
    )
    creation = _witness(
        target=observation.id,
        before_digest=None,
        after_digest=identity(observation.to_record()),
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:01Z",
        operator="record_observation",
        details={"record": observation.to_record()},
        channel="learning",
    )
    log.append("learning", creation.to_record())

    state = replay_event_log(log)
    assert state.records == {observation.id: observation.to_record()}
    assert state.belief[observation.id] == TRUE
    assert state.belief["offices/librarian"] == TRUE


def test_record_creation_with_mismatched_target_is_corrupted(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    observation = make_observation(
        accord="memory",
        proposition="p",
        witness_id=identity("dummy-witness"),
        agent=None,
    )
    creation = _witness(
        target="not-the-record-id",
        before_digest=None,
        after_digest=identity(observation.to_record()),
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        details={"record": observation.to_record()},
    )
    log.append("substrate", creation.to_record())
    with pytest.raises(CorruptedLogLineError, match="witnesses the creation of"):
        replay_event_log(log)


def test_record_creation_with_invalid_record_body_is_corrupted(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    bad_record = {"type": "Observation", "id": "ni:///sha-256;" + "a" * 43}
    creation = _witness(
        target="ni:///sha-256;" + "a" * 43,
        before_digest=None,
        after_digest=None,
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        details={"record": bad_record},
    )
    log.append("substrate", creation.to_record())
    with pytest.raises(CorruptedLogLineError, match="invalid"):
        replay_event_log(log)


# -- corrupted lines --------------------------------------------------------


def test_bad_json_is_refused_as_corrupted(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    path = log_path_for(tmp_path, "substrate", "2026-08-19T00:00:00Z")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{not json at all\n", encoding="utf-8")
    with pytest.raises(CorruptedLogLineError):
        replay_event_log(log)


def test_srn_violation_is_refused_as_corrupted(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    path = log_path_for(tmp_path, "substrate", "2026-08-19T00:00:00Z")
    path.parent.mkdir(parents=True, exist_ok=True)
    line = {
        "e": "not-valid-hex!!",
        "a": "666d5f616464",
        "v": "6162636465",
        "t": "2026-08-19T00:00:00Z",
        "record": {},
    }
    path.write_text(json.dumps(line) + "\n", encoding="utf-8")
    with pytest.raises(CorruptedLogLineError):
        replay_event_log(log)


def test_invalid_witness_shape_is_refused_as_corrupted(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    tampered = {
        "type": "Witness",
        "id": "ni:///sha-256;" + "a" * 43,
        "operator": "fm_add",
        "target": "x",
        "before_digest": None,
        "after_digest": None,
        "details": {},
        "agent": None,
        "timestamp": "2026-08-19T00:00:00Z",
        "kind": "mutation",
        "four_before": [False, False],
        "four_after": [True, False],
        "channel": "substrate",
        "conveys_authority": False,
    }
    log.append("substrate", tampered)
    with pytest.raises(CorruptedLogLineError, match="content identity mismatch"):
        replay_event_log(log)


# -- causal reordering --------------------------------------------------


def test_before_digest_contradicting_the_chain_is_refused(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    w1 = _witness(
        target="x",
        before_digest=None,
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
    )
    w2 = _witness(
        target="x",
        before_digest="wrong-digest",
        after_digest="d2",
        four_before=(True, False),
        four_after=(True, True),
        timestamp="2026-08-19T00:00:01Z",
    )
    log.append("substrate", w1.to_record())
    log.append("substrate", w2.to_record())
    with pytest.raises(CausalOrderViolation, match="does not match"):
        replay_event_log(log)


def test_first_witness_for_a_target_may_have_a_before_digest(tmp_path: Path) -> None:
    log = EventLog(root=tmp_path)
    w = _witness(
        target="x",
        before_digest="pre-existing-content",
        after_digest="d1",
        four_before=(False, False),
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
    )
    log.append("substrate", w.to_record())
    state = replay_event_log(log)
    assert state.belief == {"x": TRUE}


# -- determinism ----------------------------------------------------------


def _seed_log(root: Path) -> EventLog:
    log = EventLog(root=root)
    record_witness(
        event_log=log,
        operator="fm_add",
        target="concepts/alpha.md",
        after="alpha body",
        four_after=(True, False),
        timestamp="2026-08-19T00:00:00Z",
        channel="substrate",
        agent="morgan",
    )
    w1 = make_witness(
        operator="fm_add",
        target="concepts/alpha.md",
        before_digest=identity("alpha body"),
        after_digest=identity("alpha body v2"),
        details={},
        agent="morgan",
        timestamp="2026-08-19T00:00:01Z",
        kind="mutation",
        four_before=(True, False),
        four_after=(True, True),
        channel="substrate",
    )
    log.append("substrate", w1.to_record())
    record_witness(
        event_log=log,
        operator="lesson",
        target="concepts/beta.md",
        after="beta body",
        four_after=(False, True),
        timestamp="2026-08-19T00:00:02Z",
        channel="learning",
        agent="morgan",
    )
    return log


def test_replaying_the_same_log_twice_from_empty_state_is_byte_identical(
    tmp_path: Path,
) -> None:
    log = _seed_log(tmp_path)
    first = replay_event_log(log)
    second = replay_event_log(EventLog(root=tmp_path))
    assert first == second
    assert serialize_state(first) == serialize_state(second)


def test_two_independently_seeded_identical_logs_replay_identically(
    tmp_path: Path,
) -> None:
    root_a = tmp_path / "a"
    root_b = tmp_path / "b"
    root_a.mkdir()
    root_b.mkdir()
    log_a = _seed_log(root_a)
    log_b = _seed_log(root_b)
    assert serialize_state(replay_event_log(log_a)) == serialize_state(
        replay_event_log(log_b)
    )


# -- hypothesis: any legal witness sequence replays deterministically ----

_TARGETS = ("p", "q", "r")

_LEGAL_STEPS = {
    NEITHER: (TRUE, FALSE),
    TRUE: (BOTH,),
    FALSE: (BOTH,),
    BOTH: (),
}


def _legal_witness_sequence(draw, targets: tuple[str, ...]) -> list[dict]:
    state: dict[str, Four] = dict.fromkeys(targets, NEITHER)
    last_digest: dict[str, str | None] = dict.fromkeys(targets, None)
    records = []
    n_steps = draw(st.integers(min_value=0, max_value=12))
    for tick in range(n_steps):
        available = [t for t in targets if _LEGAL_STEPS[state[t]]]
        if not available:
            break
        target = draw(st.sampled_from(available))
        next_state = draw(st.sampled_from(_LEGAL_STEPS[state[target]]))
        content = draw(st.text(min_size=1, max_size=8))
        after_digest = identity({"target": target, "content": content, "tick": tick})
        witness = make_witness(
            operator="fm_add",
            target=target,
            before_digest=last_digest[target],
            after_digest=after_digest,
            details={},
            agent="morgan",
            timestamp=f"2026-08-19T00:{tick:02d}:00Z",
            kind="mutation",
            four_before=(state[target].pos, state[target].neg),
            four_after=(next_state.pos, next_state.neg),
            channel="substrate",
        )
        records.append(witness.to_record())
        state[target] = next_state
        last_digest[target] = after_digest
    return records


@st.composite
def _legal_sequence(draw):
    return _legal_witness_sequence(draw, _TARGETS)


@settings(max_examples=50)
@given(_legal_sequence())
def test_any_legal_witness_sequence_replays_to_the_same_state_twice(
    tmp_path_factory, records: list[dict]
) -> None:
    root_a = tmp_path_factory.mktemp("replay-a")
    root_b = tmp_path_factory.mktemp("replay-b")
    log_a = EventLog(root=root_a)
    log_b = EventLog(root=root_b)
    for record in records:
        log_a.append("substrate", record)
        log_b.append("substrate", record)
    assert serialize_state(replay_event_log(log_a)) == serialize_state(
        replay_event_log(log_b)
    )
    assert replay_event_log(log_a) == replay_event_log(EventLog(root=root_a))
