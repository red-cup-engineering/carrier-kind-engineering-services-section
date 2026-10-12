"""Integer-coefficient sheaf cohomology of a simplicial complex, in every degree.

**Extension beyond the Lean corpus.** Obsmetrologia formalizes settling
cohomology only in degrees 0 and 1
(``Obsmetrologia.Cohomology.SettlingCohomologyH1``, realized in
``pymetrologic.calculus.cohomology``); by construction it *defines*
``Hⁿ := Unit`` for ``n ≥ 2`` — a deliberate scope decision, not a theorem
that higher cohomology vanishes (see :func:`hn_trivial_above_one`'s
docstring). This module realizes no Lean theorem. Its provenance is the
ancestor Python package ``pypredcalc``: its ``sheaf/cohomology.py`` computed
only the free part of ``Hⁿ`` (rank over Q) for an arbitrary finite
simplicial complex, and its ``_linalg/smith.py`` supplied Smith Normal Form
over ℤ without either module ever combining the two into the torsion of
``Hⁿ`` itself (``governance/assets/computing/pypredcalc/src/pypredcalc/
sheaf/cohomology.py`` and ``.../pypredcalc/_linalg/smith.py``, under the
``561-group/lib/legacy/2026-05-15-mypc-561`` checkout). This module makes
that combination: it computes the actual abelian group
``Hⁿ(X; ℤ) ≅ ℤ^βⁿ ⊕ ⊕ᵢ ℤ/dᵢ`` for a :class:`~pymetrologic.simplicial.SimplicialComplex`
in any degree ``n ≥ 0`` — betti number *and* torsion coefficients — so
:func:`hn_trivial_above_one`'s assertion is now testably an approximation
rather than a foundational fact (see the ``S²``/``S³``/``RP²`` gold-standard
tests in ``test_integral_cohomology.py``).

Convention and algorithm. Cochains ``Cⁿ`` are free on the ``n``-cells; the
coboundary ``δⁿ : Cⁿ → Cⁿ⁺¹`` is ``(δφ)(τ) = Σᵢ (-1)ⁱ φ(τ with vertex i removed)``
for an ``(n+1)``-cell ``τ``. :func:`coboundary_matrix` stores it with rows
indexed by ``(n+1)``-cells and columns by ``n``-cells — ``δⁿ`` in a fixed
integer basis. ``Hⁿ = ker(δⁿ) / im(δⁿ⁻¹)``. The free rank is
``βⁿ = |n-cells| − rank(δⁿ) − rank(δⁿ⁻¹)`` (ranks over Q, via
:func:`~pymetrologic.exact_linalg.exact_rank`); the torsion coefficients are
the invariant factors greater than ``1`` in the Smith Normal Form of
``δⁿ⁻¹``'s integer matrix. This works because ``ker(δⁿ)`` is a saturated
(direct-summand) subgroup of the free group ``Cⁿ``, so the elementary
divisors of ``δⁿ⁻¹`` mapping into all of ``Cⁿ`` already coincide with those
of ``δⁿ⁻¹`` mapping into ``ker(δⁿ)`` alone — the standard Smith-normal-form
algorithm for simplicial (co)homology (see e.g. Kaczynski–Mischaikow–Mrozek,
*Computational Homology*).

One subtlety worth stating plainly, because it is easy to get backwards: by
the universal coefficient theorem, the torsion of ``Hⁿ(X; ℤ)`` is the
torsion of the *homology* group ``H_{n-1}(X; ℤ)`` — one degree lower than
the matching homology torsion, not the same degree. The real projective
plane's well-known ``H₁ ≅ ℤ/2`` (homology) therefore surfaces here as
cohomological torsion in ``H²``, not ``H¹`` — see
``TestRealProjectivePlane.test_h2_has_z2_torsion`` in
``test_integral_cohomology.py``, which exists specifically to make that
degree shift visible rather than assume the homology-degree intuition
transfers unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass

from pymetrologic.exact_linalg import ExactMatrix, exact_rank, smith_normal_form
from pymetrologic.simplicial import SimplicialComplex

__all__ = [
    "IntegralCohomology",
    "betti_number",
    "coboundary_matrix",
    "integral_cohomology",
    "torsion_coefficients",
]


def coboundary_matrix(sc: SimplicialComplex, n: int) -> ExactMatrix | None:
    """The ``n``-th coboundary ``δⁿ : Cⁿ → Cⁿ⁺¹`` as an :class:`ExactMatrix`.

    Rows index ``(n+1)``-cells, columns index ``n``-cells. Returns ``None``
    if ``n < 0`` or there are no ``(n+1)``-cells (``δⁿ``'s zero map,
    represented as absent rather than as a degenerate zero-row matrix).
    """
    if n < 0:
        return None
    n_cells = sc.cells(n)
    n1_cells = sc.cells(n + 1)
    if not n1_cells:
        return None
    n_index = {cell: i for i, cell in enumerate(n_cells)}
    rows: list[list[int]] = []
    for tau in n1_cells:
        row = [0] * len(n_cells)
        for i, sigma in enumerate(tau.faces()):
            if sigma in n_index:
                row[n_index[sigma]] += (-1) ** i
        rows.append(row)
    return ExactMatrix.from_rows(rows)


def betti_number(sc: SimplicialComplex, n: int) -> int:
    """The free rank ``βⁿ`` of ``Hⁿ(X; ℤ)`` — rank over Q of ``ker(δⁿ)/im(δⁿ⁻¹)``."""
    n_cells_count = len(sc.cells(n))
    prev = coboundary_matrix(sc, n - 1) if n > 0 else None
    curr = coboundary_matrix(sc, n)
    rank_prev = exact_rank(prev) if prev is not None else 0
    rank_curr = exact_rank(curr) if curr is not None else 0
    return n_cells_count - rank_curr - rank_prev


def torsion_coefficients(sc: SimplicialComplex, n: int) -> tuple[int, ...]:
    """The torsion coefficients of ``Hⁿ(X; ℤ)``: invariant factors ``> 1`` of ``δⁿ⁻¹``'s SNF."""
    if n <= 0:
        return ()
    prev = coboundary_matrix(sc, n - 1)
    if prev is None:
        return ()
    return tuple(d for d in smith_normal_form(prev) if d > 1)


@dataclass(frozen=True)
class IntegralCohomology:
    """``Hⁿ(X; ℤ) ≅ ℤ^betti ⊕ ⊕ᵢ ℤ/torsion[i]``, as computed data."""

    degree: int
    betti: int
    torsion: tuple[int, ...]

    def is_trivial(self) -> bool:
        """Whether ``Hⁿ`` is the zero group — the honest counterpart of ``Unit``."""
        return self.betti == 0 and not self.torsion


def integral_cohomology(sc: SimplicialComplex, n: int) -> IntegralCohomology:
    """Compute ``Hⁿ(X; ℤ)`` — betti number and torsion coefficients — for any degree ``n``."""
    return IntegralCohomology(
        degree=n,
        betti=betti_number(sc, n),
        torsion=torsion_coefficients(sc, n),
    )
