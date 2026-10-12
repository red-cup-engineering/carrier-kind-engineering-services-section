"""Nuclear autopoiesis cells over the FOUR knowledge lattice.

Executable shadow of ``RelMath.Aperiodic.Autopoiesis``.  The Lean module reads
an aperiodic settling through two commuting history-filtration nuclei:

* ``sigma``: the backward-facing saturating closure;
* ``delta``: the forward-facing transferring closure.

This Python tile keeps the finite worked model used throughout the lab: both
nuclei are join-nuclei on Belnap FOUR under the knowledge order.  Their joint
fixed layer ``A* = Fix(sigma after delta)`` is the autopoietic core, and a
family that varies across histories is tied to the existing nonzero aperiodic
``cl_inv`` witness.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from pymetrologic import BL, Corner, commutating_pair, four, is_nucleus, knowledge_lattice
from pymetrologic.quartet import CommutingPair, nuclear_quartet

from .classification import AperiodicSettling, H1Class, aperiodic_witness, flat_clinv_zero
from .regimes import ClosureRegime

__all__ = [
    "AutopoiesisCellWitness",
    "HistoryFiltrationWitness",
    "HistoryNuclearPair",
    "HistorySeparatingWitness",
    "autopoietic_core",
    "autopoietic_core_iff",
    "charge_nuclear_pair",
    "default_autopoiesis_pair",
    "history_filtration_distinct_from_value_order",
    "history_separating",
    "history_separation_aperiodicity",
    "nuclear_autopoiesis_cell",
    "varying_family",
]

FOUR = four()
LAT = knowledge_lattice(FOUR.L)
CHARGES: tuple[BL[int], ...] = LAT.elements


@dataclass(frozen=True, slots=True)
class HistoryNuclearPair:
    """Two commuting history-filtration join-nuclei on FOUR."""

    saturating_target: BL[int]
    transferring_target: BL[int]

    def saturating(self, charge: BL[int]) -> BL[int]:
        """The backward-facing ``sigma`` closure."""
        return LAT.join(charge, self.saturating_target)

    def transferring(self, charge: BL[int]) -> BL[int]:
        """The forward-facing ``delta`` closure."""
        return LAT.join(charge, self.transferring_target)

    def pi(self, charge: BL[int]) -> BL[int]:
        """The joint closure ``pi = sigma after delta``."""
        return self.saturating(self.transferring(charge))

    def commuting_pair(self) -> CommutingPair[BL[int]]:
        """Return the shared four-corner commuting-pair carrier."""
        return commutating_pair(self.saturating, self.transferring)

    def action_table(self) -> tuple[tuple[BL[int], BL[int], BL[int]], ...]:
        """The finite table distinguishing history fibers by their two nuclei."""
        return tuple(
            (charge, self.saturating(charge), self.transferring(charge)) for charge in CHARGES
        )


@dataclass(frozen=True, slots=True)
class AutopoiesisCellWitness:
    """The executable autopoiesis-cell theorem bundle."""

    nuclei: bool
    commutating: bool
    self_production: bool
    four_corners: bool
    joint_is_intersection: bool
    core_is_nonempty: bool

    @property
    def holds(self) -> bool:
        """All autopoiesis-cell checks hold."""
        return (
            self.nuclei
            and self.commutating
            and self.self_production
            and self.four_corners
            and self.joint_is_intersection
            and self.core_is_nonempty
        )


@dataclass(frozen=True, slots=True)
class HistorySeparatingWitness:
    """The history-separation-to-aperiodicity theorem bundle."""

    varying_family_exists: bool
    separated_regime_aperiodic: bool
    separated_clinv_nonzero: bool
    flat_baseline_vanishes: bool
    constant_family_invisible: bool
    varying_family_visible: bool

    @property
    def holds(self) -> bool:
        """All history-separation checks hold."""
        return (
            self.varying_family_exists
            and self.separated_regime_aperiodic
            and self.separated_clinv_nonzero
            and self.flat_baseline_vanishes
            and self.constant_family_invisible
            and self.varying_family_visible
        )


@dataclass(frozen=True, slots=True)
class HistoryFiltrationWitness:
    """History filtration and value-order quartets share form but not data."""

    history_quartet_law: bool
    value_order_quartet_law: bool
    presentations_distinct: bool

    @property
    def holds(self) -> bool:
        """Both quartet laws hold and the presentations are different."""
        return (
            self.history_quartet_law
            and self.value_order_quartet_law
            and self.presentations_distinct
        )


def charge_nuclear_pair(c1: BL[int], c2: BL[int]) -> HistoryNuclearPair:
    """The Lean ``chargeNuclearPair`` finite model: join toward ``c1`` and ``c2``."""
    return HistoryNuclearPair(saturating_target=c1, transferring_target=c2)


def default_autopoiesis_pair() -> HistoryNuclearPair:
    """The worked autopoiesis pair: close toward truth and falsity."""
    return charge_nuclear_pair(FOUR.true, FOUR.false)


def autopoietic_core(pair: HistoryNuclearPair, charge: BL[int]) -> bool:
    """Whether ``charge`` lies in ``A* = Fix(pi)``."""
    return LAT.eq(pair.pi(charge), charge)


def autopoietic_core_iff(pair: HistoryNuclearPair, charge: BL[int]) -> bool:
    """Check ``Fix(pi) iff Fix(sigma) and Fix(delta)`` at one charge."""
    fixed_by_both = LAT.eq(pair.saturating(charge), charge) and LAT.eq(
        pair.transferring(charge), charge
    )
    return autopoietic_core(pair, charge) == fixed_by_both


def nuclear_autopoiesis_cell(pair: HistoryNuclearPair | None = None) -> AutopoiesisCellWitness:
    """Bundle the finite ``nuclear_autopoiesis_cell`` checks."""
    actual = default_autopoiesis_pair() if pair is None else pair
    commuting = actual.commuting_pair()
    quartet = nuclear_quartet(commuting, CHARGES, LAT.eq)
    core = tuple(charge for charge in CHARGES if autopoietic_core(actual, charge))
    return AutopoiesisCellWitness(
        nuclei=is_nucleus(LAT, actual.saturating) and is_nucleus(LAT, actual.transferring),
        commutating=commuting.commutes(CHARGES, LAT.eq),
        self_production=all(autopoietic_core_iff(actual, charge) for charge in CHARGES),
        four_corners=set(quartet) == set(Corner) and len(quartet) == 4,
        joint_is_intersection=all(
            LAT.eq(commuting.corner_op(Corner.STABLE, charge), charge)
            == (
                LAT.eq(commuting.corner_op(Corner.POTENTIAL, charge), charge)
                and LAT.eq(commuting.corner_op(Corner.ACTIVE, charge), charge)
            )
            for charge in CHARGES
        ),
        core_is_nonempty=bool(core),
    )


def varying_family() -> tuple[HistoryNuclearPair, ...]:
    """A two-history family whose saturating nucleus genuinely varies."""
    return (
        charge_nuclear_pair(FOUR.true, FOUR.false),
        charge_nuclear_pair(FOUR.conflict, FOUR.false),
    )


def history_separating(family: Sequence[HistoryNuclearPair]) -> bool:
    """Whether a family of nuclear squares is non-constant over histories."""
    tables = {pair.action_table() for pair in family}
    return len(tables) > 1 and all(nuclear_autopoiesis_cell(pair).holds for pair in family)


def history_separation_aperiodicity(
    family: Sequence[HistoryNuclearPair] | None = None,
) -> HistorySeparatingWitness:
    """Bundle the Lean ``history_separation_aperiodicity`` finite witness."""
    actual = varying_family() if family is None else tuple(family)
    separated = aperiodic_witness().base
    flat_strict = AperiodicSettling(ClosureRegime.strict, H1Class(0))
    flat_scott = AperiodicSettling(ClosureRegime.scott, H1Class(0))
    constant_family = (default_autopoiesis_pair(), default_autopoiesis_pair())
    return HistorySeparatingWitness(
        varying_family_exists=history_separating(actual),
        separated_regime_aperiodic=separated.regime is ClosureRegime.aperiodic,
        separated_clinv_nonzero=not separated.cl_inv.is_zero,
        flat_baseline_vanishes=flat_clinv_zero(flat_strict) and flat_clinv_zero(flat_scott),
        constant_family_invisible=not history_separating(constant_family),
        varying_family_visible=history_separating(actual) and not separated.cl_inv.is_zero,
    )


def _quartet_law(pair: HistoryNuclearPair) -> bool:
    return all(autopoietic_core_iff(pair, charge) for charge in CHARGES)


def _value_order_pair() -> HistoryNuclearPair:
    return charge_nuclear_pair(FOUR.true, FOUR.conflict)


def _same_actions(left: Callable[[BL[int]], BL[int]], right: Callable[[BL[int]], BL[int]]) -> bool:
    return all(LAT.eq(left(charge), right(charge)) for charge in CHARGES)


def history_filtration_distinct_from_value_order(
    history_pair: HistoryNuclearPair | None = None,
) -> HistoryFiltrationWitness:
    """Both quartet presentations satisfy ``Fix(pi)=Fix(j1) cap Fix(j2)`` but differ."""
    history = default_autopoiesis_pair() if history_pair is None else history_pair
    value_order = _value_order_pair()
    return HistoryFiltrationWitness(
        history_quartet_law=_quartet_law(history),
        value_order_quartet_law=_quartet_law(value_order),
        presentations_distinct=not (
            _same_actions(history.saturating, value_order.saturating)
            and _same_actions(history.transferring, value_order.transferring)
        ),
    )
