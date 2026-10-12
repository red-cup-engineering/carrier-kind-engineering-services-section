"""Lean-earned real-number numerics.

This module starts to earn the material currently in ``lean/RelMath/Real`` and
``lean/RelMath/Aperiodic/StepN`` into the Python lab.  The functions are not
proofs; they are executable shadows of the proved statements, useful for
experiments, demos, and checking numerical expectations.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from fractions import Fraction
from functools import cache
from math import isqrt, log2, sqrt

from .closure import FiniteLattice, is_closure, is_scott_continuous
from .value_settling import ValueCategory


@dataclass(frozen=True, slots=True)
class QuadraticSurd:
    """Exact value ``a + b sqrt(d)`` with integer coefficients."""

    rational: int
    radical: int
    radicand: int

    def __post_init__(self) -> None:
        if self.radicand < 0:
            msg = "radicand must be nonnegative"
            raise ValueError(msg)

    def __add__(self, other: QuadraticSurd) -> QuadraticSurd:
        """Add two surds with the same radicand."""

        self._check_same_radicand(other)
        return QuadraticSurd(
            self.rational + other.rational,
            self.radical + other.radical,
            self.radicand,
        )

    def __mul__(self, other: QuadraticSurd) -> QuadraticSurd:
        """Multiply two surds with the same radicand."""

        self._check_same_radicand(other)
        return QuadraticSurd(
            self.rational * other.rational + self.radical * other.radical * self.radicand,
            self.rational * other.radical + self.radical * other.rational,
            self.radicand,
        )

    def scale(self, scalar: int) -> QuadraticSurd:
        """Multiply the surd by an integer scalar."""

        return QuadraticSurd(scalar * self.rational, scalar * self.radical, self.radicand)

    def as_float(self) -> float:
        """Return a floating approximation."""

        return self.rational + self.radical * sqrt(self.radicand)

    def _check_same_radicand(self, other: QuadraticSurd) -> None:
        if self.radicand != other.radicand:
            msg = "quadratic surds must have the same radicand"
            raise ValueError(msg)


@dataclass(frozen=True, slots=True)
class MetallicRootWitness:
    """Exact witness for Lean's ``Aperiodic.StepN.MetallicRoot`` theorem."""

    n: int
    root: QuadraticSurd
    square: QuadraticSurd
    recurrence_rhs: QuadraticSurd
    constant_identity: bool
    binomial_expansion: bool

    @property
    def equation_holds(self) -> bool:
        """Check ``z^2 = (n+n) z + 4`` exactly."""

        return self.square == self.recurrence_rhs

    @property
    def holds(self) -> bool:
        """All exact metallic-root checks hold."""

        return self.constant_identity and self.binomial_expansion and self.equation_holds


@dataclass(frozen=True, slots=True)
class RationalMultiplicationWitness:
    """Finite exact shadow of the rational lemmas in ``Real.RealMultiplication``."""

    abs_multiplicative: bool
    nonnegative_left_monotone: bool
    nonnegative_right_monotone: bool
    bound_scaling: bool
    product_increment_split: bool
    nat_ceiling: int

    @property
    def holds(self) -> bool:
        """All sampled rational multiplication checks hold."""

        return (
            self.abs_multiplicative
            and self.nonnegative_left_monotone
            and self.nonnegative_right_monotone
            and self.bound_scaling
            and self.product_increment_split
        )


@dataclass(frozen=True, slots=True)
class BishopProductEstimateWitness:
    """Exact finite product estimate used by Bishop-real multiplication."""

    factor_bound: int
    precision: int
    refined_index: int
    left_difference: Fraction
    right_difference: Fraction
    product_difference: Fraction
    split_bound: Fraction
    bound: Fraction

    @property
    def holds(self) -> bool:
        """The split estimate proves the requested product precision."""

        return self.product_difference <= self.split_bound <= self.bound


@dataclass(frozen=True, slots=True)
class ConstructiveSqrtWitness:
    """Finite exact shadow of ``Real.IVT``'s floor-sqrt construction."""

    c: int
    depth: int
    approximations: tuple[Fraction, ...]
    lower_square_bounds: tuple[bool, ...]
    upper_gap_bounds: tuple[bool, ...]
    directional_cauchy_bounds: tuple[bool, ...]

    @property
    def final_approximation(self) -> Fraction:
        """The deepest sampled rational ``sqrtSeq c depth``."""

        return self.approximations[-1]

    @property
    def final_square_gap(self) -> Fraction:
        """The exact remaining gap ``c - (sqrtSeq c depth)^2``."""

        return Fraction(self.c, 1) - self.final_approximation * self.final_approximation

    @property
    def holds(self) -> bool:
        """All sampled constructive square-root checks hold."""

        return (
            all(self.lower_square_bounds)
            and all(self.upper_gap_bounds)
            and all(self.directional_cauchy_bounds)
        )


@dataclass(frozen=True, slots=True)
class InternalRealsCompletionWitness:
    """Finite executable shadow of ``Real.InternalReals``' completion theorem."""

    rational_ordered_field_fragment: bool
    rational_orbit_converges: bool
    diagonal_completion: bool
    square_root_completion: ConstructiveSqrtWitness
    multiplication_socket: RationalMultiplicationWitness
    value_category_axioms: bool
    identity_closure_scott_continuous: bool

    @property
    def holds(self) -> bool:
        """All sampled InternalReals checks hold."""

        return (
            self.rational_ordered_field_fragment
            and self.rational_orbit_converges
            and self.diagonal_completion
            and self.square_root_completion.holds
            and self.multiplication_socket.holds
            and self.value_category_axioms
            and self.identity_closure_scott_continuous
        )


def _validate_nat(n: int, name: str) -> None:
    if n < 0:
        msg = f"{name} must be a natural number"
        raise ValueError(msg)


def _validate_positive_nat(n: int, name: str) -> None:
    if n <= 0:
        msg = f"{name} must be a positive natural number"
        raise ValueError(msg)


def rat_abs_mul(x: Fraction, y: Fraction) -> bool:
    """Check Lean's ``Rat.abs_mul`` exactly."""

    return abs(x * y) == abs(x) * abs(y)


def rat_mul_le_mul_of_nonneg_left(a: Fraction, b: Fraction, c: Fraction) -> bool:
    """Check ``c*a <= c*b`` from ``a <= b`` and ``0 <= c``."""

    if a > b:
        raise ValueError("Lean theorem requires a <= b")
    if c < 0:
        raise ValueError("Lean theorem requires 0 <= c")
    return c * a <= c * b


def rat_mul_le_mul_of_nonneg_right(a: Fraction, b: Fraction, c: Fraction) -> bool:
    """Check ``a*c <= b*c`` from ``a <= b`` and ``0 <= c``."""

    if a > b:
        raise ValueError("Lean theorem requires a <= b")
    if c < 0:
        raise ValueError("Lean theorem requires 0 <= c")
    return a * c <= b * c


def rat_inv_nat_p(k: int) -> Fraction:
    """Lean's positive reciprocal ``invNatP k = 1/(k+1)``."""

    _validate_nat(k, "k")
    return Fraction(1, k + 1)


def rat_of_nat_mul_inv_nat_p_le(bound: int, j: int, m: int) -> bool:
    """Check ``B * 1/(m+1) <= 1/(j+1)`` under Lean's side condition."""

    _validate_nat(bound, "bound")
    _validate_nat(j, "j")
    _validate_nat(m, "m")
    if bound * (j + 1) > m + 1:
        raise ValueError("Lean theorem requires bound * (j + 1) <= m + 1")
    return Fraction(bound, m + 1) <= rat_inv_nat_p(j)


def rat_nat_ge(q: Fraction) -> int:
    """Return a constructive natural upper bound for a rational."""

    return max(0, q.numerator // q.denominator) + 1


def rat_le_nat_ge(q: Fraction) -> bool:
    """Check that ``rat_nat_ge`` really bounds the rational."""

    return q <= Fraction(rat_nat_ge(q), 1)


def rat_abs_sub_zero(z: Fraction) -> bool:
    """Check ``|z - 0| = |z|`` exactly."""

    return abs(z - 0) == abs(z)


def rat_mul_neg(a: Fraction, b: Fraction) -> bool:
    """Check ``a * (-b) = -(a*b)`` exactly."""

    return a * (-b) == -(a * b)


def rat_mul_sub(a: Fraction, b: Fraction, c: Fraction) -> bool:
    """Check right distributivity over subtraction."""

    return a * (b - c) == a * b - a * c


def rat_sub_add_sub_cancel(a: Fraction, b: Fraction, c: Fraction) -> bool:
    """Check ``a - b + (b - c) = a - c`` exactly."""

    return a - b + (b - c) == a - c


def rat_mul_sub_split(w: Fraction, x: Fraction, y: Fraction, z: Fraction) -> bool:
    """Check ``w*x - y*z = w*(x-z) + z*(w-y)`` exactly."""

    return w * x - y * z == w * (x - z) + z * (w - y)


def rat_of_nat_le_of_nat(m: int, n: int) -> bool:
    """Check monotonicity of the natural-to-rational embedding."""

    _validate_nat(m, "m")
    _validate_nat(n, "n")
    if m > n:
        raise ValueError("Lean theorem requires m <= n")
    return Fraction(m, 1) <= Fraction(n, 1)


def nat_sqrt(n: int) -> int:
    """Lean's ``natSqrt``: the floor square root of a natural number."""

    _validate_nat(n, "n")
    return isqrt(n)


def nat_sqrt_spec(n: int) -> bool:
    """Check ``natSqrt n ^ 2 <= n < (natSqrt n + 1)^2``."""

    root = nat_sqrt(n)
    return root * root <= n < (root + 1) * (root + 1)


def sqrt_seq(c: int, k: int) -> Fraction:
    """Lean's ``sqrtSeq c k = floor((k+1) * sqrt(c)) / (k+1)``."""

    _validate_nat(c, "c")
    _validate_nat(k, "k")
    scale = k + 1
    return Fraction(nat_sqrt(c * scale * scale), scale)


def sqrt_seq_num_le(c: int, m: int, n: int) -> bool:
    """Check the numerator inequality behind ``sqrtSeq_le_succ``."""

    _validate_nat(c, "c")
    _validate_nat(m, "m")
    _validate_nat(n, "n")
    left = nat_sqrt(c * (m + 1) * (m + 1)) * (n + 1)
    right = (nat_sqrt(c * (n + 1) * (n + 1)) + 1) * (m + 1)
    return left <= right


def sqrt_seq_le_succ(c: int, m: int, n: int) -> bool:
    """Check ``sqrtSeq c m <= sqrtSeq c n + 1/(n+1)`` exactly."""

    return sqrt_seq(c, m) <= sqrt_seq(c, n) + rat_inv_nat_p(n)


def sqrt_seq_sq_le(c: int, k: int) -> bool:
    """Check the lower bracket ``sqrtSeq c k ^ 2 <= c``."""

    approximation = sqrt_seq(c, k)
    return approximation * approximation <= Fraction(c, 1)


def nat_sqrt_le_mul(c: int, k: int) -> bool:
    """Check ``natSqrt (c*(k+1)^2) <= c*(k+1)`` for ``1 <= c``."""

    _validate_positive_nat(c, "c")
    _validate_nat(k, "k")
    scale = k + 1
    return nat_sqrt(c * scale * scale) <= c * scale


def of_nat_sub_sqrt_seq_sq_le(c: int, k: int) -> bool:
    """Check ``c - sqrtSeq(c,k)^2 <= 2c/(k+1)`` for ``1 <= c``."""

    _validate_positive_nat(c, "c")
    approximation = sqrt_seq(c, k)
    return Fraction(c, 1) - approximation * approximation <= Fraction(2 * c, k + 1)


def constructive_sqrt_witness(c: int, depth: int) -> ConstructiveSqrtWitness:
    """Bundle finite checks for ``Real.IVT``'s constructive square-root sequence."""

    _validate_positive_nat(c, "c")
    _validate_nat(depth, "depth")
    indices = tuple(range(depth + 1))
    approximations = tuple(sqrt_seq(c, k) for k in indices)
    lower_square_bounds = tuple(sqrt_seq_sq_le(c, k) for k in indices)
    upper_gap_bounds = tuple(of_nat_sub_sqrt_seq_sq_le(c, k) for k in indices)
    directional_cauchy_bounds = tuple(sqrt_seq_le_succ(c, m, n) for m in indices for n in indices)
    return ConstructiveSqrtWitness(
        c=c,
        depth=depth,
        approximations=approximations,
        lower_square_bounds=lower_square_bounds,
        upper_gap_bounds=upper_gap_bounds,
        directional_cauchy_bounds=directional_cauchy_bounds,
    )


def real_tail_bound(values: tuple[Fraction, ...]) -> int:
    """A finite sampled analogue of the tail-bound construction."""

    if not values:
        raise ValueError("values must be nonempty")
    return rat_nat_ge(max(abs(value) for value in values))


def real_abs_seq_le_tail_bound(values: tuple[Fraction, ...]) -> bool:
    """Check that the finite sample is bounded by ``real_tail_bound``."""

    bound = Fraction(real_tail_bound(values), 1)
    return all(abs(value) <= bound for value in values)


def bishop_product_estimate(
    w: Fraction,
    x: Fraction,
    y: Fraction,
    z: Fraction,
    *,
    factor_bound: int,
    precision: int,
) -> BishopProductEstimateWitness:
    """Estimate ``|w*x - y*z|`` using the split from ``Real.mul_respects``.

    The hypotheses mirror the finite part of the Lean proof: ``w`` and ``z``
    are bounded by ``factor_bound``, and each input difference is small at the
    refined index ``factor_bound * (2*precision + 2)``.
    """

    _validate_positive_nat(factor_bound, "factor_bound")
    _validate_nat(precision, "precision")

    refined_index = factor_bound * (2 * precision + 2)
    refined_bound = rat_inv_nat_p(refined_index)
    left_difference = abs(x - z)
    right_difference = abs(w - y)

    if abs(w) > factor_bound or abs(z) > factor_bound:
        raise ValueError("Lean proof requires the selected factors to be bounded")
    if left_difference > refined_bound or right_difference > refined_bound:
        raise ValueError("Lean proof requires both differences to fit the refined modulus")

    product_difference = abs(w * x - y * z)
    split_bound = abs(w) * left_difference + abs(z) * right_difference
    bound = rat_inv_nat_p(precision)

    return BishopProductEstimateWitness(
        factor_bound=factor_bound,
        precision=precision,
        refined_index=refined_index,
        left_difference=left_difference,
        right_difference=right_difference,
        product_difference=product_difference,
        split_bound=split_bound,
        bound=bound,
    )


def real_multiplication_witness() -> RationalMultiplicationWitness:
    """Bundle sampled exact checks from ``Real.RealMultiplication``."""

    samples = (
        Fraction(-3, 2),
        Fraction(-1, 3),
        Fraction(0, 1),
        Fraction(2, 5),
        Fraction(5, 4),
    )
    nonnegative = tuple(value for value in samples if value >= 0)

    abs_multiplicative = all(rat_abs_mul(x, y) for x in samples for y in samples)
    nonnegative_left_monotone = all(
        rat_mul_le_mul_of_nonneg_left(a, b, c)
        for a in samples
        for b in samples
        for c in nonnegative
        if a <= b
    )
    nonnegative_right_monotone = all(
        rat_mul_le_mul_of_nonneg_right(a, b, c)
        for a in samples
        for b in samples
        for c in nonnegative
        if a <= b
    )
    bound_scaling = all(
        rat_of_nat_mul_inv_nat_p_le(bound, j, m)
        for bound, j, m in ((0, 0, 0), (1, 2, 2), (2, 1, 5), (3, 4, 14))
    )
    product_increment_split = all(
        rat_mul_sub_split(w, x, y, z)
        for w in samples
        for x in samples
        for y in samples
        for z in samples
    )
    nat_ceiling = rat_nat_ge(max(samples))

    return RationalMultiplicationWitness(
        abs_multiplicative=abs_multiplicative,
        nonnegative_left_monotone=nonnegative_left_monotone,
        nonnegative_right_monotone=nonnegative_right_monotone,
        bound_scaling=bound_scaling,
        product_increment_split=product_increment_split,
        nat_ceiling=nat_ceiling,
    )


def le_within_rational(k: int, a: Fraction, b: Fraction) -> bool:
    """Check ``a <= b`` within Lean's rational slack ``1/(k+1)``."""

    _validate_nat(k, "k")
    return a <= b + rat_inv_nat_p(k)


def within_rational(k: int, a: Fraction, b: Fraction) -> bool:
    """Check the symmetric rational ``Within`` relation from ``InternalReals``."""

    return le_within_rational(k, a, b) and le_within_rational(k, b, a)


def rational_ordered_field_fragment(samples: tuple[Fraction, ...] | None = None) -> bool:
    """Sample the ordered-field fragment used to construct Lean's internal rationals."""

    if samples is None:
        samples = (
            Fraction(-3, 2),
            Fraction(-1, 3),
            Fraction(0),
            Fraction(2, 5),
            Fraction(5, 4),
        )
    if not samples:
        raise ValueError("samples must be nonempty")

    nonnegative = tuple(value for value in samples if value >= 0)
    nonzero = tuple(value for value in samples if value != 0)

    additive_group = all(x + 0 == x and x + (-x) == 0 for x in samples)
    multiplicative_fragment = all(x * 1 == x for x in samples) and all(
        value * Fraction(1, value) == 1 for value in nonzero
    )
    distributive = all(
        x * (y + z) == x * y + x * z for x in samples for y in samples for z in samples
    )
    abs_multiplicative = all(rat_abs_mul(x, y) for x in samples for y in samples)
    monotone = all(
        rat_mul_le_mul_of_nonneg_left(a, b, c) and rat_mul_le_mul_of_nonneg_right(a, b, c)
        for a in samples
        for b in samples
        for c in nonnegative
        if a <= b
    )

    return (
        additive_group
        and multiplicative_fragment
        and distributive
        and abs_multiplicative
        and monotone
    )


def cauchy_with_modulus_sample(
    values: tuple[Fraction, ...],
    *,
    max_precision: int,
    modulus: Callable[[int], int],
) -> bool:
    """Check a finite Cauchy-with-modulus sample over exact rationals."""

    if not values:
        raise ValueError("values must be nonempty")
    _validate_nat(max_precision, "max_precision")
    for k in range(max_precision + 1):
        start = modulus(k)
        _validate_nat(start, "modulus(k)")
        if start >= len(values):
            return False
        slack = rat_inv_nat_p(k)
        if any(
            abs(values[m] - values[n]) > slack
            for m in range(start, len(values))
            for n in range(start, len(values))
        ):
            return False
    return True


def rational_orbit_converges_sample(
    c: int = 2,
    *,
    depth: int = 12,
    max_precision: int = 5,
) -> bool:
    """Finite analogue of ``rational_orbit_converges`` for ``sqrtSeq`` approximants."""

    _validate_positive_nat(c, "c")
    _validate_nat(depth, "depth")
    _validate_nat(max_precision, "max_precision")
    if max_precision >= depth:
        raise ValueError("depth must be greater than max_precision")

    approximations = tuple(sqrt_seq(c, n) for n in range(depth + 1))
    limit = approximations[-1]
    return all(
        within_rational(k, approximations[n], limit)
        for k in range(max_precision + 1)
        for n in range(k, len(approximations))
    )


def diagonal_completion_sample(
    c: int = 2,
    *,
    depth: int = 12,
    max_precision: int = 5,
) -> bool:
    """Finite shadow of the diagonal completion argument in ``InternalReals``."""

    _validate_positive_nat(c, "c")
    _validate_nat(depth, "depth")
    _validate_nat(max_precision, "max_precision")
    if max_precision >= depth:
        raise ValueError("depth must be greater than max_precision")

    approximations = tuple(sqrt_seq(c, n) for n in range(depth + 1))
    return cauchy_with_modulus_sample(
        approximations,
        max_precision=max_precision,
        modulus=lambda k: k,
    )


def _real_value_carrier(values: tuple[Fraction, ...] | None) -> tuple[Fraction, ...]:
    if values is None:
        values = (Fraction(0), Fraction(1, 3), Fraction(2, 3), Fraction(1))
    if any(value < 0 for value in values):
        raise ValueError("sampled real value category requires values above real zero")
    return tuple(sorted({Fraction(0), *values}))


def real_value_category_sample(
    values: tuple[Fraction, ...] | None = None,
) -> ValueCategory[Fraction]:
    """Sample ``realValueCategory`` on an exact finite nonnegative rational carrier."""

    elements = _real_value_carrier(values)
    return ValueCategory(
        name="RReal(sample)",
        lattice=FiniteLattice(
            elements=elements,
            leq=lambda a, b: a <= b,
            join=max,
            meet=min,
            bot=Fraction(0),
            top=elements[-1],
        ),
    )


def real_value_category_axioms(values: tuple[Fraction, ...] | None = None) -> bool:
    """Check reflexivity, transitivity, antisymmetry, and bottom for sampled reals."""

    category = real_value_category_sample(values)
    lat = category.lattice
    reflexive = all(lat.leq(value, value) for value in lat.elements)
    transitive = all(
        not (lat.leq(left, middle) and lat.leq(middle, right)) or lat.leq(left, right)
        for left in lat.elements
        for middle in lat.elements
        for right in lat.elements
    )
    antisymmetric = all(
        left == right or not (lat.leq(left, right) and lat.leq(right, left))
        for left in lat.elements
        for right in lat.elements
    )
    bot = category.bot == Fraction(0) and all(
        lat.leq(category.bot, value) for value in lat.elements
    )
    return reflexive and transitive and antisymmetric and bot


def real_identity_vclosure_scott_continuous(values: tuple[Fraction, ...] | None = None) -> bool:
    """Check the sampled identity ``realVClosure`` is a Scott-continuous closure."""

    category = real_value_category_sample(values)

    def identity_closure(value: Fraction) -> Fraction:
        return value

    return is_closure(category.lattice, identity_closure) and is_scott_continuous(
        category.lattice,
        identity_closure,
    )


def internal_reals_completion_witness(
    c: int = 2,
    *,
    depth: int = 12,
    max_precision: int = 5,
) -> InternalRealsCompletionWitness:
    """Bundle the executable ``Real.InternalReals`` completion/value-category shadow."""

    return InternalRealsCompletionWitness(
        rational_ordered_field_fragment=rational_ordered_field_fragment(),
        rational_orbit_converges=rational_orbit_converges_sample(
            c,
            depth=depth,
            max_precision=max_precision,
        ),
        diagonal_completion=diagonal_completion_sample(
            c,
            depth=depth,
            max_precision=max_precision,
        ),
        square_root_completion=constructive_sqrt_witness(c, depth),
        multiplication_socket=real_multiplication_witness(),
        value_category_axioms=real_value_category_axioms(),
        identity_closure_scott_continuous=real_identity_vclosure_scott_continuous(),
    )


@cache
def fib(n: int) -> int:
    """Fibonacci sequence with the Lean convention ``F_0 = F_1 = 1``."""
    if n < 0:
        raise ValueError("fib is defined on natural numbers")
    if n <= 1:
        return 1
    return fib(n - 1) + fib(n - 2)


def cassini_gap(n: int) -> int:
    """Return ``F_{n+2} F_n - F_{n+1}^2``; Lean proves this is ``(-1)^n``."""
    return fib(n + 2) * fib(n) - fib(n + 1) * fib(n + 1)


def log2_step_bound(m: int, k: int) -> bool:
    """Executable check of ``log2(M+1) <= log2(M) + 1/(k+1)`` when ``2(k+1) <= M``."""
    if m < 1 or k < 0:
        raise ValueError("m must be positive and k natural")
    if 2 * (k + 1) > m:
        raise ValueError("Lean theorem requires 2 * (k + 1) <= m")
    return log2(m + 1) <= log2(m) + 1 / (k + 1) + 1e-12


def metallic_double_root(n: int) -> float:
    """Return ``z = n + sqrt(n^2 + 4)``, twice the metallic mean."""
    if n < 0:
        raise ValueError("metallic means are indexed by natural numbers")
    return n + sqrt(n * n + 4)


def metallic_root_residual(n: int) -> float:
    """Numerical residual of Lean's ``z^2 = (n+n) z + 4`` metallic-root theorem."""
    z = metallic_double_root(n)
    return z * z - (n + n) * z - 4


def metallic_root_surd(n: int) -> QuadraticSurd:
    """Return the exact surd ``z = n + sqrt(n^2 + 4)``."""

    if n < 0:
        raise ValueError("metallic means are indexed by natural numbers")
    return QuadraticSurd(n, 1, n * n + 4)


def metallic_root_square(n: int) -> QuadraticSurd:
    """Return ``z^2`` exactly for ``z = n + sqrt(n^2 + 4)``."""

    z = metallic_root_surd(n)
    return z * z


def metallic_root_rhs(n: int) -> QuadraticSurd:
    """Return ``(n+n) z + 4`` exactly for ``z = n + sqrt(n^2 + 4)``."""

    z = metallic_root_surd(n)
    return z.scale(n + n) + QuadraticSurd(4, 0, z.radicand)


def metallic_root_constant_identity(n: int) -> bool:
    """Check the integer shadow ``n^2 + 4 = n*n + 4`` from ``MetallicRoot``."""

    if n < 0:
        raise ValueError("metallic means are indexed by natural numbers")
    return n**2 + 4 == n * n + 4


def metallic_root_binomial_expansion(n: int) -> bool:
    """Check ``(n+s)^2 = n^2 + (ns+sn) + s^2`` in exact surd arithmetic."""

    z = metallic_root_surd(n)
    n_part = QuadraticSurd(n, 0, z.radicand)
    s_part = QuadraticSurd(0, 1, z.radicand)
    return z * z == (n_part * n_part) + ((n_part * s_part) + (s_part * n_part)) + (s_part * s_part)


def metallic_root_equation_holds(n: int) -> bool:
    """Check Lean's whole-family metallic-root equation exactly."""

    return metallic_root_square(n) == metallic_root_rhs(n)


def metallic_root_witness(n: int) -> MetallicRootWitness:
    """Bundle exact executable checks for ``MetallicRoot.lean``."""

    return MetallicRootWitness(
        n=n,
        root=metallic_root_surd(n),
        square=metallic_root_square(n),
        recurrence_rhs=metallic_root_rhs(n),
        constant_identity=metallic_root_constant_identity(n),
        binomial_expansion=metallic_root_binomial_expansion(n),
    )
