"""Free energy as a Lyapunov function — the H-theorem of settling (RelMath.Flow.FreeEnergyLyapunov).

Settling is gradient flow of a free energy: the closure orbit ascends in ``≤ₖ``
toward its fixed point ``w``, so the natural Lyapunov potential is the **deficit**
to ``w``. The **knowledge-order height** ``kHeight`` (``⊥ₖ ↦ 0``, ``t/f ↦ 1``,
``⊤ₖ ↦ 2`` for FOUR) is monotone in ``≤ₖ``; the deficit
``Σ_φ (kHeight(w φ) − kHeight(v φ))`` is a Nat-valued Lyapunov function that
**strictly descends to 0** along the orbit (the H-theorem). The order *is* the
preference — no reals needed.
"""

from __future__ import annotations

from collections.abc import Hashable, Mapping
from typing import TypeVar

from .bilattice import BL, Bilattice, BoundedLattice

T = TypeVar("T")
K = TypeVar("K", bound=Hashable)

__all__ = ["base_rank", "deficit", "k_height"]


def base_rank(base: BoundedLattice[T], v: T) -> int:
    """The rank of a base value: the number of carrier values strictly below it (finite ``L``)."""
    return sum(1 for s in base.sample(0) if base.leq(s, v) and not base.leq(v, s))


def k_height(bl: Bilattice[T], x: BL[T]) -> int:
    """The knowledge-order height ``kHeight x`` — the distance up to ``⊤ₖ``, monotone in ``≤ₖ``."""
    return base_rank(bl.L, x.pro) + base_rank(bl.L, x.con)


def deficit(
    bl: Bilattice[T],
    cells: Mapping[K, BL[T]],
    fixed_point: Mapping[K, BL[T]],
) -> int:
    """The free-energy deficit ``Σ_φ (kHeight(w φ) − kHeight(v φ))`` (Nat subtraction).

    The Lyapunov potential: ``0`` exactly at the fixed point, strictly decreasing
    along the settling orbit (the H-theorem).
    """
    return sum(max(0, k_height(bl, fixed_point[c]) - k_height(bl, cells[c])) for c in fixed_point)
