"""Finite coordinate linear algebra over ``GF(p)``.

Executable shadow of ``RelMath.LinearAlgebra.Basic`` and
``RelMath.LinearAlgebra.RankNullity``. Vectors are coordinate tuples in
``GF(p)^n``; linear maps are matrices. The module keeps the finite basis
machinery explicit enough to witness standard bases, linear combinations,
spanning, independence, basis cardinality, rank, nullity, and the matrix
rank-nullity identity.
"""

from __future__ import annotations

from collections.abc import Iterable, Sequence

__all__ = [
    "apply_matrix_gf",
    "dimension_well_defined_gf",
    "is_basis_gf",
    "is_linearly_independent_gf",
    "linear_combination_gf",
    "nullity_gf",
    "rank_gf",
    "rank_nullity_holds",
    "scalar_mul_gf",
    "spans_gf",
    "standard_basis_gf",
    "vector_add_gf",
    "vector_neg_gf",
]

Matrix = Sequence[Sequence[int]]
Vector = tuple[int, ...]


def vector_add_gf(left: Sequence[int], right: Sequence[int], p: int) -> Vector:
    """Pointwise vector addition in ``GF(p)^n``."""
    _require_same_dim(left, right)
    return tuple((a + b) % p for a, b in zip(left, right, strict=True))


def vector_neg_gf(vector: Sequence[int], p: int) -> Vector:
    """Pointwise additive inverse in ``GF(p)^n``."""
    return tuple((-value) % p for value in vector)


def scalar_mul_gf(scalar: int, vector: Sequence[int], p: int) -> Vector:
    """Scalar multiplication in ``GF(p)^n``."""
    return tuple((scalar * value) % p for value in vector)


def standard_basis_gf(dim: int, p: int) -> tuple[Vector, ...]:
    """The standard basis ``e_0, ..., e_(n-1)`` of ``GF(p)^n``."""
    if dim < 0:
        msg = "dimension must be nonnegative"
        raise ValueError(msg)
    return tuple(tuple(1 if index == coord else 0 for coord in range(dim)) for index in range(dim))


def linear_combination_gf(
    coefficients: Sequence[int],
    vectors: Sequence[Sequence[int]],
    p: int,
) -> Vector:
    """The finite linear combination ``sum_i coefficients[i] * vectors[i]``."""
    if not vectors:
        return ()
    dim = _vector_dim(vectors)
    total = tuple(0 for _ in range(dim))
    for coefficient, vector in zip(coefficients, vectors, strict=False):
        total = vector_add_gf(total, scalar_mul_gf(coefficient, vector, p), p)
    return total


def is_linearly_independent_gf(vectors: Sequence[Sequence[int]], p: int) -> bool:
    """A finite vector family is independent iff its row rank is its length."""
    if not vectors:
        return True
    _vector_dim(vectors)
    return rank_gf(vectors, p) == len(vectors)


def spans_gf(vectors: Sequence[Sequence[int]], dim: int, p: int) -> bool:
    """A finite vector family spans ``GF(p)^dim`` iff its row rank is ``dim``."""
    if dim < 0:
        msg = "dimension must be nonnegative"
        raise ValueError(msg)
    if not vectors:
        return dim == 0
    if _vector_dim(vectors) != dim:
        msg = "spanning vectors must have the requested dimension"
        raise ValueError(msg)
    return rank_gf(vectors, p) == dim


def is_basis_gf(vectors: Sequence[Sequence[int]], dim: int, p: int) -> bool:
    """A basis is exactly a spanning independent family."""
    return spans_gf(vectors, dim, p) and is_linearly_independent_gf(vectors, p)


def dimension_well_defined_gf(vectors: Sequence[Sequence[int]], dim: int, p: int) -> bool:
    """Every basis of ``GF(p)^dim`` has exactly ``dim`` vectors."""
    return is_basis_gf(vectors, dim, p) and len(vectors) == dim


def apply_matrix_gf(rows: Matrix, vector: Sequence[int], p: int) -> Vector:
    """Apply an ``m x n`` matrix to a vector in ``GF(p)^n``."""
    if not rows:
        return ()
    ncols = _matrix_width(rows)
    if len(vector) != ncols:
        msg = "matrix width must match vector dimension"
        raise ValueError(msg)
    return tuple(
        sum((entry % p) * (value % p) for entry, value in zip(row, vector, strict=True)) % p
        for row in rows
    )


def rank_gf(rows: Matrix, p: int) -> int:
    """The rank of a matrix over ``GF(p)`` with prime ``p``."""
    _matrix_width(rows)
    mat = [[x % p for x in row] for row in rows]
    if not mat:
        return 0
    ncols = len(mat[0])
    nrows = len(mat)
    rank = 0
    for col in range(ncols):
        pivot = next((r for r in range(rank, nrows) if mat[r][col] != 0), None)
        if pivot is None:
            continue
        mat[rank], mat[pivot] = mat[pivot], mat[rank]
        inv = pow(mat[rank][col], p - 2, p)
        mat[rank] = [(x * inv) % p for x in mat[rank]]
        for r in range(nrows):
            if r != rank and mat[r][col] != 0:
                factor = mat[r][col]
                mat[r] = [(mat[r][k] - factor * mat[rank][k]) % p for k in range(ncols)]
        rank += 1
        if rank == nrows:
            break
    return rank


def nullity_gf(rows: Matrix, p: int) -> int:
    """The nullity of an ``m x n`` matrix over ``GF(p)``."""
    ncols = _matrix_width(rows)
    return ncols - rank_gf(rows, p)


def rank_nullity_holds(rows: Matrix, p: int) -> bool:
    """The rank-nullity theorem: ``rank + nullity = n``."""
    ncols = _matrix_width(rows)
    return rank_gf(rows, p) + nullity_gf(rows, p) == ncols


def _require_same_dim(left: Sequence[int], right: Sequence[int]) -> None:
    if len(left) != len(right):
        msg = "vectors must have the same dimension"
        raise ValueError(msg)


def _vector_dim(vectors: Sequence[Sequence[int]]) -> int:
    dim = len(vectors[0])
    if any(len(vector) != dim for vector in vectors):
        msg = "vectors must all have the same dimension"
        raise ValueError(msg)
    return dim


def _matrix_width(rows: Iterable[Sequence[int]]) -> int:
    rows_tuple = tuple(rows)
    if not rows_tuple:
        return 0
    width = len(rows_tuple[0])
    if any(len(row) != width for row in rows_tuple):
        msg = "matrix rows must all have the same width"
        raise ValueError(msg)
    return width
