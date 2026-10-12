from __future__ import annotations

from pymetrologic.formats import (
    FORMATS,
    Format,
    FormatsClosureHierarchy,
    corner_onto,
    format_corner,
    format_cost,
    format_regime,
    formats_closure_hierarchy,
    regime_cost,
    regime_decidable,
)
from pymetrologic.quartet import CORNERS, Corner
from pymetrologic.regimes import ClosureRegime


def test_formats_four_table_has_eight_analyzed_formats() -> None:
    assert len(FORMATS) == 8
    assert tuple(Format) == FORMATS


def test_format_content_corners_cover_the_recurring_four() -> None:
    assert format_corner(Format.bytes) is Corner.ABSURD
    assert format_corner(Format.json) is Corner.POTENTIAL
    assert format_corner(Format.plaintext) is Corner.ACTIVE
    assert format_corner(Format.rdf) is Corner.STABLE

    assert all(corner_onto(corner) for corner in CORNERS)


def test_format_completion_regimes_match_lean_table() -> None:
    assert format_regime(Format.bytes) is ClosureRegime.strict
    assert format_regime(Format.plaintext) is ClosureRegime.strict
    assert format_regime(Format.json) is ClosureRegime.transfinite_bounded
    assert format_regime(Format.rdf) is ClosureRegime.scott
    assert format_regime(Format.markdown) is ClosureRegime.strict
    assert format_regime(Format.html) is ClosureRegime.aperiodic
    assert format_regime(Format.tex) is ClosureRegime.aperiodic
    assert format_regime(Format.rmn_html) is ClosureRegime.scott


def test_completion_cost_is_nonmonotone_in_knowledge_order() -> None:
    assert format_cost(Format.bytes) < format_cost(Format.json)
    assert format_cost(Format.rdf) < format_cost(Format.json)


def test_top_corner_has_multiple_regimes_and_rmn_recovers_decidability() -> None:
    assert format_corner(Format.markdown) is Corner.STABLE
    assert format_corner(Format.rdf) is Corner.STABLE
    assert format_corner(Format.html) is Corner.STABLE

    assert regime_cost(ClosureRegime.strict) == 0
    assert regime_cost(ClosureRegime.scott) == 1
    assert regime_cost(ClosureRegime.transfinite_bounded) == 2
    assert regime_cost(ClosureRegime.aperiodic) == 3

    assert format_corner(Format.rmn_html) is format_corner(Format.html)
    assert regime_decidable(format_regime(Format.rmn_html))
    assert not regime_decidable(format_regime(Format.html))


def test_formats_closure_hierarchy_bundles_the_lean_theorem_surface() -> None:
    witness = formats_closure_hierarchy()

    assert isinstance(witness, FormatsClosureHierarchy)
    assert witness.holds
    assert witness.cardinality_eight
    assert witness.corner_onto
    assert witness.cost_rises
    assert witness.cost_falls
    assert witness.top_corner_multi_regime
    assert witness.rmn_recovers_decidability
