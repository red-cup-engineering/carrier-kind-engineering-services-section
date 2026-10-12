"""The four-corner coherence cell — the corpus keystone (QuartetRecurrence).

Transcribed from ``RelMath.Articulating.FourCornerCell`` and
``RelMath.Positing.QuartetRecurrence`` (lean/). The corpus' deepest claim: the four
base verbs are **one** four-corner cell met at successive depths. The same object
is read as

* articulation **phases** ``{absurd, potential, active, stable}`` (:class:`Corner`),
* bilattice **charges** ``{⊥, t, f, ⊤}`` (``BL`` over Boolean = FOUR),
* status pairs ``(pro, con) ∈ Bool × Bool``,
* the **modal four** ``{neither, ◇, □, both}`` (:class:`Modal`).

All readings biject, and every round-trip is the identity (the *master
conflation* :func:`quartet_recurrence`). The recurring **coherence 2-cell** is a
:class:`CommutingPair` ``f ∘ g = g ∘ f``; on the bilattice it is *twistoring*:
``f = neg`` (∼), ``g = conflate`` (−), which commute on every bilattice.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from enum import Enum
from typing import Generic, TypeVar

from .bilattice import BL, Bilattice

C = TypeVar("C")

__all__ = [
    "CORNERS",
    "CommutingPair",
    "Corner",
    "Modal",
    "charge_of_corner",
    "commutating_pair",
    "corner_of_charge",
    "corner_of_modal",
    "corner_of_status",
    "modal_of_corner",
    "nuclear_quartet",
    "quartet_recurrence",
    "status_of_corner",
    "twistoring_pair",
]


class Corner(Enum):
    """The articulation phase / bilattice charge corner."""

    ABSURD = "absurd"  # ⊥: told none
    POTENTIAL = "potential"  # t: told true only
    ACTIVE = "active"  # f: told false only
    STABLE = "stable"  # ⊤: told both


class Modal(Enum):
    """The modal four: apply neither nucleus, ◇ (j₁), □ (j₂), or both (π)."""

    NEITHER = "neither"
    DIA = "dia"  # ◇
    BOX = "box"  # □
    BOTH = "both"


#: The four corners in canonical order ⊥, t, f, ⊤.
CORNERS: tuple[Corner, ...] = (Corner.ABSURD, Corner.POTENTIAL, Corner.ACTIVE, Corner.STABLE)

# The canonical (pro-present, con-present) status of each corner — the Bool×Bool
# reading. (F,F)=⊥, (T,F)=t, (F,T)=f, (T,T)=⊤.
_STATUS: dict[Corner, tuple[bool, bool]] = {
    Corner.ABSURD: (False, False),
    Corner.POTENTIAL: (True, False),
    Corner.ACTIVE: (False, True),
    Corner.STABLE: (True, True),
}
_OF_STATUS: dict[tuple[bool, bool], Corner] = {v: k for k, v in _STATUS.items()}
_TO_MODAL: dict[Corner, Modal] = dict(zip(CORNERS, list(Modal), strict=True))
_OF_MODAL: dict[Modal, Corner] = {m: c for c, m in _TO_MODAL.items()}


def corner_of_status(pro: bool, con: bool) -> Corner:
    """``FourCorner.toCorner``: the status pair ``(pro, con)`` as a corner."""
    return _OF_STATUS[(pro, con)]


def status_of_corner(c: Corner) -> tuple[bool, bool]:
    """``FourCorner.ofCorner``: a corner's ``(pro-present, con-present)`` status."""
    return _STATUS[c]


def modal_of_corner(c: Corner) -> Modal:
    """``Modal.ofCorner``: the corner re-read under modal names."""
    return _TO_MODAL[c]


def corner_of_modal(m: Modal) -> Corner:
    """``Modal.toCorner``: a modal corner as an articulation/charge corner."""
    return _OF_MODAL[m]


def charge_of_corner(bl: Bilattice[int], c: Corner) -> BL[int]:
    """The corner as a FOUR bilattice charge: ⊥/t/f/⊤."""
    pro, con = _STATUS[c]
    top, bot = bl.L.top, bl.L.bot
    return BL(top if pro else bot, top if con else bot)


def corner_of_charge(bl: Bilattice[int], v: BL[int]) -> Corner:
    """A FOUR charge read back as a corner (``pro``/``con`` presence = at the top)."""
    return corner_of_status(v.pro == bl.L.top, v.con == bl.L.top)


def quartet_recurrence() -> bool:
    """The master conflation: every four-corner reading round-trips to the identity.

    ``Corner → status → Corner``, ``Corner → Modal → Corner``,
    ``Modal → Corner → Modal``, and ``Corner → charge → Corner`` are all the
    identity, and there are exactly four corners (``card_four``).
    """
    from .bilattice import four

    bl = four()
    if len(CORNERS) != 4:
        return False
    for c in CORNERS:
        if corner_of_status(*status_of_corner(c)) != c:
            return False
        if corner_of_modal(modal_of_corner(c)) != c:
            return False
        if corner_of_charge(bl, charge_of_corner(bl, c)) != c:
            return False
    return all(modal_of_corner(corner_of_modal(m)) == m for m in Modal)


@dataclass(frozen=True)
class CommutingPair(Generic[C]):
    """Two endomaps that commute — the bare data of the recurring coherence 2-cell.

    The involution/idempotency laws of a specific depth are deliberately absent;
    only ``f ∘ g = g ∘ f`` is shared (the ``square``).
    """

    f: Callable[[C], C]
    g: Callable[[C], C]

    def corner_op(self, corner: Corner, a: C) -> C:
        """The corner-indexed action: ⊥↦id, t↦f, f↦g, ⊤↦f∘g."""
        if corner is Corner.ABSURD:
            return a
        if corner is Corner.POTENTIAL:
            return self.f(a)
        if corner is Corner.ACTIVE:
            return self.g(a)
        return self.f(self.g(a))

    def square(self, a: C) -> tuple[C, C]:
        """The 2-cell's two paths from the free corner: ``(f(g a), g(f a))`` — equal."""
        return self.f(self.g(a)), self.g(self.f(a))

    def commutes(self, samples: Sequence[C], eq: Callable[[C, C], bool]) -> bool:
        """``f ∘ g = g ∘ f`` on the given samples."""
        return all(eq(*self.square(a)) for a in samples)


def twistoring_pair(bl: Bilattice[C]) -> CommutingPair[BL[C]]:
    """Twistoring: the commuting pair ``f = neg`` (∼), ``g = conflate`` (−) on ``L^⋈``.

    They commute on every bilattice — ``neg(conflate x) = conflate(neg x)`` — the
    K₄ coherence at the articulating birth-corner.
    """
    return CommutingPair(f=bl.neg, g=bl.conflate)


def nuclear_quartet(
    pair: CommutingPair[C],
    elements: Sequence[C],
    eq: Callable[[C, C], bool],
) -> dict[Corner, tuple[C, ...]]:
    """The four sub-algebras ``(A, Fix j₁, Fix j₂, A*)`` indexed by corner.

    For each corner, the fixed points of its corner operator: ``absurd ↦`` the
    free ``A`` (``Fix id``), ``potential ↦ Fix j₁``, ``active ↦ Fix j₂``, ``stable ↦
    A* = Fix(j₁∘j₂)``. With commuting nuclei this is the nuclear-quartet
    four-corner cell on settled fiber-algebras (the ``BigradedDiamond`` node).
    """
    return {
        corner: tuple(x for x in elements if eq(pair.corner_op(corner, x), x)) for corner in CORNERS
    }


def commutating_pair(j1: Callable[[C], C], j2: Callable[[C], C]) -> CommutingPair[C]:
    """Commutating: the commuting pair of two **commuting nuclei** ``f = j₁``, ``g = j₂``.

    The settled-fiber-algebra instance of the same coherence cell as
    :func:`twistoring_pair` (``twistoring_eq_commutating``): at this depth the pair
    are idempotent nuclei rather than involutions. The caller supplies nuclei that
    commute (``j₁ ∘ j₂ = j₂ ∘ j₁``).
    """
    return CommutingPair(f=j1, g=j2)
