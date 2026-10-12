"""Algebraic Laplacianizers (RelMath.Flow.Laplacianizability)."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four, join_nucleus, knowledge_lattice
from pymetrologic.laplacianizers import (
    hodge_isomorphism_holds,
    settled_sections,
    settling_hodge_round_trips,
    settling_is_laplacianizable,
    settling_laplacianizability,
    settling_laplacianizer,
)

bl = four()
lat = knowledge_lattice(bl.L)
laplacian = join_nucleus(lat, bl.true)


def test_settled_sections_are_the_harmonic_kernel() -> None:
    laplacianizer = settling_laplacianizer(lat, laplacian)

    assert settled_sections(lat, laplacian) == laplacianizer.harmonic_kernel()
    assert set(laplacianizer.harmonic_kernel()) == {bl.true, bl.conflict}


def test_hodge_isomorphism_is_identity_on_settled_sections() -> None:
    laplacianizer = settling_laplacianizer(lat, laplacian)
    trips = settling_hodge_round_trips(laplacianizer)

    assert hodge_isomorphism_holds(laplacianizer)
    assert len(trips) == 2
    assert all(trip.left_round_trip and trip.right_round_trip for trip in trips)
    assert all(trip.cohomology_class == trip.harmonic_representative for trip in trips)


def test_settling_laplacianizability_bundles_the_laws() -> None:
    witness = settling_laplacianizability(lat, laplacian)

    assert settling_is_laplacianizable(lat, laplacian)
    assert witness.holds
    assert witness.laplacianizable
    assert witness.laplacian_is_supplied_operator
    assert witness.idempotent_projection
    assert witness.monotone_q_functor
    assert witness.hodge_isomorphism


def test_unsettled_value_is_not_a_hodge_cohomology_class() -> None:
    laplacianizer = settling_laplacianizer(lat, laplacian)
    unsettled: BL[int] = bl.false

    with pytest.raises(ValueError, match="settled/harmonic"):
        laplacianizer.to_harmonic(unsettled)
