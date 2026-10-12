"""Pairwise Stone/Priestley dual of Belnap FOUR.

Executable shadow of ``RelMath.Cohomology.PairwiseStoneClopen``.  FOUR's
finite dual is the two-point antichain ``{plus, minus}``; its clopen up-sets
are just the four Boolean pairs, and the point-swap sigma transports across
the duality as bilattice negation.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from pymetrologic.bilattice import BL, four
from pymetrologic.klein import K4
from pymetrologic.klein import act as k4_act
from pymetrologic.klein import mul as k4_mul

__all__ = [
    "CLOPEN_BOT",
    "CLOPEN_MINUS",
    "CLOPEN_PLUS",
    "CLOPEN_TOP",
    "CLOPEN_UPS",
    "FOUR_DUAL_POINTS",
    "ClopenUp",
    "FourDualPoint",
    "FourPriestleyDualWitness",
    "PairwiseStoneTopologyWitness",
    "SwapNegationWitness",
    "four_dual_le",
    "four_dual_sigma",
    "four_priestley_dual",
    "of_charge",
    "order_recovered_from_tau_plus",
    "pairwise_stone_topology",
    "sigma_act",
    "swap_induces_negate",
    "swap_is_gauge_neg",
    "swap_is_z2_negation",
    "tau_minus",
    "tau_plus",
    "to_charge",
]


class FourDualPoint(Enum):
    """The two points of the finite Priestley dual of FOUR."""

    PLUS = "plus"
    MINUS = "minus"


FOUR_DUAL_POINTS: tuple[FourDualPoint, ...] = (
    FourDualPoint.PLUS,
    FourDualPoint.MINUS,
)


@dataclass(frozen=True, slots=True)
class ClopenUp:
    """A clopen up-set of the two-point antichain, stored as membership bits."""

    plus: bool
    minus: bool

    def mem(self, point: FourDualPoint) -> bool:
        """Membership of a dual point in this clopen."""
        if point is FourDualPoint.PLUS:
            return self.plus
        return self.minus

    def meet(self, other: ClopenUp) -> ClopenUp:
        """Intersection of clopen up-sets."""
        return ClopenUp(self.plus and other.plus, self.minus and other.minus)

    def join(self, other: ClopenUp) -> ClopenUp:
        """Union of clopen up-sets."""
        return ClopenUp(self.plus or other.plus, self.minus or other.minus)

    def sigma_act(self) -> ClopenUp:
        """Action induced by swapping the dual points."""
        return ClopenUp(self.minus, self.plus)


CLOPEN_BOT = ClopenUp(False, False)
CLOPEN_PLUS = ClopenUp(True, False)
CLOPEN_MINUS = ClopenUp(False, True)
CLOPEN_TOP = ClopenUp(True, True)

CLOPEN_UPS: tuple[ClopenUp, ...] = (
    CLOPEN_BOT,
    CLOPEN_PLUS,
    CLOPEN_MINUS,
    CLOPEN_TOP,
)


@dataclass(frozen=True, slots=True)
class FourPriestleyDualWitness:
    """Finite witness that clopen up-sets of the dual are exactly FOUR charges."""

    table: tuple[tuple[ClopenUp, BL[int]], ...]
    left_inverse: bool
    right_inverse: bool
    lattice_laws: bool

    @property
    def holds(self) -> bool:
        """The table, inverse, and lattice checks all hold."""
        return self.left_inverse and self.right_inverse and self.lattice_laws


@dataclass(frozen=True, slots=True)
class SwapNegationWitness:
    """Witness that the spatial swap is the Z/2 negation gauge on FOUR."""

    point_involutive: bool
    clopen_involutive: bool
    swap_induces_negate: bool
    swap_is_gauge_neg: bool
    k4_neg_square: bool

    @property
    def holds(self) -> bool:
        """All swap-negation checks hold."""
        return (
            self.point_involutive
            and self.clopen_involutive
            and self.swap_induces_negate
            and self.swap_is_gauge_neg
            and self.k4_neg_square
        )


@dataclass(frozen=True, slots=True)
class PairwiseStoneTopologyWitness:
    """The two pairwise-Stone topologies and their recovered Priestley order."""

    tau_plus: tuple[ClopenUp, ...]
    tau_minus: tuple[ClopenUp, ...]
    tau_minus_is_sigma_image: bool
    discrete_pair: bool
    order_recovered: bool

    @property
    def holds(self) -> bool:
        """The finite pairwise-Stone topology recovers the dual antichain."""
        return self.tau_minus_is_sigma_image and self.discrete_pair and self.order_recovered


def four_dual_le(left: FourDualPoint, right: FourDualPoint) -> bool:
    """The Priestley order on the dual: the two points form an antichain."""
    return left is right


def four_dual_sigma(point: FourDualPoint) -> FourDualPoint:
    """The nontrivial swap of the two dual points."""
    if point is FourDualPoint.PLUS:
        return FourDualPoint.MINUS
    return FourDualPoint.PLUS


def sigma_act(clopen: ClopenUp) -> ClopenUp:
    """The induced action on clopen up-sets."""
    return clopen.sigma_act()


def to_charge(clopen: ClopenUp) -> BL[int]:
    """Map a clopen up-set ``(plus?, minus?)`` to its FOUR charge."""
    bl = four()
    if clopen == CLOPEN_BOT:
        return bl.none
    if clopen == CLOPEN_PLUS:
        return bl.true
    if clopen == CLOPEN_MINUS:
        return bl.false
    if clopen == CLOPEN_TOP:
        return bl.conflict
    msg = "unknown clopen up-set"
    raise ValueError(msg)


def of_charge(charge: BL[int]) -> ClopenUp:
    """Map a FOUR charge back to the corresponding clopen up-set."""
    bl = four()
    if charge == bl.none:
        return CLOPEN_BOT
    if charge == bl.true:
        return CLOPEN_PLUS
    if charge == bl.false:
        return CLOPEN_MINUS
    if charge == bl.conflict:
        return CLOPEN_TOP
    msg = "charge is not one of Belnap FOUR's corners"
    raise ValueError(msg)


def _lattice_laws() -> bool:
    return all(
        a.meet(b) == b.meet(a)
        and a.join(b) == b.join(a)
        and a.meet(a) == a
        and a.join(a) == a
        and a.meet(CLOPEN_TOP) == a
        and a.join(CLOPEN_BOT) == a
        and a.meet(a.join(b)) == a
        and a.join(a.meet(b)) == a
        for a in CLOPEN_UPS
        for b in CLOPEN_UPS
    )


def four_priestley_dual() -> FourPriestleyDualWitness:
    """The finite bijection between clopen up-sets and FOUR charges."""
    bl = four()
    charges = (bl.none, bl.true, bl.false, bl.conflict)
    table = tuple((clopen, to_charge(clopen)) for clopen in CLOPEN_UPS)
    return FourPriestleyDualWitness(
        table=table,
        left_inverse=all(of_charge(to_charge(clopen)) == clopen for clopen in CLOPEN_UPS),
        right_inverse=all(to_charge(of_charge(charge)) == charge for charge in charges),
        lattice_laws=_lattice_laws(),
    )


def swap_induces_negate(clopen: ClopenUp) -> bool:
    """Transporting sigma across the duality gives bilattice negation."""
    bl = four()
    return to_charge(sigma_act(clopen)) == bl.neg(to_charge(clopen))


def swap_is_gauge_neg(clopen: ClopenUp) -> bool:
    """The same transported action is the Klein-four NEG gauge element."""
    bl = four()
    return to_charge(sigma_act(clopen)) == k4_act(K4.NEG, bl, to_charge(clopen))


def swap_is_z2_negation() -> SwapNegationWitness:
    """The point swap is involutive and induces the Z/2 negation on FOUR."""
    return SwapNegationWitness(
        point_involutive=all(
            four_dual_sigma(four_dual_sigma(point)) is point for point in FOUR_DUAL_POINTS
        ),
        clopen_involutive=all(sigma_act(sigma_act(clopen)) == clopen for clopen in CLOPEN_UPS),
        swap_induces_negate=all(swap_induces_negate(clopen) for clopen in CLOPEN_UPS),
        swap_is_gauge_neg=all(swap_is_gauge_neg(clopen) for clopen in CLOPEN_UPS),
        k4_neg_square=k4_mul(K4.NEG, K4.NEG) is K4.ID,
    )


def tau_plus() -> tuple[ClopenUp, ...]:
    """The positive topology: all clopen up-sets of the antichain."""
    return CLOPEN_UPS


def tau_minus() -> tuple[ClopenUp, ...]:
    """The negative topology: sigma-images of the positive topology."""
    return tuple(sigma_act(clopen) for clopen in tau_plus())


def order_recovered_from_tau_plus(left: FourDualPoint, right: FourDualPoint) -> bool:
    """Check the finite Priestley order-recovery criterion."""
    recovered = all((not clopen.mem(left)) or clopen.mem(right) for clopen in tau_plus())
    return four_dual_le(left, right) == recovered


def pairwise_stone_topology() -> PairwiseStoneTopologyWitness:
    """The pairwise-Stone topology pair and its order recovery witness."""
    positive = tau_plus()
    negative = tau_minus()
    return PairwiseStoneTopologyWitness(
        tau_plus=positive,
        tau_minus=negative,
        tau_minus_is_sigma_image=negative == tuple(sigma_act(clopen) for clopen in positive),
        discrete_pair=set(positive) == set(CLOPEN_UPS) and set(negative) == set(CLOPEN_UPS),
        order_recovered=all(
            order_recovered_from_tau_plus(left, right)
            for left in FOUR_DUAL_POINTS
            for right in FOUR_DUAL_POINTS
        ),
    )
