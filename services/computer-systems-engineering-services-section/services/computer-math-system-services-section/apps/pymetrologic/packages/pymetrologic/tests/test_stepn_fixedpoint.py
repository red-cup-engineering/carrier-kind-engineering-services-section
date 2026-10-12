from __future__ import annotations

import pytest

from pymetrologic.classification import (
    H1Class,
)
from pymetrologic.moduli import (
    StepRule,
)
from pymetrologic.stepn_fixedpoint import (
    StepNEmbedding,
    StepNFixedPoint,
    chain_inclusion,
    chain_preserves_point,
    embed_cocone,
    embed_depth_independent,
    sigma_infinity,
    sigma_infinity_embed,
    sigma_infinity_embed_fixed,
    step_n_colimit_rg_fixed_point,
    step_n_embed,
    step_rule_embed,
    step_shift_chain_colimit,
)


def fibonacci_rule(coord: int = 3) -> StepRule:
    return StepRule(substitution=((0, 1), (0,)), primitive=True, coord=coord)


def test_step_shift_chain_preserves_moduli_membership() -> None:
    rule = fibonacci_rule(coord=5)

    assert chain_preserves_point(rule)
    assert chain_inclusion(rule)
    assert chain_inclusion(rule, H1Class(5))
    assert chain_inclusion(rule, H1Class(99))


def test_finite_stage_embeddings_collapse_depth() -> None:
    point = H1Class(8)

    assert StepNEmbedding(2, point).point == point
    assert step_n_embed(2, point) == StepNFixedPoint(point)
    assert step_n_embed(2, point) == step_n_embed(200, point)
    assert embed_depth_independent(2, 200, point)
    assert embed_cocone(7, point)


def test_step_rules_embed_by_their_moduli_point() -> None:
    rule = fibonacci_rule(coord=-4)
    same_point_later_rule = StepRule(
        substitution=((0, 1), (0,), (2,)),
        primitive=True,
        coord=-4,
    )

    assert step_rule_embed(rule) == StepNFixedPoint(H1Class(-4))
    assert step_rule_embed(rule) == step_rule_embed(same_point_later_rule)


def test_sigma_infinity_is_the_rg_fixed_point_flow() -> None:
    point = H1Class(11)
    embedded = step_n_embed(4, point)

    assert sigma_infinity(embedded) == embedded
    assert sigma_infinity_embed(4, point)
    assert sigma_infinity_embed_fixed(4, point)
    assert step_n_colimit_rg_fixed_point([embedded, step_n_embed(9, H1Class(12))])


def test_step_shift_chain_colimit_bundles_the_fixed_point_laws() -> None:
    rule = fibonacci_rule(coord=1)
    shifted_point = H1Class(rule.coord)

    assert step_shift_chain_colimit([rule], [shifted_point, H1Class(2)])


def test_step_n_embedding_validation() -> None:
    with pytest.raises(ValueError, match="natural"):
        StepNEmbedding(-1, H1Class())

    with pytest.raises(ValueError, match="natural"):
        step_n_embed(-1, H1Class())
