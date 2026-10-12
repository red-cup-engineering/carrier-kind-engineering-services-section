"""Global sections by settling.

PySheaf finds a global section (or its nearest approximation) by optimization.
We instead **settle**: diffuse each cell's section to its cofaces by the
knowledge join ``∨_k`` until a fixed point. Settling is monotone and
inflationary on a bounded fiber, so it always converges (:func:`pymetrologic.settle`),
and the fixed point is the maximal knowledge consistent with the assignment and
the restriction maps. Where two faces of a coface disagree, the settled value
rises to ``⊤`` (conflict) *at exactly the disputed key* — the obstruction is
localized rather than collapsed to a scalar.
"""

from __future__ import annotations

from collections.abc import Hashable

from pymetrologic import BL
from pymetrologic.site import Cell

from .sheaf import Assignment, PredicationSheaf

__all__ = ["FlatKey", "settle_assignment"]

FlatKey = tuple[Cell, Hashable]


def settle_assignment(
    sheaf: PredicationSheaf,
    assignment: Assignment[Hashable, object],
) -> tuple[dict[Cell, dict[Hashable, BL[object]]], int]:
    """Settle ``assignment`` along ``sheaf`` to a ``≤_k`` fixed point.

    Returns the settled assignment (every cell, every key) and the iteration
    count. Restrictions flow from each face to its coface; the settled state is
    the join of the starting assignment with everything its faces imply.
    """
    bl = sheaf.bl

    start: dict[FlatKey, BL[object]] = {}
    for cell in sheaf.site.cells:
        sec = assignment.get(cell, {})
        for key in sheaf.stalk_index[cell]:
            start[(cell, key)] = sec.get(key, bl.none)

    def step(state: dict[FlatKey, BL[object]]) -> dict[FlatKey, BL[object]]:
        out: dict[FlatKey, BL[object]] = {}
        for a, b in sheaf.site.faces:
            sec_a = {key: state[(a, key)] for key in sheaf.stalk_index[a]}
            pushed = sheaf.restriction[(a, b)](sec_a)
            for key, val in pushed.items():
                fk: FlatKey = (b, key)
                out[fk] = bl.join_k(out.get(fk, bl.none), val)
        return out

    from pymetrologic import settle  # local import keeps the module's surface flat

    settled_flat, iterations = settle(bl, step, start)

    settled: dict[Cell, dict[Hashable, BL[object]]] = {c: {} for c in sheaf.site.cells}
    for (cell, key), value in settled_flat.items():
        settled[cell][key] = value
    return settled, iterations
