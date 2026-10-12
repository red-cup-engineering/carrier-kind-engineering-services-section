from __future__ import annotations

import pytest

from pymetrologic.bilattice import BL
from pymetrologic.classification import (
    H1Class,
)
from pymetrologic.klein import K4
from pymetrologic.moduli import (
    StepRule,
    coarse_moduli_well_defined,
    is_residue,
    is_stratified,
    mem_step_moduli,
    moduli_colimit_stage_independent,
    moduli_point,
    moduli_stack_stratification,
    negation_gauge_closed,
    negation_gauge_invisible,
    step_shift,
    step_shift_injective_on_classes,
    step_shift_preserves_moduli,
    step_shift_preserves_primitive,
    to_settling,
)
from pymetrologic.regimes import (
    ClosureRegime,
)


def fibonacci_rule(coord: int = 1, *, primitive: bool = True) -> StepRule:
    return StepRule(substitution=((0, 1), (0,)), primitive=primitive, coord=coord)


def test_step_rule_realizes_aperiodic_moduli_point() -> None:
    rule = fibonacci_rule(coord=3)
    settling = to_settling(rule)

    assert rule.n == 2
    assert settling.regime is ClosureRegime.aperiodic
    assert settling.cl_inv == H1Class(3)
    assert moduli_point(rule) == H1Class(3)
    assert mem_step_moduli(rule)
    assert mem_step_moduli(rule, H1Class(3))
    assert not mem_step_moduli(rule, H1Class(4))


def test_coarse_moduli_is_well_defined_by_classifying_coordinate() -> None:
    left = fibonacci_rule(coord=5)
    right = StepRule(substitution=((1,), (0, 1)), primitive=True, coord=5)
    different = fibonacci_rule(coord=6)

    assert coarse_moduli_well_defined(left, right)
    assert coarse_moduli_well_defined(left, different)
    assert moduli_point(left) == moduli_point(right)


def test_step_shift_preserves_primitive_coordinate_and_moduli_class() -> None:
    rule = fibonacci_rule(coord=-2)
    shifted = step_shift(rule)

    assert shifted.n == 3
    assert shifted.substitution == ((0, 1), (0,), (2,))
    assert shifted.primitive is rule.primitive
    assert shifted.coord == rule.coord
    assert step_shift_preserves_primitive(rule)
    assert step_shift_preserves_moduli(rule)
    assert step_shift_injective_on_classes(rule, fibonacci_rule(coord=-2))


def test_moduli_stratification_and_colimit_depth_independence() -> None:
    stratified = fibonacci_rule(coord=1)
    other = fibonacci_rule(coord=2)
    points = [H1Class(1), H1Class(9)]

    assert is_stratified(H1Class(1), [stratified, other])
    assert not is_residue(H1Class(1), [stratified, other])
    assert not is_stratified(H1Class(9), [stratified, other])
    assert is_residue(H1Class(9), [stratified, other])
    assert moduli_colimit_stage_independent(2, 8, H1Class(1))
    assert moduli_stack_stratification([stratified, other], points)


def test_negation_gauge_closed_and_invisible_on_paraconsistent_points() -> None:
    paraconsistent = [BL(0, 0), BL(1, 1), BL(1, 1)]

    assert negation_gauge_closed(K4.ID, K4.NEG)
    assert negation_gauge_closed(K4.NEG, K4.NEG)
    assert negation_gauge_invisible(K4.ID, paraconsistent)
    assert negation_gauge_invisible(K4.NEG, paraconsistent)
    assert not negation_gauge_invisible(K4.NEG, [BL(1, 0)])


def test_step_rule_validation() -> None:
    with pytest.raises(ValueError, match="positive"):
        StepRule(substitution=(), primitive=True, coord=0)

    with pytest.raises(ValueError, match="range"):
        StepRule(substitution=((0, 2), (1,)), primitive=True, coord=0)
