"""Smoke tests for the optional visualization (skipped without matplotlib)."""

from __future__ import annotations

import pytest

from pymetrologic.calculus.examples import triangle_sheaf

pytest.importorskip("matplotlib")
pytest.importorskip("networkx")


def test_draw_discrete_sheaf_returns_axes() -> None:
    import matplotlib

    matplotlib.use("Agg")
    from pymetrologic.calculus.viz import draw_discrete_sheaf

    ax = draw_discrete_sheaf(triangle_sheaf("0", "1", "0"))
    assert ax is not None
    assert "obstructed" in ax.get_title()


def test_draw_sensor_fusion_returns_axes() -> None:
    import matplotlib

    matplotlib.use("Agg")
    from pymetrologic.calculus.viz import draw_sensor_fusion

    ax = draw_sensor_fusion(
        {"u": (0.9, 0.1), "v": (0.2, 0.8)},
        [("u", "v")],
    )
    assert ax is not None
    assert "conflict" in ax.get_title()
