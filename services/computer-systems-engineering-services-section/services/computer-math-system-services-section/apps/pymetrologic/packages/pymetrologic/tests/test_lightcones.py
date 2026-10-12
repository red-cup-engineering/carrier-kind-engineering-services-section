from __future__ import annotations

import pytest

from pymetrologic.lightcones import (
    IntervalKind,
    LightConeEvent,
    causal_diamond,
    causal_relation_matrix,
    causally_precedes_event,
    chronologically_precedes_event,
    future_cone,
    interval_kind,
    minkowski_interval,
    spacelike_incomparable,
)

ORIGIN = LightConeEvent(0, 0)


def test_minkowski_interval_classifies_separations() -> None:
    assert minkowski_interval(ORIGIN, LightConeEvent(2, 0)) == 4
    assert interval_kind(ORIGIN, LightConeEvent(2, 0)) is IntervalKind.timelike
    assert interval_kind(ORIGIN, LightConeEvent(2, 2)) is IntervalKind.lightlike
    assert interval_kind(ORIGIN, LightConeEvent(1, 2)) is IntervalKind.spacelike
    assert interval_kind(ORIGIN, ORIGIN) is IntervalKind.identical


def test_closed_causal_precedence_and_open_chronological_precedence() -> None:
    assert causally_precedes_event(ORIGIN, ORIGIN)
    assert causally_precedes_event(ORIGIN, LightConeEvent(2, 2))
    assert not chronologically_precedes_event(ORIGIN, LightConeEvent(2, 2))
    assert chronologically_precedes_event(ORIGIN, LightConeEvent(2, 0))
    assert not causally_precedes_event(LightConeEvent(2, 0), ORIGIN)


def test_future_cone_enumerates_the_closed_integer_cone() -> None:
    assert future_cone(ORIGIN, 2) == (
        LightConeEvent(0, 0),
        LightConeEvent(1, -1),
        LightConeEvent(1, 0),
        LightConeEvent(1, 1),
        LightConeEvent(2, -2),
        LightConeEvent(2, -1),
        LightConeEvent(2, 0),
        LightConeEvent(2, 1),
        LightConeEvent(2, 2),
    )

    with pytest.raises(ValueError, match="radius"):
        future_cone(ORIGIN, -1)


def test_causal_diamond_is_future_meet_past() -> None:
    upper = LightConeEvent(2, 0)
    diamond = causal_diamond(ORIGIN, upper)

    assert LightConeEvent(1, 0) in diamond
    assert LightConeEvent(1, 1) in diamond
    assert LightConeEvent(1, -1) in diamond
    assert LightConeEvent(1, 2) not in diamond
    assert causal_diamond(upper, ORIGIN) == ()


def test_spacelike_separation_is_incomparability() -> None:
    left = LightConeEvent(1, -2)
    right = LightConeEvent(1, 2)

    assert spacelike_incomparable(left, right)
    assert not causally_precedes_event(left, right)
    assert not causally_precedes_event(right, left)


def test_causal_relation_matrix_is_reflexive_and_transitive_on_a_chain() -> None:
    events = (ORIGIN, LightConeEvent(1, 0), LightConeEvent(2, 0))
    matrix = causal_relation_matrix(events)

    assert matrix == (
        (True, True, True),
        (False, True, True),
        (False, False, True),
    )
