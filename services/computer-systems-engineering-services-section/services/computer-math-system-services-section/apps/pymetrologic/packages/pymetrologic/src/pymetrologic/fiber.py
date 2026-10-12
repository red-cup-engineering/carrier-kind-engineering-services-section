"""The predication fiber functor ``F : C^op → DBiLat(L)``.

For each predicate ``p`` the fiber is the uniform algebra
``A_p = L^{⋈ E×E}`` — a section assigns a bilattice value to every ordered
entity pair ``(s, o)`` (subject, object). The corpus proves that the four
generator classes of the predicate category act on these fibers by *cellwise
reindexing*

    ``F(f)(v)(s, o) = v(g(s, o))``

for an index map ``g : E×E → E×E`` (partial for specialization). Because every
bilattice operation is pointwise on the index, any reindexing is automatically a
**bilattice homomorphism**, so ``F`` lands in ``DBiLat(L)``. This module
realizes the four generators as exactly those reindexings.

A fiber section is a ``dict[(s, o), BL]`` over the full ``E×E`` index.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import TypeVar

from .bilattice import BL, Bilattice

T = TypeVar("T")
Ent = str
Pair = tuple[Ent, Ent]
Section = dict[Pair, BL[T]]
Reindex = Callable[[Section[T]], Section[T]]

__all__ = [
    "constant_section",
    "converse",
    "full_index",
    "is_bilattice_homomorphism",
    "object_projection",
    "specialization",
    "subject_projection",
]


def full_index(entities: Sequence[Ent]) -> tuple[Pair, ...]:
    """Every ordered pair ``(s, o)`` over ``entities``."""
    return tuple((s, o) for s in entities for o in entities)


def constant_section(bl: Bilattice[T], entities: Sequence[Ent], value: BL[T]) -> Section[T]:
    """The fiber section that is ``value`` at every pair."""
    return dict.fromkeys(full_index(entities), value)


def specialization(
    bl: Bilattice[T],
    entities: Sequence[Ent],
    support: set[Pair],
) -> Reindex[T]:
    """``F`` of a specialization ``f : q → p``: restrict to ``support``.

    Pairs inside ``dom(q) = support`` keep their value; pairs outside collapse to
    ``⊥`` (nothing known there). This is restriction along the face inclusion.
    """
    index = full_index(entities)

    def f_star(v: Section[T]) -> Section[T]:
        return {(s, o): (v[(s, o)] if (s, o) in support else bl.none) for (s, o) in index}

    return f_star


def converse(bl: Bilattice[T], entities: Sequence[Ent]) -> Reindex[T]:
    """``F`` of a converse ``f : p^c → p``: the swap ``(s, o) ↦ (o, s)``."""
    index = full_index(entities)

    def f_star(v: Section[T]) -> Section[T]:
        return {(s, o): v[(o, s)] for (s, o) in index}

    return f_star


def subject_projection(bl: Bilattice[T], entities: Sequence[Ent]) -> Reindex[T]:
    """``F`` of a subject-projection: the diagonal collapse ``(s, o) ↦ (s, s)``."""
    index = full_index(entities)

    def f_star(v: Section[T]) -> Section[T]:
        return {(s, o): v[(s, s)] for (s, o) in index}

    return f_star


def object_projection(bl: Bilattice[T], entities: Sequence[Ent]) -> Reindex[T]:
    """``F`` of an object-projection: the diagonal collapse ``(s, o) ↦ (o, o)``."""
    index = full_index(entities)

    def f_star(v: Section[T]) -> Section[T]:
        return {(s, o): v[(o, o)] for (s, o) in index}

    return f_star


def is_bilattice_homomorphism(
    bl: Bilattice[T],
    f: Reindex[T],
    samples: Sequence[Section[T]],
) -> bool:
    """Check that ``f`` preserves the bilattice structure on the given samples.

    A genuine ``F(generator)`` preserves ``∨_k, ∧_k, ∨_t, ∧_t`` and ``∼``; this
    witnesses that the corpus' "cellwise reindexing ⇒ homomorphism" claim holds
    for the realized maps. Used by the property tests.
    """
    ops = (bl.join_k, bl.meet_k, bl.join_t, bl.meet_t)
    for x in samples:
        if _sections_differ(bl, f(_negate(bl, x)), _negate(bl, f(x))):
            return False
        for y in samples:
            for op in ops:
                lhs = f(_pointwise(op, x, y))
                rhs = _pointwise(op, f(x), f(y))
                if _sections_differ(bl, lhs, rhs):
                    return False
    return True


def _pointwise(op: Callable[[BL[T], BL[T]], BL[T]], x: Section[T], y: Section[T]) -> Section[T]:
    return {k: op(x[k], y[k]) for k in x}


def _negate(bl: Bilattice[T], x: Section[T]) -> Section[T]:
    return {k: bl.neg(v) for k, v in x.items()}


def _sections_differ(bl: Bilattice[T], a: Section[T], b: Section[T]) -> bool:
    if set(a) != set(b):
        return True
    return any(not bl.eq(a[k], b[k]) for k in a)
