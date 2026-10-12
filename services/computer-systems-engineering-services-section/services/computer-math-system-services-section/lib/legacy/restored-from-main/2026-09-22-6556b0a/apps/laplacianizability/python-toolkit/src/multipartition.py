"""
Bipartite multipartitions: enumeration, codim/stab formulas, closure poset.

A bipartite multipartition over a chain complex with chain dimensions
(m_0, m_1, ..., m_N) is a partition of the indexing set
    I = {(n, i) : 0 <= n <= N, 1 <= i <= m_n}.

Each block B in a multipartition Pi has:
    - total size |B|
    - per-degree multiplicity k_n^B := #{i : (n, i) in B}

Codim formulas (`theorems/stab-codim-formula.md`):
    - codim in eigenvalue moduli:  sum_B (|B| - 1)
    - stab dim (within ambient H): sum_B sum_n C(k_n^B, 2)

Closure poset (`theorems/closure-poset-of-strata.md`):
    Pi <= Pi'  iff  Pi' refines Pi  (Pi has coarser blocks).
    Equivalently: every block of Pi' is contained in some block of Pi.
"""

from itertools import combinations, product
from math import comb
from functools import lru_cache


def chain_index_set(dims):
    """The indexing set I for a chain complex with given chain dimensions."""
    return tuple((n, i) for n, m in enumerate(dims) for i in range(1, m + 1))


def all_partitions(elements):
    """Yield every set-partition of the iterable `elements` as a tuple of frozensets.

    Implements set-partition enumeration via the Bell-number recursion.
    """
    elts = list(elements)
    if not elts:
        yield ()
        return

    def gen(idx, blocks):
        if idx == len(elts):
            yield tuple(frozenset(b) for b in blocks)
            return
        e = elts[idx]
        # Place e in an existing block.
        for k in range(len(blocks)):
            new_blocks = [list(b) for b in blocks]
            new_blocks[k].append(e)
            yield from gen(idx + 1, new_blocks)
        # Or start a new block.
        yield from gen(idx + 1, blocks + [[e]])

    yield from gen(0, [])


def block_size(B):
    return len(B)


def block_per_degree_mult(B):
    """Return dict {n: k_n^B} for block B."""
    counts = {}
    for (n, _i) in B:
        counts[n] = counts.get(n, 0) + 1
    return counts


def codim_eigenvalue_moduli(Pi):
    """sum_B (|B| - 1) — codim in the bipartite eigenvalue moduli."""
    return sum(len(B) - 1 for B in Pi)


def stab_dim(Pi):
    """sum_B sum_n C(k_n^B, 2) — stab dim within the ambient H."""
    total = 0
    for B in Pi:
        ks = block_per_degree_mult(B)
        total += sum(comb(k, 2) for k in ks.values())
    return total


def codim_in_ambient(Pi):
    """codim in H = codim in eigenvalue moduli + stab dim."""
    return codim_eigenvalue_moduli(Pi) + stab_dim(Pi)


def is_refinement(Pi_fine, Pi_coarse):
    """True iff Pi_fine refines Pi_coarse (every block of Pi_fine is contained
    in some block of Pi_coarse)."""
    for B_fine in Pi_fine:
        if not any(B_fine.issubset(B_coarse) for B_coarse in Pi_coarse):
            return False
    return True


def partition_canonical(Pi):
    """Canonical form: blocks sorted, each block as a sorted tuple of (n,i)."""
    return tuple(sorted(tuple(sorted(B)) for B in Pi))


def closure_poset(dims, hodge_constraints=None):
    """Enumerate all bipartite multipartitions consistent with `hodge_constraints`
    and return the closure poset.

    `hodge_constraints` is None or a list of frozensets giving forced identifications
    (each element of hodge_constraints is a set of indices that must lie in the same block).

    Returns:
        partitions: list of canonical partitions (tuples of tuples of (n,i))
        cover_relations: list of (i, j) pairs such that partitions[i] is covered
            by partitions[j] (j is a one-step refinement of i).
    """
    I = chain_index_set(dims)
    raw = list(all_partitions(I))

    if hodge_constraints:
        def respects(Pi):
            for forced in hodge_constraints:
                if not any(forced.issubset(B) for B in Pi):
                    return False
            return True
        raw = [Pi for Pi in raw if respects(Pi)]

    canon = sorted({partition_canonical(Pi) for Pi in raw},
                   key=lambda p: (len(p), tuple(len(b) for b in p)))

    # Reconvert to frozenset blocks for refinement testing.
    parts = [tuple(frozenset(B) for B in Pi) for Pi in canon]

    # Compute cover relations: Pi covered by Pi' if Pi' refines Pi and there's
    # no Pi'' strictly between.
    n = len(parts)
    refines_index = {i: set() for i in range(n)}
    for i, j in product(range(n), repeat=2):
        if i != j and is_refinement(parts[j], parts[i]):
            refines_index[i].add(j)

    covers = []
    for i in range(n):
        direct = refines_index[i].copy()
        # Remove non-direct ones: if k refines j refines i (with j != i, k), then k is not direct.
        for j in list(direct):
            for k in refines_index[i]:
                if k != j and is_refinement(parts[k], parts[j]) and k != i:
                    direct.discard(k)
        for j in direct:
            covers.append((i, j))

    return canon, covers


def codim_table(dims, hodge_constraints=None):
    """Print a table of all bipartite multipartitions with codim/stab info."""
    parts, _covers = closure_poset(dims, hodge_constraints)
    print(f"Chain dims: {dims}")
    print(f"Index set size: {sum(dims)}")
    print(f"Number of partitions: {len(parts)}")
    if hodge_constraints:
        print(f"Hodge constraints: {len(hodge_constraints)} forced identifications")
    print()
    print(f"{'Pi':<60} {'codim_eig':>10} {'stab':>6} {'codim_H':>8}")
    print("-" * 88)
    for Pi in parts:
        Pi_repr = " | ".join(",".join(str(idx) for idx in B) for B in Pi)
        if len(Pi_repr) > 58:
            Pi_repr = Pi_repr[:55] + "..."
        ce = codim_eigenvalue_moduli(Pi)
        sd = stab_dim(Pi)
        ch = codim_in_ambient(Pi)
        print(f"{Pi_repr:<60} {ce:>10} {sd:>6} {ch:>8}")


def mobius_function(parts, covers):
    """Compute the Mobius function mu(0, Pi) for each Pi in the closure poset.

    Convention: 0 (the minimum element) is the partition with the largest blocks
    (= the coarsest partition); Pi refines 0. Returns dict {Pi_index: mu_value}.
    """
    n = len(parts)
    pframes = [tuple(frozenset(B) for B in Pi) for Pi in parts]

    # Find the minimum (coarsest = single block, or coarsest consistent with constraints).
    min_idx = 0
    for i in range(1, n):
        if is_refinement(pframes[min_idx], pframes[i]):
            min_idx = i

    # Build the order: i <= j iff parts[j] refines parts[i].
    leq = {(i, j): is_refinement(pframes[j], pframes[i]) or i == j
           for i, j in product(range(n), repeat=2)}

    mu = {}
    # Order: process from min_idx upward in refinement order. min_idx is
    # the coarsest (single block) with highest codim_eig; refinements have
    # lower codim_eig. So process by *decreasing* codim_eig — from coarse to fine.
    order = sorted(range(n), key=lambda i: -codim_eigenvalue_moduli(parts[i]))
    for j in order:
        if j == min_idx:
            mu[j] = 1
        else:
            mu[j] = -sum(mu[i] for i in range(n)
                         if i != j and i in mu
                         and leq[(min_idx, i)] and leq[(i, j)])
    return mu, min_idx


if __name__ == "__main__":
    print("=== Univariate Sym^+_2 (single chain space, dim 2) ===")
    codim_table((2,))
    print()
    print("=== Univariate Sym^+_3 (dim 3) ===")
    codim_table((3,))
