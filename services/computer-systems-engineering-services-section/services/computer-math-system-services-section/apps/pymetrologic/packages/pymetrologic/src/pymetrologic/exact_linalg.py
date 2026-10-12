"""Exact linear algebra over the rationals, plus Smith Normal Form over the integers.

**Extension beyond the Lean corpus.** Obsmetrologia does not formalize a
rational- or integer-coefficient linear algebra layer: its own
``Calculus.LinearAlgebra`` material (realized in ``pymetrologic.linalg``) is
coordinate algebra over ``GF(p)`` only, with no exact-rational rank, no
matrix inverse, and no Smith Normal Form. Nothing in this module realizes a
Lean theorem. Its provenance is the ancestor Python package ``pypredcalc``
(``governance/assets/computing/pypredcalc/src/pypredcalc/_linalg/
{matrix,determinant,inverse,smith}.py``, under the
``561-group/lib/legacy/2026-05-15-mypc-561`` checkout), ported and
modernized here because ``pymetrologic.calculus.integral_cohomology`` needs
exact-rational rank and integer Smith Normal Form to compute the actual
cohomology group ``Hⁿ`` — betti number *and* torsion coefficients — in every
degree, rather than assert its vanishing. See that module's docstring for
the motivating story.

``ExactMatrix`` is a small (≲ 50×50), immutable, ``Fraction``-backed dense
matrix — built for coboundary matrices on small simplicial complexes, not as
a numerics workhorse. ``exact_det``/``exact_rank`` use Bareiss fraction-free
elimination (exact, no numerical cancellation, and asymptotically optimal
for exact arithmetic: O(n^3) ring operations with no fraction blow-up).
``exact_inverse``/``exact_solve`` share a Bareiss-style Gauss-Jordan
elimination. ``smith_normal_form`` is the classical row/column
elementary-operation reduction over ℤ: at each step it picks a
smallest-magnitude nonzero pivot, sweeps its row and column by integer
(Euclidean) division, and recurses on the trailing submatrix, producing the
diagonal invariant factors ``d_1 | d_2 | ... | d_r`` that carry the torsion
information plain rank-over-Q discards.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from fractions import Fraction

Rational = Fraction | int

__all__ = [
    "ExactMatrix",
    "Rational",
    "exact_det",
    "exact_inverse",
    "exact_rank",
    "exact_solve",
    "integer_rank",
    "smith_normal_form",
]


def _to_fraction(x: Rational) -> Fraction:
    return x if isinstance(x, Fraction) else Fraction(x)


@dataclass(frozen=True)
class ExactMatrix:
    """A rational matrix, row-major, immutable, exact (``Fraction``-backed).

    Use :meth:`from_rows` for construction; ``rows`` is the canonical
    tuple-of-tuples form.
    """

    rows: tuple[tuple[Fraction, ...], ...]

    @classmethod
    def from_rows(cls, rows: Iterable[Iterable[Rational]]) -> ExactMatrix:
        materialized = tuple(tuple(_to_fraction(x) for x in row) for row in rows)
        if materialized and any(len(r) != len(materialized[0]) for r in materialized):
            raise ValueError("ragged matrix: rows have unequal length")
        return cls(materialized)

    @classmethod
    def zeros(cls, n_rows: int, n_cols: int) -> ExactMatrix:
        z = Fraction(0)
        return cls(tuple((z,) * n_cols for _ in range(n_rows)))

    @classmethod
    def identity(cls, n: int) -> ExactMatrix:
        z, o = Fraction(0), Fraction(1)
        return cls(tuple(tuple(o if i == j else z for j in range(n)) for i in range(n)))

    @property
    def shape(self) -> tuple[int, int]:
        if not self.rows:
            return (0, 0)
        return (len(self.rows), len(self.rows[0]))

    @property
    def n_rows(self) -> int:
        return self.shape[0]

    @property
    def n_cols(self) -> int:
        return self.shape[1]

    def is_square(self) -> bool:
        r, c = self.shape
        return r == c

    def get(self, i: int, j: int) -> Fraction:
        return self.rows[i][j]

    def transpose(self) -> ExactMatrix:
        r, c = self.shape
        return ExactMatrix(tuple(tuple(self.rows[i][j] for i in range(r)) for j in range(c)))

    def __matmul__(self, other: ExactMatrix) -> ExactMatrix:
        if self.n_cols != other.n_rows:
            raise ValueError(f"shape mismatch for matmul: {self.shape} @ {other.shape}")
        z = Fraction(0)
        result = []
        for i in range(self.n_rows):
            row = []
            for j in range(other.n_cols):
                s = z
                for k in range(self.n_cols):
                    s += self.rows[i][k] * other.rows[k][j]
                row.append(s)
            result.append(tuple(row))
        return ExactMatrix(tuple(result))

    def to_lists(self) -> list[list[Fraction]]:
        return [list(row) for row in self.rows]


def exact_det(m: ExactMatrix) -> Fraction:
    """Determinant of a square ``ExactMatrix`` via Bareiss elimination."""
    if not m.is_square():
        raise ValueError(f"exact_det requires a square matrix, got shape {m.shape}")
    n = m.n_rows
    if n == 0:
        return Fraction(1)
    a = [list(row) for row in m.rows]
    sign = 1
    prev_pivot = Fraction(1)
    for k in range(n - 1):
        if a[k][k] == 0:
            swap = next((r for r in range(k + 1, n) if a[r][k] != 0), None)
            if swap is None:
                return Fraction(0)
            a[k], a[swap] = a[swap], a[k]
            sign = -sign
        for i in range(k + 1, n):
            for j in range(k + 1, n):
                a[i][j] = (a[i][j] * a[k][k] - a[i][k] * a[k][j]) / prev_pivot
            a[i][k] = Fraction(0)
        prev_pivot = a[k][k]
    return Fraction(sign) * a[n - 1][n - 1]


def exact_rank(m: ExactMatrix) -> int:
    """Rank of an ``ExactMatrix`` over Q, via Gauss elimination."""
    if m.n_rows == 0 or m.n_cols == 0:
        return 0
    a = [list(row) for row in m.rows]
    n_rows, n_cols = m.shape
    r = 0
    for col in range(n_cols):
        if r >= n_rows:
            break
        pivot_row = next((i for i in range(r, n_rows) if a[i][col] != 0), None)
        if pivot_row is None:
            continue
        if pivot_row != r:
            a[r], a[pivot_row] = a[pivot_row], a[r]
        pivot = a[r][col]
        for i in range(n_rows):
            if i == r or a[i][col] == 0:
                continue
            factor = a[i][col] / pivot
            for j in range(col, n_cols):
                a[i][j] = a[i][j] - factor * a[r][j]
        r += 1
    return r


def _augment(rows: list[list[Fraction]], rhs: list[list[Fraction]]) -> list[list[Fraction]]:
    return [row + r for row, r in zip(rows, rhs, strict=True)]


def _gauss_jordan(aug: list[list[Fraction]], n: int) -> list[list[Fraction]]:
    """Reduce ``aug`` (n x (n+m)) to identity-augmented form. Raises if singular."""
    for col in range(n):
        pivot_row = next((i for i in range(col, n) if aug[i][col] != 0), None)
        if pivot_row is None:
            raise ValueError("singular matrix")
        if pivot_row != col:
            aug[col], aug[pivot_row] = aug[pivot_row], aug[col]
        pivot = aug[col][col]
        aug[col] = [x / pivot for x in aug[col]]
        for i in range(n):
            if i == col or aug[i][col] == 0:
                continue
            factor = aug[i][col]
            aug[i] = [x - factor * y for x, y in zip(aug[i], aug[col], strict=True)]
    return aug


def exact_inverse(a: ExactMatrix) -> ExactMatrix:
    """Inverse of a square invertible ``ExactMatrix`` over Q. Raises on singularity."""
    if not a.is_square():
        raise ValueError(f"exact_inverse requires a square matrix, got shape {a.shape}")
    n = a.n_rows
    if n == 0:
        return a
    rows = [list(row) for row in a.rows]
    identity = [[Fraction(1) if i == j else Fraction(0) for j in range(n)] for i in range(n)]
    aug = _gauss_jordan(_augment(rows, identity), n)
    return ExactMatrix(tuple(tuple(row[n:]) for row in aug))


def exact_solve(a: ExactMatrix, b: ExactMatrix) -> ExactMatrix:
    """Solve ``A x = b`` for square invertible ``A``; ``b`` may have multiple RHS columns."""
    if not a.is_square():
        raise ValueError(f"exact_solve requires a square A, got shape {a.shape}")
    if a.n_rows != b.n_rows:
        raise ValueError(f"shape mismatch: A is {a.shape}, b is {b.shape}")
    n = a.n_rows
    if n == 0:
        return b
    rows = [list(row) for row in a.rows]
    rhs = [list(row) for row in b.rows]
    aug = _gauss_jordan(_augment(rows, rhs), n)
    return ExactMatrix(tuple(tuple(row[n:]) for row in aug))


def _to_int_rows(m: ExactMatrix) -> list[list[int]]:
    out: list[list[int]] = []
    for row in m.rows:
        irow: list[int] = []
        for x in row:
            if x.denominator != 1:
                raise ValueError(f"Smith form requires integer entries, got {x}")
            irow.append(x.numerator)
        out.append(irow)
    return out


def _argmin_nonzero(a: list[list[int]], k: int, n_rows: int, n_cols: int) -> tuple[int, int] | None:
    best: tuple[int, int] | None = None
    best_abs: int | None = None
    for i in range(k, n_rows):
        for j in range(k, n_cols):
            v = a[i][j]
            if v == 0:
                continue
            av = abs(v)
            if best_abs is None or av < best_abs:
                best_abs = av
                best = (i, j)
    return best


def _smith_normal_form_ints(a: list[list[int]]) -> tuple[int, ...]:
    if not a or not a[0]:
        return ()
    n_rows, n_cols = len(a), len(a[0])
    invariants: list[int] = []
    for k in range(min(n_rows, n_cols)):
        # Reduce entries (k.., k..) until (k, k) divides everything in its row
        # and column, then sweep the row/column to zero.
        while True:
            pivot = _argmin_nonzero(a, k, n_rows, n_cols)
            if pivot is None:
                return tuple(invariants)
            pi, pj = pivot
            if pi != k:
                a[k], a[pi] = a[pi], a[k]
            if pj != k:
                for i in range(n_rows):
                    a[i][k], a[i][pj] = a[i][pj], a[i][k]
            p = a[k][k]
            if p < 0:
                for j in range(k, n_cols):
                    a[k][j] = -a[k][j]
                p = a[k][k]
            progressed = False
            for i in range(n_rows):
                if i == k or a[i][k] == 0:
                    continue
                q = a[i][k] // p
                if q != 0:
                    for j in range(k, n_cols):
                        a[i][j] -= q * a[k][j]
                    progressed = True
            for j in range(n_cols):
                if j == k or a[k][j] == 0:
                    continue
                q = a[k][j] // p
                if q != 0:
                    for i in range(n_rows):
                        a[i][j] -= q * a[i][k]
                    progressed = True
            if (
                not progressed
                and all(a[i][k] == 0 for i in range(n_rows) if i != k)
                and all(a[k][j] == 0 for j in range(n_cols) if j != k)
            ):
                break
        if a[k][k] == 0:
            break
        # Enforce divisibility with the trailing submatrix by absorbing rows
        # that break it, then restarting this k on the (possibly smaller)
        # trailing submatrix.
        for i in range(k + 1, n_rows):
            for j in range(k + 1, n_cols):
                if a[i][j] % a[k][k] != 0:
                    for jj in range(n_cols):
                        a[k][jj] += a[i][jj]
                    break
            else:
                continue
            break
        else:
            invariants.append(a[k][k])
            continue
        tail = [a[i][k:] for i in range(k, n_rows)]
        return tuple(invariants) + _smith_normal_form_ints(tail)
    return tuple(invariants)


def smith_normal_form(m: ExactMatrix) -> tuple[int, ...]:
    """The diagonal invariant factors ``(d_1 | d_2 | ... | d_r)`` of an integer ``ExactMatrix``.

    For an integer matrix of rank ``r``, returns a tuple of ``r`` positive
    integers with ``d_i`` dividing ``d_{i+1}``. Trailing zeros
    (rank-deficiency) are omitted. Raises if any entry is non-integral —
    Smith form is a ℤ-invariant, so callers must clear denominators first.
    """
    if m.n_rows == 0 or m.n_cols == 0:
        return ()
    return _smith_normal_form_ints(_to_int_rows(m))


def integer_rank(m: ExactMatrix) -> int:
    """ℤ-rank (= Q-rank) of an integer ``ExactMatrix`` — the count of nonzero invariant factors."""
    return len(smith_normal_form(m))
