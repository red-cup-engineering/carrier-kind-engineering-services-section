"""
Verify the moduli of Laplacianizations on the boundary of the 3-simplex
(tetrahedron), matching `examples/cellular-sheaf-on-tetrahedron-boundary.md`
and `examples/moduli-strata-classification.md`.

Expected:
    - Chain dim (4, 6, 4) — vertices, edges, triangles of partial Delta^3.
    - Boundary maps d_1 (signed incidence edges->vertices), d_2 (triangles->edges).
    - Betti: H_0 = R, H_1 = 0, H_2 = R (homology of S^2).
    - Bipartite content arises with cross-degree pairings.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from chain_complex import (
    example_partial_delta_3, hodge_eigenvalues, spectrum_signature,
    check_chain_complex,
)


def main():
    d_maps = example_partial_delta_3()
    d1, d2 = d_maps

    print("Boundary of 3-simplex (tetrahedron):")
    print(f"  Chain dims: {d1.cols}_2 -> {d1.rows}_1 -> {d2.cols}_0  ... wait")
    print(f"  d_1 shape: {d1.shape}  (cols = edges, rows = vertices)")
    print(f"  d_2 shape: {d2.shape}  (cols = triangles, rows = edges)")
    print()

    # Verify d_1 d_2 = 0
    check_chain_complex([d1, d2])
    print(f"  d_1 d_2 = 0 ✓")

    rank_d1 = d1.rank()
    rank_d2 = d2.rank()
    print(f"  rank(d_1) = {rank_d1}, rank(d_2) = {rank_d2}")
    print(f"  Betti numbers: H_0 = R^{4 - rank_d1}, H_1 = R^{6 - rank_d1 - rank_d2}, H_2 = R^{4 - rank_d2}")
    print()

    # Symmetric uniform Hilbert structures
    print("--- Uniform inner products Q_n = I ---")
    Qs = [sp.eye(4), sp.eye(6), sp.eye(4)]
    for n in range(3):
        evs = hodge_eigenvalues(d_maps, Qs, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs)
    print(f"  Bipartite multipartition (block count): {len(sig)}")
    for B in sig:
        print(f"    block of size {len(B)}: {sorted(B)}")
    print()

    # Asymmetric: distinct vertex weights to break symmetry
    print("--- Q_0 = diag(1,2,3,4), Q_1 = Q_2 = I ---")
    Qs = [sp.diag(1, 2, 3, 4), sp.eye(6), sp.eye(4)]
    for n in range(3):
        evs = hodge_eigenvalues(d_maps, Qs, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs)
    print(f"  Bipartite multipartition (block count): {len(sig)}")


if __name__ == "__main__":
    main()
