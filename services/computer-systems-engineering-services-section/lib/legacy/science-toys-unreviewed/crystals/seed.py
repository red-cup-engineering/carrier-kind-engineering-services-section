"""
Python mirror of Core/Foundation.lean.

One seed. The axioms are the methods. Keep using it.
Nonconfluence is the point: extending in different orders gives different histories.
The structure grows transfinitely without settling.
DefectCollapse, zones, all of it — same axioms, greater depth.
"""

from __future__ import annotations


class History:

    def __init__(self, _trace: tuple = ()):
        self._trace = _trace

    # ExtendIsExtension: Order(self, self.extend(event)) — always holds
    def extend(self, event) -> History:
        return History(self._trace + (event,))

    # OrderReflexive, OrderTransitive, EmptyIsMinimum, ExtendIsExtension, ExtendIsInjective
    def order(self, other: History) -> bool:
        n = len(self._trace)
        return other._trace[:n] == self._trace

    # EventCommutationSymmetric: e==f is symmetric
    # Events almost never commute — this is the structural tension
    @staticmethod
    def event_commutation(e, f) -> bool:
        return e == f

    # AxiomaticExtensionCommutation:
    # When event_commutation(e, f): both paths satisfy the same propositions
    # When NOT (almost always): the paths DIVERGE — nonconfluence
    # This is the four-corner structure unfolding
    def diamond(self, e, f) -> tuple[History, History, bool]:
        ef = self.extend(e).extend(f)
        fe = self.extend(f).extend(e)
        return ef, fe, self.event_commutation(e, f)

    def __eq__(self, other):
        return isinstance(other, History) and self._trace == other._trace

    def __hash__(self):
        return hash(self._trace)

    def __repr__(self):
        return 'Empty' if not self._trace else ' → '.join(repr(e) for e in self._trace)


Empty = History()


def crystal(*coords) -> History:
    h = Empty
    for event in coords:
        h = h.extend(event)
    return h
