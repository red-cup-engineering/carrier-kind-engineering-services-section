"""Anderson-Putnam direct-limit shadows.

Lean's ``Aperiodic.AndersonPutnam`` builds the direct limit of finite-stage
aperiodic cohomologies, then records a concrete constant-stage system and the
rank-``n`` step invariant ``cl-inv^(n)``.  This module keeps that executable
finite skeleton for the lab: stage elements, eventual equality, the constant
``H1Class`` system, and the ``n = 2`` FOUR alignment.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from pymetrologic.quartet import CORNERS, Corner, corner_of_status, status_of_corner

from .classification import H1Class

StageMap = Callable[[int, int, H1Class], H1Class]


@dataclass(frozen=True)
class APStageElement:
    """A finite-stage representative of an Anderson-Putnam direct-limit class."""

    stage: int
    value: H1Class

    def __post_init__(self) -> None:
        if self.stage < 0:
            msg = "stage must be a natural number"
            raise ValueError(msg)


@dataclass(frozen=True)
class APDirectedSystem:
    """A directed system of finite-stage ``H1Class`` cohomologies over ``Nat``."""

    map_stage: StageMap

    def map(self, source: int, target: int, value: H1Class) -> H1Class:
        """Map a class from ``source`` to a later ``target`` stage."""

        if source < 0 or target < 0:
            msg = "stages must be natural numbers"
            raise ValueError(msg)
        if target < source:
            msg = "target stage must be later than or equal to source stage"
            raise ValueError(msg)
        return self.map_stage(source, target, value)

    def eventually_equal(self, left: APStageElement, right: APStageElement) -> bool:
        """Return whether two representatives agree at a common later stage."""

        common = max(left.stage, right.stage)
        return self.map(left.stage, common, left.value) == self.map(
            right.stage,
            common,
            right.value,
        )


__all__ = [
    "APDirectedSystem",
    "APStageElement",
    "ap_colimit_class",
    "ap_direct_limit_laws",
    "ap_system",
    "ap_system_stage_independent",
    "cocone_law",
    "colimit_identifies_eventually_equal",
    "eventual_equivalence_laws",
    "step_n_invariant",
    "step_two_is_four",
]


def ap_system() -> APDirectedSystem:
    """Return the constant ``H1Class`` Anderson-Putnam directed system."""

    return APDirectedSystem(map_stage=lambda _source, _target, value: value)


def colimit_identifies_eventually_equal(
    system: APDirectedSystem,
    left: APStageElement,
    right: APStageElement,
) -> bool:
    """Executable ``Quot.sound`` shadow: eventual equality identifies representatives."""

    return system.eventually_equal(left, right)


def cocone_law(
    system: APDirectedSystem,
    source: int,
    target: int,
    value: H1Class,
) -> bool:
    """Return whether a stage element agrees with its image in the colimit."""

    mapped = APStageElement(target, system.map(source, target, value))
    return system.eventually_equal(APStageElement(source, value), mapped)


def eventual_equivalence_laws(
    system: APDirectedSystem,
    elements: Sequence[APStageElement],
) -> tuple[bool, bool, bool]:
    """Check reflexivity, symmetry, and transitivity of eventual equality on samples."""

    reflexive = all(system.eventually_equal(x, x) for x in elements)
    symmetric = all(
        not system.eventually_equal(x, y) or system.eventually_equal(y, x)
        for x in elements
        for y in elements
    )
    transitive = all(
        not (system.eventually_equal(x, y) and system.eventually_equal(y, z))
        or system.eventually_equal(x, z)
        for x in elements
        for y in elements
        for z in elements
    )
    return reflexive, symmetric, transitive


def ap_system_stage_independent(first: int, second: int, value: H1Class) -> bool:
    """Return whether the constant AP system identifies the same value at both stages."""

    system = ap_system()
    return system.eventually_equal(APStageElement(first, value), APStageElement(second, value))


def ap_colimit_class(element: APStageElement) -> H1Class:
    """Read the constant AP system's direct-limit class represented by ``element``."""

    return element.value


def step_n_invariant(n: int, coords: Sequence[int]) -> tuple[int, ...]:
    """Return the rank-``n`` step invariant as an integer tuple."""

    if n < 0:
        msg = "n must be a natural number"
        raise ValueError(msg)
    if len(coords) != n:
        msg = "coords length must equal n"
        raise ValueError(msg)
    return tuple(coords)


def step_two_is_four() -> bool:
    """Return the Lean ``n = 2`` alignment: two axes and four status corners."""

    two_axes = len(step_n_invariant(2, (0, 1))) == 2
    four_corners = len(CORNERS) == 4
    status_round_trips = all(
        corner_of_status(*status_of_corner(corner)) is corner for corner in Corner
    )
    return two_axes and four_corners and status_round_trips


def ap_direct_limit_laws(system: APDirectedSystem, elements: Sequence[APStageElement]) -> bool:
    """Bundle the finite direct-limit laws used by the executable AP shadow."""

    return eventual_equivalence_laws(system, elements) == (True, True, True) and all(
        cocone_law(system, element.stage, element.stage + 1, element.value) for element in elements
    )
