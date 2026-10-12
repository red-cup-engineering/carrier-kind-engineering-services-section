"""
IEP-G: distinguish "any within-degree multiplicity" from "full degeneracy"
on small cellular sheaves.

For low-rank cases (rank d_n <= 2), the two coincide.
For higher-rank, full degeneracy is strictly stronger.

Predictions vs results:
    P_n: NEITHER realizable (paths admit no spectral degeneracy at all).
    K_3, C_3, partial Delta^2: BOTH realizable at uniform weights.
    K_{1,3}: ANY realizable; FULL not (gives mult (2,1) not (3)).
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from cellular_sheaf import (
    path_P, cycle_C, star_K, complete_K, boundary_simplex,
    realize_any_multiplicity, realize_full_degeneracy,
)


def report(label, sheaf, n=1):
    print(f"\n--- {label} (degree {n}) ---", flush=True)
    print(f"    chain dims: {sheaf.dims}, rank d_{n} = {sheaf.d_maps[n-1].rank()}", flush=True)

    any_status, any_info = realize_any_multiplicity(sheaf, n=n)
    print(f"    ANY multiplicity > 1:  {any_status}", flush=True)

    full_status, full_info = realize_full_degeneracy(sheaf, n=n)
    print(f"    FULL nonzero-degeneracy: {full_status}", flush=True)


def main():
    print("=" * 70, flush=True)
    print("Path graphs (admit no spectral multiplicity)", flush=True)
    print("=" * 70, flush=True)
    report("P_3", path_P(3))
    report("P_4", path_P(4))

    print()
    print("=" * 70, flush=True)
    print("Symmetric small graphs (admit some multiplicity at uniform)", flush=True)
    print("=" * 70, flush=True)
    report("C_3", cycle_C(3))
    report("C_4", cycle_C(4))
    report("K_3", complete_K(3))
    report("partial Delta^2", boundary_simplex(2))

    print()
    print("=" * 70, flush=True)
    print("Star K_{1,n} for n >= 3 — partial degeneracy yes, full no", flush=True)
    print("=" * 70, flush=True)
    report("K_{1,3}", star_K(3))


if __name__ == "__main__":
    main()
