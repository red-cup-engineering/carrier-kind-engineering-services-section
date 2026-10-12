"""The dedicated settling-monotonicity gate — design spec S5 step 7.

Wired into the witness pipeline's named seam
(:func:`pyfars.kernel.witness.record_witness`'s ``settlement`` parameter):
a cell write is refused, before anything is appended, when it would move
that cell backward in the FOUR knowledge order. This is a hard abort
distinct from Register B's WIT gate (:func:`pyfars.kernel.four.witness_bit`),
judged against a cell's actual accumulated state rather than a single
witness's self-reported ``four_before`` — a caller can only fold the prior
witnesses it was given, but :class:`CellSettlement` remembers every write it
has ever guarded.

Built directly on PyMetroLogic's proven settling machinery, never a
from-scratch comparison: the knowledge order is judged over
``pymetrologic.closure.knowledge_lattice(boolean())`` — the same
``FiniteLattice`` :mod:`pymetrologic.settling_monotonicity_quiescence`'s own
sample witness uses — a proposed write's settled value is computed with
``pymetrologic.settling.merge``, and the gate itself is expressed with
``orbit_monotone``/``is_quiescent``/``settled_value``.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from pymetrologic.bilattice import BL, bilattice, boolean
from pymetrologic.closure import FiniteLattice, knowledge_lattice
from pymetrologic.settling import merge
from pymetrologic.settling_monotonicity_quiescence import (
    is_quiescent,
    orbit_monotone,
    settled_value,
)

from pyfars.kernel.four import NEITHER, Four

__all__ = [
    "KNOWLEDGE_LATTICE",
    "CellSettlement",
    "SettlingMonotonicityViolation",
    "guard_settling_monotone",
    "settled_write",
]

KNOWLEDGE_LATTICE: FiniteLattice[BL[int]] = knowledge_lattice(boolean())
_BL = bilattice(boolean())
_CELL_KEY = "_"


class SettlingMonotonicityViolation(ValueError):
    """A cell write moved backward in the knowledge order — refused before
    any append, by a dedicated check distinct from Register B's WIT gate."""


def _closure_toward(target: BL[int]) -> Callable[[BL[int]], BL[int]]:
    return lambda value: KNOWLEDGE_LATTICE.join(value, target)


def settled_write(before: Four, after: Four) -> Four:
    """The settled value a write of ``after`` reaches from ``before``: the
    knowledge-order join, computed with ``pymetrologic.settling.merge`` over
    the single fiber this gate judges."""
    merged = merge(_BL, {_CELL_KEY: before.to_bl()}, {_CELL_KEY: after.to_bl()})[_CELL_KEY]
    return Four(bool(merged.pro), bool(merged.con))


def guard_settling_monotone(before: Four, after: Four, *, cell: str = "") -> None:
    """Raise :class:`SettlingMonotonicityViolation` when ``after`` does not
    dominate ``before`` in the knowledge order — i.e. when the write would
    move ``cell`` backward. Judged with
    ``pymetrologic.settling_monotonicity_quiescence``'s own
    ``orbit_monotone``/``is_quiescent``/``settled_value`` over the closure
    that joins any value toward ``after``, never a bare ``<=`` comparison."""
    seed = before.to_bl()
    target = after.to_bl()
    closure = _closure_toward(target)
    if not orbit_monotone(KNOWLEDGE_LATTICE, closure, seed, steps=2):
        raise SettlingMonotonicityViolation(
            f"settling-monotonicity violation on cell {cell!r}: the orbit "
            f"from {before!r} toward {after!r} is not knowledge-monotone"
        )
    settled = settled_value(KNOWLEDGE_LATTICE, closure, seed)
    if not (
        is_quiescent(KNOWLEDGE_LATTICE, closure, settled)
        and KNOWLEDGE_LATTICE.eq(settled, target)
    ):
        raise SettlingMonotonicityViolation(
            f"settling-monotonicity violation on cell {cell!r}: write from "
            f"{before!r} to {after!r} moves backward in the knowledge order"
        )


@dataclass
class CellSettlement:
    """Per-cell committed knowledge state, tracked independently of any
    single witness's self-reported ``four_before`` — the actual accumulated
    state the dedicated gate judges a proposed write against. Every
    successful :meth:`write` only ever advances (or holds) a cell's
    knowledge order; a write that would not is refused before it is
    recorded here, and before the caller's own append."""

    _state: dict[str, Four] = field(default_factory=dict)

    def value_of(self, cell: str) -> Four:
        return self._state.get(cell, NEITHER)

    def write(self, cell: str, after: Four) -> Four:
        before = self.value_of(cell)
        guard_settling_monotone(before, after, cell=cell)
        self._state[cell] = after
        return after
