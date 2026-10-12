"""The modal pair ◇⊣□ on valuations (RelMath.Closure.ModalPairAdjunction).

Over a **modal frame** (cells with an accessibility relation), the modal pair acts
on a valuation ``v : cell → charge``:

* **possibilize** ``◇`` raises each cell to the knowledge-join ``∨ₖ`` over its
  accessible cells — inflationary, "what *could* become known";
* **necessitate** ``□`` lowers each cell to the knowledge-meet ``∧ₖ`` — deflationary,
  "what *must* hold".

On an S5 frame (an equivalence accessibility) reflexivity makes ◇ inflationary / □
deflationary, symmetry gives the Galois adjunction ``◇ ⊣ □`` (``leK (◇v) w ⟺ leK v
(□w)``), and the composite ``□◇`` is a closure / nucleus.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

from .bilattice import BL, Bilattice

T = TypeVar("T")
Valuation = dict[str, BL[T]]
Access = Callable[[str, str], bool]

__all__ = [
    "leK_valuation",
    "modal_adjoint_holds",
    "modal_closure",
    "necessitate",
    "possibilize",
]


def _join_k(bl: Bilattice[T], xs: Sequence[BL[T]]) -> BL[T]:
    acc = bl.none
    for x in xs:
        acc = bl.join_k(acc, x)
    return acc


def _meet_k(bl: Bilattice[T], xs: Sequence[BL[T]]) -> BL[T]:
    acc = bl.conflict
    for x in xs:
        acc = bl.meet_k(acc, x)
    return acc


def possibilize(
    bl: Bilattice[T], cells: Sequence[str], access: Access, v: Valuation[T]
) -> Valuation[T]:
    """``◇v``: each cell's knowledge-join ``∨ₖ`` over its accessible cells."""
    return {phi: _join_k(bl, [v[psi] for psi in cells if access(phi, psi)]) for phi in cells}


def necessitate(
    bl: Bilattice[T], cells: Sequence[str], access: Access, v: Valuation[T]
) -> Valuation[T]:
    """``□v``: each cell's knowledge-meet ``∧ₖ`` over its accessible cells."""
    return {phi: _meet_k(bl, [v[psi] for psi in cells if access(phi, psi)]) for phi in cells}


def leK_valuation(bl: Bilattice[T], a: Valuation[T], b: Valuation[T]) -> bool:
    """The pointwise knowledge order ``a ≤ₖ b`` on valuations."""
    return all(bl.leq_k(a[c], b[c]) for c in a)


def modal_adjoint_holds(
    bl: Bilattice[T], cells: Sequence[str], access: Access, v: Valuation[T], w: Valuation[T]
) -> bool:
    """The Galois adjunction ``◇ ⊣ □``: ``leK (◇v) w ⟺ leK v (□w)`` (from symmetry)."""
    left = leK_valuation(bl, possibilize(bl, cells, access, v), w)
    right = leK_valuation(bl, v, necessitate(bl, cells, access, w))
    return left == right


def modal_closure(
    bl: Bilattice[T], cells: Sequence[str], access: Access, v: Valuation[T]
) -> Valuation[T]:
    """The composite ``□◇`` — a closure on the valuation knowledge order (S5 frame)."""
    return necessitate(bl, cells, access, possibilize(bl, cells, access, v))
