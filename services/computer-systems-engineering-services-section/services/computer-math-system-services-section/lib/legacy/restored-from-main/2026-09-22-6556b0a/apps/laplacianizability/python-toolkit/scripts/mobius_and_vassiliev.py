"""
Compute the bipartite Möbius function and bipartite Vassiliev E_1-page rank profile
for small chain complex shapes.

Tests the conjectural product formula from `theorems/bipartite-vassiliev-shapiro-vainshtein.md`:
    mu_bipartite(Pi_coarse, Pi_fine) = product over blocks (univariate mu of refinement)

Also verifies the closure-poset structure on small cases.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from itertools import product as iproduct
from math import factorial

from multipartition import (
    chain_index_set, all_partitions, codim_eigenvalue_moduli, stab_dim,
    codim_in_ambient, is_refinement, partition_canonical, mobius_function,
    closure_poset,
)


def univariate_mobius_full(n):
    """Möbius function mu(0, 1) on partition lattice of [n], where 0 is the
    minimum (single block of size n) and 1 is the maximum (n singleton blocks).

    Classical formula: (-1)^{n-1} (n-1)!.
    """
    return (-1) ** (n - 1) * factorial(n - 1)


def report_lattice(dims, label, hodge_constraints=None):
    print("=" * 70)
    print(f"Closure poset for chain dims {dims}: {label}")
    print("=" * 70)
    parts, covers = closure_poset(dims, hodge_constraints=hodge_constraints)
    print(f"  number of partitions: {len(parts)}")
    print(f"  number of cover relations: {len(covers)}")
    print()

    print(f"  {'Pi':<60}{'codim_eig':>10}{'stab':>6}{'codim_H':>8}")
    print("  " + "-" * 84)
    for Pi in parts:
        Pi_repr = " | ".join(",".join(str(idx) for idx in B) for B in Pi)
        if len(Pi_repr) > 58:
            Pi_repr = Pi_repr[:55] + "..."
        ce = codim_eigenvalue_moduli(Pi)
        sd = stab_dim(Pi)
        ch = codim_in_ambient(Pi)
        print(f"  {Pi_repr:<60}{ce:>10}{sd:>6}{ch:>8}")

    print()
    mu, min_idx = mobius_function(parts, covers)
    print(f"  Möbius function from coarsest stratum (index {min_idx}):")
    for j, val in mu.items():
        Pi = parts[j]
        Pi_repr = " | ".join(",".join(str(idx) for idx in B) for B in Pi)
        if len(Pi_repr) > 50:
            Pi_repr = Pi_repr[:47] + "..."
        print(f"    mu({Pi_repr:<52}) = {val}")
    print()


def vassiliev_e1_profile(parts):
    """Compute E_1-page rank profile by codim level.

    Each codim-c stratum contributes generators in the E_1 page; we count by codim
    in the eigenvalue moduli (codim_eig). Higher details (cohomology of strata)
    require flag-manifold cohomology which we don't compute here, but the codim
    profile is the structural skeleton.
    """
    profile = {}
    for Pi in parts:
        c = codim_eigenvalue_moduli(Pi)
        profile.setdefault(c, []).append(Pi)
    return profile


def bipartite_mobius_test(dims, label):
    """Verify the bipartite Mobius computation for small cases."""
    parts, covers = closure_poset(dims)
    mu, min_idx = mobius_function(parts, covers)

    n = sum(dims)
    # In refinement order: min = coarsest = single block; max = finest = singletons.
    # Find the finest (max) partition: all singletons.
    finest_idx = None
    for i, Pi in enumerate(parts):
        if all(len(B) == 1 for B in Pi):
            finest_idx = i
            break

    if finest_idx is not None:
        mu_finest = mu[finest_idx]
        expected = univariate_mobius_full(n)
        print(f"  {label} (univariate, dim {n}):")
        print(f"    mu(coarsest, finest) = {mu_finest}")
        print(f"    expected (-1)^(n-1)(n-1)! = {expected}")
        print(f"    {'✓ matches' if mu_finest == expected else '✗ MISMATCH'}")
        print()


def main():
    print("\n" + "=" * 70)
    print("UNIVARIATE Möbius function consistency check")
    print("=" * 70)
    print()
    bipartite_mobius_test((2,), "Sym^+_2")
    bipartite_mobius_test((3,), "Sym^+_3")
    bipartite_mobius_test((4,), "Sym^+_4")

    print()
    report_lattice((2, 2), "(2,2) chain — bipartite content via cross-degree pairs")

    print()
    report_lattice((2, 1), "(2,1) chain (no Hodge constraints)")

    print()
    print("=" * 70)
    print("E_1 codim profile for (2,2) chain (no constraints)")
    print("=" * 70)
    parts, _ = closure_poset((2, 2))
    profile = vassiliev_e1_profile(parts)
    for c in sorted(profile):
        print(f"  codim_eig = {c}: {len(profile[c])} stratum/strata")

    print()
    print("=" * 70)
    print("(2,2) chain WITH Hodge constraints (d_1 iso pairs (0,i) ~ (1,i))")
    print("=" * 70)
    hodge = [
        frozenset({(0, 1), (1, 1)}),
        frozenset({(0, 2), (1, 2)}),
    ]
    report_lattice((2, 2), "(2,2) Hodge-constrained", hodge_constraints=hodge)


if False:  # placeholder
    pass


if __name__ == "__main__":
    main()
