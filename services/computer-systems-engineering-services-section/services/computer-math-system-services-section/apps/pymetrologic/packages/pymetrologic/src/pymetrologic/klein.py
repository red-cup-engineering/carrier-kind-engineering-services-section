"""The Klein four-group gauge ``K₄`` on the charge — why twistoring commutes.

Transcribed from ``RelMath.Positing.KleinFourGauge`` (lean/). The four bilattice
involutions ``{id, neg ∼, conflate −, negConf}`` form a Klein four-group ``V₄``
acting on ``L^⋈``: each is self-inverse, they commute (abelian), and ``act`` is a
group action ``act(g·h) = act g ∘ act h``. This abelian K₄ is exactly the
coherence behind :func:`pymetrologic.twistoring_pair`.

The order signature of each gauge element (proved in RelMath): ``id`` preserves
both orders; ``neg`` preserves ``≤_k`` and reverses ``≤_t``; ``conflate``
reverses ``≤_k`` and preserves ``≤_t``; ``negConf`` reverses both.
"""

from __future__ import annotations

from enum import Enum
from typing import TypeVar

from .bilattice import BL, Bilattice

T = TypeVar("T")

__all__ = ["K4", "K4_ELEMENTS", "act", "is_group", "mul"]


class K4(Enum):
    """The Klein four-group gauge: identity and the three twist involutions."""

    ID = "id"
    NEG = "neg"  # ∼ — slot swap
    CONF = "conf"  # − — complemented swap (conflation)
    NEGCONF = "negConf"  # π = ∼∘−


#: The gauge elements in canonical order.
K4_ELEMENTS: tuple[K4, ...] = (K4.ID, K4.NEG, K4.CONF, K4.NEGCONF)

# V₄ ≅ ℤ₂ × ℤ₂: each element is two bits, the group law is componentwise XOR.
_BITS: dict[K4, tuple[int, int]] = {
    K4.ID: (0, 0),
    K4.NEG: (1, 0),
    K4.CONF: (0, 1),
    K4.NEGCONF: (1, 1),
}
_OF_BITS: dict[tuple[int, int], K4] = {b: g for g, b in _BITS.items()}


def act(g: K4, bl: Bilattice[T], x: BL[T]) -> BL[T]:
    """Act by gauge element ``g``: ``id``/``neg``/``conflate``/``neg∘conflate``."""
    if g is K4.ID:
        return x
    if g is K4.NEG:
        return bl.neg(x)
    if g is K4.CONF:
        return bl.conflate(x)
    return bl.neg(bl.conflate(x))


def mul(g: K4, h: K4) -> K4:
    """The group law ``g · h`` (componentwise XOR; abelian, each element self-inverse)."""
    (a1, b1), (a2, b2) = _BITS[g], _BITS[h]
    return _OF_BITS[(a1 ^ a2, b1 ^ b2)]


def is_group(bl: Bilattice[T]) -> bool:
    """Witness that ``(K₄, ·)`` acts as a group on ``L^⋈``: action, involution, abelian.

    Checks ``act(g·h) = act g ∘ act h``, ``g·g = id``, and ``g·h = h·g`` on the
    bilattice's sample — the computational form of RelMath's ``isGroup`` + ``act_mul``.
    """
    samples = bl.sample(3)
    for g in K4_ELEMENTS:
        if mul(g, g) is not K4.ID:
            return False
        for h in K4_ELEMENTS:
            if mul(g, h) is not mul(h, g):
                return False
            if any(not bl.eq(act(mul(g, h), bl, x), act(g, bl, act(h, bl, x))) for x in samples):
                return False
    return True
