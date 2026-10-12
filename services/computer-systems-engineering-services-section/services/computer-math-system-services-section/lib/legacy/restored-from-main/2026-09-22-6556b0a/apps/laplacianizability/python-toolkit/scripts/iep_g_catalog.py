"""
IEP-G realizability catalog: test which graphs realize the supersymmetric
(full-degeneracy) within-degree stratum.

Compares against the predictions in `theorems/chain-complex-iep-g.md` and
`examples/iep-g-cellular-catalog.md`.

Expected:
    P_n  : NOT realizable (Sturm tridiagonal-simplicity).
    C_n  : realizable for n >= 3 at uniform weights.
    K_{1,n} (star): realizable iff n >= 2 (rotational symmetry around center).
    K_n  : realizable at uniform weights (S_n symmetry).
    partial Delta^k: realizable at uniform weights.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from cellular_sheaf import (
    path_P, cycle_C, star_K, complete_K, boundary_simplex,
    realize_full_degeneracy,
)


def section(title):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def report(label, sheaf, n=1):
    print(f"\n--- {label}  (testing degree-{n} squared singular values) ---")
    print(f"    chain dims: {sheaf.dims}")
    status, info = realize_full_degeneracy(sheaf, n=n, verbose=False)
    print(f"    full-degeneracy: {status}")
    print(f"    info: {info}")

    # Compute eigenvalues at uniform weights for sanity-check.
    if max(sheaf.dims) <= 6:
        evs = sheaf.all_eigenvalues_at_uniform(n=n)
        print(f"    spectrum at uniform weights: {evs}")


def main():
    section("PATH GRAPHS — predicted UNREALIZABLE (Sturm)")
    for n in [2, 3, 4]:
        report(f"P_{n}", path_P(n), n=1)

    section("CYCLE GRAPHS — predicted REALIZABLE at uniform weights")
    for n in [3, 4]:
        report(f"C_{n}", cycle_C(n), n=1)

    section("STAR GRAPHS K_{1,n} — predicted REALIZABLE for n >= 2")
    for n in [2, 3, 4]:
        report(f"K_{{1,{n}}}", star_K(n), n=1)

    section("COMPLETE GRAPHS K_n — predicted REALIZABLE at uniform weights")
    for n in [3, 4]:
        report(f"K_{n}", complete_K(n), n=1)

    section("BOUNDARY OF 2-SIMPLEX (triangle) — predicted REALIZABLE")
    ds2 = boundary_simplex(2)
    for n in range(1, ds2.N + 1):
        report(f"partial Delta^2, degree {n}", ds2, n=n)

    # partial Delta^3 has 4 vertices, 6 edges, 4 triangles — symbolic discriminant
    # too expensive at full pencil. Test only at uniform weights.
    section("BOUNDARY OF 3-SIMPLEX (tetrahedron) — uniform-weight check only")
    ds3 = boundary_simplex(3)
    for n in range(1, ds3.N + 1):
        evs = ds3.all_eigenvalues_at_uniform(n=n)
        nonzero = [e for e in evs if e != 0]
        all_equal = len(set(nonzero)) <= 1
        print(f"\n--- partial Delta^3, degree {n} (uniform weights) ---")
        print(f"    chain dims: {ds3.dims}")
        print(f"    spectrum: {evs}")
        print(f"    nonzero eigenvalues all equal: {all_equal}")


if __name__ == "__main__":
    main()
