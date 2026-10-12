"""Tests for kind-filtering on EventLog — Round 14 / WOAH #5.

Adds a ``kind`` filter parameter to ``read_all`` / ``tail`` / ``count``
and a ``kinds()`` histogram method. Verifies the filter composes with
existing channel/origin/operator filters and that the histogram reports
in canonical kind order."""
from __future__ import annotations

from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog


def _seed(log: EventLog) -> None:
    """Seed a log with one witness of each kind we use here."""
    log.append(make_witness("commit", "abc",
                            before_hash=None, after_hash="abc"))      # observation
    log.append(make_witness("tick", "heartbeat",
                            before_hash=None, after_hash=None,
                            channel="heartbeat"))                      # observation
    log.append(make_witness("dispatch", "x",
                            before_hash=None, after_hash=None,
                            channel="dispatch"))                       # guard
    log.append(make_witness("set_fm_field", "x",
                            before_hash="a", after_hash="b"))          # mutation
    log.append(make_witness("insert_flatfile", "y",
                            before_hash=None, after_hash="c"))         # mutation
    from pyfars.operator.witness import (
        make_diagnosis_witness, make_lesson_witness,
    )
    log.append(make_diagnosis_witness("x", cause="oom",
                                      failed_operator="set_fm_field"))  # learning
    log.append(make_lesson_witness("retry-on-oom",
                                   suggested_action="reduce batch"))    # learning


# -- filter ---------------------------------------------------------------


def test_read_all_filters_by_single_kind(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    learning = list(log.read_all(kind="learning"))
    assert len(learning) == 2
    assert {w.operator for w in learning} == {"diagnose", "lesson"}


def test_read_all_filters_by_kind_iterable(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    obs_or_guard = list(log.read_all(kind=("observation", "guard")))
    assert len(obs_or_guard) == 3
    assert {w.kind for w in obs_or_guard} == {"observation", "guard"}


def test_read_all_kind_none_does_not_filter(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    assert len(list(log.read_all())) == 7
    assert len(list(log.read_all(kind=None))) == 7


def test_read_all_kind_composes_with_channel(tmp_path):
    """Filter intersects: only witnesses matching ALL provided dimensions."""
    log = EventLog(tmp_path)
    _seed(log)
    # observation + heartbeat channel = just the tick witness
    result = list(log.read_all(kind="observation", channel="heartbeat"))
    assert len(result) == 1
    assert result[0].operator == "tick"
    # observation alone = both tick and commit
    assert len(list(log.read_all(kind="observation"))) == 2


def test_count_with_kind(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    assert log.count(kind="mutation") == 2
    assert log.count(kind="learning") == 2
    assert log.count(kind="observation") == 2
    assert log.count(kind="guard") == 1
    assert log.count(kind="accounting") == 0


def test_tail_with_kind(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    last_two_mutations = log.tail(2, kind="mutation")
    assert len(last_two_mutations) == 2
    assert {w.kind for w in last_two_mutations} == {"mutation"}


def test_tail_kind_filters_before_slice(tmp_path):
    """Documented invariant: filters apply BEFORE the tail slice."""
    log = EventLog(tmp_path)
    _seed(log)
    # 2 learning witnesses total; tail(5, kind=learning) returns both,
    # not "the learning witnesses among the last 5 overall."
    res = log.tail(5, kind="learning")
    assert len(res) == 2


# -- histogram ------------------------------------------------------------


def test_kinds_histogram_in_canonical_order(tmp_path):
    log = EventLog(tmp_path)
    _seed(log)
    hist = log.kinds()
    assert hist == {
        "observation": 2,
        "guard": 1,
        "mutation": 2,
        "learning": 2,
    }
    # Order matters — insertion order is canonical kind order.
    assert list(hist.keys()) == ["observation", "guard", "mutation", "learning"]


def test_kinds_histogram_empty_log(tmp_path):
    log = EventLog(tmp_path)
    assert log.kinds() == {}


def test_kinds_histogram_omits_zero_kinds(tmp_path):
    """Kinds with no witnesses are not in the result (sparse)."""
    log = EventLog(tmp_path)
    log.append(make_witness("commit", "x",
                            before_hash=None, after_hash="x"))
    hist = log.kinds()
    assert hist == {"observation": 1}
    assert "query" not in hist
    assert "analysis" not in hist
