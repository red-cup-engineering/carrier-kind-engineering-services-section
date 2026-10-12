"""Tests for pyfars.runtime.dispatch."""
import pytest

from pyfars.runtime.dispatch import DispatchTable, HandlerError
from pyfars.runtime.event_log import EventLog


# ----- existing core dispatch contract -------------------------------------

def test_register_and_handlers_for():
    dt = DispatchTable()
    f = lambda x: x + 1
    dt.register("inc", f)
    assert dt.handlers_for("inc") == [f]
    assert dt.handlers_for("absent") == []


def test_dispatch_invokes_all_handlers():
    dt = DispatchTable()
    calls = []
    dt.register("p", lambda x: calls.append(("a", x)))
    dt.register("p", lambda x: calls.append(("b", x)))
    dt.dispatch("p", 42)
    assert calls == [("a", 42), ("b", 42)]


def test_dispatch_returns_handler_results():
    dt = DispatchTable()
    dt.register("p", lambda x: x * 2)
    dt.register("p", lambda x: x * 3)
    assert dt.dispatch("p", 5) == [10, 15]


def test_dispatch_no_handler_returns_empty():
    dt = DispatchTable()
    assert dt.dispatch("nope") == []


def test_unregister():
    dt = DispatchTable()
    f = lambda: 1
    g = lambda: 2
    dt.register("p", f)
    dt.register("p", g)
    dt.unregister("p", f)
    assert dt.handlers_for("p") == [g]
    dt.unregister("p", g)
    assert dt.handlers_for("p") == []
    assert "p" not in dt.predicates()


def test_unregister_absent_is_noop():
    dt = DispatchTable()
    dt.unregister("p", lambda: None)  # no exception


def test_predicates():
    dt = DispatchTable()
    dt.register("a", lambda: 1)
    dt.register("b", lambda: 2)
    assert set(dt.predicates()) == {"a", "b"}


# ----- on_miss (Voyager re-dispatch hook) ----------------------------------

def test_on_miss_invoked_when_no_handler():
    seen: list[tuple] = []
    def fallback(predicate, args, kwargs):
        seen.append((predicate, args, kwargs))
        return "fallback-value"
    dt = DispatchTable(on_miss=fallback)
    out = dt.dispatch("absent", 1, key="v")
    assert out == ["fallback-value"]
    assert seen == [("absent", (1,), {"key": "v"})]


def test_on_miss_not_invoked_when_handler_present():
    called = []
    dt = DispatchTable(on_miss=lambda p, a, k: called.append("miss"))
    dt.register("p", lambda: "ok")
    assert dt.dispatch("p") == ["ok"]
    assert called == []


# ----- event-log integration (channel=dispatch) ----------------------------

def test_dispatch_emits_witness_on_hit(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log, agent="test")
    dt.register("p", lambda: "ok")
    dt.dispatch("p")
    witnesses = list(log.read_all(channel="dispatch"))
    assert len(witnesses) == 1
    w = witnesses[0]
    assert w.operator == "dispatch"
    assert w.target == "p"
    assert w.origin == "dispatch:p"
    assert w.agent == "test"
    assert w.details["outcome"] == "hit"
    assert w.details["handler_count"] == 1
    assert w.details["errors"] == 0
    assert w.truth == 1.0


def test_dispatch_emits_miss_witness_with_zero_truth(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.dispatch("absent")
    misses = [w for w in log.read_all(channel="dispatch")
              if w.details["outcome"] == "miss"]
    assert len(misses) == 1
    assert misses[0].truth == 0.0
    assert misses[0].evidence == 1.0
    assert misses[0].origin == "dispatch:absent"
    assert misses[0].details["handler_count"] == 0


def test_dispatch_without_event_log_emits_nothing():
    dt = DispatchTable()
    dt.dispatch("absent")  # no log; no error


# ----- safe-mode dispatch (per-handler exception capture) ------------------

def test_dispatch_safe_captures_handler_exception(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    def good():
        return "good"
    def bad():
        raise ValueError("nope")
    dt.register("p", good)
    dt.register("p", bad)
    dt.register("p", good)
    results = dt.dispatch_safe("p")
    assert results[0] == "good"
    assert isinstance(results[1], HandlerError)
    assert isinstance(results[1].exception, ValueError)
    assert results[1].predicate == "p"
    assert results[2] == "good"
    # Hit witness records 3 handlers, 1 error.
    hit = next(w for w in log.read_all(channel="dispatch")
               if w.details["outcome"] == "hit")
    assert hit.details["handler_count"] == 3
    assert hit.details["errors"] == 1
    assert hit.truth == pytest.approx(2 / 3)
    # Per-handler error witness exists.
    err = next(w for w in log.read_all(channel="dispatch")
               if w.details["outcome"] == "handler_error")
    assert err.details["exception_type"] == "ValueError"
    assert err.details["exception_message"] == "nope"
    assert err.truth == 0.0


def test_dispatch_default_propagates_exceptions():
    dt = DispatchTable()
    dt.register("p", lambda: (_ for _ in ()).throw(RuntimeError("boom")))
    with pytest.raises(RuntimeError, match="boom"):
        dt.dispatch("p")


def test_dispatch_emits_partial_witness_when_handler_raises(tmp_path):
    """Regression: even when default dispatch() propagates a handler
    exception, the aggregate hit witness must still be written, with
    truth = succeeded / handler_count, so the dispatch channel sees
    the partial-truth event."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: "ok")
    def boom():
        raise RuntimeError("boom")
    dt.register("p", boom)
    dt.register("p", lambda: "never-runs")
    with pytest.raises(RuntimeError, match="boom"):
        dt.dispatch("p")
    hits = [w for w in log.read_all(channel="dispatch")
            if w.details["outcome"] == "hit"]
    assert len(hits) == 1
    h = hits[0]
    assert h.details["handler_count"] == 3
    assert h.details["succeeded"] == 1
    assert h.details["errors"] == 2  # boom + the one that never ran
    assert h.truth == pytest.approx(1 / 3)


def test_dispatch_safe_emits_default_diagnosis_on_handler_error(tmp_path):
    """Reflexion pattern: a captured handler exception in safe-mode
    must produce a learning-channel diagnosis witness with
    failed_operator='dispatch' and a natural-language cause."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    def bad():
        raise KeyError("missing-key")
    dt.register("p", bad)
    dt.dispatch_safe("p")
    diags = list(log.read_all(channel="learning", operator="diagnose"))
    assert len(diags) == 1
    d = diags[0]
    assert d.target == "p"
    assert d.details["failed_operator"] == "dispatch"
    assert "KeyError" in d.details["diagnosed_cause"]
    assert "missing-key" in d.details["diagnosed_cause"]
    assert d.details["related"]["predicate"] == "p"
    assert d.details["related"]["exception_type"] == "KeyError"
    assert d.origin == "dispatch:p"


def test_dispatch_safe_uses_custom_diagnoser(tmp_path):
    """The diagnoser closure can produce a richer cause + suggested
    response that downstream learning consumers can compose against."""
    log = EventLog(root=tmp_path)
    def diagnose(predicate, exc, args, kwargs):
        return (f"handler for {predicate} hit {type(exc).__name__}",
                "fall back to read-only mode")
    dt = DispatchTable(event_log=log, diagnose=diagnose)
    dt.register("p", lambda: (_ for _ in ()).throw(RuntimeError("e")))
    dt.dispatch_safe("p")
    d = next(iter(log.read_all(channel="learning", operator="diagnose")))
    assert d.details["diagnosed_cause"] == "handler for p hit RuntimeError"
    assert d.details["suggested_response"] == "fall back to read-only mode"


def test_dispatch_safe_does_not_diagnose_when_no_event_log():
    """Without an event log there is nowhere to write a diagnosis;
    the diagnoser must not be invoked (no observable side effect)."""
    called = []
    def diagnose(*a, **k):
        called.append(True)
        return ("c", None)
    dt = DispatchTable(diagnose=diagnose)
    dt.register("p", lambda: (_ for _ in ()).throw(RuntimeError("e")))
    dt.dispatch_safe("p")  # captures error, no diagnosis side-effect
    assert called == []


def test_dispatch_safe_invokes_on_miss_and_witnesses(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log,
                       on_miss=lambda p, a, k: f"defaulted:{p}")
    out = dt.dispatch_safe("absent")
    assert out == ["defaulted:absent"]
    misses = [w for w in log.read_all(channel="dispatch")
              if w.details["outcome"] == "miss"]
    assert len(misses) == 1
