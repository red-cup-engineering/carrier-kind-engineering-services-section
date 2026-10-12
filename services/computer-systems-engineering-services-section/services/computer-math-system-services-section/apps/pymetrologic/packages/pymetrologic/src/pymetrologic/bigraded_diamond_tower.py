"""The ``K4``-graded bigraded diamond tower from ``RelMath.Positing``."""

from __future__ import annotations

from dataclasses import dataclass

from pymetrologic.klein import K4, K4_ELEMENTS, mul
from pymetrologic.quartet import CORNERS, Corner, corner_of_status, status_of_corner

FourCorner = tuple[bool, bool]

__all__ = [
    "BigradedDiamondTowerWitness",
    "FourCorner",
    "GradeSquare",
    "axes_independent",
    "bigraded_diamond_tower",
    "bigrading_roundtrip",
    "grade_corner",
    "grade_of_corner",
    "grade_poles",
    "knowledge_axis",
    "of_four_corner",
    "to_four_corner",
    "tower_bigrading_is_two_orders",
    "tower_square",
    "truth_axis",
]


@dataclass(frozen=True, slots=True)
class GradeSquare:
    """One same-order nuclear-square slot in the ``K4``-graded tower."""

    grade: K4
    poles: tuple[Corner, Corner]

    @property
    def corner(self) -> Corner:
        """Read the grade through the recurring four-corner cell."""

        return grade_corner(self.grade)


@dataclass(frozen=True, slots=True)
class BigradedDiamondTowerWitness:
    """Executable witness for the bigraded diamond tower laws."""

    grades: tuple[K4, ...]
    bigrading_roundtrips: bool
    axes_are_independent: bool
    corners_exhausted: bool
    grade_corner_roundtrips: bool
    same_order_grades: bool
    cross_order_enters_as_grade: bool

    @property
    def holds(self) -> bool:
        """All finite tower checks hold."""

        return (
            len(self.grades) == 4
            and self.bigrading_roundtrips
            and self.axes_are_independent
            and self.corners_exhausted
            and self.grade_corner_roundtrips
            and self.same_order_grades
            and self.cross_order_enters_as_grade
        )


def knowledge_axis(grade: K4) -> bool:
    """The first ``Z/2`` coordinate: the negation/knowledge gauge bit."""

    return grade in (K4.NEG, K4.NEGCONF)


def truth_axis(grade: K4) -> bool:
    """The second ``Z/2`` coordinate: the conflation/truth gauge bit."""

    return grade in (K4.CONF, K4.NEGCONF)


def to_four_corner(grade: K4) -> FourCorner:
    """Map a ``K4`` grade to its ``Bool x Bool`` four-corner coordinate."""

    return knowledge_axis(grade), truth_axis(grade)


def of_four_corner(corner: FourCorner) -> K4:
    """Reassemble a ``K4`` grade from its two grading coordinates."""

    match corner:
        case (False, False):
            return K4.ID
        case (True, False):
            return K4.NEG
        case (False, True):
            return K4.CONF
        case (True, True):
            return K4.NEGCONF
    msg = f"invalid four-corner coordinate: {corner!r}"
    raise ValueError(msg)


def grade_corner(grade: K4) -> Corner:
    """Read a ``K4`` grade as the corresponding quartet corner."""

    return corner_of_status(*to_four_corner(grade))


def grade_of_corner(corner: Corner) -> K4:
    """Read a quartet corner as its ``K4`` grade."""

    return of_four_corner(status_of_corner(corner))


def grade_poles(grade: K4) -> tuple[Corner, Corner]:
    """The same-order pole pair selected by a ``K4`` grade."""

    return grade_corner(grade), Corner.ABSURD


def tower_square(grade: K4) -> GradeSquare:
    """The tower's square at one ``K4`` grade."""

    return GradeSquare(grade=grade, poles=grade_poles(grade))


def bigrading_roundtrip() -> bool:
    """Check the Lean ``K4 <-> FourCorner`` bijection."""

    four_corners = ((False, False), (True, False), (False, True), (True, True))
    return all(of_four_corner(to_four_corner(grade)) is grade for grade in K4_ELEMENTS) and all(
        to_four_corner(of_four_corner(corner)) == corner for corner in four_corners
    )


def axes_independent() -> bool:
    """Negation toggles only knowledge; conflation toggles only truth."""

    return all(
        knowledge_axis(mul(K4.NEG, grade)) is (not knowledge_axis(grade))
        and truth_axis(mul(K4.NEG, grade)) is truth_axis(grade)
        and knowledge_axis(mul(K4.CONF, grade)) is knowledge_axis(grade)
        and truth_axis(mul(K4.CONF, grade)) is (not truth_axis(grade))
        for grade in K4_ELEMENTS
    )


def tower_bigrading_is_two_orders() -> BigradedDiamondTowerWitness:
    """Witness that the tower's two ``K4`` bits are the two order axes."""

    squares = tuple(tower_square(grade) for grade in K4_ELEMENTS)
    return BigradedDiamondTowerWitness(
        grades=K4_ELEMENTS,
        bigrading_roundtrips=bigrading_roundtrip(),
        axes_are_independent=axes_independent(),
        corners_exhausted=tuple(grade_corner(grade) for grade in K4_ELEMENTS) == CORNERS,
        grade_corner_roundtrips=all(
            grade_of_corner(grade_corner(grade)) is grade for grade in K4_ELEMENTS
        )
        and all(grade_corner(grade_of_corner(corner)) is corner for corner in CORNERS),
        same_order_grades=all(square.poles[1] is Corner.ABSURD for square in squares),
        cross_order_enters_as_grade=len({truth_axis(grade) for grade in K4_ELEMENTS}) == 2,
    )


def bigraded_diamond_tower() -> BigradedDiamondTowerWitness:
    """The proof-carrying ``K4``-graded bigraded diamond tower."""

    return tower_bigrading_is_two_orders()
