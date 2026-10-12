"""``Four`` — the FOUR bilattice value FARS's WIT law is judged in.

Built on ``pymetrologic.bilattice.four()``/``Bilattice.leq_k``/``join_k`` —
the proven twist-product bilattice over the two-point base lattice — never a
from-scratch Belnap reimplementation. Mirrors
``relation-model-notation-runtime``'s ``four.mjs``: a WIT is exactly one
legal 0->1 cover transition in the knowledge order, never a decrement, a
two-bit jump, or a no-op.
"""

from __future__ import annotations

from dataclasses import dataclass

from pymetrologic.bilattice import BL
from pymetrologic.bilattice import four as bilattice_four

_L = bilattice_four()


class NotOneWitError(ValueError):
    """A claimed WIT was not exactly one 0->1 knowledge-cover transition."""


@dataclass(frozen=True, slots=True)
class Four:
    """A FOUR evidence pair: positive and negative evidence bits."""

    pos: bool
    neg: bool

    def __post_init__(self) -> None:
        if not isinstance(self.pos, bool) or not isinstance(self.neg, bool):
            raise TypeError("Four requires explicit boolean pos and neg bits")

    def to_bl(self) -> BL[int]:
        return BL(int(self.pos), int(self.neg))


def four(pos: bool, neg: bool) -> Four:
    return Four(pos, neg)


NEITHER = four(False, False)
TRUE = four(True, False)
FALSE = four(False, True)
BOTH = four(True, True)

FOUR = {"neither": NEITHER, "true": TRUE, "false": FALSE, "both": BOTH}


def join_knowledge(left: Four, right: Four) -> Four:
    """Knowledge-order join ``∨_k`` — pointwise OR of the evidence bits."""
    joined = _L.join_k(left.to_bl(), right.to_bl())
    return four(bool(joined.pro), bool(joined.con))


def is_knowledge_cover(before: Four, after: Four) -> bool:
    """Whether ``after`` is exactly one legal 0->1 bit above ``before`` in
    the knowledge order: rejects a decrement, a two-bit jump, and a no-op."""
    b, a = before.to_bl(), after.to_bl()
    if not _L.leq_k(b, a) or _L.eq(b, a):
        return False
    return (before.pos != after.pos) != (before.neg != after.neg)


def witness_bit(before: Four, after: Four) -> str:
    """Name the bit (``"pos"``/``"neg"``) a legal WIT set; raises
    :class:`NotOneWitError` on anything but exactly one 0->1 knowledge-cover
    transition."""
    if not is_knowledge_cover(before, after):
        raise NotOneWitError(
            "not-one-wit: a WIT must be exactly one 0->1 cover transition "
            "in the FOUR knowledge order"
        )
    return "neg" if before.pos == after.pos else "pos"


__all__ = [
    "BOTH",
    "FALSE",
    "FOUR",
    "NEITHER",
    "TRUE",
    "Four",
    "NotOneWitError",
    "four",
    "is_knowledge_cover",
    "join_knowledge",
    "witness_bit",
]
