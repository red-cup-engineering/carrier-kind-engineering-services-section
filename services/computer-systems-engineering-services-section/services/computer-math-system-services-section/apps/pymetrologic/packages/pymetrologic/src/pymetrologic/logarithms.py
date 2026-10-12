"""Executable shadows of ``RelMath.Real.Logarithm``, ``LogLipschitz``, and ``GoldenLog``.

Lean constructs logarithms as Bishop reals from floor-logarithm approximants and
then proves the scalar cancellation needed for the per-step log-Lipschitz bound.
The lab keeps the finite, runnable side of that story: floor logs, rational
approximants, Bernoulli power bounds, rational monotonicity, and the Fibonacci
bracket/convergence witness around the golden inflation entropy.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
from math import log2


@dataclass(frozen=True)
class GoldenLogBracket:
    """A rational bracket for ``phi`` together with its base-2 log endpoints."""

    lower: Fraction
    upper: Fraction
    lower_log2: float
    upper_log2: float

    @property
    def width(self) -> Fraction:
        """Return the rational width of the bracket."""

        return self.upper - self.lower


@dataclass(frozen=True)
class GoldenLogConvergenceWitness:
    """Finite witness for ``log_2(phi)`` as a convergent Fibonacci-log sequence."""

    depth: int
    lower_ratio: Fraction
    upper_ratio: Fraction
    lower_log2: float
    upper_log2: float
    cassini: bool
    even_monotone: bool
    odd_antitone: bool
    nested_brackets: bool
    width_bound: bool

    @property
    def log_width(self) -> float:
        """Executable width of the final log bracket."""

        return self.upper_log2 - self.lower_log2

    @property
    def approximate_log2_phi(self) -> float:
        """Midpoint approximation to ``log_2(phi)`` from the final bracket."""

        return (self.lower_log2 + self.upper_log2) / 2

    @property
    def holds(self) -> bool:
        """All finite GoldenLog checks hold."""

        return (
            self.cassini
            and self.even_monotone
            and self.odd_antitone
            and self.nested_brackets
            and self.width_bound
            and self.lower_log2 <= self.upper_log2
        )


__all__ = [
    "GoldenLogBracket",
    "GoldenLogConvergenceWitness",
    "bernoulli_power_bound_holds",
    "cassini_holds",
    "floor_log",
    "golden_fib",
    "golden_log_bishop_bracket",
    "golden_log_bracket",
    "golden_log_convergence_witness",
    "golden_log_convergent_log2",
    "golden_log_convergent_ratio",
    "log2_lipschitz_gap",
    "log2_ratio",
    "log2_ratio_monotone",
    "log_additivity_defect",
    "log_seq",
    "log_step_bound_holds",
]


def floor_log(base: int, value: int) -> int:
    """Return the largest exponent ``e`` with ``base**e <= value``."""

    if base < 2:
        msg = "base must be at least 2"
        raise ValueError(msg)
    if value < 1:
        msg = "value must be positive"
        raise ValueError(msg)

    exponent = 0
    power = 1
    while power * base <= value:
        power *= base
        exponent += 1
    return exponent


def log_seq(base: int, value: int, level: int) -> Fraction:
    """Return Lean's ``level`` floor-log approximant ``floor(log_b(value^(k+1))) / (k+1)``."""

    if level < 0:
        msg = "level must be natural"
        raise ValueError(msg)
    denominator = level + 1
    return Fraction(floor_log(base, value**denominator), denominator)


def log_additivity_defect(base: int, left: int, right: int, level: int) -> Fraction:
    """Return the finite floor-log defect for ``log(left * right) = log(left) + log(right)``."""

    if left < 1 or right < 1:
        msg = "left and right must be positive"
        raise ValueError(msg)
    return (
        log_seq(base, left * right, level)
        - log_seq(base, left, level)
        - log_seq(base, right, level)
    )


def log2_ratio(numerator: int, denominator: int) -> float:
    """Return the executable real-number shadow of Lean's ``logRatN numerator denominator``."""

    if numerator < 1 or denominator < 1:
        msg = "numerator and denominator must be positive"
        raise ValueError(msg)
    return log2(numerator) - log2(denominator)


def log2_ratio_monotone(left: Fraction, right: Fraction) -> bool:
    """Check the monotonicity shadow ``left <= right -> log2(left) <= log2(right)``."""

    if left <= 0 or right <= 0:
        msg = "ratios must be positive"
        raise ValueError(msg)
    if left > right:
        msg = "Lean monotonicity theorem requires left <= right"
        raise ValueError(msg)
    return (
        log2_ratio(left.numerator, left.denominator)
        <= log2_ratio(right.numerator, right.denominator) + 1e-12
    )


def bernoulli_power_bound_holds(m: int, n: int) -> bool:
    """Check ``(M+1)^n <= 2*M^n`` under Lean's side condition ``2*n <= M``."""

    if m < 0 or n < 0:
        msg = "m and n must be natural"
        raise ValueError(msg)
    if 2 * n > m:
        msg = "Lean theorem requires 2 * n <= m"
        raise ValueError(msg)
    return bool((m + 1) ** n <= 2 * (m**n))


def log2_lipschitz_gap(m: int) -> float:
    """Return the finite increment ``log2(M+1) - log2(M)``."""

    if m < 1:
        msg = "m must be positive"
        raise ValueError(msg)
    return log2(m + 1) - log2(m)


def log_step_bound_holds(m: int, k: int) -> bool:
    """Check ``log2(M+1) <= log2(M) + 1/(k+1)`` when ``2*(k+1) <= M``."""

    if k < 0:
        msg = "k must be natural"
        raise ValueError(msg)
    if 2 * (k + 1) > m:
        msg = "Lean theorem requires 2 * (k + 1) <= m"
        raise ValueError(msg)
    return log2_lipschitz_gap(m) <= 1 / (k + 1) + 1e-12


def golden_log_bracket(index: int) -> GoldenLogBracket:
    """Return the Fibonacci convergent bracket ``F_(n+1)/F_n <= phi <= F_(n+2)/F_(n+1)``.

    The lab uses the standard Fibonacci convention ``F_0 = 0, F_1 = 1`` for
    convergents.  ``index`` must be odd and at least ``5`` so the lower endpoint
    is below ``phi`` and the upper endpoint is above it, as in Lean's
    ``8/5 <= phi <= 13/8`` bracket.
    """

    if index < 5 or index % 2 != 1:
        msg = "index must be an odd Fibonacci index at least 5"
        raise ValueError(msg)
    a = _std_fib(index)
    b = _std_fib(index + 1)
    c = _std_fib(index + 2)
    lower = Fraction(b, a)
    upper = Fraction(c, b)
    return GoldenLogBracket(
        lower=lower,
        upper=upper,
        lower_log2=log2_ratio(lower.numerator, lower.denominator),
        upper_log2=log2_ratio(upper.numerator, upper.denominator),
    )


def golden_fib(index: int) -> int:
    """Lean's GoldenLog Fibonacci sequence ``F_0 = F_1 = 1``."""

    if index < 0:
        msg = "fibonacci index must be natural"
        raise ValueError(msg)
    if index < 2:
        return 1
    previous = 1
    current = 1
    for _ in range(2, index + 1):
        previous, current = current, previous + current
    return current


def cassini_holds(index: int) -> bool:
    """Check Lean's Cassini identity for ``golden_fib`` at ``index``."""

    if index < 0:
        msg = "cassini index must be natural"
        raise ValueError(msg)
    left = golden_fib(index + 2) * golden_fib(index) - golden_fib(index + 1) ** 2
    right = -1 if index % 2 else 1
    return left == right


def golden_log_convergent_ratio(index: int) -> Fraction:
    """The Fibonacci convergent ratio ``F_(n+1) / F_n`` used by ``aLog n``."""

    if index < 0:
        msg = "convergent index must be natural"
        raise ValueError(msg)
    return Fraction(golden_fib(index + 1), golden_fib(index))


def golden_log_convergent_log2(index: int) -> float:
    """Executable ``aLog index = log_2(F_(n+1)/F_n)``."""

    ratio = golden_log_convergent_ratio(index)
    return log2_ratio(ratio.numerator, ratio.denominator)


def golden_log_bishop_bracket(depth: int) -> GoldenLogBracket:
    """Return Lean's even/odd bracket for the GoldenLog limit.

    The lower endpoint is ``aLog(2*depth+2)`` and the upper endpoint is
    ``aLog(2*depth+1)``.  The even subsequence increases, the odd subsequence
    decreases, and Cassini makes these nested brackets shrink.
    """

    if depth < 0:
        msg = "depth must be natural"
        raise ValueError(msg)
    lower = golden_log_convergent_ratio(2 * depth + 2)
    upper = golden_log_convergent_ratio(2 * depth + 1)
    return GoldenLogBracket(
        lower=lower,
        upper=upper,
        lower_log2=log2_ratio(lower.numerator, lower.denominator),
        upper_log2=log2_ratio(upper.numerator, upper.denominator),
    )


def golden_log_convergence_witness(depth: int) -> GoldenLogConvergenceWitness:
    """Finite shadow of ``goldenLog_converges`` up to ``depth``.

    This checks the exact rational monotonicity/bracketing facts Lean proves
    from Cassini, plus the executable log-width bound
    ``a_(2i+1) <= a_(2i+2) + 1/(i+1)`` on the sampled prefix.
    """

    if depth < 1:
        msg = "depth must be at least 1"
        raise ValueError(msg)
    brackets = [golden_log_bishop_bracket(i) for i in range(depth + 1)]
    final = brackets[-1]
    even_ratios = [golden_log_convergent_ratio(2 * i + 2) for i in range(depth + 1)]
    odd_ratios = [golden_log_convergent_ratio(2 * i + 1) for i in range(depth + 1)]
    return GoldenLogConvergenceWitness(
        depth=depth,
        lower_ratio=final.lower,
        upper_ratio=final.upper,
        lower_log2=final.lower_log2,
        upper_log2=final.upper_log2,
        cassini=all(cassini_holds(i) for i in range(2 * depth + 4)),
        even_monotone=all(
            even_ratios[i] <= even_ratios[i + 1] for i in range(len(even_ratios) - 1)
        ),
        odd_antitone=all(odd_ratios[i + 1] <= odd_ratios[i] for i in range(len(odd_ratios) - 1)),
        nested_brackets=all(
            brackets[i].lower <= brackets[i + 1].lower
            and brackets[i + 1].upper <= brackets[i].upper
            and brackets[i].lower <= brackets[i].upper
            for i in range(len(brackets) - 1)
        ),
        width_bound=all(
            brackets[i].upper_log2 - brackets[i].lower_log2 <= 1 / (i + 1) + 1e-12
            for i in range(depth + 1)
        ),
    )


def _std_fib(n: int) -> int:
    if n < 0:
        msg = "fibonacci index must be natural"
        raise ValueError(msg)
    previous = 0
    current = 1
    for _ in range(n):
        previous, current = current, previous + current
    return previous
