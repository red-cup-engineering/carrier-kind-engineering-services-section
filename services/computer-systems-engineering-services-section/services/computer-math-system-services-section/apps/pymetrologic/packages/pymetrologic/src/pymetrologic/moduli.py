"""Aperiodic settling moduli-stack shadows.

Lean's ``Aperiodic.Moduli`` models step-``n`` substitution rules, their coarse
``cl_inv`` moduli points, the step-shift chain ``M^(n) -> M^(n+1)``, the
stratified/residue split, and the invisible negation gauge.  This module keeps
that finite executable skeleton for PyMetroLogic; it does not assert the open
classification identifying all coarse moduli points with structural MLD classes.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from pymetrologic.bilattice import BL, four
from pymetrologic.klein import K4, act, mul

from .anderson_putnam import APDirectedSystem, APStageElement
from .classification import AperiodicSettling, H1Class
from .regimes import ClosureRegime

ModuliPoint = H1Class


@dataclass(frozen=True)
class StepRule:
    """A finite step-``n`` substitution rule with a leading classifying coordinate."""

    substitution: tuple[tuple[int, ...], ...]
    primitive: bool
    coord: int

    def __post_init__(self) -> None:
        n = len(self.substitution)
        if n == 0:
            msg = "a step rule must have positive depth"
            raise ValueError(msg)
        if any(symbol < 0 or symbol >= n for word in self.substitution for symbol in word):
            msg = "substitution symbols must lie in range(n)"
            raise ValueError(msg)

    @property
    def n(self) -> int:
        """Return this rule's step depth / alphabet size."""

        return len(self.substitution)


__all__ = [
    "ModuliPoint",
    "StepRule",
    "coarse_moduli_well_defined",
    "is_residue",
    "is_stratified",
    "mem_step_moduli",
    "moduli_colimit_stage_independent",
    "moduli_point",
    "moduli_stack_stratification",
    "moduli_system",
    "negation_gauge_closed",
    "negation_gauge_invisible",
    "step_shift",
    "step_shift_injective_on_classes",
    "step_shift_preserves_moduli",
    "step_shift_preserves_primitive",
    "to_settling",
]


def to_settling(rule: StepRule) -> AperiodicSettling:
    """Realize a step rule as an aperiodic settling with ``cl_inv = coord``."""

    return AperiodicSettling(ClosureRegime.aperiodic, H1Class(rule.coord))


def moduli_point(rule: StepRule) -> ModuliPoint:
    """Return the coarse moduli point: the rule's ``cl_inv`` class."""

    return to_settling(rule).cl_inv


def coarse_moduli_well_defined(left: StepRule, right: StepRule) -> bool:
    """Return whether equal classifying coordinates give the same moduli point."""

    if left.coord != right.coord:
        return True
    return moduli_point(left) == moduli_point(right)


def mem_step_moduli(rule: StepRule, point: ModuliPoint | None = None) -> bool:
    """Return whether a primitive rule realizes ``point`` in its step sub-stack."""

    target = moduli_point(rule) if point is None else point
    return rule.primitive and moduli_point(rule) == target


def step_shift(rule: StepRule) -> StepRule:
    """Embed a step-``n`` rule into step ``n+1`` by adding a fixed new letter."""

    shifted = tuple(tuple(symbol for symbol in word) for word in rule.substitution)
    return StepRule(
        substitution=(*shifted, (rule.n,)),
        primitive=rule.primitive,
        coord=rule.coord,
    )


def step_shift_preserves_primitive(rule: StepRule) -> bool:
    """Return whether ``step_shift`` preserves the primitivity flag."""

    return step_shift(rule).primitive == rule.primitive


def step_shift_preserves_moduli(rule: StepRule) -> bool:
    """Return whether ``step_shift`` preserves the coarse moduli point."""

    return moduli_point(step_shift(rule)) == moduli_point(rule)


def step_shift_injective_on_classes(left: StepRule, right: StepRule) -> bool:
    """Return whether equality after step-shift implies equality before it."""

    if moduli_point(step_shift(left)) != moduli_point(step_shift(right)):
        return True
    return moduli_point(left) == moduli_point(right)


def moduli_system() -> APDirectedSystem:
    """Return the identity-on-classes directed system for moduli points."""

    return APDirectedSystem(map_stage=lambda _source, _target, point: point)


def moduli_colimit_stage_independent(first: int, second: int, point: ModuliPoint) -> bool:
    """Return whether the moduli directed-system colimit ignores step depth."""

    system = moduli_system()
    return system.eventually_equal(APStageElement(first, point), APStageElement(second, point))


def is_stratified(point: ModuliPoint, rules: Sequence[StepRule]) -> bool:
    """Return whether ``point`` lies in some primitive ``M^(n)`` with ``n >= 2``."""

    return any(rule.n >= 2 and mem_step_moduli(rule, point) for rule in rules)


def is_residue(point: ModuliPoint, rules: Sequence[StepRule]) -> bool:
    """Return whether ``point`` is not realized by the sampled primitive step rules."""

    return not is_stratified(point, rules)


def moduli_stack_stratification(rules: Sequence[StepRule], points: Sequence[ModuliPoint]) -> bool:
    """Bundle the sampled ascending-chain, stratification, and colimit laws."""

    chain_laws = all(
        step_shift_preserves_primitive(rule)
        and step_shift_preserves_moduli(rule)
        and (not mem_step_moduli(rule) or mem_step_moduli(step_shift(rule), moduli_point(rule)))
        for rule in rules
    )
    stratification_laws = all(
        is_stratified(point, rules) != is_residue(point, rules) for point in points
    )
    colimit_laws = all(moduli_colimit_stage_independent(2, 7, point) for point in points)
    return chain_laws and stratification_laws and colimit_laws


def negation_gauge_closed(left: K4, right: K4) -> bool:
    """Return whether the ``{id, neg}`` gauge subgroup is closed under multiplication."""

    gauge = {K4.ID, K4.NEG}
    if left not in gauge or right not in gauge:
        return True
    return mul(left, right) in gauge


def negation_gauge_invisible(gauge: K4, values: Sequence[BL[int]]) -> bool:
    """Return whether a paraconsistent ``bot/top`` fiber point is fixed by the gauge."""

    if gauge not in {K4.ID, K4.NEG}:
        return True
    bl = four()
    bot_top = {BL(0, 0), BL(1, 1)}
    if any(value not in bot_top for value in values):
        return False
    return all(act(gauge, bl, value) == value for value in values)
