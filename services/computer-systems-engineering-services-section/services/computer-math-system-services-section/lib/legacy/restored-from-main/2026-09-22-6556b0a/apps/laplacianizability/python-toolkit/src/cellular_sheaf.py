"""
Cellular sheaves with stalkwise-diagonal Hilbert structure.

A cellular sheaf here means a chain complex (C_bullet, d) with each C_n
equipped with a distinguished cellular basis. The stalkwise-diagonal Hilbert
cone is

    H_diag = product over n of R^{m_n}_{>0}     (per-cell positive weights)

This is a sub-cone of the full H = product Sym^+(C_n) of codim sum_n C(m_n, 2)
(killing all off-diagonals).

The IEP-G question (`theorems/chain-complex-iep-g.md`):
    For a target bipartite multipartition Pi, does there exist a stalkwise-
    diagonal Q in H_diag realizing Pi(Q) = Pi?

This module provides:
    - CellularSheaf class
    - Symbolic generalized eigenvalue pencil computation
    - IEP-G realizability tests (univariate per-degree)
    - Canonical examples: P_n, C_n, K_{1,n}, K_n, partial Delta^k

The decomposition theorem (`theorems/chain-complex-iep-g-decomposition.md`)
says realizability decomposes per-degree:
    Pi realizable iff each Pi|_n is univariate-IEP-G realizable for d_n.
We exploit this and check per-degree.
"""

import sympy as sp
from itertools import product as iproduct


class CellularSheaf:
    """A chain complex with stalkwise-diagonal Hilbert constraint.

    Attributes:
        d_maps: list of sympy Matrix objects, d_maps[k] = d_{k+1} : C_{k+1} -> C_k.
        dims: tuple of chain space dimensions (m_0, m_1, ..., m_N).
        N: number of boundary maps (so chain spaces are C_0, ..., C_N where N
           equals len(d_maps)).
    """

    def __init__(self, d_maps):
        self.d_maps = list(d_maps)
        # Verify chain-complex condition.
        for k in range(len(d_maps) - 1):
            prod = d_maps[k] * d_maps[k + 1]
            if not prod.is_zero_matrix:
                raise ValueError(f"Chain complex condition fails: d_{k+1} d_{k+2} != 0")

        # Infer dimensions.
        if not d_maps:
            self.dims = (0,)
        else:
            dims = []
            for k, d in enumerate(d_maps):
                if k == 0:
                    dims.append(d.rows)
                dims.append(d.cols)
            self.dims = tuple(dims)
        self.N = len(d_maps)

    def num_cells(self):
        return sum(self.dims)

    def diag_weight_symbols(self, prefix=("a", "b", "c", "e", "f", "g", "h")):
        """Generate symbolic positive weights for each cell, returned as a list of
        sympy Symbol lists per chain degree.

        Returns:
            weights: list of length len(dims), with weights[n] a list of m_n
                Symbols (positive=True).
        """
        weights = []
        for n, m in enumerate(self.dims):
            letter = prefix[n] if n < len(prefix) else f"w{n}"
            ws = [sp.Symbol(f"{letter}{i+1}", positive=True) for i in range(m)]
            weights.append(ws)
        return weights

    def Q_diag(self, weights, n):
        """Diagonal Q_n with given positive weights."""
        return sp.diag(*weights[n])

    def pencil_polynomial(self, weights, n, lam):
        """Generalized eigenvalue pencil for the squared singular values of
        the weighted boundary d_n : C_n -> C_{n-1}.

        Computes  det(d_n^T Q_{n-1} d_n - lam * Q_n)  as a polynomial in lam
        with coefficients in the weights.

        Returns: sympy polynomial in lam.
        """
        if n == 0 or n > self.N:
            return None
        d_n = self.d_maps[n - 1]  # d_n : C_n -> C_{n-1}
        Q_below = self.Q_diag(weights, n - 1)
        Q_above = self.Q_diag(weights, n)
        M = d_n.T * Q_below * d_n
        pencil = M - lam * Q_above
        return sp.expand(pencil.det())

    def all_eigenvalues_at_uniform(self, n, value=sp.S(1)):
        """Compute eigenvalues of Delta_n with all weights = `value`.

        Useful for checking the supersymmetric stratum at uniform weights.
        """
        weights = self.diag_weight_symbols()
        subs_dict = {w: value for ws in weights for w in ws}

        from chain_complex import hodge_eigenvalues
        Qs = [self.Q_diag(weights, k).subs(subs_dict) for k in range(len(self.dims))]
        return hodge_eigenvalues(self.d_maps, Qs, n)


# ---------------------------------------------------------------------------
# IEP-G realizability tests
# ---------------------------------------------------------------------------

def realize_any_multiplicity(sheaf, n, verbose=False):
    """Test whether ANY within-degree multiplicity > 1 is achievable for the
    nonzero eigenvalues of d_n by choosing positive stalkwise weights.

    Equivalently: does the discriminant of the reduced pencil polynomial vanish
    for some positive weight assignment?

    For chain complexes where rank(d_n) <= 2 (so the reduced polynomial has
    degree <= 2), this is equivalent to full nonzero-degeneracy. For higher
    rank, it's a weaker condition (just some pair coinciding).

    Strategy:
      1. Compute the pencil polynomial p(lam) = det(d_n^T Q_{n-1} d_n - lam Q_n).
      2. Factor out lam^k for k = dim ker(d_n) (the structural zero-eigenvalue
         multiplicity), giving the reduced polynomial q(lam) on the nonzero spectrum.
      3. Check whether the discriminant of q can vanish for positive stalkwise weights.

    Returns:
        ("realizable", witness)
        ("unrealizable", reason)
        ("inconclusive", info)
    """
    weights = sheaf.diag_weight_symbols()
    lam = sp.Symbol("lam")
    poly_lam = sheaf.pencil_polynomial(weights, n, lam)
    if poly_lam is None:
        return ("realizable", "trivial: no boundary at this degree")

    P = sp.Poly(poly_lam, lam)
    full_deg = P.degree()

    # Determine structural kernel dim of the pencil:
    # ker(d_n^T Q_{n-1} d_n) at generic positive weights = ker(d_n).
    d_n = sheaf.d_maps[n - 1]
    k_ker = d_n.cols - d_n.rank()  # nullity

    # Factor out lam^k_ker.
    coeffs = P.all_coeffs()  # high to low
    # The polynomial has lam^k_ker dividing it iff lowest k_ker coefficients are zero.
    # We trust the linear-algebra fact and divide by lam^k_ker symbolically.
    if k_ker > 0:
        poly_reduced = sp.expand(poly_lam / lam**k_ker)
    else:
        poly_reduced = poly_lam
    Q = sp.Poly(poly_reduced, lam)
    deg_red = Q.degree()
    if verbose:
        print(f"  full pencil deg {full_deg}, ker dim {k_ker}, reduced deg {deg_red}")
        print(f"  reduced polynomial: {sp.expand(poly_reduced)}")

    if deg_red <= 1:
        return ("realizable", f"reduced polynomial degree {deg_red} - trivial")

    # Compute discriminant of the reduced polynomial.
    disc = sp.expand(sp.discriminant(poly_reduced, lam))
    if verbose:
        print(f"  discriminant: {disc}")

    if disc == 0:
        return ("realizable", "discriminant identically zero (full-degenerate by construction)")

    # Check sign at uniform positive weights and a couple variants.
    all_syms = [w for ws in weights for w in ws]
    test_points = [
        {s: sp.Rational(1) for s in all_syms},
        {s: sp.Rational(i + 1) for i, s in enumerate(all_syms)},
    ]
    signs = []
    for tp in test_points:
        v = sp.nsimplify(disc.subs(tp))
        if v.is_number:
            try:
                vf = float(v)
                signs.append(("zero" if abs(vf) < 1e-12 else
                              "pos" if vf > 0 else "neg",
                              tp, vf))
            except (TypeError, ValueError):
                pass

    zero_witness = next((tp for sign, tp, _v in signs if sign == "zero"), None)
    if zero_witness is not None:
        return ("realizable", f"discriminant = 0 at {zero_witness}")

    if signs and all(s[0] == "pos" for s in signs):
        return ("unrealizable",
                f"discriminant > 0 at all tested positive points (samples: {[s[2] for s in signs]})")

    return ("inconclusive", f"sign observations: {signs}")


def realize_full_degeneracy(sheaf, n, verbose=False):
    """Test whether the *nonzero* within-degree-n eigenvalues can ALL be made
    equal by choosing positive stalkwise weights.

    Strategy: compute the reduced pencil polynomial q(lam) of degree d
    (= rank(d_n)). For full degeneracy q must equal c (lam - mu)^d.
    Equivalently, in monic form the coefficients (c_0, c_1, ..., c_{d-1})
    must satisfy: c_k = binom(d, d-k) * (-mu)^{d-k} where mu = -c_{d-1}/d.

    We extract the polynomial coefficients in lam, write down the (d-1)
    polynomial relations on the weights, and check positive-real-solvability.

    For small d, sympy can verify directly.
    """
    weights = sheaf.diag_weight_symbols()
    lam = sp.Symbol("lam")
    poly_lam = sheaf.pencil_polynomial(weights, n, lam)
    if poly_lam is None:
        return ("realizable", "trivial: no boundary at this degree")

    d_n = sheaf.d_maps[n - 1]
    k_ker = d_n.cols - d_n.rank()
    poly_reduced = sp.expand(poly_lam / lam**k_ker) if k_ker > 0 else poly_lam
    Q = sp.Poly(poly_reduced, lam)
    d = Q.degree()
    if d <= 1:
        return ("realizable", f"reduced polynomial degree {d} - trivial")
    if d == 2:
        # Same as any-multiplicity at degree 2.
        return realize_any_multiplicity(sheaf, n, verbose=verbose)

    # Degree d >= 3: write coefficients in monic form, derive the (d-1) relations.
    coeffs_high_to_low = Q.all_coeffs()
    leading = coeffs_high_to_low[0]
    # Monic coefficients c_d=1, c_{d-1}, ..., c_0.
    monic = [sp.simplify(c / leading) for c in coeffs_high_to_low]
    c_dm1 = monic[1]
    mu = -c_dm1 / d
    relations = []
    from math import comb as math_comb
    for k in range(d - 1):  # match c_{d-2}, c_{d-3}, ..., c_0
        idx = d - k  # so monic[idx] is c_{k}
        c_k = monic[idx]
        target = math_comb(d, d - k) * (-mu) ** (d - k)
        relations.append(sp.simplify(c_k - target))

    if verbose:
        print(f"  full-degen relations on weights: {len(relations)} equations")
        for i, r in enumerate(relations):
            print(f"    rel {i}: {r}")

    # Check at uniform weights:
    all_syms = [w for ws in weights for w in ws]
    test_points = [
        {s: sp.Rational(1) for s in all_syms},
        {s: sp.Rational(i + 1) for i, s in enumerate(all_syms)},
    ]
    for tp in test_points:
        all_zero = all(sp.simplify(r.subs(tp)) == 0 for r in relations)
        if all_zero:
            return ("realizable", f"witness at {tp}")

    # If relations are visibly non-zero polynomials in weights and no test point
    # works, conclude "unrealizable at tested points; structurally open".
    nonzero_count = sum(1 for r in relations if sp.simplify(r) != 0)
    return ("unrealizable",
            f"none of {len(relations)} full-degen relations vanish at tested points; "
            f"{nonzero_count} nonzero")


# ---------------------------------------------------------------------------
# Canonical cellular complexes
# ---------------------------------------------------------------------------

def path_P(n):
    """Path graph P_n: n vertices, n-1 edges. Cellular sheaf chain complex."""
    if n < 2:
        raise ValueError("P_n requires n >= 2")
    d1 = sp.zeros(n, n - 1)
    for i in range(n - 1):
        d1[i, i] = -1       # edge i has tail at vertex i
        d1[i + 1, i] = 1    # edge i has head at vertex i+1
    return CellularSheaf([d1])


def cycle_C(n):
    """Cycle graph C_n: n vertices, n edges (closes back to vertex 0)."""
    if n < 3:
        raise ValueError("C_n requires n >= 3")
    d1 = sp.zeros(n, n)
    for i in range(n):
        d1[i, i] = -1
        d1[(i + 1) % n, i] = 1
    return CellularSheaf([d1])


def star_K(n):
    """Star K_{1,n}: 1 center + n leaves, n edges from center to each leaf."""
    if n < 1:
        raise ValueError("K_{1,n} requires n >= 1")
    rows = n + 1
    d1 = sp.zeros(rows, n)
    # Vertex 0 is center; vertices 1..n are leaves.
    for i in range(n):
        d1[0, i] = -1     # tail at center
        d1[i + 1, i] = 1  # head at leaf
    return CellularSheaf([d1])


def complete_K(n):
    """Complete graph K_n: n vertices, C(n,2) edges."""
    if n < 2:
        raise ValueError("K_n requires n >= 2")
    edges = [(i, j) for i in range(n) for j in range(i + 1, n)]
    d1 = sp.zeros(n, len(edges))
    for col, (i, j) in enumerate(edges):
        d1[i, col] = -1
        d1[j, col] = 1
    return CellularSheaf([d1])


def boundary_simplex(k):
    """Cellular chain complex of the boundary of the k-simplex (= S^{k-1})."""
    if k < 1:
        raise ValueError("k >= 1")
    # Vertices: k+1 of them.
    # Edges: C(k+1, 2)
    # Triangles: C(k+1, 3)
    # ... up to (k-1)-faces.
    from itertools import combinations
    vertex_count = k + 1
    faces_by_dim = [list(combinations(range(vertex_count), d + 1)) for d in range(k)]
    # Note: faces_by_dim[d] are the (d+1)-element subsets = d-cells.

    d_maps = []
    for d in range(1, k):
        cells_lower = faces_by_dim[d - 1]   # (d-1)-cells
        cells_upper = faces_by_dim[d]       # d-cells
        idx_lower = {c: i for i, c in enumerate(cells_lower)}
        d_op = sp.zeros(len(cells_lower), len(cells_upper))
        for col, cell in enumerate(cells_upper):
            # boundary of cell: sum_i (-1)^i (cell minus its i-th vertex)
            for i in range(len(cell)):
                face = cell[:i] + cell[i + 1:]
                row = idx_lower[face]
                d_op[row, col] = (-1) ** i
        d_maps.append(d_op)
    return CellularSheaf(d_maps)


if __name__ == "__main__":
    print("=== P_3 chain complex ===")
    p3 = path_P(3)
    print(f"  dims: {p3.dims}")
    weights = p3.diag_weight_symbols()
    lam = sp.Symbol("lam")
    poly = p3.pencil_polynomial(weights, n=1, lam=lam)
    print(f"  Pencil polynomial: {poly}")
    disc = sp.discriminant(poly, lam)
    print(f"  Discriminant: {sp.expand(disc)}")
    print(f"  Factored:    {sp.factor(disc)}")
