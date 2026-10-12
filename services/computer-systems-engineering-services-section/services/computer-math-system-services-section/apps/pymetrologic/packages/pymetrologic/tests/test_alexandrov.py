"""Alexandrov topology and Husainov Cech side (RelMath.Cohomology.AlexandrovHusainov)."""

from __future__ import annotations

import pytest

from pymetrologic.alexandrov import (
    AlexandrovTopology,
    FinitePoset,
    alexandrov_specialization_recovers_poset,
    causal_alexandrov_recovers_cones,
    causal_closed_future,
    causal_closed_future_open,
    causal_continuous_iff_monotone,
    causal_future,
    causal_future_open,
    causal_partial_order,
    causal_specializes_iff_precedes,
    causal_topology,
    cech_acyclic,
    continuous_iff_monotone,
    husainov_cech_acyclic_on_bounded_sites,
    is_causal_open,
    is_continuous,
    is_monotone,
    reaches_iff_specializes_ne,
    spacelike_iff_no_specialization,
)
from pymetrologic.causal import causal_closure
from pymetrologic.regimes import (
    ClosureRegime,
)


def diamond_poset() -> FinitePoset:
    return FinitePoset(
        elements=("bot", "left", "right", "top"),
        leq=frozenset(
            {
                ("bot", "bot"),
                ("left", "left"),
                ("right", "right"),
                ("top", "top"),
                ("bot", "left"),
                ("bot", "right"),
                ("bot", "top"),
                ("left", "top"),
                ("right", "top"),
            }
        ),
    )


def chain_poset() -> FinitePoset:
    return FinitePoset(
        elements=("0", "1", "2"),
        leq=frozenset(
            {
                ("0", "0"),
                ("1", "1"),
                ("2", "2"),
                ("0", "1"),
                ("1", "2"),
                ("0", "2"),
            }
        ),
    )


def causal_order() -> tuple[tuple[str, ...], frozenset[tuple[str, str]]]:
    events = ("a", "b", "c", "d")
    seed = frozenset({("a", "b"), ("b", "c"), ("a", "d")})
    return events, causal_closure(events, seed)


def test_opens_are_upsets_and_closed_under_intersections_and_unions() -> None:
    topology = AlexandrovTopology(diamond_poset())

    assert topology.is_open(())
    assert topology.is_open(("top",))
    assert topology.is_open(("left", "top"))
    assert topology.is_open(("right", "top"))
    assert topology.is_open(("left", "right", "top"))
    assert topology.is_open(("bot", "left", "right", "top"))
    assert not topology.is_open(("bot",))
    assert topology.upper_set("bot") == frozenset({"bot", "left", "right", "top"})
    assert topology.upper_set("left") == frozenset({"left", "top"})

    family = (frozenset({"left", "top"}), frozenset({"right", "top"}))
    assert topology.is_open_intersection(family)
    assert topology.is_open_union(family)


def test_causal_alexandrov_topology_packages_strict_reachability_as_reflexive_poset() -> None:
    events, order = causal_order()
    poset = causal_partial_order(events, order)
    topology = causal_topology(events, order)

    assert poset.le("a", "a")
    assert poset.le("a", "c")
    assert not poset.le("c", "d")
    assert topology.upper_set("a") == frozenset({"a", "b", "c", "d"})
    assert causal_closed_future(events, order, "b") == frozenset({"b", "c"})
    assert causal_future(events, order, "b") == frozenset({"c"})
    assert is_causal_open(events, order, {"b", "c"})
    assert not is_causal_open(events, order, {"b"})


def test_causal_alexandrov_recovers_cones_and_topological_order() -> None:
    events, order = causal_order()

    assert all(causal_closed_future_open(events, order, event) for event in events)
    assert all(causal_future_open(events, order, event) for event in events)
    assert causal_specializes_iff_precedes(events, order)
    assert reaches_iff_specializes_ne(events, order)
    assert spacelike_iff_no_specialization(events, order)

    witness = causal_alexandrov_recovers_cones(events, order)
    assert witness.holds
    assert witness.specialization_recovers_causal_order
    assert witness.spacelike_is_topological_incomparability


def test_causal_continuous_maps_are_exactly_causal_monotone() -> None:
    events, order = causal_order()
    identity = {event: event for event in events}
    non_monotone = {"a": "b", "b": "a", "c": "c", "d": "d"}

    assert causal_continuous_iff_monotone(events, order, events, order, identity)
    assert causal_continuous_iff_monotone(events, order, events, order, non_monotone)

    source = causal_topology(events, order)
    target = causal_topology(events, order)
    assert is_monotone(source, target, identity)
    assert is_continuous(source, target, identity)
    assert not is_monotone(source, target, non_monotone)
    assert not is_continuous(source, target, non_monotone)

    witness = causal_alexandrov_recovers_cones(
        events,
        order,
        sample_maps=((events, order, identity), (events, order, non_monotone)),
    )
    assert witness.holds


def test_specialization_order_recovers_original_poset() -> None:
    topology = AlexandrovTopology(diamond_poset())

    for left in topology.poset.elements:
        for right in topology.poset.elements:
            assert topology.specializes(left, right) == topology.poset.le(left, right)

    assert alexandrov_specialization_recovers_poset(topology).holds


def test_continuous_maps_are_exactly_monotone_maps() -> None:
    source = AlexandrovTopology(diamond_poset())
    target = AlexandrovTopology(chain_poset())

    monotone_map = {"bot": "0", "left": "1", "right": "1", "top": "2"}
    non_monotone_map = {"bot": "1", "left": "0", "right": "1", "top": "2"}

    assert is_monotone(source, target, monotone_map)
    assert is_continuous(source, target, monotone_map)
    assert continuous_iff_monotone(source, target, monotone_map)

    assert not is_monotone(source, target, non_monotone_map)
    assert not is_continuous(source, target, non_monotone_map)
    assert continuous_iff_monotone(source, target, non_monotone_map)

    witness = alexandrov_specialization_recovers_poset(
        source,
        sample_maps=((target, monotone_map), (target, non_monotone_map)),
    )
    assert witness.holds


def test_husainov_bounded_site_witness_is_cech_side_only() -> None:
    assert cech_acyclic()

    strict = husainov_cech_acyclic_on_bounded_sites(ClosureRegime.strict)
    scott = husainov_cech_acyclic_on_bounded_sites(ClosureRegime.scott)

    assert strict.holds
    assert scott.holds
    assert strict.derived_functor_comparison_open
    assert scott.derived_functor_comparison_open

    with pytest.raises(ValueError, match="strict or Scott"):
        husainov_cech_acyclic_on_bounded_sites(ClosureRegime.aperiodic)


def test_poset_and_map_validation_reject_bad_data() -> None:
    with pytest.raises(ValueError, match="reflexive"):
        FinitePoset(elements=("a",), leq=frozenset())

    with pytest.raises(ValueError, match="antisymmetric"):
        FinitePoset(
            elements=("a", "b"), leq=frozenset({("a", "a"), ("b", "b"), ("a", "b"), ("b", "a")})
        )

    with pytest.raises(ValueError, match="antisymmetric"):
        causal_partial_order(("a", "b"), frozenset({("a", "b"), ("b", "a")}))

    with pytest.raises(ValueError, match="transitive"):
        FinitePoset(
            elements=("a", "b", "c"),
            leq=frozenset({("a", "a"), ("b", "b"), ("c", "c"), ("a", "b"), ("b", "c")}),
        )

    source = AlexandrovTopology(diamond_poset())
    target = AlexandrovTopology(chain_poset())
    with pytest.raises(ValueError, match="total"):
        is_monotone(source, target, {"bot": "0"})
    with pytest.raises(ValueError, match="outside"):
        is_continuous(source, target, {"bot": "0", "left": "1", "right": "1", "top": "x"})
