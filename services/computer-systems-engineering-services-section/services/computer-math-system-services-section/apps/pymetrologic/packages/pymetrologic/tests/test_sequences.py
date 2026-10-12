"""Padovan ≤ Fibonacci — the integer shadow of ρ < φ (RelMath.Closure.Collatz.PadovanShape)."""

from __future__ import annotations

from pymetrologic import fibonacci, padovan, perron_eigenvalue
from pymetrologic.substitution import fibonacci_matrix, padovan_matrix


def test_sequence_values() -> None:
    assert [fibonacci(n) for n in range(7)] == [1, 1, 2, 3, 5, 8, 13]
    assert [padovan(n) for n in range(9)] == [1, 1, 1, 2, 2, 3, 4, 5, 7]


def test_padovan_le_fibonacci() -> None:
    # The eigenvalue extremality ρ < φ, shadowed: Padovan never outgrows Fibonacci.
    assert all(padovan(n) <= fibonacci(n) for n in range(30))


def test_growth_rates_match_the_eigenvalues() -> None:
    # Consecutive ratios approach the inflation factors.
    fib_ratio = fibonacci(30) / fibonacci(29)
    pad_ratio = padovan(60) / padovan(59)
    assert abs(fib_ratio - perron_eigenvalue(fibonacci_matrix())) < 1e-3
    assert abs(pad_ratio - perron_eigenvalue(padovan_matrix())) < 1e-3
