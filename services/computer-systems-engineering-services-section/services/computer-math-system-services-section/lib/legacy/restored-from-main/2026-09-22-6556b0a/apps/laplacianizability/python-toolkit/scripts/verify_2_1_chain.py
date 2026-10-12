"""
Verify the (2,1) chain complex used in the EDD = 40 example.

Chain: (C_0, C_1, C_2) = (2, 3, 1)
    d_1 = [[1, 0, 0], [0, 1, 0]]
    d_2 = [0, 0, 1]^T

Verifies:
    - Stratification I (eigenvalue multipartition) on the SPD interior:
      generic Hilbert structure -> open stratum;
      tuned weights -> Pi_T (supersymmetric) sub-stratum.
    - Stratification II (Pataki + Schubert) at the boundary:
      identifying which boundary stratum corresponds to each EDD-singular component.
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import sympy as sp
from chain_complex import example_2_1_chain, hodge_eigenvalues, spectrum_signature
from stratification_ii import enumerate_full_stratification_ii


def stratification_i_demo():
    print("=" * 70)
    print("Stratification I (interior eigenvalue multipartition)")
    print("=" * 70)
    d_maps = example_2_1_chain()

    # Generic-ish Hilbert structure
    print("\n--- Generic Hilbert: Q_0 = diag(1, 2), Q_1 = diag(1, 1, 3), Q_2 = (1) ---")
    Qs = [sp.diag(1, 2), sp.diag(1, 1, 3), sp.Matrix([[1]])]
    for n in range(3):
        evs = hodge_eigenvalues(d_maps, Qs, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs)
    print(f"  Bipartite multipartition: {sig}")

    # Tuned for Pi_T (supersymmetric: nonzero spectra of Delta_0 and Delta_2 align)
    print("\n--- Tuned for supersymmetric: Q_0 = I, Q_1 = I, Q_2 = (1) ---")
    Qs = [sp.eye(2), sp.eye(3), sp.Matrix([[1]])]
    for n in range(3):
        evs = hodge_eigenvalues(d_maps, Qs, n)
        print(f"  Delta_{n} eigenvalues: {evs}")
    sig = spectrum_signature(d_maps, Qs)
    print(f"  Bipartite multipartition: {sig}")


def stratification_ii_demo():
    print()
    print("=" * 70)
    print("Stratification II (boundary structure of $\\overline{\\mathcal H}$)")
    print("=" * 70)
    print()
    print("Chain dims (2, 3, 1), boundary ranks (rho_1, rho_2) = (2, 1)")
    print("Total dim of $\\overline{\\mathcal H}$ = C(3,2) + C(4,2) + C(2,2) = 3 + 6 + 1 = 10")
    print()
    strata = enumerate_full_stratification_ii(
        m_tuple=(2, 3, 1),
        rho_tuple=(2, 1, 0),  # rho[0] = rank d_1 = 2, rho[1] = rank d_2 = 1
        max_codim=3,
    )
    strata.sort(key=lambda x: (x[2], x[0]))
    print("Codim-1 boundary strata (rank drops by 1):")
    for r_tuple, a_z, total in strata:
        if total == 1:
            label = describe_pataki(r_tuple, a_z)
            print(f"  r = {r_tuple}  Schubert {a_z}  codim {total}  -- {label}")

    print()
    print("Codim-3 boundary strata (matching EDD components 1, 2, 3):")
    matches_to_edd = [
        ("(2, 2, 1) with (0,0)|(1,1)|(0,0)",
         "Component 2: kernel of Q_1 contains im d_2 = <e_3>; b_{13} = b_{23} = b_{33} = 0"),
        ("(1, 3, 1) with extra cubic",
         "Component 4: det Q_0 = 0 + Stratification I cubic refinement"),
    ]
    for r_tuple, a_z, total in strata:
        if total == 3:
            label = describe_pataki(r_tuple, a_z)
            print(f"  r = {r_tuple}  Schubert {a_z}  codim {total}  -- {label}")


def describe_pataki(r_tuple, a_z):
    descs = []
    m = (2, 3, 1)
    for n, (r, m_n) in enumerate(zip(r_tuple, m)):
        if r < m_n:
            descs.append(f"Q_{n} rank {r}")
    if not descs:
        descs.append("interior")
    schubert = []
    for n, (a, z) in enumerate(a_z):
        if a > 0 or z > 0:
            schubert.append(f"deg {n}: a={a}, z={z}")
    if schubert:
        descs.append("Schubert: " + "; ".join(schubert))
    return "; ".join(descs)


if __name__ == "__main__":
    stratification_i_demo()
    stratification_ii_demo()
