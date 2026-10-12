"""pymetrologic.calculus — the predication calculus.

Predication sheaves over a site, global sections by settling, a localized
consistency/conflict map that generalizes PySheaf's consistency radius, a coarse
``H¹`` obstruction, and a PySheaf bridge.

``integral_cohomology`` is an **extension beyond the Lean corpus** — see its
own module docstring — computing actual integer-coefficient ``Hⁿ`` (betti
number and torsion) for a general simplicial complex, in any degree.
"""

from __future__ import annotations

from .cohomology import (
    GlobalSection,
    h0,
    h0_designated_count,
    h1_obstruction,
    h1_vanishes,
    hn_trivial_above_one,
    inconsistency_count,
    knowledge_designated_count,
)
from .consistency import (
    cell_conflict_grade,
    conflict_map,
    conflicted_cells,
    consistency_radius,
    consistent_at,
    filtration,
    is_consistent,
)
from .examples import (
    graded_conflicts,
    sensor_fusion_sheaf,
    triangle_sheaf,
)
from .integral_cohomology import (
    IntegralCohomology,
    betti_number,
    coboundary_matrix,
    integral_cohomology,
    torsion_coefficients,
)
from .pysheaf_bridge import (
    BridgeComparison,
    DiscreteGraphSheaf,
    compare_with_pysheaf,
)
from .sections import settle_assignment
from .sheaf import Assignment, PredicationSheaf, RestrictionMap, Section

__version__ = "0.1.0"

__all__ = [
    "Assignment",
    "BridgeComparison",
    "DiscreteGraphSheaf",
    "GlobalSection",
    "IntegralCohomology",
    "PredicationSheaf",
    "RestrictionMap",
    "Section",
    "betti_number",
    "cell_conflict_grade",
    "coboundary_matrix",
    "compare_with_pysheaf",
    "conflict_map",
    "conflicted_cells",
    "consistency_radius",
    "consistent_at",
    "filtration",
    "graded_conflicts",
    "h0",
    "h0_designated_count",
    "h1_obstruction",
    "h1_vanishes",
    "hn_trivial_above_one",
    "inconsistency_count",
    "integral_cohomology",
    "is_consistent",
    "knowledge_designated_count",
    "sensor_fusion_sheaf",
    "settle_assignment",
    "torsion_coefficients",
    "triangle_sheaf",
]
