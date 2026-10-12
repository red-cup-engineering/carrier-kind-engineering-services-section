"""``python -m pymetrologic.calculus`` — a terminal demo of meeting and beating PySheaf.

Runs the discrete triangle (meet), the continuous sensor network (beat), and
the consistency filtration (the sweepable "beat" PySheaf's scalar radius
collapses away), and prints what settling found, with no plotting dependencies.
"""

from __future__ import annotations

from .consistency import filtration
from .examples import graded_conflicts, sensor_fusion_sheaf, triangle_sheaf
from .pysheaf_bridge import compare_with_pysheaf
from .sections import settle_assignment


def main() -> None:
    print("== discrete triangle (meet PySheaf) ==")
    for a, b, c in (("0", "0", "0"), ("0", "1", "0")):
        cmp = compare_with_pysheaf(triangle_sheaf(a, b, c))
        where = ", ".join(sorted(cmp.located_conflicts)) or "none"
        print(
            f"  a={a} b={b} c={c}: classical={cmp.classical_radius} "
            f"ours={cmp.bilattice_radius} agree={cmp.agrees_with_classical} conflict@ {where}"
        )

    print("\n== continuous sensor fusion (beat: graded conflict) ==")
    # One-sided readings: (q, 0) = yes·q, (0, q) = no·q.
    readings = {
        "n": (0.9, 0.0),  # yes, confident
        "e": (0.8, 0.0),  # yes
        "s": (0.0, 0.8),  # NO -> contradicts its neighbours
        "w": (0.0, 0.4),  # weak no
    }
    edges = [("n", "e"), ("e", "s"), ("s", "w"), ("w", "n")]
    sheaf, assignment = sensor_fusion_sheaf(readings, edges)
    conflicts = graded_conflicts(sheaf, assignment)
    if not conflicts:
        print("  no conflict — clean consensus")
    for edge, degree in sorted(conflicts.items(), key=lambda kv: -kv[1]):
        print(f"  edge {edge}: graded conflict {degree:.2f}")

    print("\n== consistency filtration (beat: the sweep PySheaf's scalar discards) ==")
    settled, _ = settle_assignment(sheaf, assignment)
    for grade, cells in filtration(sheaf, settled).items():
        admitted = ", ".join(sorted(cells)) or "none"
        print(f"  grade ≤ {grade:.2f}: admits {admitted}")


if __name__ == "__main__":
    main()
