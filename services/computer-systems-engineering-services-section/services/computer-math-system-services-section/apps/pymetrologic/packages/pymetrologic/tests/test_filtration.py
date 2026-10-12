"""The consistency filtration — the sweepable feature PySheaf's scalar radius discards.

PySheaf's own consistency filtration sweeps a tolerance threshold from none to
everything, admitting more of the complex as "consistent enough" at each level.
:func:`pymetrologic.calculus.filtration` is that sweep here, graded in the
fiber's own base lattice rather than a bolted-on numeric radius (see
``calculus/consistency.py``'s module docstring for the quantale-graded framing).
"""

from __future__ import annotations

from itertools import pairwise

from pymetrologic.calculus import (
    cell_conflict_grade,
    consistency_radius,
    consistent_at,
    filtration,
    h0,
    sensor_fusion_sheaf,
    settle_assignment,
    triangle_sheaf,
)


def test_consistent_at_bottom_grade_is_the_clean_cells_on_a_consistent_triangle() -> None:
    sheaf, assignment = triangle_sheaf("0", "0", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    admitted = consistent_at(sheaf, settled, sheaf.bl.L.bot)
    assert set(admitted) == set(sheaf.site.cells)


def test_consistent_at_bottom_grade_excludes_conflicted_cells_on_a_broken_triangle() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    admitted_bottom = consistent_at(sheaf, settled, sheaf.bl.L.bot)
    # a|b and b|c disagree; a|c and every vertex stay clean.
    assert "a|b" not in admitted_bottom
    assert "b|c" not in admitted_bottom
    assert "a|c" in admitted_bottom
    for v in ("a", "b", "c"):
        assert v in admitted_bottom


def test_consistent_at_top_grade_always_admits_every_cell() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    admitted_top = consistent_at(sheaf, settled, sheaf.bl.L.top)
    assert set(admitted_top) == set(sheaf.site.cells)


def test_filtration_is_monotone_nondecreasing_in_the_grade() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    levels = filtration(sheaf, settled)
    grades = list(levels)
    assert grades == sorted(grades)  # returned in ascending order
    admitted_sets = [set(levels[g]) for g in grades]
    for earlier, later in pairwise(admitted_sets):
        assert earlier <= later  # nested: never lose a cell as the grade rises


def test_filtration_top_grade_recovers_every_cell() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    levels = filtration(sheaf, settled, grades=[sheaf.bl.L.bot, sheaf.bl.L.top])
    assert set(levels[sheaf.bl.L.top]) == set(sheaf.site.cells)


def test_cell_conflict_grade_matches_consistency_radius_at_the_worst_cell() -> None:
    sheaf, assignment = triangle_sheaf("0", "1", "0").to_predication_sheaf()
    settled = h0(sheaf, assignment).section  # type: ignore[arg-type]
    worst = max(cell_conflict_grade(sheaf, settled, c) for c in sheaf.site.cells)  # type: ignore[type-var]
    assert worst == consistency_radius(sheaf, settled)


def test_filtration_on_continuous_sensor_fusion_grades_the_dissenting_edges() -> None:
    # Graded (continuous) fiber: the dissenting sensor's two edges should only
    # be admitted once the grade rises past their graded conflict degree.
    readings = {
        "n": (0.9, 0.0),
        "e": (0.85, 0.0),
        "s": (0.0, 0.9),  # the dissenter
        "w": (0.8, 0.0),
    }
    edges = [("n", "e"), ("e", "s"), ("s", "w"), ("w", "n")]
    sheaf, assignment = sensor_fusion_sheaf(readings, edges)
    settled, _ = settle_assignment(sheaf, assignment)

    # At grade 0 only the clean ("all yes") edges are admitted.
    clean = consistent_at(sheaf, settled, 0.0)
    assert "e|s" not in clean
    assert "s|w" not in clean

    # At grade 1 (top of [0,1]) every cell is admitted.
    everything = consistent_at(sheaf, settled, 1.0)
    assert set(everything) == set(sheaf.site.cells)

    # The sweep is nested: a cell admitted at a lower grade stays admitted higher up.
    levels = filtration(sheaf, settled, grades=[0.0, 0.5, 1.0])
    assert set(levels[0.0]) <= set(levels[0.5]) <= set(levels[1.0])
