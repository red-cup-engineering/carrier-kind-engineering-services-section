"""Generic containment with LPMud-style lifecycle callbacks.

Implements the FARS containment-and-composition analysis: containment
is *generic* — one ``contents`` list works for all containers (plans,
departments, ships, rooms). Don't build per-type containment APIs;
build deep primitives that compose.

Per the analysis, two consensus principles drive this module:

  1. **Generic containment.** A single ``contents`` list of entity
     slugs, manipulated through one pair of operations (``receive``,
     ``remove``). Same operation regardless of what the container
     or the contained thing is — moving a task between plans is
     ``remove`` from one and ``receive`` on the other.

  2. **LPMud-style lifecycle callbacks.** When an entity enters a
     container, ``on_receive`` fires (validate, check duplicates,
     update indexes); when it leaves, ``on_remove`` fires (clean
     references, archive). These are container *behaviors*, not
     hooks — they live on the container and fire deterministically.
     A callback that raises rolls back the operation's *own* effect
     on the contents list (the appended/removed slug) before the
     exception propagates; *other* mutations a callback may have
     performed against the container are the callback's own
     responsibility — see ``receive``/``remove`` docstrings for the
     exact (narrow) atomicity contract.

The deeper mereology (``part-of`` for synchronic containment,
``depends-on`` for diachronic succession) belongs in the corpus
predicate layer, not here. This module is the runtime data carrier.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Callable

ReceiveCallback = Callable[["Container", str], None]
"""``(container, slug) -> None``. Fires after the slug has been
appended to ``contents``. Raise to veto the receive — the slug is
removed before the exception propagates so the contents list stays
consistent (Mem0's "conflict resolution at creation time")."""

RemoveCallback = Callable[["Container", str], None]
"""``(container, slug) -> None``. Fires after the slug has been
removed. A raising remove-callback re-inserts the slug at its prior
index before propagating, mirroring the receive atomicity."""


@dataclass
class Container:
    """A generic FARS container.

    Fields:
      slug: the container's own entity slug (used in error messages
        and so a callback can identify which container fired it).
      contents: ordered list of contained entity slugs. Order matters
        for plans (``ordering:`` is implicit in ``contents`` order)
        and is preserved through all operations.
      on_receive: callbacks fired after a successful ``receive``.
      on_remove: callbacks fired after a successful ``remove``.
      allow_duplicates: when ``False`` (default), receiving an
        already-contained slug raises. The Mem0 ADD/UPDATE/DELETE
        decision lives in the receive-callback layer; the bare
        primitive just refuses silent duplication.

    The ``contents`` list is intentionally a plain list of slugs —
    the deeper graph (the contained entities themselves) lives on
    disk and is resolved by callers as needed. This keeps the
    primitive cheap and serializable.
    """
    slug: str
    contents: list[str] = field(default_factory=list)
    on_receive: list[ReceiveCallback] = field(default_factory=list)
    on_remove: list[RemoveCallback] = field(default_factory=list)
    allow_duplicates: bool = False

    # -- generic containment ---------------------------------------

    def receive(self, slug: str) -> None:
        """Add ``slug`` to ``contents`` and fire ``on_receive``.

        **Rollback contract** (best-effort, scoped to our own slug):
        if any receive-callback raises, this method removes one
        occurrence of ``slug`` at index ``>= appended_at`` before the
        exception propagates. The post-failure invariant is therefore
        narrow but reliable: *the slug we tried to receive is absent
        from ``contents`` after a failed receive*. Other mutations a
        callback performed (appends, inserts, removes of unrelated
        slugs, replacement of the received slug with a different
        value) are NOT undone — the callback owns those side effects.
        The LPMud ``init()`` callback shape expressed as a container
        behavior, with the limited atomicity above.
        """
        if not self.allow_duplicates and slug in self.contents:
            raise ValueError(
                f"container {self.slug!r} already contains {slug!r}"
            )
        appended_at = len(self.contents)
        self.contents.append(slug)
        try:
            # Snapshot the callback list: a callback that mutates
            # ``on_receive`` mid-iteration must not change which
            # callbacks fire for *this* receive (and must not corrupt
            # the rollback path on a downstream raise).
            for cb in tuple(self.on_receive):
                cb(self, slug)
        except BaseException:
            # Atomic: remove one occurrence of *our* slug. A callback
            # may have inserted before the appended index (shifting
            # ours right) or after it; either way we walk from the
            # recorded position forward and remove the first match.
            # The contract is "the slug we tried to receive is not
            # in contents after a failed receive" — callbacks own
            # the responsibility of cleaning up *their own* mutations.
            for i in range(appended_at, len(self.contents)):
                if self.contents[i] == slug:
                    self.contents.pop(i)
                    break
            raise

    def remove(self, slug: str) -> None:
        """Remove ``slug`` from ``contents`` and fire ``on_remove``.

        **Rollback contract** (best-effort, scoped to our own slug):
        if any remove-callback raises, this method re-inserts ``slug``
        at the recorded prior index (clamped to current length) before
        the exception propagates. The post-failure invariant is
        therefore narrow but reliable: *the slug we tried to remove
        is present in ``contents`` after a failed remove*. Other
        mutations a callback performed are NOT undone — the callback
        owns those side effects. The LPMud ``destruct()`` callback
        expressed as a container behavior, with the limited atomicity
        above.
        """
        if slug not in self.contents:
            raise KeyError(
                f"container {self.slug!r} does not contain {slug!r}"
            )
        index = self.contents.index(slug)
        self.contents.pop(index)
        try:
            for cb in tuple(self.on_remove):
                cb(self, slug)
        except BaseException:
            # Restore at the recorded index, clamped to current
            # length so a callback that also shrank ``contents``
            # cannot make insert() raise during rollback.
            self.contents.insert(min(index, len(self.contents)), slug)
            raise

    def __contains__(self, slug: object) -> bool:
        """Generic membership test — ``slug in container`` is the
        same operation regardless of container type (the analysis'
        "build deep primitives that compose" principle)."""
        return slug in self.contents

    def __len__(self) -> int:
        return len(self.contents)

    def __iter__(self):
        return iter(self.contents)


def move(slug: str, *, source: Container, destination: Container) -> None:
    """Move ``slug`` from ``source`` to ``destination`` atomically.

    The analysis' canonical example — "moving a task between plans:
    remove from one ``contents``, add to another. Same operation
    regardless of what the container or the contained thing is." If
    the destination's ``receive`` raises, the slug is restored to the
    source so the move is an all-or-nothing operation across both
    containers.
    """
    source.remove(slug)
    try:
        destination.receive(slug)
    except BaseException:
        # Restore source state so the move is observably atomic
        # across both containers; we know remove() succeeded above.
        source.receive(slug)
        raise


def compose_extends(parent_attrs: Iterable[str],
                    child_attrs: Iterable[str]) -> frozenset[str]:
    """Additive inheritance over attribute slugs.

    Per the analysis (TAB's "additive-attributes accumulate down the
    base chain"; LPMud's guild + character composition): an entity
    that ``extends`` another gets the parent's attributes PLUS its
    own — never less. This helper centralizes the union so callers
    don't accidentally implement override semantics by hand.
    """
    return frozenset(parent_attrs) | frozenset(child_attrs)
