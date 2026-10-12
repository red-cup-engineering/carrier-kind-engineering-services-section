"""Settling a predication sheaf: global sections and localized obstruction."""

from __future__ import annotations

from typing import Any

from pymetrologic import BL, four
from pymetrologic.calculus import conflict_map, consistency_radius, h0, h1_obstruction
from pymetrologic.calculus.sheaf import PredicationSheaf, Section
from pymetrologic.site import Site

bl = four()


def _identity_edge_sheaf() -> PredicationSheaf:
    """Two vertices u, v sharing an edge; each restricts its single value identically."""
    site = Site.graph(["u", "v"], [("u", "v")])
    e = Site.edge_name("u", "v")
    values = ("L", "R")

    def restrict(section: Section[Any, Any]) -> dict[Any, BL[Any]]:
        return {k: section[k] for k in values}

    return PredicationSheaf(
        site=site,
        bl=bl,
        stalk_index={"u": values, "v": values, e: values},
        restriction={("u", e): restrict, ("v", e): restrict},
    )


def _assert_one_hot(
    section: dict[Any, BL[Any]], chosen: str, values: tuple[str, ...]
) -> dict[Any, BL[Any]]:
    return {x: (bl.true if x == chosen else bl.false) for x in values}


def test_agreeing_endpoints_form_a_global_section() -> None:
    sheaf = _identity_edge_sheaf()
    values = ("L", "R")
    assignment = {
        "u": _assert_one_hot({}, "L", values),
        "v": _assert_one_hot({}, "L", values),
    }
    result = h0(sheaf, assignment)
    assert result.consistent
    assert bool(result) is True
    assert consistency_radius(sheaf, result.section) == 0
    assert conflict_map(sheaf, result.section) == {}


def test_disagreeing_endpoints_localize_the_conflict() -> None:
    sheaf = _identity_edge_sheaf()
    values = ("L", "R")
    assignment = {
        "u": _assert_one_hot({}, "L", values),
        "v": _assert_one_hot({}, "R", values),
    }
    result = h0(sheaf, assignment)
    assert not result.consistent
    assert consistency_radius(sheaf, result.section) == 1

    e = Site.edge_name("u", "v")
    located = conflict_map(sheaf, result.section)
    # The conflict is on the edge, at *both* disputed values — and nowhere else.
    assert set(located) == {e}
    assert set(located[e]) == {"L", "R"}
    # The vertices themselves stay clean — the obstruction is on the overlap.
    assert "u" not in located and "v" not in located


def test_h1_obstruction_matches_conflict_map() -> None:
    sheaf = _identity_edge_sheaf()
    values = ("L", "R")
    assignment = {
        "u": _assert_one_hot({}, "L", values),
        "v": _assert_one_hot({}, "R", values),
    }
    settled = h0(sheaf, assignment).section
    assert h1_obstruction(sheaf, assignment) == conflict_map(sheaf, settled)


def test_settling_is_idempotent_on_a_section() -> None:
    sheaf = _identity_edge_sheaf()
    values = ("L", "R")
    assignment = {
        "u": _assert_one_hot({}, "L", values),
        "v": _assert_one_hot({}, "L", values),
    }
    once = h0(sheaf, assignment).section
    twice = h0(sheaf, once).section
    assert once == twice
