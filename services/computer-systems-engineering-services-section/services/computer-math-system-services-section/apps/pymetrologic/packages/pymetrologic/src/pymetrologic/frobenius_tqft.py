"""Settling Frobenius algebra and Abrams 2D TQFT.

Executable shadow of ``RelMath.Value.SettlingFrobeniusTQFT``.  The worked
carrier is ``Z2 = Z[x]/(x^2)``, represented as integer pairs ``(a, b)`` for
``a + b*x``.  Multiplication, counit, and comultiplication are the standard
commutative Frobenius algebra whose associated 2D TQFT is determined by the disk,
pair-of-pants, and their duals.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable, Sequence
from dataclasses import dataclass

from pymetrologic.klein import K4_ELEMENTS
from pymetrologic.klein import mul as k4_mul

Z2 = tuple[int, int]
Tensor = tuple[tuple[Z2, Z2], ...]

__all__ = [
    "Z2",
    "AbramsCorrespondence",
    "FrobeniusLawWitness",
    "SettlingFrobenius",
    "Tensor",
    "TwoDTQFT",
    "commutative_frobenius_is_tqft",
    "counit_reads_top",
    "degree_of_class",
    "handle_operator",
    "settling_frobenius_algebra",
    "tqft_of_commutative",
    "z2add",
    "z2comul",
    "z2counit",
    "z2mul",
    "z2neg",
    "z2one",
    "z2zero",
]

DEFAULT_SAMPLES: tuple[Z2, ...] = tuple((a, b) for a in (-1, 0, 1) for b in (-1, 0, 1))


@dataclass(frozen=True)
class FrobeniusLawWitness:
    """Finite executable check of the Frobenius algebra laws."""

    module_laws: bool
    algebra_laws: bool
    bilinear: bool
    counit_laws: bool
    frobenius_compatibility: bool
    commutative: bool

    @property
    def holds(self) -> bool:
        """All checked Frobenius laws hold."""
        return (
            self.module_laws
            and self.algebra_laws
            and self.bilinear
            and self.counit_laws
            and self.frobenius_compatibility
            and self.commutative
        )


@dataclass(frozen=True)
class SettlingFrobenius:
    """The worked settling Frobenius algebra ``Z[x]/(x^2)``."""

    unit: Z2
    laws: FrobeniusLawWitness
    h0_unit_axis: bool
    vanishes_above_one: bool
    counit_top_class: bool
    k4_graded: bool

    @property
    def holds(self) -> bool:
        """The algebra, cohomology-axis, and grading witnesses all hold."""
        return (
            self.laws.holds
            and self.h0_unit_axis
            and self.vanishes_above_one
            and self.counit_top_class
            and self.k4_graded
        )


@dataclass(frozen=True)
class TwoDTQFT:
    """The 2D TQFT generators induced by a commutative Frobenius algebra."""

    unit: Z2
    mult: Callable[[Z2, Z2], Z2]
    counit: Callable[[Z2], int]
    comult: Callable[[Z2], Tensor]
    relations: FrobeniusLawWitness

    @property
    def holds(self) -> bool:
        """The generating cobordism relations hold."""
        return self.relations.holds


@dataclass(frozen=True)
class AbramsCorrespondence:
    """The worked commutative Frobenius algebra and its induced 2D TQFT."""

    frobenius: SettlingFrobenius
    tqft: TwoDTQFT
    circle_value: str
    generators_match: bool
    roundtrip_mul: bool
    roundtrip_unit: bool

    @property
    def holds(self) -> bool:
        """The worked Abrams correspondence round-trip holds."""
        return (
            self.frobenius.holds
            and self.tqft.holds
            and self.generators_match
            and self.roundtrip_mul
            and self.roundtrip_unit
        )


def z2add(left: Z2, right: Z2) -> Z2:
    """Coordinatewise module addition."""
    return left[0] + right[0], left[1] + right[1]


def z2zero() -> Z2:
    """The module zero."""
    return 0, 0


def z2neg(value: Z2) -> Z2:
    """Coordinatewise module negation."""
    return -value[0], -value[1]


def z2mul(left: Z2, right: Z2) -> Z2:
    """Product in ``Z[x]/(x^2)``."""
    return left[0] * right[0], left[0] * right[1] + left[1] * right[0]


def z2one() -> Z2:
    """The algebra unit ``1``."""
    return 1, 0


def z2counit(value: Z2) -> int:
    """The trace/counit, reading the top-class coefficient."""
    return value[1]


def z2comul(value: Z2) -> Tensor:
    """Comultiplication ``Delta(a + bx) = a(1 tensor x + x tensor 1) + b(x tensor x)``."""
    a, b = value
    return (((a, 0), (0, 1)), ((0, 1), (a, 0)), ((0, b), (0, 1)))


def _int_smul(n: int, value: Z2) -> Z2:
    return n * value[0], n * value[1]


def _sum(values: Iterable[Z2]) -> Z2:
    acc = z2zero()
    for value in values:
        acc = z2add(acc, value)
    return acc


def _left_counit(tensor: Tensor) -> Z2:
    return _sum(_int_smul(z2counit(left), right) for left, right in tensor)


def _right_counit(tensor: Tensor) -> Z2:
    return _sum(_int_smul(z2counit(right), left) for left, right in tensor)


def degree_of_class(degree: int, coefficient: int) -> Z2:
    """Embed cohomological degree 0 on the unit axis and degree 1 on the ``x`` axis."""
    if degree < 0:
        msg = "degree must be nonnegative"
        raise ValueError(msg)
    if degree == 0:
        return coefficient, 0
    if degree == 1:
        return 0, coefficient
    return z2zero()


def counit_reads_top(coefficient: int) -> bool:
    """The counit reads the degree-1 coefficient and kills degree 0."""
    return (
        z2counit(degree_of_class(1, coefficient)) == coefficient
        and z2counit(degree_of_class(0, coefficient)) == 0
    )


def handle_operator(value: Z2) -> Z2:
    """The genus handle operator ``mu after Delta``."""
    return _sum(z2mul(left, right) for left, right in z2comul(value))


def _samples(values: Sequence[Z2] | None) -> tuple[Z2, ...]:
    return tuple(values) if values is not None else DEFAULT_SAMPLES


def _frobenius_laws(samples: Sequence[Z2] | None = None) -> FrobeniusLawWitness:
    vals = _samples(samples)
    module_laws = all(
        z2add(z2add(a, b), c) == z2add(a, z2add(b, c))
        and z2add(a, b) == z2add(b, a)
        and z2add(a, z2zero()) == a
        and z2add(z2neg(a), a) == z2zero()
        for a in vals
        for b in vals
        for c in vals
    )
    algebra_laws = all(
        z2mul(z2mul(a, b), c) == z2mul(a, z2mul(b, c))
        and z2mul(z2one(), a) == a
        and z2mul(a, z2one()) == a
        for a in vals
        for b in vals
        for c in vals
    )
    bilinear = all(
        z2mul(z2add(a, b), c) == z2add(z2mul(a, c), z2mul(b, c))
        and z2mul(a, z2add(b, c)) == z2add(z2mul(a, b), z2mul(a, c))
        for a in vals
        for b in vals
        for c in vals
    )
    counit_laws = all(
        _left_counit(z2comul(a)) == a and _right_counit(z2comul(a)) == a for a in vals
    )
    frobenius_compatibility = all(
        _right_counit(z2comul(z2mul(a, b))) == z2mul(a, _right_counit(z2comul(b)))
        for a in vals
        for b in vals
    )
    commutative = all(z2mul(a, b) == z2mul(b, a) for a in vals for b in vals)
    return FrobeniusLawWitness(
        module_laws=module_laws,
        algebra_laws=algebra_laws,
        bilinear=bilinear,
        counit_laws=counit_laws,
        frobenius_compatibility=frobenius_compatibility,
        commutative=commutative,
    )


def _k4_graded() -> bool:
    return all(
        k4_mul(k4_mul(g, h), k) is k4_mul(g, k4_mul(h, k))
        and k4_mul(g, g) is K4_ELEMENTS[0]
        and k4_mul(g, h) is k4_mul(h, g)
        for g in K4_ELEMENTS
        for h in K4_ELEMENTS
        for k in K4_ELEMENTS
    )


def settling_frobenius_algebra(
    samples: Sequence[Z2] | None = None, coefficients: Sequence[int] = (-2, -1, 0, 1, 2)
) -> SettlingFrobenius:
    """Return the worked settling Frobenius algebra witness."""
    return SettlingFrobenius(
        unit=z2one(),
        laws=_frobenius_laws(samples),
        h0_unit_axis=all(
            degree_of_class(0, coefficient) == (coefficient, 0) for coefficient in coefficients
        ),
        vanishes_above_one=all(
            degree_of_class(degree, coefficient) == z2zero()
            for degree in (2, 3, 4)
            for coefficient in coefficients
        ),
        counit_top_class=all(counit_reads_top(coefficient) for coefficient in coefficients),
        k4_graded=_k4_graded(),
    )


def tqft_of_commutative(samples: Sequence[Z2] | None = None) -> TwoDTQFT:
    """Abrams forward direction: a commutative Frobenius algebra yields a 2D TQFT."""
    return TwoDTQFT(
        unit=z2one(),
        mult=z2mul,
        counit=z2counit,
        comult=z2comul,
        relations=_frobenius_laws(samples),
    )


def commutative_frobenius_is_tqft(samples: Sequence[Z2] | None = None) -> AbramsCorrespondence:
    """The worked Abrams correspondence for the settling Frobenius algebra."""
    vals = _samples(samples)
    frobenius = settling_frobenius_algebra(vals)
    tqft = tqft_of_commutative(vals)
    return AbramsCorrespondence(
        frobenius=frobenius,
        tqft=tqft,
        circle_value="Z[x]/(x^2)",
        generators_match=(
            tqft.unit == z2one()
            and tqft.mult is z2mul
            and tqft.counit is z2counit
            and tqft.comult is z2comul
        ),
        roundtrip_mul=all(tqft.mult(a, b) == z2mul(a, b) for a in vals for b in vals),
        roundtrip_unit=tqft.unit == z2one(),
    )
