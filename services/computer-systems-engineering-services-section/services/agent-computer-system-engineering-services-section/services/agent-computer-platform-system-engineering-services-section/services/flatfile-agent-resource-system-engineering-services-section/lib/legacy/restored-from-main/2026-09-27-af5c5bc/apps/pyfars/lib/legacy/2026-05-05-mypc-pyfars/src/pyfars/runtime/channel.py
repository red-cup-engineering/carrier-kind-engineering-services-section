"""Live channel pub/sub and event-stream state derivation.

Implements the runtime side of the FARS messaging-and-events analysis
that ``EventLog`` and ``Witness`` don't already cover. Two primitives:

  1. **MessageBus** — in-process pub/sub keyed by channel (and
     optionally origin/operator). Producers ``publish`` a witness;
     subscribers registered for that channel see it without the
     producer needing to know who they are. This is the runtime
     expression of the analysis' "channel decouples producer from
     consumer" principle. The on-disk ``EventLog`` remains the
     authoritative log; the bus is the *live* fan-out path for
     handlers that need to react in the same process.

  2. **replay_state** — fold a witness stream into derived state
     via a reducer. Per the analysis (Kafka, OpenHands): "events
     are the source of truth; state is derived." This is the
     primitive that makes that derivation explicit so consumers
     don't each invent their own fold loop.

Handler isolation matters: per the FARS learning-and-feedback
analysis, a handler that raises must not poison the bus or starve
other subscribers. ``publish`` collects exceptions and re-raises
the first one (or a grouped exception) only AFTER every handler
has had its turn, so a misbehaving handler can't silently swallow
a witness that other handlers needed to see.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Callable, Optional, TypeVar

from pyfars.operator.witness import Witness
from pyfars.runtime.event_log import EventLog

Handler = Callable[[Witness], None]
"""``(witness) -> None``. A subscribed handler. Raising propagates
back to the publisher *after* all other handlers have run."""


@dataclass(frozen=True)
class Subscription:
    """A registered handler with its routing filters.

    Fields:
      channel: only deliver witnesses on this channel.
      handler: the callback.
      origin: optional origin filter; ``None`` = any origin (incl. None).
      operator: optional operator filter; ``None`` = any operator.

    The triple-key filter mirrors ``EventLog.read_all`` so a
    subscriber's *live* view matches what the same filter would
    return from a *historical* query — no skew between the two
    addressing surfaces.
    """
    channel: str
    handler: Handler
    origin: Optional[str] = None
    operator: Optional[str] = None

    def matches(self, w: Witness) -> bool:
        if w.channel != self.channel:
            return False
        if self.origin is not None and w.origin != self.origin:
            return False
        if self.operator is not None and w.operator != self.operator:
            return False
        return True


@dataclass
class MessageBus:
    """In-process pub/sub over named channels.

    The bus is intentionally not a queue — there's no buffering or
    backpressure. ``publish`` is synchronous: it iterates matching
    subscriptions and calls each handler in registration order.
    Handlers that need queueing or async behavior should wrap their
    own thread/queue inside the handler.

    The on-disk ``EventLog`` remains the authoritative record; the
    bus is the live fan-out path. Wiring ``EventLog.append`` to
    also ``publish`` here is a caller's choice — keeping them
    independent means tests and one-shot scripts can use either
    primitive without dragging the other in.
    """
    subscriptions: list[Subscription] = field(default_factory=list)

    def subscribe(self, channel: str, handler: Handler, *,
                  origin: Optional[str] = None,
                  operator: Optional[str] = None) -> Subscription:
        """Register ``handler`` for witnesses on ``channel``.

        Returns the ``Subscription`` so callers can pass it back to
        ``unsubscribe`` later. Multiple handlers per channel are
        allowed; they fire in registration order.
        """
        sub = Subscription(channel=channel, handler=handler,
                           origin=origin, operator=operator)
        self.subscriptions.append(sub)
        return sub

    def unsubscribe(self, sub: Subscription) -> None:
        """Remove a subscription. Idempotent — calling twice is a
        no-op rather than an error so cleanup paths can be naive."""
        try:
            self.subscriptions.remove(sub)
        except ValueError:
            pass

    def publish(self, witness: Witness) -> None:
        """Deliver ``witness`` to every matching subscription.

        Handler isolation: if a handler raises, the exception is
        captured and the bus continues delivering to remaining
        subscribers. After every handler has had its turn, the
        first captured exception is re-raised (or, if multiple
        handlers raised, an ``ExceptionGroup`` covering all of
        them on Python 3.11+; otherwise the first one). This way
        one buggy handler can't silently swallow a witness other
        handlers depended on.
        """
        # Snapshot so a handler that mutates subscriptions mid-publish
        # doesn't change which handlers fire for *this* publish.
        snapshot = tuple(self.subscriptions)
        errors: list[BaseException] = []
        for sub in snapshot:
            if not sub.matches(witness):
                continue
            try:
                sub.handler(witness)
            except BaseException as e:  # noqa: BLE001 — by design
                errors.append(e)
        if not errors:
            return
        if len(errors) == 1:
            raise errors[0]
        # Python 3.11+: ExceptionGroup. We construct it explicitly
        # rather than using `raise ... from None` chains so callers
        # can iterate every handler failure in a single `except*`.
        try:
            raise ExceptionGroup(  # type: ignore[name-defined]
                "one or more channel handlers raised", errors
            )
        except NameError:  # pragma: no cover — Python < 3.11
            raise errors[0]

    def channels(self) -> list[str]:
        """Distinct channels currently subscribed, sorted. The live
        analogue of ``EventLog.channels`` for the *future* witnesses
        the bus will route, not the historical ones."""
        return sorted({s.channel for s in self.subscriptions})


# -- state derivation -------------------------------------------------

S = TypeVar("S")
"""State type for ``replay_state`` reducers — opaque to this module."""

Reducer = Callable[[S, Witness], S]
"""``(state, witness) -> new_state``. Pure-function fold step.
Mutating the input state in place is allowed (and frequently
useful) but the return value is what subsequent steps see."""


@dataclass
class EventRuntime:
    """Composition of ``EventLog`` and ``MessageBus``.

    Per architect review of the messaging-and-events analysis: keeping
    the on-disk log and the in-process bus *independent* is useful for
    tests and one-shot scripts but creates a real footgun in
    production code — a producer that publishes to the bus but
    forgets to append to the log silently violates the analysis'
    "events are the source of truth, log is authoritative" principle.

    ``EventRuntime`` is the recommended default path: ``emit(witness)``
    appends to the log FIRST (so the authoritative record is durable
    before any handler can react), then publishes to the bus. If the
    log append raises (full disk, permissions), the bus is *not*
    notified — there's no "happened" event to broadcast yet. If a
    handler raises during publish, the log already has the witness;
    the bus's normal exception aggregation propagates the handler
    failure to the caller without rolling back the durable record.

    Direct ``log.append``/``bus.publish`` calls remain available for
    cases where the asymmetry is intentional (e.g. pure derived-state
    handlers that should fire without producing a new log entry).
    """
    log: EventLog
    bus: MessageBus

    def emit(self, witness: Witness) -> None:
        """Authoritative emission: append to the log, then publish.

        The order is deliberate — the durable record exists before
        any handler can act on it, so a handler that itself emits
        (cascading reaction) is guaranteed to see its trigger
        already in the log if it queries.
        """
        self.log.append(witness)
        self.bus.publish(witness)


def replay_state(witnesses: Iterable[Witness], reducer: Reducer[S],
                 initial: S) -> S:
    """Fold a witness stream into derived state.

    Per the analysis (Kafka 'event log IS the database, state derived
    by replay'; OpenHands 'state derived from event stream, not
    maintained separately'): the canonical way to compute current
    state is to fold the event stream. This helper centralizes the
    fold so every consumer doesn't reinvent it (and silently disagree
    on edge cases like empty streams or reducer return-value
    semantics).

    The reducer is called once per witness in iteration order; the
    final state is returned. An empty stream returns ``initial``
    unchanged. Callers that want *channel-filtered* derivation
    should pass ``EventLog.read_all(channel=...)`` as ``witnesses``
    so the same routing predicate gates both the live and historical
    paths.
    """
    state = initial
    for w in witnesses:
        state = reducer(state, w)
    return state
