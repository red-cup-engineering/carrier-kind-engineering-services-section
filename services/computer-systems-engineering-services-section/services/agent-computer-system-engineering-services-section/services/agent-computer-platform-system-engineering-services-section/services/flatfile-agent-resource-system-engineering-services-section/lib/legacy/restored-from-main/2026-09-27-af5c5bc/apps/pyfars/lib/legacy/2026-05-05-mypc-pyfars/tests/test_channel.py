"""Tests for pyfars.runtime.channel — pub/sub bus and state replay."""
import pytest

from pyfars.operator.witness import Witness, make_witness
from pyfars.runtime.channel import (
    EventRuntime,
    MessageBus,
    Subscription,
    replay_state,
)
from pyfars.runtime.event_log import EventLog


def _w(channel="dispatch", origin=None, operator="op"):
    """Test-only witness factory; reuses make_witness for parity
    with how dispatch and friends produce them in production."""
    return make_witness(operator=operator, target="t",
                        before_hash=None, after_hash=None,
                        channel=channel, origin=origin)


def test_subscribe_and_publish_routes_to_matching_channel_only():
    """The core decoupling: a handler registered for one channel
    sees only its channel's witnesses; producers don't need to
    know about subscribers."""
    bus = MessageBus()
    seen_dispatch, seen_learning = [], []
    bus.subscribe("dispatch", lambda w: seen_dispatch.append(w))
    bus.subscribe("learning", lambda w: seen_learning.append(w))

    bus.publish(_w(channel="dispatch"))
    bus.publish(_w(channel="learning"))
    bus.publish(_w(channel="other"))

    assert len(seen_dispatch) == 1
    assert len(seen_learning) == 1
    assert seen_dispatch[0].channel == "dispatch"
    assert seen_learning[0].channel == "learning"


def test_origin_and_operator_filters_narrow_subscription():
    """Subscription filters mirror EventLog.read_all so the live
    view and the historical query agree on which witnesses match."""
    bus = MessageBus()
    seen = []
    bus.subscribe("dispatch", seen.append, origin="office:auditor",
                  operator="audit")
    bus.publish(_w(operator="audit", origin="office:auditor"))
    bus.publish(_w(operator="audit", origin="office:other"))   # wrong origin
    bus.publish(_w(operator="open", origin="office:auditor"))  # wrong op
    assert len(seen) == 1


def test_multiple_handlers_fire_in_registration_order():
    """Determinism matters for tests and for replay parity. The
    snapshot-iteration pattern (mirroring container.py) also means
    a handler that subscribes mid-publish doesn't fire for the
    in-flight witness."""
    bus = MessageBus()
    order = []
    bus.subscribe("c", lambda _w: order.append("first"))
    bus.subscribe("c", lambda _w: order.append("second"))
    def late_subscriber(_w):
        order.append("third")
        bus.subscribe("c", lambda _w: order.append("late"))
    bus.subscribe("c", late_subscriber)

    bus.publish(_w(channel="c"))
    assert order == ["first", "second", "third"]
    # The late subscription fires on the *next* publish
    bus.publish(_w(channel="c"))
    assert "late" in order


def test_unsubscribe_is_idempotent():
    """Cleanup paths are often duplicated; unsubscribing twice
    must be a no-op rather than raising."""
    bus = MessageBus()
    sub = bus.subscribe("c", lambda _w: None)
    bus.unsubscribe(sub)
    bus.unsubscribe(sub)  # second time: no-op
    assert sub not in bus.subscriptions


def test_handler_failure_does_not_starve_other_handlers():
    """The learning-and-feedback principle: one bad handler must
    not silently swallow a witness other handlers needed to see.
    All matching handlers fire; the publisher then gets the
    exception(s)."""
    bus = MessageBus()
    seen = []
    def boom(_w):
        raise RuntimeError("handler-1 failed")
    bus.subscribe("c", boom)
    bus.subscribe("c", lambda w: seen.append(w))

    with pytest.raises(RuntimeError, match="handler-1 failed"):
        bus.publish(_w(channel="c"))
    # Critically: handler-2 still ran despite handler-1 raising
    assert len(seen) == 1


def test_multiple_handler_failures_grouped_when_possible():
    """When more than one handler raises, the bus reports all of
    them via ExceptionGroup (Python 3.11+) so debugging doesn't
    require re-running with handlers removed one at a time."""
    bus = MessageBus()
    bus.subscribe("c", lambda _w: (_ for _ in ()).throw(ValueError("a")))
    bus.subscribe("c", lambda _w: (_ for _ in ()).throw(KeyError("b")))
    bus.subscribe("c", lambda _w: (_ for _ in ()).throw(RuntimeError("c")))

    with pytest.raises(BaseException) as excinfo:
        bus.publish(_w(channel="c"))
    # On 3.11+ this is an ExceptionGroup; verify it covers all 3.
    eg = excinfo.value
    if hasattr(eg, "exceptions"):
        types = {type(e).__name__ for e in eg.exceptions}
        assert types == {"ValueError", "KeyError", "RuntimeError"}


def test_channels_lists_distinct_subscribed_channels_sorted():
    bus = MessageBus()
    bus.subscribe("z", lambda _w: None)
    bus.subscribe("a", lambda _w: None)
    bus.subscribe("a", lambda _w: None)  # duplicate channel
    assert bus.channels() == ["a", "z"]


def test_replay_state_folds_witness_stream_into_derived_state():
    """Per analysis: events are source of truth, state is derived.
    replay_state is the canonical fold so consumers don't each
    invent edge-case-incompatible variants."""
    witnesses = [_w(operator="add"), _w(operator="add"),
                 _w(operator="remove"), _w(operator="add")]
    def reducer(count: int, w: Witness) -> int:
        return count + (1 if w.operator == "add" else -1)
    assert replay_state(witnesses, reducer, 0) == 2


def test_replay_state_empty_stream_returns_initial_unchanged():
    """Edge case: an empty stream means no fold steps, so the
    initial state passes through. Pinning this so a future
    refactor can't silently change the contract."""
    sentinel = object()
    assert replay_state(iter([]), lambda s, _w: s, sentinel) is sentinel


def test_event_runtime_emit_appends_then_publishes(tmp_path):
    """The authoritative-flow integration: EventRuntime.emit must
    write to the log first, then notify subscribers. After emit,
    both the durable record and the live observer have the witness."""
    runtime = EventRuntime(log=EventLog(root=tmp_path), bus=MessageBus())
    seen = []
    runtime.bus.subscribe("dispatch", seen.append)

    w = _w(channel="dispatch", operator="audit")
    runtime.emit(w)

    # Log is authoritative: the witness is durably recorded
    logged = list(runtime.log.read_all())
    assert len(logged) == 1
    assert logged[0].operator == "audit"
    assert logged[0].channel == "dispatch"
    # Bus subscriber also saw it
    assert len(seen) == 1
    assert seen[0].operator == "audit"


def test_event_runtime_log_failure_blocks_bus_publish(tmp_path, monkeypatch):
    """If the durable log append fails, the bus must NOT be notified —
    there's no 'happened' event to broadcast. Preserves the
    'log-is-authoritative' invariant under failure."""
    runtime = EventRuntime(log=EventLog(root=tmp_path), bus=MessageBus())
    seen = []
    runtime.bus.subscribe("c", seen.append)

    def boom(_w):
        raise OSError("disk full")
    monkeypatch.setattr(runtime.log, "append", boom)

    with pytest.raises(OSError, match="disk full"):
        runtime.emit(_w(channel="c"))
    # Critically: subscriber NOT notified of an event that wasn't logged
    assert seen == []


def test_event_runtime_handler_failure_does_not_unwrite_log(tmp_path):
    """A handler raising during publish must not roll back the
    already-durable log entry — the witness happened, was recorded,
    and the handler's failure is reported to the caller separately."""
    runtime = EventRuntime(log=EventLog(root=tmp_path), bus=MessageBus())
    runtime.bus.subscribe("c", lambda _w: (_ for _ in ()).throw(
        RuntimeError("handler-failed")))

    with pytest.raises(RuntimeError, match="handler-failed"):
        runtime.emit(_w(channel="c"))
    # Log entry persists despite handler failure
    assert len(list(runtime.log.read_all())) == 1


def test_subscription_matches_routes_correctly():
    """Direct test of the matching predicate so subscription
    semantics are pinned independently of MessageBus delivery."""
    sub = Subscription(channel="c", handler=lambda _w: None,
                       origin="o", operator="op")
    assert sub.matches(_w(channel="c", origin="o", operator="op"))
    assert not sub.matches(_w(channel="other", origin="o", operator="op"))
    assert not sub.matches(_w(channel="c", origin="other", operator="op"))
    assert not sub.matches(_w(channel="c", origin="o", operator="other"))
