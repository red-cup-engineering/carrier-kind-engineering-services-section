"""
RelationalOrder — Foundation.lean, Reach.lean, Zone.lean, Level2.lean

Strings are opaque datums. The code only ever asks:
  a.key == b.key    (EventCommutation)
  a.value == b.key  (DependsOn)

The geometry is the orbit graph. Growing it is reapplying those two
questions to the results of the previous ring, until nothing changes.
"""

from __future__ import annotations
from dataclasses import dataclass


@dataclass(frozen=True)
class Event:
    key:   str   # opaque datum
    value: str   # opaque datum

    def __repr__(self):
        return f"[{self.key}]={self.value!r}"


class RelationalOrder:

    def __init__(self, events: frozenset[Event]):
        self.events = events
        self._by_key: dict[str, frozenset[Event]] = {}
        for e in events:
            s = self._by_key.get(e.key, frozenset())
            self._by_key[e.key] = s | {e}

    # The two questions. Nothing else reads string content.

    def EventCommutation(self, a: Event, b: Event) -> bool:
        return a.key == b.key

    def DependsOn(self, a: Event, b: Event) -> bool:
        return a.value == b.key

    # Direct orbits — ring 0

    def ascending_orbit(self, e: Event) -> frozenset[Event]:
        """{ f : EventCommutation(e, f), f ≠ e }"""
        return self._by_key.get(e.key, frozenset()) - {e}

    def descending_orbit(self, e: Event) -> frozenset[Event]:
        """{ f : DependsOn(e, f) }"""
        return self._by_key.get(e.value, frozenset())

    def build_geometry(self) -> Geometry:
        return Geometry._from(self)


class Geometry:
    """
    The orbit graph, grown to fixed point.

    ascending[e]  — frozenset[Event]  events commuting with e   (fixed at ring 0)
    descending[e] — frozenset[Event]  events reachable from e
                                      through DependsOn chains  (grows per ring)

    rings — list of frozenset[Event]: events whose descending reach
            changed at that ring index.

    That is the geometry. Anything else is a measurement taken from it.
    """

    @classmethod
    def _from(cls, ro: RelationalOrder) -> Geometry:
        geo = cls()
        geo.ro = ro

        # Ascending orbit: EventCommutation is already closed within key-groups.
        # Applying the question again produces the same set. Fixed at ring 0.
        geo.ascending: dict[Event, frozenset[Event]] = {
            e: ro.ascending_orbit(e) for e in ro.events
        }

        # Descending reach: start from direct DependsOn, grow by reapplying
        # DependsOn to the current reach, one ring at a time.
        desc: dict[Event, frozenset[Event]] = {
            e: ro.descending_orbit(e) for e in ro.events
        }

        rings: list[frozenset[Event]] = []

        while True:
            changed: set[Event] = set()
            new_desc: dict[Event, frozenset[Event]] = {}

            for e in ro.events:
                reach: set[Event] = set(desc[e])
                for f in desc[e]:
                    # Reapply DependsOn: everything f reaches, e now reaches
                    for g in desc[f]:
                        if g not in reach:
                            reach.add(g)
                            changed.add(e)
                new_desc[e] = frozenset(reach)

            rings.append(frozenset(changed))

            if not changed:
                break

            desc = new_desc

        geo.descending = desc
        geo.rings = rings   # ring[i] = events whose reach grew at ring i
        return geo

    # Measurements — read from the geometry, not stored in it

    def commutation_peers(self, e: Event) -> frozenset[Event]:
        return self.ascending[e]

    def dependency_reach(self, e: Event) -> frozenset[Event]:
        return self.descending[e]

    def spo(self, file_events: list[tuple[str, Event]]) -> list[dict]:
        """
        All SPO triples. The geometry for each triple is its orbit sets.
        """
        return [
            {
                'subject':            file,
                'predicate':          e.key,
                'object':             e.value,
                'commutation_peers':  [f.key + '\x00' + f.value
                                       for f in self.ascending[e]],
                'dependency_reach':   [f.key + '\x00' + f.value
                                       for f in self.descending[e]],
            }
            for file, e in file_events
        ]

    def grafts(self, file_events: list[tuple[str, Event]]) -> dict[str, list[str]]:
        """Files sharing the same (predicate, object) tile."""
        from collections import defaultdict
        tile: dict[tuple[str, str], list[str]] = defaultdict(list)
        for file, e in file_events:
            tile[(e.key, e.value)].append(file)
        return {
            k + '\x00' + v: sorted(set(fs))
            for (k, v), fs in tile.items()
            if len(set(fs)) > 1
        }
