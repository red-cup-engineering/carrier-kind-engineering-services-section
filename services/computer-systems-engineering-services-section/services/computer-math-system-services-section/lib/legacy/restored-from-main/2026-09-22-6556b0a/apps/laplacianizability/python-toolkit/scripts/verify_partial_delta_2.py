"""
Verify the moduli of Laplacianizations on the boundary of the 2-simplex,
matching `examples/moduli-of-triangle-boundary.md`.

Expected:
    - Chain dim (3, 3) for vertices and edges (boundary of triangle).
    - rank d_1 = 2 (kernel = constants in C_0; image = "boundaries" of dim 2 in C_1).
    - H_0 = R, H_1 = R (single connected component, single 1-cycle).
    - Bipartite multipartition lattice: forces certain Hodge identifications;
      after that, eigenvalue stratification by within-degree partition.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from chain_complex import (
    example_partial_delta_2, hodge_eigenvalues, spectrum_signature
)


def main():
    d_maps = example_partial_delta_2()
    d1 = d_maps[0]

    print(f"Boundary of 2-simplex (triangle):")
    print(f"  d_1 (3 edges -> 3 vertices):")
    print(d1)
    print()
    print(f"  rank(d_1) = {d1.rank()}")
    print(f"  H_0 = R^{3 - d1.rank()}, H_1 = R^{3 - d1.rank()}  (Betti = (1, 1))")
    print()

    # Identity Hilbert structures (uniform vertex/edge weights)
    Qs_uniform = [sp.eye(3), sp.eye(3)]
    print(f"--- Uniform inner products Q_0 = Q_1 = I ---")
    for n in range(2):
        evs = hodge_eigenvalues(d_maps, Qs_uniform, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs_uniform)
    print(f"  Bipartite multipartition: {sig}")
    print()

    # Asymmetric: distinct vertex weights breaks the S_3 symmetry
    Qs_asym = [sp.diag(1, 2, 3), sp.eye(3)]
    print(f"--- Q_0 = diag(1, 2, 3), Q_1 = I ---")
    for n in range(2):
        evs = hodge_eigenvalues(d_maps, Qs_asym, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs_asym)
    print(f"  Bipartite multipartition: {sig}")
    print()

    # All-equal symmetric weights
    Qs_sym = [2 * sp.eye(3), 3 * sp.eye(3)]
    print(f"--- Q_0 = 2I, Q_1 = 3I (Sym^3-symmetric weighting) ---")
    for n in range(2):
        evs = hodge_eigenvalues(d_maps, Qs_sym, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs_sym)
    print(f"  Bipartite multipartition: {sig}")


if __name__ == "__main__":
    main()
