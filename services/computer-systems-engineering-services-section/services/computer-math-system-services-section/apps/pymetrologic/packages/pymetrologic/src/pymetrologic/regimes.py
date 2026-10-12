"""Executable shadow of the Lean Salem/Pisot closure-regime split."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from pymetrologic.quartet import CORNERS, Corner


class ClosureRegime(StrEnum):
    strict = "strict"
    scott = "scott"
    transfinite_bounded = "transfiniteBounded"
    aperiodic = "aperiodic"


@dataclass(frozen=True)
class CurvatureRegimeWitness:
    """The bundled legs of ``Flow.ClosureFlowCurvatureRegime`` for one regime."""

    regime: ClosureRegime
    flat_iff_not_curved: bool
    vanishes_iff_flat: bool
    nonvanishes_iff_curved: bool
    no_curved_omega_terminating: bool
    rank_zero_iff_flat: bool
    curvature_rank: int | None


@dataclass(frozen=True)
class ClosureRegimeData:
    """Decidable data classifying a closure ordinal regime."""

    scott_continuous: bool
    finite_base: bool
    countable_cofinality: bool

    @property
    def valid_constraints(self) -> bool:
        """A finite base forces Scott-continuity and countable cofinality."""

        return not self.finite_base or (self.scott_continuous and self.countable_cofinality)


@dataclass(frozen=True)
class FourRegimeDichotomyWitness:
    """The executable four-regime dichotomy over decidable regime data."""

    data: ClosureRegimeData
    regime: ClosureRegime
    exhaustive: bool
    strict_iff_finite: bool
    scott_iff_scott_infinite: bool
    transfinite_iff_non_scott_countable: bool
    aperiodic_iff_non_scott_uncountable: bool
    regime_is_corner: bool

    @property
    def holds(self) -> bool:
        """All dichotomy legs hold."""

        return (
            self.data.valid_constraints
            and self.exhaustive
            and self.strict_iff_finite
            and self.scott_iff_scott_infinite
            and self.transfinite_iff_non_scott_countable
            and self.aperiodic_iff_non_scott_uncountable
            and self.regime_is_corner
        )


@dataclass(frozen=True)
class InflationRegimeData:
    on_unit_circle: bool
    scott_continuous: bool
    finite_base: bool
    countable_cofinality: bool


CURVED_REGIMES = frozenset({ClosureRegime.transfinite_bounded, ClosureRegime.aperiodic})
FLAT_CURVATURE_REGIMES = frozenset({ClosureRegime.strict, ClosureRegime.scott})

__all__ = [
    "CURVED_REGIMES",
    "FLAT_CURVATURE_REGIMES",
    "ClosureRegime",
    "ClosureRegimeData",
    "CurvatureRegimeWitness",
    "FourRegimeDichotomyWitness",
    "InflationRegimeData",
    "classify_closure_regime",
    "cohomology_vanishes",
    "curvature_rank",
    "curvature_regime_correspondence",
    "four_regime_dichotomy",
    "inflation_regime",
    "inflation_regime_data",
    "is_curved_regime",
    "is_flat_regime",
    "regime_is_four_corner",
    "regime_of_corner",
    "regime_to_corner",
    "salem_vs_pisot_regime",
    "spine_cohomology_vanishes",
    "spine_is_strict",
    "spine_regime_data",
    "terminates_by_omega",
]


def classify_closure_regime(data: ClosureRegimeData) -> ClosureRegime:
    """Classify closure-regime data by the four-regime dichotomy."""

    if not data.valid_constraints:
        msg = "finite regime data must be Scott-continuous and countably cofinal"
        raise ValueError(msg)
    if data.finite_base:
        return ClosureRegime.strict
    if data.scott_continuous:
        return ClosureRegime.scott
    if data.countable_cofinality:
        return ClosureRegime.transfinite_bounded
    return ClosureRegime.aperiodic


def regime_to_corner(regime: ClosureRegime) -> Corner:
    """Read a closure regime as the recurring four-corner phase."""

    match regime:
        case ClosureRegime.strict:
            return Corner.ABSURD
        case ClosureRegime.scott:
            return Corner.POTENTIAL
        case ClosureRegime.transfinite_bounded:
            return Corner.ACTIVE
        case ClosureRegime.aperiodic:
            return Corner.STABLE


def regime_of_corner(corner: Corner) -> ClosureRegime:
    """Read a recurring four-corner phase as a closure regime."""

    match corner:
        case Corner.ABSURD:
            return ClosureRegime.strict
        case Corner.POTENTIAL:
            return ClosureRegime.scott
        case Corner.ACTIVE:
            return ClosureRegime.transfinite_bounded
        case Corner.STABLE:
            return ClosureRegime.aperiodic


def regime_is_four_corner() -> bool:
    """Check the bijection ``ClosureRegime <-> Corner``."""

    regimes_roundtrip = all(
        regime_of_corner(regime_to_corner(regime)) is regime for regime in ClosureRegime
    )
    corners_roundtrip = all(
        regime_to_corner(regime_of_corner(corner)) is corner for corner in CORNERS
    )
    return regimes_roundtrip and corners_roundtrip


def four_regime_dichotomy(data: ClosureRegimeData) -> FourRegimeDichotomyWitness:
    """Bundle the executable four-regime dichotomy theorem legs."""

    regime = classify_closure_regime(data)
    return FourRegimeDichotomyWitness(
        data=data,
        regime=regime,
        exhaustive=regime in tuple(ClosureRegime),
        strict_iff_finite=(regime is ClosureRegime.strict) == data.finite_base,
        scott_iff_scott_infinite=(regime is ClosureRegime.scott)
        == (data.scott_continuous and not data.finite_base),
        transfinite_iff_non_scott_countable=(regime is ClosureRegime.transfinite_bounded)
        == ((not data.scott_continuous) and data.countable_cofinality),
        aperiodic_iff_non_scott_uncountable=(regime is ClosureRegime.aperiodic)
        == ((not data.scott_continuous) and (not data.countable_cofinality)),
        regime_is_corner=regime_is_four_corner(),
    )


def spine_regime_data() -> ClosureRegimeData:
    """The finite charge-lattice spine data from ``ClosureOrdinalRegime``."""

    return ClosureRegimeData(
        scott_continuous=True,
        finite_base=True,
        countable_cofinality=True,
    )


def spine_is_strict() -> bool:
    """The finite spine classifies into the strict regime."""

    return classify_closure_regime(spine_regime_data()) is ClosureRegime.strict


def is_flat_regime(regime: ClosureRegime) -> bool:
    """Lean's ``IsFlat``: strict and Scott regimes carry zero curvature."""

    return regime in FLAT_CURVATURE_REGIMES


def is_curved_regime(regime: ClosureRegime) -> bool:
    """Lean's ``IsCurved``: transfinite-bounded and aperiodic regimes carry curvature."""

    return regime in CURVED_REGIMES


def cohomology_vanishes(regime: ClosureRegime) -> bool:
    """Return whether the settling cohomology ``H^1`` vanishes for the regime."""

    return is_flat_regime(regime)


def spine_cohomology_vanishes() -> bool:
    """The strict spine has vanishing settling cohomology."""

    return cohomology_vanishes(classify_closure_regime(spine_regime_data()))


def terminates_by_omega(regime: ClosureRegime) -> bool:
    """Return whether the closure flow terminates in ``≤ omega`` stages."""

    return is_flat_regime(regime)


def curvature_rank(regime: ClosureRegime) -> int | None:
    """Return the Lean ``Option Nat`` curvature rank model: ``0`` for flat, ``None`` for curved."""

    return 0 if is_flat_regime(regime) else None


def curvature_regime_correspondence(regime: ClosureRegime) -> CurvatureRegimeWitness:
    """Bundle the executable curvature-regime correspondence theorem legs."""

    flat = is_flat_regime(regime)
    curved = is_curved_regime(regime)
    vanishes = cohomology_vanishes(regime)
    rank = curvature_rank(regime)
    return CurvatureRegimeWitness(
        regime=regime,
        flat_iff_not_curved=flat == (not curved),
        vanishes_iff_flat=vanishes == flat,
        nonvanishes_iff_curved=(not vanishes) == curved,
        no_curved_omega_terminating=not (curved and terminates_by_omega(regime)),
        rank_zero_iff_flat=(rank == 0) == flat,
        curvature_rank=rank,
    )


def inflation_regime_data(on_unit_circle: bool) -> InflationRegimeData:
    """Lean's ``inflationRegimeData`` as a Python datum."""
    contracting = not on_unit_circle
    return InflationRegimeData(
        on_unit_circle=on_unit_circle,
        scott_continuous=contracting,
        finite_base=contracting,
        countable_cofinality=contracting,
    )


def inflation_regime(on_unit_circle: bool) -> ClosureRegime:
    """Off-circle Pisot directions are strict; on-circle Salem directions are aperiodic."""
    return ClosureRegime.aperiodic if on_unit_circle else ClosureRegime.strict


def salem_vs_pisot_regime() -> tuple[ClosureRegime, ClosureRegime]:
    """Return ``(Salem, Pisot)`` regimes from the Lean dichotomy."""
    return inflation_regime(True), inflation_regime(False)
