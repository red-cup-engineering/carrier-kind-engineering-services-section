"""Scott-continuous closure (RelMath.Closure.ScottContinuousClosure).

In the strict-finite (κ<ω) regime, monotone = Scott-continuous: every directed
set already contains its supremum, so suprema are preserved.
"""

from __future__ import annotations

from collections.abc import Callable

from pymetrologic import (
    BL,
    four,
    is_directed,
    is_monotone,
    is_scott_continuous,
    join_nucleus,
    knowledge_lattice,
)

bl = four()
lat = knowledge_lattice(bl.L)


def test_directedness() -> None:
    # The whole FOUR knowledge lattice is directed (⊤ is above everything).
    assert is_directed(lat, lat.elements)
    # {t, f} is NOT directed: no upper bound *within the subset* (their lub ⊤ is absent).
    assert not is_directed(lat, (bl.true, bl.false))


def test_monotone_maps_are_scott_continuous() -> None:
    for c in lat.elements:
        f = join_nucleus(lat, c)
        assert is_monotone(lat, f)
        assert is_scott_continuous(lat, f)


def test_scott_continuous_iff_monotone_in_finite_regime() -> None:
    maps: list[Callable[[BL[int]], BL[int]]] = [
        lambda x: x,
        lambda x: bl.join_k(x, bl.true),
        lambda x: bl.meet_k(x, bl.true),  # monotone (non-inflationary) but still Scott
    ]
    for f in maps:
        assert is_scott_continuous(lat, f) == is_monotone(lat, f)
