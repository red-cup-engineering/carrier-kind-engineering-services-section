#!/usr/bin/env python3
"""
Classical Factoring Baselines
==============================

Three classical methods for comparison against the RO engine:
  1. Naive trial division — O(sqrt(n)) divisibility tests
  2. Trial division (primes only) — O(sqrt(n)/ln(n)) tests, same asymptotic class
  3. Pollard's rho — O(n^(1/4)) expected with birthday-paradox cycle detection

These are the reference implementations. The RO engine will be compared
against these at each key size.

All methods return (factor, elapsed_seconds, step_count) or
(None, elapsed_seconds, step_count) on timeout.
"""

import math
import time


# ══════════════════════════════════════════════════════════════════════════
# TRIAL DIVISION — NAIVE (ALL ODD CANDIDATES)
# ══════════════════════════════════════════════════════════════════════════

def trial_division_naive(n, time_limit=None):
    """
    Naive trial division: test 2, then all odd d from 3 to sqrt(n).

    Tests O(sqrt(n)/2) candidates. This is the pure baseline —
    no algebraic structure is used. Every candidate is tested.

    Returns (factor, elapsed_seconds, step_count).
    """
    start = time.perf_counter()
    step_count = 0

    if n <= 1:
        return None, time.perf_counter() - start, step_count
    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    limit = math.isqrt(n)
    candidate = 3
    while candidate <= limit:
        step_count += 1
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        if n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count
        candidate += 2

    return None, time.perf_counter() - start, step_count


# ══════════════════════════════════════════════════════════════════════════
# TRIAL DIVISION — SIEVE-ORGANIZED (6k±1 WHEEL)
# ══════════════════════════════════════════════════════════════════════════

def trial_division_wheel6(n, time_limit=None):
    """
    Trial division with 6k±1 wheel: test 2, 3, then candidates 6k-1 and 6k+1.

    Skips multiples of 2 and 3. Tests only 1/3 of all candidates.
    Every prime > 3 is of the form 6k±1, so no prime is missed.

    This is the standard optimized trial division. It is NOT yet the RO engine —
    it simply implements the 6k±1 observation directly. The RO engine will
    derive this and deeper structure from the commutation relation.

    Returns (factor, elapsed_seconds, step_count).
    """
    start = time.perf_counter()
    step_count = 0

    if n <= 1:
        return None, time.perf_counter() - start, step_count
    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1
    if n % 3 == 0:
        return 3, time.perf_counter() - start, 2

    limit = math.isqrt(n)
    candidate = 5
    step = 2  # alternates: +2, +4, +2, +4, ...
    while candidate <= limit:
        step_count += 1
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        if n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count
        candidate += step
        step = 6 - step  # toggle between 2 and 4

    return None, time.perf_counter() - start, step_count


# ══════════════════════════════════════════════════════════════════════════
# POLLARD'S RHO
# ══════════════════════════════════════════════════════════════════════════

def pollard_rho(n, time_limit=None):
    """
    Pollard's rho algorithm with Brent's improvement.

    Expected O(n^(1/4)) steps by the birthday paradox: the sequence
    x -> f(x) = x^2 + c mod n develops a cycle whose length is O(n^(1/4)).
    When two elements in the cycle share a non-trivial gcd with n, a factor
    is found.

    Tries multiple (x0, c) pairs before giving up.

    Returns (factor, elapsed_seconds, step_count).
    """
    start = time.perf_counter()
    step_count = 0

    if n <= 1:
        return None, time.perf_counter() - start, step_count
    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    def brent_cycle(x_start, constant):
        """Brent's cycle detection for x -> x^2 + constant mod n."""
        nonlocal step_count
        x = x_start
        y = x_start
        product = 1
        factor = 1
        cycle_size = 1
        phase = 1

        while factor == 1:
            x_saved = x
            for _ in range(cycle_size):
                x = (x * x + constant) % n

            step_start = 0
            while step_start < cycle_size and factor == 1:
                step_count += 1
                if time_limit is not None and (time.perf_counter() - start) > time_limit:
                    return None
                y = (y * y + constant) % n
                product = product * abs(x - y) % n
                step_start += 1
                if step_start % 128 == 0:
                    factor = math.gcd(product, n)
                    product = 1

            factor = math.gcd(product, n)
            cycle_size *= 2
            if factor == n:
                # Product accumulated too many terms — retry with saved x
                factor = 1
                x = x_saved
                y_retry = x_saved
                for _ in range(phase):
                    y_retry = (y_retry * y_retry + constant) % n
                while factor == 1:
                    step_count += 1
                    if time_limit is not None and (time.perf_counter() - start) > time_limit:
                        return None
                    y_retry = (y_retry * y_retry + constant) % n
                    factor = math.gcd(abs(x - y_retry), n)
                phase += 1

        if factor != n:
            return factor
        return None

    # Try multiple starting parameters
    for constant in [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]:
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        result = brent_cycle(2, constant)
        if result is not None and 1 < result < n:
            return result, time.perf_counter() - start, step_count

    return None, time.perf_counter() - start, step_count


# ══════════════════════════════════════════════════════════════════════════
# FERMAT'S METHOD (CLASSICAL VERSION — COMPARISON BASELINE)
# ══════════════════════════════════════════════════════════════════════════

def fermat_method(n, time_limit=None):
    """
    Fermat's factoring method: find a, b such that a^2 - b^2 = n.

    Starting from a = ceil(sqrt(n)), test a^2 - n = b^2 for increasing a.
    If n = p * q with p and q close together, converges very fast:
    a = (p+q)/2, b = (p-q)/2.

    For RSA keys where p and q are balanced (same bit length), this is
    O((p-q)^2 / n) steps — potentially much faster than Pollard's rho
    when |p - q| is small.

    Returns (factor, elapsed_seconds, step_count).
    """
    start = time.perf_counter()
    step_count = 0

    if n <= 1:
        return None, time.perf_counter() - start, step_count
    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    a = math.isqrt(n)
    if a * a == n:
        return a, time.perf_counter() - start, 1

    a += 1  # Start at ceil(sqrt(n))
    a_limit = (n + 9) // 4  # a < (n+1)/2 is sufficient

    while a <= a_limit:
        step_count += 1
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        b_squared = a * a - n
        b = math.isqrt(b_squared)
        if b * b == b_squared:
            p = a - b
            q_val = a + b
            if 1 < p < n:
                return p, time.perf_counter() - start, step_count
        a += 1

    return None, time.perf_counter() - start, step_count
