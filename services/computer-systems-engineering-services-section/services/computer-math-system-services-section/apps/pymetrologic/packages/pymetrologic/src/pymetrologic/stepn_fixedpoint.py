"""Step-``n`` moduli fixed-point shadows from ``Aperiodic.StepN.FixedPoint``.

Lean models ``M^infinity`` as the colimit of the ascending chain
``M^(2) -> M^(3) -> ...`` under step-shift.  The existing moduli shadow already
records that step-shift preserves ``cl_inv``; this module packages the resulting
depth collapse: finite-stage embeddings depend only on their moduli point, and
the induced infinite step-shift ``sigma_infinity`` is the identity.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from .moduli import ModuliPoint, StepRule, mem_step_moduli, moduli_point, step_shift

__all__ = [
    "StepNEmbedding",
    "StepNFixedPoint",
    "chain_inclusion",
    "chain_preserves_point",
    "embed_cocone",
    "embed_depth_independent",
    "sigma_infinity",
    "sigma_infinity_embed",
    "sigma_infinity_embed_fixed",
    "step_n_colimit_rg_fixed_point",
    "step_n_embed",
    "step_rule_embed",
    "step_shift_chain_colimit",
]


@dataclass(frozen=True)
class StepNEmbedding:
    """A finite-stage representative ``(n, p)`` of the step-``n`` moduli colimit."""

    depth: int
    point: ModuliPoint

    def __post_init__(self) -> None:
        if self.depth < 0:
            msg = "step depth must be a natural number"
            raise ValueError(msg)


@dataclass(frozen=True)
class StepNFixedPoint:
    """A depth-collapsed point of ``M^infinity``."""

    point: ModuliPoint


def chain_preserves_point(rule: StepRule) -> bool:
    """Return whether one step-shift preserves the rule's moduli point."""

    return moduli_point(step_shift(rule)) == moduli_point(rule)


def chain_inclusion(rule: StepRule, point: ModuliPoint | None = None) -> bool:
    """Check that membership in a finite sub-stack includes into the next stage."""

    target = moduli_point(rule) if point is None else point
    if not mem_step_moduli(rule, target):
        return True
    return mem_step_moduli(step_shift(rule), target)


def step_n_embed(depth: int, point: ModuliPoint) -> StepNFixedPoint:
    """Embed a finite step-depth moduli point into ``M^infinity``."""

    StepNEmbedding(depth, point)
    return StepNFixedPoint(point)


def step_rule_embed(rule: StepRule) -> StepNFixedPoint:
    """Embed a concrete step rule through its coarse moduli point."""

    return step_n_embed(rule.n, moduli_point(rule))


def embed_depth_independent(first: int, second: int, point: ModuliPoint) -> bool:
    """Return whether the colimit identifies the same point at any two depths."""

    return step_n_embed(first, point) == step_n_embed(second, point)


def embed_cocone(depth: int, point: ModuliPoint) -> bool:
    """Return the cocone law: embedding agrees with the next directed-system image."""

    return step_n_embed(depth, point) == step_n_embed(depth + 1, point)


def sigma_infinity(point: StepNFixedPoint) -> StepNFixedPoint:
    """The infinite step-shift flow on ``M^infinity``; it is identity after colimiting."""

    return point


def sigma_infinity_embed(depth: int, point: ModuliPoint) -> bool:
    """Check that ``sigma_infinity`` advances an embedded representative one depth."""

    return sigma_infinity(step_n_embed(depth, point)) == step_n_embed(depth + 1, point)


def sigma_infinity_embed_fixed(depth: int, point: ModuliPoint) -> bool:
    """Check that ``sigma_infinity`` fixes every embedded finite-stage class."""

    return sigma_infinity(step_n_embed(depth, point)) == step_n_embed(depth, point)


def step_n_colimit_rg_fixed_point(points: Sequence[StepNFixedPoint]) -> bool:
    """Bundle the RG fixed-point equation on sampled ``M^infinity`` points."""

    return all(sigma_infinity(point) == point for point in points)


def step_shift_chain_colimit(rules: Sequence[StepRule], points: Sequence[ModuliPoint]) -> bool:
    """Bundle the finite chain, cocone, depth-collapse, and fixed-flow laws."""

    chain_laws = all(chain_preserves_point(rule) and chain_inclusion(rule) for rule in rules)
    cocone_laws = all(embed_cocone(depth, point) for depth, point in enumerate(points))
    depth_laws = all(
        embed_depth_independent(first, second, point)
        for point in points
        for first in range(len(points) + 1)
        for second in range(len(points) + 1)
    )
    fixed_laws = step_n_colimit_rg_fixed_point([StepNFixedPoint(point) for point in points])
    return chain_laws and cocone_laws and depth_laws and fixed_laws
