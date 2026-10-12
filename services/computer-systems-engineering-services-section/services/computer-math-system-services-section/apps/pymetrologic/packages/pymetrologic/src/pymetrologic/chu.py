"""Chu spaces over FOUR and FOUR's star-autonomous alphabet (RelMath.Order.LinearLogicChu).

FOUR is read as the *alphabet* of a category of Chu spaces valued in it. A Chu
space ``C = ⟨pts, sts, r⟩`` pairs two carriers with a FOUR-valued matrix
``r : pts → sts → charge``. The category is star-autonomous: it has an involutive
``dual`` built by transposing and negating the matrix.

The alphabet itself is star-autonomous as a residuated lattice: its tensor
``⊗ = ⊙`` (fusion) is left adjoint to its hom ``⊸ = ⇒`` (residual), and
``negate`` (∼) is a De Morgan linear involution — the ``⊗ ⊣ ⊸`` of multiplicative
linear logic. This reuses the residuation already built in :mod:`pymetrologic.bilattice`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, TypeVar

from .bilattice import BL, Bilattice

T = TypeVar("T")

__all__ = [
    "ChuSpace",
    "dual",
    "four_hom",
    "four_tensor",
    "is_star_autonomous",
]


@dataclass(frozen=True)
class ChuSpace(Generic[T]):
    """A Chu space over a bilattice alphabet: points, states, and a charge matrix."""

    pts: tuple[str, ...]
    sts: tuple[str, ...]
    matrix: dict[tuple[str, str], BL[T]]


def dual(bl: Bilattice[T], c: ChuSpace[T]) -> ChuSpace[T]:
    """The Chu dual ``C^⊥``: transpose the matrix and negate each entry (involutive)."""
    return ChuSpace(
        pts=c.sts,
        sts=c.pts,
        matrix={(s, p): bl.neg(c.matrix[(p, s)]) for (p, s) in c.matrix},
    )


def four_tensor(bl: Bilattice[T], a: BL[T], b: BL[T]) -> BL[T]:
    """The linear-logic tensor ``⊗`` on the alphabet — the fusion ``⊙``."""
    return bl.fuse(a, b)


def four_hom(bl: Bilattice[T], a: BL[T], b: BL[T]) -> BL[T]:
    """The linear-logic hom ``⊸`` on the alphabet — the residual ``⇒``."""
    return bl.residuum(a, b)


def is_star_autonomous(bl: Bilattice[T]) -> bool:
    """The alphabet is star-autonomous: ``negate`` is an involution and ``⊗ ⊣ ⊸``.

    Checks ``∼∼x = x`` (De Morgan linear involution) and the linear adjunction
    ``a ⊗ b ≤_t c ⟺ a ≤_t (b ⊸ c)`` (``four_star_autonomous``).
    """
    vals = bl.sample(3)
    if not all(bl.eq(bl.neg(bl.neg(x)), x) for x in vals):
        return False
    return all(
        bl.leq_t(four_tensor(bl, a, b), c) == bl.leq_t(a, four_hom(bl, b, c))
        for a in vals
        for b in vals
        for c in vals
    )
