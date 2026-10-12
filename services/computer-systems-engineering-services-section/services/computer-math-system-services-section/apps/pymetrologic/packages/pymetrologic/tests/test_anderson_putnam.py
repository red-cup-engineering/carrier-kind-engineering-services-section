from __future__ import annotations

import pytest

from pymetrologic.anderson_putnam import (
    APDirectedSystem,
    APStageElement,
    ap_colimit_class,
    ap_direct_limit_laws,
    ap_system,
    ap_system_stage_independent,
    cocone_law,
    colimit_identifies_eventually_equal,
    eventual_equivalence_laws,
    step_n_invariant,
    step_two_is_four,
)
from pymetrologic.classification import (
    H1Class,
)


def test_constant_ap_system_identifies_stage_independent_representatives() -> None:
    system = ap_system()
    early = APStageElement(0, H1Class(4))
    later = APStageElement(12, H1Class(4))
    different = APStageElement(12, H1Class(5))

    assert system.eventually_equal(early, later)
    assert colimit_identifies_eventually_equal(system, early, later)
    assert not system.eventually_equal(early, different)
    assert ap_system_stage_independent(3, 9, H1Class(-2))
    assert ap_colimit_class(later) == H1Class(4)


def test_eventual_equality_is_an_equivalence_on_samples() -> None:
    system = ap_system()
    elements = [
        APStageElement(0, H1Class(1)),
        APStageElement(2, H1Class(1)),
        APStageElement(5, H1Class(2)),
    ]

    assert eventual_equivalence_laws(system, elements) == (True, True, True)
    assert ap_direct_limit_laws(system, elements)


def test_cocone_law_identifies_element_with_later_image() -> None:
    system = APDirectedSystem(
        map_stage=lambda source, target, value: H1Class(value.coord + target - source)
    )

    assert system.map(1, 4, H1Class(10)) == H1Class(13)
    assert cocone_law(system, 1, 4, H1Class(10))
    assert system.eventually_equal(APStageElement(1, H1Class(10)), APStageElement(4, H1Class(13)))


def test_ap_stage_validation() -> None:
    with pytest.raises(ValueError, match="natural"):
        APStageElement(-1, H1Class())

    with pytest.raises(ValueError, match="later"):
        ap_system().map(4, 3, H1Class())


def test_step_n_invariant_and_step_two_four_alignment() -> None:
    assert step_n_invariant(3, (2, -1, 5)) == (2, -1, 5)
    assert step_two_is_four()

    with pytest.raises(ValueError, match="length"):
        step_n_invariant(2, (1,))
