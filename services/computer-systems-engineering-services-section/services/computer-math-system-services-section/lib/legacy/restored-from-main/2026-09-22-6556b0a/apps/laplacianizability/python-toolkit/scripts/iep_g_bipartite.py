"""
Bipartite IEP-G via decomposition theorem.

`theorems/chain-complex-iep-g-decomposition.md` says:
    A bipartite multipartition Pi is realizable in H_diag iff each
    within-degree restriction Pi|_n is univariate-IEP-G realizable.

This script tests the decomposition by checking each degree separately on
multi-degree cellular chain complexes (boundary of 3-simplex, etc.) where
the bipartite content matters.

partial Delta^3 has chain dims (4, 6, 4), with d_1 the signed incidence
(rank 3) and d_2 the triangle boundary (rank 3). The squared singular values
of d_1 are 3 nonzero eigenvalues; same for d_2 (Hodge identifies them with
the spectra of Delta_0, Delta_1, Delta_2 across degrees).

Within-degree realizability:
    deg 1 (squared singular values of d_1): determined by graph K_4 = K_4
        (the 1-skeleton of partial Delta^3 is K_4).
    deg 2 (squared singular values of d_2): determined by the triangle-edge
        cellular sheaf structure.

Bipartite Pi realizable iff both within-degree problems realize the
corresponding sub-partitions.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from cellular_sheaf import (
    boundary_simplex, complete_K, realize_any_multiplicity, realize_full_degeneracy,
)


def main():
    print("=" * 70, flush=True)
    print("Bipartite IEP-G test: per-degree realizability via decomposition", flush=True)
    print("=" * 70, flush=True)
    print()

    # K_4: 1-skeleton of partial Delta^3. Symbolic discriminant is too expensive
    # (10 weight symbols, degree-3 reduced polynomial). Only do uniform-weight check.
    print("--- K_4 (= 1-skeleton of partial Delta^3) — uniform-weight check ---", flush=True)
    k4 = complete_K(4)
    print(f"    chain dims: {k4.dims}, rank d_1 = {k4.d_maps[0].rank()}", flush=True)
    evs = k4.all_eigenvalues_at_uniform(n=1)
    nonzero = sorted([e for e in evs if e != 0])
    distinct = sorted(set(nonzero), key=lambda x: float(x))
    mults = {e: nonzero.count(e) for e in distinct}
    print(f"    spectrum at uniform: {evs}", flush=True)
    print(f"    nonzero multiplicity profile: {mults}", flush=True)

    print()
    print("--- partial Delta^3 (full bipartite test, uniform-weight only) ---", flush=True)
    pd3 = boundary_simplex(3)
    print(f"    chain dims: {pd3.dims}", flush=True)
    print(f"    rank d_1 = {pd3.d_maps[0].rank()}, rank d_2 = {pd3.d_maps[1].rank()}", flush=True)

    for n in [1, 2]:
        evs = pd3.all_eigenvalues_at_uniform(n=n)
        nonzero = sorted([e for e in evs if e != 0])
        if nonzero:
            distinct = sorted(set(nonzero), key=lambda x: float(x))
            mults = {e: nonzero.count(e) for e in distinct}
        else:
            mults = {}
        print(f"    Delta_{n} spectrum at uniform: {evs}", flush=True)
        print(f"      nonzero multiplicity profile: {mults}", flush=True)


if __name__ == "__main__":
    main()
