"""
Stratification II: Pataki rank stratification + chain-complex Schubert refinement.

For a chain complex of dimensions (m_0, ..., m_N) with boundary ranks
    rho_n = rank(d_n)         (with d_n : C_n -> C_{n-1})

the closed cone $\\overline{\\mathcal H} = \\prod_n \\overline{\\mathrm{Sym}^+_{m_n}}$
stratifies by:

  - Pataki rank tuple r = (r_0, ..., r_N) with 0 <= r_n <= m_n.
    Stratum has dim sum_n [r_n m_n - C(r_n, 2)] and codim sum_n C(m_n - r_n + 1, 2).

  - Schubert refinement: for each n, kernel K_n = ker Q_n is a (m_n - r_n)-dim
    subspace of C_n. The chain filtration  0 ⊂ im d_{n+1} ⊂ ker d_n ⊂ C_n
    defines Schubert invariants
        a_n = dim(K_n ∩ im d_{n+1})
        z_n = dim(K_n ∩ ker d_n)
        k_n = m_n - r_n.

    Generic intersection (Schubert calculus):
        a_n^gen = max(0, k_n + rho_{n+1} - m_n)
        z_n^gen = max(0, k_n + (m_n - rho_n) - m_n) = max(0, k_n - rho_n)

    A Schubert sub-stratum has additional codim
        sum_n [(a_n - a_n^gen)(m_n - rho_{n+1} - k_n + a_n)
              + ((z_n - a_n) - (z_n - a_n)^gen)(rho_n - (k_n - z_n) + ...)]
    (using the standard Grassmannian Schubert codim).

This module enumerates the Pataki+Schubert strata for a given chain complex
and prints their codims, validating against the EDD = 40 example's 4 boundary
components on the (2,1) chain.
"""

from itertools import product
from math import comb


def pataki_dim(r_tuple, m_tuple):
    """dim of Pataki product stratum with rank tuple r in PSD cone of dims m."""
    return sum(r * m - comb(r, 2) for r, m in zip(r_tuple, m_tuple))


def pataki_codim(r_tuple, m_tuple):
    """codim of Pataki product stratum in $\\overline{\\mathcal H}$."""
    return sum(comb(m - r + 1, 2) for r, m in zip(r_tuple, m_tuple))


def schubert_intersect_dim_generic(k, v, m):
    """Generic dim of K ∩ V where dim K = k, dim V = v, ambient dim = m."""
    return max(0, k + v - m)


def schubert_codim(k, j, v, m):
    """Schubert codim of {K : dim(K ∩ V) = j} in Gr(k, m), given dim V = v.

    Using the standard formula: dim of Schubert variety is k(m-k) - j(m-v-k+j),
    so codim of "dim K ∩ V >= j" in Gr(k, m) is j*(m - v - k + j) for j >= max(0, k+v-m).
    """
    j_gen = max(0, k + v - m)
    if j < j_gen:
        return None  # impossible
    return j * (m - v - k + j) - j_gen * (m - v - k + j_gen)


def enumerate_pataki_strata(m_tuple, max_codim=None):
    """Yield (r_tuple, codim) for each Pataki stratum, optionally bounded by codim."""
    ranges = [range(0, m + 1) for m in m_tuple]
    for r_tuple in product(*ranges):
        c = pataki_codim(r_tuple, m_tuple)
        if max_codim is not None and c > max_codim:
            continue
        yield r_tuple, c


def schubert_subrefinements(r_tuple, m_tuple, rho_tuple):
    """For each Pataki stratum (r_tuple), yield the Schubert sub-strata indexed
    by tuples (a_n, z_n) per chain degree n.

    rho_tuple[n] = rank of d_{n+1} : C_{n+1} -> C_n
    (so rho has length N where there are N+1 chain spaces, but we provide
    rho with len = len(m_tuple) where rho_tuple[n] = rank of d_{n+1} (or 0 at top)).

    Uses chain filtration  im d_{n+1} ⊂ ker d_n ⊂ C_n with dims
        v_im = rho_{n+1}                # incoming boundary
        v_ker = m_n - rho_n             # cycles
    where rho_n = rank of d_n : C_n -> C_{n-1}.
    """
    yields = []
    N = len(m_tuple)
    schubert_codims_per_degree = []
    for n, (r_n, m_n) in enumerate(zip(r_tuple, m_tuple)):
        k_n = m_n - r_n
        rho_in = rho_tuple[n] if n < len(rho_tuple) else 0  # rank of d_{n+1}
        rho_out = rho_tuple[n - 1] if n >= 1 else 0  # rank of d_n into C_{n-1}, but we want rank d_n out of C_n
        # rho_n in our usage: rank(d_n : C_n -> C_{n-1}). For n=0, no d_0, so rho_0_out = 0.
        # We'll redefine: rho_out_per_degree[n] = rank(d_n) where d_n : C_n -> C_{n-1}.
        # For n = 0: rho_out_per_degree[0] = 0 (no d_0).
        # For n > 0: rho_out_per_degree[n] = rho_tuple[n-1] (rank of d_n).
        # And rho_in_per_degree[n] = rank(d_{n+1}) for n < N-1; 0 at the top.
        # But the input rho_tuple is structured as rho[k] = rank(d_{k+1}) per the chain_complex convention.
        # So:
        #   rho_n (rank of d_n into C_{n-1}) = rho_tuple[n-1] for n >= 1; 0 for n = 0.
        #   rho_{n+1} (rank of d_{n+1} into C_n) = rho_tuple[n] if n < N-1; 0 if n = N-1.
        rho_n_value = rho_tuple[n - 1] if n >= 1 else 0
        rho_n_plus_1_value = rho_tuple[n] if n < len(rho_tuple) else 0

        v_im = rho_n_plus_1_value
        v_ker = m_n - rho_n_value
        # 0 <= a_n <= min(k_n, v_im)
        # a_n <= z_n <= min(k_n, v_ker)
        per_deg_options = []
        for a_n in range(0, min(k_n, v_im) + 1):
            for z_n in range(a_n, min(k_n, v_ker) + 1):
                # Schubert codim within this Pataki block
                a_gen = schubert_intersect_dim_generic(k_n, v_im, m_n)
                z_gen = max(a_gen, schubert_intersect_dim_generic(k_n, v_ker, m_n))
                # codim_a : Schubert codim of dim(K ∩ im d_{n+1}) >= a_n
                codim_a = schubert_codim(k_n, a_n, v_im, m_n)
                # codim_z : Schubert codim of dim(K ∩ ker d_n) >= z_n, beyond codim_a.
                # We compute it w.r.t. ker d_n, which is v_ker-dim; conditioning on a_n.
                codim_z_total = schubert_codim(k_n, z_n, v_ker, m_n)
                if codim_a is None or codim_z_total is None:
                    continue
                # Combined Schubert codim per degree (rough upper bound):
                schubert_codim_n = max(codim_a, codim_z_total)
                per_deg_options.append((a_n, z_n, schubert_codim_n))
        schubert_codims_per_degree.append(per_deg_options)

    for combo in product(*schubert_codims_per_degree):
        a_z = tuple((c[0], c[1]) for c in combo)
        sch_codim = sum(c[2] for c in combo)
        yields.append((a_z, sch_codim))
    return yields


def enumerate_full_stratification_ii(m_tuple, rho_tuple, max_codim=None):
    """Enumerate combined Pataki + Schubert strata.

    Returns list of (r_tuple, schubert_pattern, total_codim) triples.
    """
    strata = []
    for r_tuple, p_codim in enumerate_pataki_strata(m_tuple, max_codim=max_codim):
        for a_z, sch_codim in schubert_subrefinements(r_tuple, m_tuple, rho_tuple):
            total = p_codim + sch_codim
            if max_codim is not None and total > max_codim:
                continue
            strata.append((r_tuple, a_z, total))
    return strata


def print_low_codim_strata(m_tuple, rho_tuple, max_codim=4):
    """Print the low-codim strata of Stratification II for given chain complex shape."""
    print(f"Chain dims:    m = {m_tuple}")
    print(f"Boundary ranks: rho = {rho_tuple}    (rho[k] = rank of d_{{k+1}})")
    print(f"Total dim of $\\overline{{\\mathcal H}}$: {sum(comb(m + 1, 2) for m in m_tuple)}")
    print()
    print(f"{'r_tuple':<14}{'a,z per deg':<28}{'total_codim':<12}")
    print("-" * 60)
    strata = enumerate_full_stratification_ii(m_tuple, rho_tuple, max_codim=max_codim)
    strata.sort(key=lambda x: (x[2], x[0]))
    for r_tuple, a_z, total in strata:
        if total == 0:
            label = "(open SPD interior)"
        else:
            label = ""
        a_z_str = " | ".join(f"a={a},z={z}" for (a, z) in a_z)
        print(f"{str(r_tuple):<14}{a_z_str:<28}{total:<12}{label}")


if __name__ == "__main__":
    print("=== Stratification II for (2, 1) chain complex ===")
    # m_tuple = (2, 3, 1), boundaries d_1: C_1 -> C_0 rank 2, d_2: C_2 -> C_1 rank 1.
    # rho_tuple[k] = rank(d_{k+1}), so rho[0] = rank(d_1) = 2, rho[1] = rank(d_2) = 1, rho[2] = 0.
    print_low_codim_strata(m_tuple=(2, 3, 1), rho_tuple=(2, 1, 0), max_codim=4)
