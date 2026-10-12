"""Settling over a value category (RelMath.Value.SettlingOverValueCategory).

The Lean theorem says that settling is not special to FOUR: the same closure
shape runs over any value category ``V``. In the lab we make that executable for
finite carriers by wrapping :class:`pymetrologic.closure.FiniteLattice` as a value
category, then checking the closure least-fixed-point and regime-independence
laws over the finite carrier.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from pymetrologic.bilattice import BL, four
from pymetrologic.closure import FiniteLattice, is_closure, knowledge_lattice

from .regimes import ClosureRegime

E = TypeVar("E")

__all__ = [
    "BooleanSpineRecoveryWitness",
    "LaxSlackNonThinWitness",
    "LaxVClosure",
    "PreValueCategory",
    "VClosure",
    "VSettlingLFPWitness",
    "ValueCategory",
    "ValueRegimeData",
    "ValueRegimeIndependenceWitness",
    "boolean_recovers_spine",
    "boolean_value_category",
    "charge_value_category",
    "classify_value_regime",
    "four_regime_v_independent",
    "genuine_lax_cone_needs_non_thin_carrier",
    "lax_closure_idem_of_antisymm",
    "lax_slack_witnesses_nonantisymmetry",
    "lax_vclosure",
    "pre_value_category",
    "prevalue_has_lax_slack",
    "regime_of",
    "value_category",
    "vclosure",
    "vsettle",
    "vsettle_lfp",
]


@dataclass(frozen=True)
class ValueCategory(Generic[E]):
    """A finite value category: a partial-order carrier with a bottom seed."""

    name: str
    lattice: FiniteLattice[E]

    @property
    def bot(self) -> E:
        """The seed value ``bot`` settling climbs from."""
        return self.lattice.bot


@dataclass(frozen=True)
class PreValueCategory(Generic[E]):
    """A finite preorder-valued carrier with a bottom seed.

    This is the non-thin generalization of :class:`ValueCategory`: reflexivity
    and transitivity are required, while antisymmetry is intentionally not.
    """

    name: str
    elements: tuple[E, ...]
    leq: Callable[[E, E], bool]
    bot: E

    def le_refl(self) -> bool:
        """The preorder is reflexive over the finite carrier."""
        return all(self.leq(value, value) for value in self.elements)

    def le_trans(self) -> bool:
        """The preorder is transitive over the finite carrier."""
        return all(
            not (self.leq(left, middle) and self.leq(middle, right)) or self.leq(left, right)
            for left in self.elements
            for middle in self.elements
            for right in self.elements
        )

    def related_both_ways(self, left: E, right: E) -> bool:
        """Return whether ``left <= right`` and ``right <= left``."""
        return self.leq(left, right) and self.leq(right, left)

    def is_antisymmetric(self) -> bool:
        """Return whether the preorder collapses to a partial order."""
        return all(
            left == right or not self.related_both_ways(left, right)
            for left in self.elements
            for right in self.elements
        )


@dataclass(frozen=True)
class VClosure(Generic[E]):
    """A ``V``-enriched closure operator over a finite value category."""

    category: ValueCategory[E]
    op: Callable[[E], E]
    name: str = "closure"

    def settle(self, seed: E) -> E:
        """The universal settling ``F_U`` over ``V`` evaluated at ``seed``."""
        return self.op(seed)


@dataclass(frozen=True)
class LaxVClosure(Generic[E]):
    """A lax closure over a pre-value carrier."""

    category: PreValueCategory[E]
    op: Callable[[E], E]
    name: str = "lax-closure"


@dataclass(frozen=True)
class VSettlingLFPWitness(Generic[E]):
    """The settled value is the least fixed point above the seed."""

    seed: E
    settled: E
    seed_below_settled: bool
    fixed: bool
    least_fixed_above_seed: bool

    @property
    def holds(self) -> bool:
        """All least-fixed-point legs hold."""
        return self.seed_below_settled and self.fixed and self.least_fixed_above_seed


@dataclass(frozen=True)
class LaxSlackNonThinWitness(Generic[E]):
    """A lax slack cell exhibiting two mutually-below but distinct values."""

    lower: E
    upper: E
    lower_below_upper: bool
    upper_below_lower: bool
    distinct: bool

    @property
    def holds(self) -> bool:
        """The preorder is non-thin at this witnessed pair."""
        return self.lower_below_upper and self.upper_below_lower and self.distinct


@dataclass(frozen=True)
class ValueRegimeData:
    """The decidable regime data used by the four-regime classifier."""

    scott_continuous: bool
    finite_base: bool
    countable_cofinality: bool

    @property
    def valid_constraints(self) -> bool:
        """A finite base forces Scott-continuity and countable cofinality."""
        return not self.finite_base or (self.scott_continuous and self.countable_cofinality)


@dataclass(frozen=True)
class ValueRegimeIndependenceWitness:
    """The four-regime classification factors through regime data, not ``V``."""

    data: ValueRegimeData
    left_category: str
    right_category: str
    left_regime: ClosureRegime
    right_regime: ClosureRegime
    valid_data: bool
    same_regime: bool
    dichotomy_holds: bool

    @property
    def holds(self) -> bool:
        """The value carrier is irrelevant once the regime data is fixed."""
        return self.valid_data and self.same_regime and self.dichotomy_holds


@dataclass(frozen=True)
class BooleanSpineRecoveryWitness:
    """Boolean and FOUR value categories recover the standard settling spine."""

    boolean_reflexive: bool
    four_reflexive: bool
    four_settle_is_closure: bool
    four_settle_lfp: VSettlingLFPWitness[BL[int]]

    @property
    def holds(self) -> bool:
        """Both named carriers are valid and FOUR settles by the same closure."""
        return (
            self.boolean_reflexive
            and self.four_reflexive
            and self.four_settle_is_closure
            and self.four_settle_lfp.holds
        )


def value_category(name: str, lattice: FiniteLattice[E]) -> ValueCategory[E]:
    """Wrap a finite lattice as a value category."""
    return ValueCategory(name=name, lattice=lattice)


def pre_value_category(
    name: str,
    elements: tuple[E, ...],
    leq: Callable[[E, E], bool],
    bot: E,
) -> PreValueCategory[E]:
    """Wrap a finite preorder as a pre-value category."""
    if bot not in elements:
        msg = "pre-value category bot must be in the carrier"
        raise ValueError(msg)
    category = PreValueCategory(name=name, elements=elements, leq=leq, bot=bot)
    if not category.le_refl():
        msg = "pre-value category relation must be reflexive"
        raise ValueError(msg)
    if not category.le_trans():
        msg = "pre-value category relation must be transitive"
        raise ValueError(msg)
    return category


def vclosure(
    category: ValueCategory[E], op: Callable[[E], E], *, name: str = "closure"
) -> VClosure[E]:
    """Build a ``VClosure`` after checking monotone/inflationary/idempotent laws."""
    if not is_closure(category.lattice, op):
        msg = "VClosure requires a closure operator on the value category"
        raise ValueError(msg)
    return VClosure(category=category, op=op, name=name)


def lax_vclosure(
    category: PreValueCategory[E],
    op: Callable[[E], E],
    *,
    name: str = "lax-closure",
) -> LaxVClosure[E]:
    """Build a lax closure after checking inflationary, monotone, and KZ laws."""
    if any(op(value) not in category.elements for value in category.elements):
        msg = "lax closure operator must land in the pre-value carrier"
        raise ValueError(msg)
    if any(not category.leq(value, op(value)) for value in category.elements):
        msg = "lax closure requires inflationary operator"
        raise ValueError(msg)
    if any(
        category.leq(left, right) and not category.leq(op(left), op(right))
        for left in category.elements
        for right in category.elements
    ):
        msg = "lax closure requires monotone operator"
        raise ValueError(msg)
    if any(not category.leq(op(op(value)), op(value)) for value in category.elements):
        msg = "lax closure requires KZ inequality"
        raise ValueError(msg)
    return LaxVClosure(category=category, op=op, name=name)


def vsettle(closure: VClosure[E], seed: E) -> E:
    """Settle ``seed`` under a value-category closure."""
    return closure.settle(seed)


def vsettle_lfp(closure: VClosure[E], seed: E) -> VSettlingLFPWitness[E]:
    """Witness that ``settle(seed)`` is the least fixed point above ``seed``."""
    lat = closure.category.lattice
    settled = closure.settle(seed)
    fixed_points_above_seed = [
        value for value in lat.elements if lat.leq(seed, value) and lat.eq(closure.op(value), value)
    ]
    return VSettlingLFPWitness(
        seed=seed,
        settled=settled,
        seed_below_settled=lat.leq(seed, settled),
        fixed=lat.eq(closure.op(settled), settled),
        least_fixed_above_seed=all(lat.leq(settled, value) for value in fixed_points_above_seed),
    )


def prevalue_has_lax_slack(closure: LaxVClosure[E], value: E) -> bool:
    """Return whether ``op(op(value)) <= op(value)`` holds without equality."""
    once = closure.op(value)
    twice = closure.op(once)
    return closure.category.leq(twice, once) and twice != once


def lax_slack_witnesses_nonantisymmetry(
    closure: LaxVClosure[E],
    value: E,
) -> LaxSlackNonThinWitness[E]:
    """A genuine lax slack cell gives two mutually-below distinct values."""
    if not prevalue_has_lax_slack(closure, value):
        msg = "value must have genuine lax slack"
        raise ValueError(msg)
    once = closure.op(value)
    twice = closure.op(once)
    return LaxSlackNonThinWitness(
        lower=twice,
        upper=once,
        lower_below_upper=closure.category.leq(twice, once),
        upper_below_lower=closure.category.leq(once, twice),
        distinct=twice != once,
    )


def lax_closure_idem_of_antisymm(closure: LaxVClosure[E], value: E) -> bool:
    """On an antisymmetric pre-value carrier, KZ lax closure is idempotent."""
    if not closure.category.is_antisymmetric():
        msg = "idempotence collapse requires an antisymmetric pre-value carrier"
        raise ValueError(msg)
    return closure.op(closure.op(value)) == closure.op(value)


def genuine_lax_cone_needs_non_thin_carrier(
    closure: LaxVClosure[E],
    value: E,
) -> LaxSlackNonThinWitness[E]:
    """Return the non-thinness witness forced by genuine lax slack."""
    return lax_slack_witnesses_nonantisymmetry(closure, value)


def classify_value_regime(data: ValueRegimeData) -> ClosureRegime:
    """Classify value-settling regime data into the four closure regimes."""
    if not data.valid_constraints:
        msg = "finite value-regime data must be Scott-continuous and countably cofinal"
        raise ValueError(msg)
    if data.finite_base:
        return ClosureRegime.strict
    if data.scott_continuous:
        return ClosureRegime.scott
    if data.countable_cofinality:
        return ClosureRegime.transfinite_bounded
    return ClosureRegime.aperiodic


def regime_of(_closure: VClosure[Any], data: ValueRegimeData) -> ClosureRegime:
    """The regime of a value-category settling, factored through ``data`` alone."""
    return classify_value_regime(data)


def four_regime_v_independent(
    left: VClosure[Any], right: VClosure[Any], data: ValueRegimeData
) -> ValueRegimeIndependenceWitness:
    """Check that two value categories with the same data classify identically."""
    left_regime = regime_of(left, data)
    right_regime = regime_of(right, data)
    expected = classify_value_regime(data)
    dichotomy_holds = (
        (expected == ClosureRegime.strict) == data.finite_base
        and (expected == ClosureRegime.scott) == (data.scott_continuous and not data.finite_base)
        and (expected == ClosureRegime.transfinite_bounded)
        == ((not data.scott_continuous) and data.countable_cofinality)
        and (expected == ClosureRegime.aperiodic)
        == ((not data.scott_continuous) and (not data.countable_cofinality))
    )
    return ValueRegimeIndependenceWitness(
        data=data,
        left_category=left.category.name,
        right_category=right.category.name,
        left_regime=left_regime,
        right_regime=right_regime,
        valid_data=data.valid_constraints,
        same_regime=left_regime == right_regime,
        dichotomy_holds=dichotomy_holds,
    )


def boolean_value_category() -> ValueCategory[bool]:
    """The Boolean value category ``{False <= True}``."""
    return value_category(
        "Boolean",
        FiniteLattice(
            elements=(False, True),
            leq=lambda left, right: (not left) or right,
            join=lambda left, right: left or right,
            meet=lambda left, right: left and right,
            bot=False,
            top=True,
        ),
    )


def charge_value_category() -> ValueCategory[BL[int]]:
    """The FOUR/Charge value category under the knowledge order."""
    bl = four()
    return value_category("FOUR", knowledge_lattice(bl.L))


def boolean_recovers_spine() -> BooleanSpineRecoveryWitness:
    """Boolean and FOUR are value categories; FOUR recovers ordinary closure settling."""
    boolean_v = boolean_value_category()
    charge_v = charge_value_category()
    bl = four()
    add_true = vclosure(charge_v, lambda value: charge_v.lattice.join(value, bl.true))
    seed = bl.none
    return BooleanSpineRecoveryWitness(
        boolean_reflexive=all(
            boolean_v.lattice.leq(value, value) for value in boolean_v.lattice.elements
        ),
        four_reflexive=all(
            charge_v.lattice.leq(value, value) for value in charge_v.lattice.elements
        ),
        four_settle_is_closure=charge_v.lattice.eq(add_true.settle(seed), add_true.op(seed)),
        four_settle_lfp=vsettle_lfp(add_true, seed),
    )
