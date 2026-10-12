"""Integer light-cone shadows for finite 1+1-dimensional causal geometry.

This module is deliberately finite and combinatorial.  It gives the lab a
runnable model of the light-cone frontier: a cone field is an admissibility
relation, causal diamonds are intersections of a future and a past cone, and
spacelike separation is structural incomparability rather than a failed value.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from enum import StrEnum


@dataclass(frozen=True, order=True)
class LightConeEvent:
    """A lattice event in 1+1 Minkowski space."""

    time: int
    position: int


class IntervalKind(StrEnum):
    """The causal type of the displacement from one event to another."""

    identical = "identical"
    timelike = "timelike"
    lightlike = "lightlike"
    spacelike = "spacelike"


__all__ = [
    "IntervalKind",
    "LightConeEvent",
    "causal_diamond",
    "causal_relation_matrix",
    "causally_precedes_event",
    "chronologically_precedes_event",
    "future_cone",
    "interval_kind",
    "minkowski_interval",
    "spacelike_incomparable",
]


def minkowski_interval(a: LightConeEvent, b: LightConeEvent) -> int:
    """Return ``dt^2 - dx^2`` for the displacement from ``a`` to ``b``."""

    dt = b.time - a.time
    dx = b.position - a.position
    return dt * dt - dx * dx


def interval_kind(a: LightConeEvent, b: LightConeEvent) -> IntervalKind:
    """Classify the separation between two events by its Minkowski interval."""

    if a == b:
        return IntervalKind.identical
    interval = minkowski_interval(a, b)
    if interval > 0:
        return IntervalKind.timelike
    if interval == 0:
        return IntervalKind.lightlike
    return IntervalKind.spacelike


def causally_precedes_event(a: LightConeEvent, b: LightConeEvent) -> bool:
    """Return whether ``b`` lies in the closed future cone of ``a``."""

    dt = b.time - a.time
    dx = b.position - a.position
    return dt >= 0 and dt * dt >= dx * dx


def chronologically_precedes_event(a: LightConeEvent, b: LightConeEvent) -> bool:
    """Return whether ``b`` lies in the open timelike future of ``a``."""

    dt = b.time - a.time
    dx = b.position - a.position
    return dt > 0 and dt * dt > dx * dx


def spacelike_incomparable(a: LightConeEvent, b: LightConeEvent) -> bool:
    """Return whether neither event causally precedes the other."""

    return not causally_precedes_event(a, b) and not causally_precedes_event(b, a)


def future_cone(origin: LightConeEvent, radius: int) -> tuple[LightConeEvent, ...]:
    """Enumerate integer events in ``origin``'s closed future cone up to ``radius`` time steps."""

    if radius < 0:
        msg = "radius must be non-negative"
        raise ValueError(msg)
    events = [
        LightConeEvent(origin.time + dt, origin.position + dx)
        for dt in range(radius + 1)
        for dx in range(-dt, dt + 1)
    ]
    return tuple(sorted(events))


def causal_diamond(
    lower: LightConeEvent,
    upper: LightConeEvent,
    *,
    events: Iterable[LightConeEvent] | None = None,
) -> tuple[LightConeEvent, ...]:
    """Return the finite Alexandrov interval ``{x | lower <= x <= upper}``.

    If no event collection is supplied, the ambient search space is the integer
    bounding box between the endpoint coordinates.
    """

    if not causally_precedes_event(lower, upper):
        return ()
    candidates = tuple(events) if events is not None else _bounding_events(lower, upper)
    return tuple(
        sorted(
            event
            for event in candidates
            if causally_precedes_event(lower, event) and causally_precedes_event(event, upper)
        )
    )


def causal_relation_matrix(events: Sequence[LightConeEvent]) -> tuple[tuple[bool, ...], ...]:
    """Return the closed causal precedence relation on a finite event list."""

    return tuple(tuple(causally_precedes_event(a, b) for b in events) for a in events)


def _bounding_events(lower: LightConeEvent, upper: LightConeEvent) -> tuple[LightConeEvent, ...]:
    min_x = min(lower.position, upper.position)
    max_x = max(lower.position, upper.position)
    return tuple(
        LightConeEvent(time, position)
        for time in range(lower.time, upper.time + 1)
        for position in range(min_x - (time - lower.time), max_x + (upper.time - time) + 1)
    )
