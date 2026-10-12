"""
Chain complex with Hilbert structure: Hodge Laplacian, eigenvalue spectrum,
stratum identification.

A chain complex is a list of dimensions (m_0, ..., m_N) and a list of
boundary maps [d_1, ..., d_N] with d_n : C_n -> C_{n-1} a sympy Matrix
of shape (m_{n-1}, m_n). The condition d_{n-1} * d_n = 0 is checked.

A Hilbert structure is a list of inner products [Q_0, ..., Q_N] with
Q_n a sympy Matrix of shape (m_n, m_n) symmetric positive-definite.

Hodge Laplacian:
    For each n, the Hilbert adjoint of d_n is
        d_n^* = Q_n^{-1} * d_n^T * Q_{n-1}
    and the Laplacian on C_n is
        Delta_n = d_n^* d_n + d_{n+1} d_{n+1}^*           (on cochains)
    or, equivalently in our chain convention,
        Delta_n = d_n^* d_n + d_{n+1} d_{n+1}^*.

The eigenvalues of Delta_n (as an operator on the Hilbert space (C_n, Q_n))
are computed by similarity to a symmetric matrix:
    L_n := Q_n^{1/2} Delta_n Q_n^{-1/2}
gives the same spectrum and is symmetric in the standard basis.
"""

import sympy as sp
from itertools import product
import math


def check_chain_complex(d_maps):
    """Verify d_{n-1} d_n = 0 for each composable pair.

    d_maps[k] is d_{k+1} : C_{k+1} -> C_k (so d_maps has length N if there are
    N boundary operators).
    """
    for k in range(len(d_maps) - 1):
        prod = d_maps[k] * d_maps[k + 1]
        if not prod.is_zero_matrix:
            raise ValueError(f"Chain complex condition fails at index {k}: d{k} d{k+1} != 0")


def random_spd(m, scale=1.0, seed=None):
    """Generate a random symbolic SPD matrix of size m x m via A^T A + epsilon I,
    with rational entries for reproducibility (uses sympy).

    seed is currently unused (placeholder); use distinct calls for distinct samples.
    """
    if seed is not None:
        import random
        random.seed(seed)
    import random
    A = sp.Matrix(m, m, lambda i, j: sp.Rational(random.randint(-3, 3) + (i == j) * 4, 1))
    Q = A.T * A + sp.Rational(1, 10) * sp.eye(m)
    return Q


def diagonal_spd(weights):
    """Diagonal SPD with given positive weights."""
    return sp.diag(*[sp.Rational(w) for w in weights])


def hodge_laplacian(d_maps, Qs, n):
    """Compute Delta_n = d_n^* d_n + d_{n+1} d_{n+1}^*.

    Conventions:
        d_maps[k] = d_{k+1} : C_{k+1} -> C_k
        Qs[k] = Q_k inner product on C_k
        n is the chain degree.
    """
    N = len(d_maps)  # number of boundary maps
    dims = [Q.rows for Q in Qs]
    m_n = dims[n]

    delta = sp.zeros(m_n, m_n)

    # Term: d_n^* d_n where d_n : C_n -> C_{n-1} is d_maps[n-1].
    if n >= 1:
        d_n = d_maps[n - 1]  # C_n -> C_{n-1}
        Q_n = Qs[n]
        Q_nm1 = Qs[n - 1]
        d_n_adj = Q_n.inv() * d_n.T * Q_nm1
        delta = delta + d_n_adj * d_n

    # Term: d_{n+1} d_{n+1}^* where d_{n+1} : C_{n+1} -> C_n is d_maps[n].
    if n < N:
        d_np1 = d_maps[n]  # C_{n+1} -> C_n
        Q_n = Qs[n]
        Q_np1 = Qs[n + 1]
        d_np1_adj = Q_np1.inv() * d_np1.T * Q_n
        delta = delta + d_np1 * d_np1_adj

    return delta


def hodge_eigenvalues(d_maps, Qs, n, sort=True):
    """Eigenvalues of Delta_n as an operator on (C_n, Q_n).

    Returns a list of eigenvalues with multiplicity. Computed via the
    similarity to the Q_n-symmetric form L_n = Q_n^{1/2} Delta_n Q_n^{-1/2},
    or equivalently as eigenvalues of the generalized eigenproblem Delta_n v = lambda v
    in the Hilbert structure (so plain eigenvalues of the matrix Delta_n suffice
    when Delta_n is the operator-matrix in the standard basis).
    """
    delta = hodge_laplacian(d_maps, Qs, n)
    eigenvalues = list(delta.eigenvals().items())  # {value: multiplicity}
    flat = []
    for val, mult in eigenvalues:
        for _ in range(mult):
            flat.append(val)
    if sort:
        # Try to sort numerically by floating-point evaluation.
        try:
            flat.sort(key=lambda x: float(x))
        except (TypeError, ValueError):
            pass
    return flat


def all_hodge_eigenvalues(d_maps, Qs):
    """Return list of (n, eigenvalue) pairs for all chain degrees."""
    result = []
    dims = [Q.rows for Q in Qs]
    for n in range(len(dims)):
        for ev in hodge_eigenvalues(d_maps, Qs, n):
            result.append((n, ev))
    return result


def spectrum_signature(d_maps, Qs, tol=1e-9):
    """Identify the bipartite multipartition of the joint spectrum.

    Returns a tuple of frozensets, where each frozenset is a block of indices
    (n, i) (with i in 1..m_n) such that the corresponding eigenvalues coincide.

    The identification of "which eigenvalue index i in degree n" uses sorted order.
    """
    spectra = {}
    dims = [Q.rows for Q in Qs]
    for n in range(len(dims)):
        evs = hodge_eigenvalues(d_maps, Qs, n)
        spectra[n] = evs

    # Flatten with index labels
    indexed = []
    for n in spectra:
        for i, ev in enumerate(spectra[n], start=1):
            indexed.append(((n, i), ev))

    # Group by approximate value (numeric)
    def numeric(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return float(sp.simplify(x))

    blocks = []
    used = set()
    for label, ev in indexed:
        if label in used:
            continue
        block = {label}
        used.add(label)
        v_ev = numeric(ev)
        for label2, ev2 in indexed:
            if label2 in used:
                continue
            if abs(numeric(ev2) - v_ev) < tol:
                block.add(label2)
                used.add(label2)
        blocks.append(frozenset(block))
    return tuple(sorted(blocks, key=lambda b: sorted(b)))


# ---------------------------------------------------------------------------
# Canonical examples
# ---------------------------------------------------------------------------

def example_2_2_iso():
    """(C_0, C_1) = (2, 2), d_1 = identity. Smallest case with bipartite content."""
    d1 = sp.eye(2)
    return [d1], [sp.eye(2), sp.eye(2)]


def example_2_1_chain():
    """(C_0, C_1, C_2) = (2, 3, 1) with the canonical-form boundaries from
    the EDD = 40 example.

        d_1 = [[1, 0, 0], [0, 1, 0]]
        d_2 = [[0], [0], [1]]
    """
    d1 = sp.Matrix([[1, 0, 0], [0, 1, 0]])
    d2 = sp.Matrix([[0], [0], [1]])
    return [d1, d2]


def example_partial_delta_2():
    """The cellular chain complex of the boundary of a 2-simplex (triangle).
    3 vertices, 3 edges. d_1: C^edge_1 -> C^vert_0 is the signed incidence.
    """
    # Vertices: v0, v1, v2 indexed 0,1,2.
    # Edges: e_{01} = v1 - v0, e_{12} = v2 - v1, e_{02} = v2 - v0
    # d_1 columns are images of edges.
    d1 = sp.Matrix([
        [-1,  0, -1],   # v0 row
        [ 1, -1,  0],   # v1 row
        [ 0,  1,  1],   # v2 row
    ])
    return [d1]


def example_partial_delta_3():
    """Cellular chain complex of the boundary of a 3-simplex (tetrahedron).
    4 vertices, 6 edges, 4 triangles. d_1: edges -> vertices, d_2: triangles -> edges.
    """
    # Vertices v0..v3, edges e_{ij} for i<j, triangles t_{ijk}.
    edges = [(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)]
    triangles = [(0, 1, 2), (0, 1, 3), (0, 2, 3), (1, 2, 3)]

    d1 = sp.zeros(4, 6)
    for col, (i, j) in enumerate(edges):
        d1[i, col] = -1
        d1[j, col] = 1

    d2 = sp.zeros(6, 4)
    for col, (i, j, k) in enumerate(triangles):
        # d(t_{ijk}) = e_{jk} - e_{ik} + e_{ij}
        e_jk = edges.index((j, k))
        e_ik = edges.index((i, k))
        e_ij = edges.index((i, j))
        d2[e_jk, col] = 1
        d2[e_ik, col] = -1
        d2[e_ij, col] = 1

    return [d1, d2]


if __name__ == "__main__":
    print("=== (2,2) chain with d_1 = I, identity Hilbert ===")
    d_maps, Qs = example_2_2_iso()
    check_chain_complex(d_maps + [sp.zeros(2, 1)])  # padded to check
    for n in range(2):
        print(f"Delta_{n} eigenvalues: {hodge_eigenvalues(d_maps, Qs, n)}")
    print(f"Bipartite multipartition: {spectrum_signature(d_maps, Qs)}")

    print()
    print("=== (2,2) with Q_0 = diag(1, 4), Q_1 = I — splits eigenvalues ===")
    Qs = [sp.diag(1, 4), sp.eye(2)]
    for n in range(2):
        print(f"Delta_{n} eigenvalues: {hodge_eigenvalues(d_maps, Qs, n)}")
    print(f"Bipartite multipartition: {spectrum_signature(d_maps, Qs)}")
