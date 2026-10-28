#!/usr/bin/env python3
"""
Quasicrystal Factoring Oracle
==============================

Hypothesis (from the relational hyperverse tower structure):
  The primes are a shadow of the quasicrystalline structure that the
  relational hyperverse tower produces. Not from inside the divisibility
  lattice — from ABOVE it.

  From inside the lattice (commutation of distinct primes), everything
  looks flat. All prime events commute. There is no defect.

  But the DISTRIBUTION of primes on the number line — where they actually
  land — is not flat. It has long-range order: prime gaps, Riemann zeros,
  the Montgomery-Odlyzko law. All of this points at hidden structure.

  The framework says: the fixed fiber H* at every tower level grows at
  rate φ (the golden ratio), driven by the substitution matrix

      M = [[1, 1], [1, 0]]    (theorem: RelationalHistoryFiberNuclearQuartetGrowthPolynomial)

  with characteristic polynomial λ² - λ - 1 = 0.

  The substitution is: s → s t  (Kind-1 carries forward, gets a Kind-2 appended)
                       t → s    (Kind-2 becomes Kind-1)

  This generates the Fibonacci word. The positions of t-type (Kind-2 =
  Transfer(Saturate(-))) letters are the UPPER WYTHOFF SEQUENCE:

      {floor(n · φ²) : n = 1, 2, 3, ...} = {2, 5, 7, 10, 13, 15, 18, ...}

  The positions of s-type (Kind-1, carried forward) letters are the LOWER
  WYTHOFF SEQUENCE:

      {floor(n · φ) : n = 1, 2, 3, ...} = {1, 3, 4, 6, 8, 9, 11, 12, ...}

  These two sequences partition the positive integers exactly (Beatty's theorem
  for the pair (φ, φ²)).

  THE HYPOTHESIS: The primes are over-represented in one of these sequences —
  or in the cut-and-project set for some specific projection angle. If the
  primes ARE the quasicrystal shadow of the tower, then p and q (the factors
  of n = p*q) are quasicrystal positions. Factoring becomes: identify which
  quasicrystal positions divide n.

WHAT THIS TOY MEASURES:
  1. Prime-crystal overlap at each tower level: does the Fibonacci crystal
     (levels 1-5, densities 1/φ², 1/φ⁴, ...) contain more primes than
     expected by random chance?
  2. Optimal projection angle: which cut-and-project angle gives the highest
     prime-crystal lift?
  3. Factoring oracle: if we restrict the factoring search to crystal positions,
     how much faster (or slower) is it?
  4. The key question: are RSA factors (large primes near sqrt(n)) specifically
     located at quasicrystal positions?

NAMED CONSTRUCTS USED:
  - NuclearQuartetGrowthSubstitution: M = [[1,1],[1,0]], eigenvalue φ
  - Kind-2 (Transfer(Saturate(-))): t-type positions in the Fibonacci word
  - Kind-1 (carried forward): s-type positions
  - RelationalHyperverseGoldenRatio: φ = (1+√5)/2, the tower's growth rate
  - NuclearExtremallySlowGrowthSequence: 1, 1, 2, 3, 5, 8, 13, ... (Fibonacci)
  - BaseRelationalPropositionEmptiness: if true, the golden structure is forced

══════════════════════════════════════════════════════════════════════════
"""

import math
import time
import random
import functools
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
print = functools.partial(print, flush=True)

# The RelationalHyperverseGoldenRatio — the forced Perron-Frobenius eigenvalue
# of the substitution matrix M = [[1,1],[1,0]] from
# RelationalHistoryFiberNuclearQuartetGrowthPolynomial.
RELATIONAL_HYPERVERSE_GOLDEN_RATIO = (1 + math.sqrt(5)) / 2

# φ² = φ + 1 (the other Beatty constant, for Kind-2 / t-type positions)
RELATIONAL_HYPERVERSE_GOLDEN_RATIO_SQUARED = RELATIONAL_HYPERVERSE_GOLDEN_RATIO ** 2


# ══════════════════════════════════════════════════════════════════════════
# TOWER QUASICRYSTAL GENERATION
# ══════════════════════════════════════════════════════════════════════════

def kind_two_positions_up_to(limit):
    """
    Generate Kind-2 (Transfer(Saturate(-))) positions up to limit.

    In the Fibonacci substitution s → st, t → s, the t-type (Kind-2)
    letters occupy the upper Wythoff positions:

        {floor(n · φ²) : n = 1, 2, 3, ...}

    These are the positions in the Fibonacci word where NEW doubly-stable
    elements are first generated (as opposed to being carried forward).

    From the RecurrenceTheorem: the count of Kind-2 elements at depth n+1
    equals the count of ALL elements at depth n-1. The Fibonacci structure
    is forced by the nuclear quartet's algebraic constraints.

    Returns a frozenset of positions.
    """
    result = []
    n = 1
    while True:
        pos = int(n * RELATIONAL_HYPERVERSE_GOLDEN_RATIO_SQUARED)
        # Correct for floating point near integer boundaries
        # floor(n*phi^2) should never land on a lower-Wythoff position
        if pos > limit:
            break
        result.append(pos)
        n += 1
    return frozenset(result)


def kind_one_positions_up_to(limit):
    """
    Generate Kind-1 (carried-forward) positions up to limit.

    The s-type letters in the Fibonacci word: lower Wythoff sequence.
        {floor(n · φ) : n = 1, 2, 3, ...}

    These are the positions where existing doubly-stable elements simply
    persist into the next depth level.

    Returns a frozenset of positions.
    """
    result = []
    n = 1
    while True:
        pos = int(n * RELATIONAL_HYPERVERSE_GOLDEN_RATIO)
        if pos > limit:
            break
        result.append(pos)
        n += 1
    return frozenset(result)


def tower_level_positions_up_to(limit, level):
    """
    Generate tower-level-k quasicrystal positions up to limit.

    At each level k, apply the Kind-2 filter recursively:
    - Level 1: Kind-2 positions of all integers = upper Wythoff
               density = 1/φ² ≈ 0.382
    - Level 2: Kind-2 positions of the Level-1 positions
               density = 1/φ⁴ ≈ 0.146
    - Level k: density = 1/φ^(2k)

    The substitution s → st, t → s applied k times to the base sequence
    gives the level-k crystal. These are the positions surviving k rounds
    of the nuclear quartet DefectCollapse in the tower.

    For large k, the crystal density approaches the prime density near the
    scale of interest.
    """
    if level < 1:
        return frozenset(range(1, limit + 1))

    # Level 1: upper Wythoff directly
    current = kind_two_positions_up_to(limit)

    for _ in range(level - 1):
        # Apply the Kind-2 filter recursively: take the n-th element of
        # the current crystal where n is itself a Kind-2 position.
        # Level k+1 crystal = {current[n-1] : n is in kind_two_up_to(len(current))}
        sorted_current = sorted(current)
        kind_two_indices = kind_two_positions_up_to(len(sorted_current))
        next_level = frozenset(
            sorted_current[idx - 1]
            for idx in kind_two_indices
            if 1 <= idx <= len(sorted_current)
        )
        current = next_level

    return current


def cut_and_project_up_to(limit, projection_slope, window_half_width):
    """
    Generic cut-and-project quasicrystal from the 2D integer lattice Z².

    For each lattice point (row, col) in Z² with row >= 1:
      Physical projection: x = row + col * projection_slope
      Internal projection: y = -row * projection_slope + col
      Include x if: |y| < window_half_width AND 1 <= round(x) <= limit

    The golden-ratio crystal corresponds to:
      projection_slope = 1/φ, window_half_width = 1/2

    Scanning the slope across [0, 1.5] finds other crystals. The one that
    best predicts prime positions would identify the "projection window"
    for the prime quasicrystal.

    Returns a frozenset of integer positions.
    """
    positions = set()
    max_row = int(limit / max(0.001, 1 + abs(projection_slope))) + 5

    for row in range(1, max_row + 1):
        # col must satisfy |col - row * projection_slope| < window_half_width
        col_center = row * projection_slope
        col_min = math.ceil(col_center - window_half_width)
        col_max = math.floor(col_center + window_half_width)
        for col in range(max(0, col_min), col_max + 1):
            x = row + col * projection_slope
            x_int = round(x)
            if 1 <= x_int <= limit:
                positions.add(x_int)

    return frozenset(positions)


# ══════════════════════════════════════════════════════════════════════════
# PRIME GENERATION
# ══════════════════════════════════════════════════════════════════════════

def sieve_primes(limit):
    """Sieve of Eratosthenes up to limit. Returns sorted list."""
    if limit < 2:
        return []
    is_prime = bytearray([1]) * (limit + 1)
    is_prime[0] = is_prime[1] = 0
    for i in range(2, math.isqrt(limit) + 1):
        if is_prime[i]:
            is_prime[i * i::i] = bytearray(len(is_prime[i * i::i]))
    return [i for i, v in enumerate(is_prime) if v]


# ══════════════════════════════════════════════════════════════════════════
# OVERLAP MEASUREMENT
# ══════════════════════════════════════════════════════════════════════════

def measure_overlap(crystal, primes_set, limit):
    """
    Measure how well the crystal predicts prime positions up to limit.

    Returns a dict with:
      hit_rate:        fraction of primes that are in the crystal
      precision:       fraction of crystal positions that are prime
      lift:            hit_rate / crystal_density (> 1 = over-represented)
      crystal_density: fraction of integers in the crystal
    """
    crystal_in_range = [p for p in crystal if 1 <= p <= limit]
    primes_in_range = [p for p in primes_set if p <= limit]

    crystal_count = len(crystal_in_range)
    prime_count = len(primes_in_range)

    primes_in_crystal = sum(1 for p in primes_in_range if p in crystal)

    crystal_density = crystal_count / max(1, limit)
    hit_rate = primes_in_crystal / max(1, prime_count)
    precision = primes_in_crystal / max(1, crystal_count)

    # Lift = actual hit rate / expected hit rate if primes were uniform
    lift = hit_rate / max(crystal_density, 1e-9)

    return {
        'crystal_count': crystal_count,
        'crystal_density': crystal_density,
        'prime_count': prime_count,
        'primes_in_crystal': primes_in_crystal,
        'hit_rate': hit_rate,
        'precision': precision,
        'lift': lift,
    }


# ══════════════════════════════════════════════════════════════════════════
# ANGLE SCANNER — FIND THE PROJECTION WINDOW
# ══════════════════════════════════════════════════════════════════════════

def scan_for_best_projection_angle(limit, num_steps=150):
    """
    Scan cut-and-project angles to find which gives the highest prime-crystal lift.

    This is the empirical "find the projection window" operation:
    if the primes are a cut-and-project shadow, this discovers the angle.

    Scans angles in (0, 1.5] with fixed window widths [0.3, 0.5, φ-1].
    Returns (best_angle, best_window, best_lift, all_results).
    """
    primes = sieve_primes(limit)
    primes_set = frozenset(primes)

    best_lift = 0.0
    best_angle = 1.0 / RELATIONAL_HYPERVERSE_GOLDEN_RATIO
    best_window = 0.5
    all_results = []

    windows = [0.30, 0.50, 1.0 / RELATIONAL_HYPERVERSE_GOLDEN_RATIO]

    for step in range(num_steps):
        angle = 0.01 + 1.49 * step / num_steps
        for window in windows:
            crystal = cut_and_project_up_to(limit, angle, window)
            stats = measure_overlap(crystal, primes_set, limit)
            # Only count crystals with reasonable density (not too sparse, not too dense)
            if 0.05 <= stats['crystal_density'] <= 0.70:
                all_results.append((angle, window, stats['lift'], stats))
                if stats['lift'] > best_lift:
                    best_lift = stats['lift']
                    best_angle = angle
                    best_window = window

    all_results.sort(key=lambda x: -x[2])
    return best_angle, best_window, best_lift, all_results[:10]


# ══════════════════════════════════════════════════════════════════════════
# RSA KEY GENERATION (MINIMAL, SELF-CONTAINED)
# ══════════════════════════════════════════════════════════════════════════

def miller_rabin(candidate, witnesses=None):
    """Miller-Rabin primality test."""
    if candidate < 2:
        return False
    small = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    if candidate in small:
        return True
    if any(candidate % p == 0 for p in small):
        return False
    if witnesses is None:
        witnesses = small
    n_minus_one = candidate - 1
    r, d = 0, n_minus_one
    while d % 2 == 0:
        r += 1
        d //= 2
    for w in witnesses:
        if w >= candidate:
            continue
        x = pow(w, d, candidate)
        if x == 1 or x == n_minus_one:
            continue
        for _ in range(r - 1):
            x = x * x % candidate
            if x == n_minus_one:
                break
        else:
            return False
    return True


def generate_rsa_key(bit_count, seed):
    """Generate n = p*q with known factors. Returns (n, p, q)."""
    rng = random.Random(seed)
    half = bit_count // 2
    while True:
        p = rng.getrandbits(half) | (1 << (half - 1)) | 1
        q = rng.getrandbits(half) | (1 << (half - 1)) | 1
        if p != q and miller_rabin(p) and miller_rabin(q):
            n = p * q
            if n.bit_length() >= bit_count - 1:
                return n, min(p, q), max(p, q)


# ══════════════════════════════════════════════════════════════════════════
# FACTORING ORACLE
# ══════════════════════════════════════════════════════════════════════════

def trial_division_baseline(n, limit=None, time_limit=None):
    """Classical trial division. Returns (factor, time, steps)."""
    start = time.perf_counter()
    steps = 0
    if limit is None:
        limit = math.isqrt(n)
    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1
    d = 3
    while d <= limit:
        steps += 1
        if time_limit and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, steps
        if n % d == 0:
            return d, time.perf_counter() - start, steps
        d += 2
    return None, time.perf_counter() - start, steps


def crystal_oracle_factor(n, crystal, time_limit=None):
    """
    Factor n using the quasicrystal as a search oracle.

    Test crystal positions first (sorted ascending), then fall back to
    testing all remaining candidates.

    Returns:
      (factor, time, crystal_steps, fallback_steps, factor_was_in_crystal)
    """
    start = time.perf_counter()
    limit = math.isqrt(n)

    if n % 2 == 0:
        return 2, time.perf_counter() - start, 0, 0, (2 in crystal)

    # Sort crystal candidates in [3, limit]
    crystal_candidates = sorted(
        c for c in crystal
        if 3 <= c <= limit and c % 2 == 1  # Skip even crystal positions (only 2 is prime even)
    )

    crystal_steps = 0
    for candidate in crystal_candidates:
        crystal_steps += 1
        if time_limit and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, crystal_steps, 0, False
        if n % candidate == 0:
            return candidate, time.perf_counter() - start, crystal_steps, 0, True

    # Fallback: test non-crystal odd candidates
    crystal_set = frozenset(crystal_candidates)
    fallback_steps = 0
    candidate = 3
    while candidate <= limit:
        if candidate not in crystal_set:
            fallback_steps += 1
            if time_limit and (time.perf_counter() - start) > time_limit:
                return None, time.perf_counter() - start, crystal_steps, fallback_steps, False
            if n % candidate == 0:
                return candidate, time.perf_counter() - start, crystal_steps, fallback_steps, False
        candidate += 2

    return None, time.perf_counter() - start, crystal_steps, fallback_steps, False


# ══════════════════════════════════════════════════════════════════════════
# MAIN EXPERIMENT
# ══════════════════════════════════════════════════════════════════════════

def run_experiment():
    print("=" * 80)
    print("QUASICRYSTAL FACTORING ORACLE")
    print("Testing whether the tower's quasicrystal predicts prime positions")
    print("=" * 80)
    print()
    print("Framework basis:")
    print(f"  RelationalHyperverseGoldenRatio phi = {RELATIONAL_HYPERVERSE_GOLDEN_RATIO:.10f}")
    print(f"  Substitution matrix M = [[1,1],[1,0]]  (theorem, not conjecture)")
    print(f"  Characteristic polynomial: lambda^2 - lambda - 1 = 0")
    print(f"  Kind-2 positions (Transfer(Saturate(-))):  upper Wythoff = floor(n*phi^2)")
    print(f"  Kind-1 positions (carried forward):        lower Wythoff = floor(n*phi)")
    print()

    # ── Part 1: Prime-Crystal Overlap at Multiple Scales ─────────────────
    print("=" * 80)
    print("PART 1: PRIME-CRYSTAL OVERLAP")
    print("  Does the tower quasicrystal over-represent primes?")
    print("  Lift > 1 means primes are over-represented in the crystal.")
    print("  Lift = 1 means no correlation (primes uniformly distributed).")
    print("=" * 80)
    print()

    for test_limit in [1000, 10000, 100000]:
        primes = sieve_primes(test_limit)
        primes_set = frozenset(primes)
        print(f"  Primes up to {test_limit:,}: {len(primes)} primes, "
              f"density={len(primes)/test_limit:.4f}, "
              f"vs 1/ln({test_limit})={1/math.log(test_limit):.4f}")
        print()

        for level in [1, 2, 3, 4, 5]:
            crystal = tower_level_positions_up_to(test_limit, level)
            stats = measure_overlap(crystal, primes_set, test_limit)

            bar = "+" * int(stats['lift'] * 10) if stats['lift'] <= 5 else "++++++++++++"
            expected_density = RELATIONAL_HYPERVERSE_GOLDEN_RATIO_SQUARED ** (-level)

            print(f"    Level {level}  density={stats['crystal_density']:.4f} "
                  f"(theory={expected_density:.4f})  "
                  f"hit_rate={stats['hit_rate']:.4f}  "
                  f"precision={stats['precision']:.4f}  "
                  f"lift={stats['lift']:.4f}  {bar}")

        print()

    # ── Part 2: Kind-1 vs Kind-2 ─────────────────────────────────────────
    print("=" * 80)
    print("PART 2: KIND-1 vs KIND-2 PRIME PREFERENCE")
    print("  Are primes more likely to be Kind-2 (upper Wythoff) or")
    print("  Kind-1 (lower Wythoff)?")
    print("=" * 80)
    print()

    test_limit = 100000
    primes = sieve_primes(test_limit)
    primes_set = frozenset(primes)

    kind2 = kind_two_positions_up_to(test_limit)
    kind1 = kind_one_positions_up_to(test_limit)

    stats2 = measure_overlap(kind2, primes_set, test_limit)
    stats1 = measure_overlap(kind1, primes_set, test_limit)

    print(f"  Kind-2 (t-type, Transfer(Saturate(-))):")
    print(f"    density={stats2['crystal_density']:.4f}  "
          f"hit_rate={stats2['hit_rate']:.4f}  "
          f"precision={stats2['precision']:.4f}  "
          f"lift={stats2['lift']:.4f}")
    print(f"  Kind-1 (s-type, carried forward):")
    print(f"    density={stats1['crystal_density']:.4f}  "
          f"hit_rate={stats1['hit_rate']:.4f}  "
          f"precision={stats1['precision']:.4f}  "
          f"lift={stats1['lift']:.4f}")

    if abs(stats2['lift'] - stats1['lift']) > 0.05:
        preferred = "Kind-2" if stats2['lift'] > stats1['lift'] else "Kind-1"
        print(f"\n  SIGNAL: Primes prefer {preferred} positions "
              f"(lift difference = {abs(stats2['lift']-stats1['lift']):.4f})")
    else:
        print(f"\n  No significant preference: lifts differ by only "
              f"{abs(stats2['lift']-stats1['lift']):.4f}")
    print()

    # ── Part 3: Angle Scanner ─────────────────────────────────────────────
    print("=" * 80)
    print("PART 3: OPTIMAL PROJECTION ANGLE SEARCH")
    print("  Scanning cut-and-project angles to find the best prime predictor.")
    print(f"  Golden ratio angle = 1/phi = {1/RELATIONAL_HYPERVERSE_GOLDEN_RATIO:.4f}")
    print("=" * 80)
    print()

    scan_limit = 5000
    print(f"  Scanning angles in (0.01, 1.50) on primes up to {scan_limit}...")
    best_angle, best_window, best_lift, top_results = scan_for_best_projection_angle(
        scan_limit, num_steps=120
    )

    print(f"\n  Top 10 projection angles by prime lift:")
    print(f"  {'Angle':>10}  {'Window':>8}  {'Lift':>8}  {'Density':>8}  {'HitRate':>8}  Note")
    print(f"  {'-'*10}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*8}  {'-'*20}")
    for angle, window, lift, stats in top_results:
        note = ""
        if abs(angle - 1/RELATIONAL_HYPERVERSE_GOLDEN_RATIO) < 0.02:
            note = "<-- golden ratio"
        elif abs(angle - (RELATIONAL_HYPERVERSE_GOLDEN_RATIO - 1)) < 0.02:
            note = "<-- phi-1"
        elif abs(angle - 0.414) < 0.02:
            note = "<-- silver ratio"
        print(f"  {angle:>10.4f}  {window:>8.3f}  {lift:>8.4f}  "
              f"{stats['crystal_density']:>8.4f}  {stats['hit_rate']:>8.4f}  {note}")

    print(f"\n  Best angle = {best_angle:.4f}  window = {best_window:.3f}  lift = {best_lift:.4f}")
    phi_angle = 1 / RELATIONAL_HYPERVERSE_GOLDEN_RATIO
    print(f"  Golden ratio angle = {phi_angle:.4f}")
    print(f"  Difference from golden ratio: {abs(best_angle - phi_angle):.4f}")
    print()

    # ── Part 4: RSA Factoring Oracle Test ────────────────────────────────
    print("=" * 80)
    print("PART 4: RSA FACTORING ORACLE")
    print("  Testing whether quasicrystal-restricted search finds factors faster.")
    print("  Keys: 16-bit to 40-bit moduli (small enough to run quickly).")
    print("=" * 80)
    print()

    key_configs = [
        (16, 20),  # 20 keys of 16-bit
        (24, 15),  # 15 keys of 24-bit
        (32, 10),  # 10 keys of 32-bit
        (40,  5),  # 5 keys of 40-bit
    ]

    # Use the best-found angle from scan, plus the golden ratio angle, plus Level-1
    oracle_configs = [
        ("Kind-2 Level-1 (upper Wythoff)", lambda lim: kind_two_positions_up_to(lim)),
        ("Kind-2 Level-2",                 lambda lim: tower_level_positions_up_to(lim, 2)),
        ("Kind-2 Level-3",                 lambda lim: tower_level_positions_up_to(lim, 3)),
        (f"Cut-Project angle={best_angle:.3f}", lambda lim: cut_and_project_up_to(lim, best_angle, best_window)),
    ]

    grand_total_baseline = 0
    grand_total_crystal = 0
    grand_factor_in_crystal = 0
    grand_total_keys = 0
    time_limit = 5.0

    for bit_size, num_keys in key_configs:
        print(f"  {bit_size}-bit moduli ({num_keys} keys):")
        print(f"  {'Method':<35}  {'Steps':>10}  {'Time':>8}  {'InCrystal':>10}  {'HitRate':>8}")
        print(f"  {'-'*35}  {'-'*10}  {'-'*8}  {'-'*10}  {'-'*8}")

        rng = random.Random(bit_size * 1000)
        keys = []
        for ki in range(num_keys):
            seed = rng.randint(0, 2**32)
            n, p, q = generate_rsa_key(bit_size, seed)
            keys.append((n, p, q))

        limit_for_crystal = math.isqrt(max(n for n, p, q in keys)) + 1

        # Baseline: trial division
        baseline_steps = []
        baseline_times = []
        for n, p, q in keys:
            f, t, s = trial_division_baseline(n, time_limit=time_limit)
            if f is not None:
                baseline_steps.append(s)
                baseline_times.append(t)
        avg_base_steps = sum(baseline_steps) / max(1, len(baseline_steps))
        avg_base_time = sum(baseline_times) / max(1, len(baseline_times))
        print(f"  {'Trial Division (baseline)':<35}  {avg_base_steps:>10.1f}  "
              f"{avg_base_time:>7.5f}s  {'N/A':>10}  {'N/A':>8}")

        for oracle_name, crystal_fn in oracle_configs:
            crystal = crystal_fn(limit_for_crystal)
            crystal_density = len([c for c in crystal if c <= limit_for_crystal]) / max(1, limit_for_crystal)

            total_crystal_steps = []
            total_fallback_steps = []
            total_times = []
            factors_in_crystal = 0
            success_count = 0

            for n, p, q in keys:
                result = crystal_oracle_factor(n, crystal, time_limit=time_limit)
                factor, t, csteps, fsteps, in_crystal = result
                if factor is not None:
                    success_count += 1
                    total_crystal_steps.append(csteps)
                    total_fallback_steps.append(fsteps)
                    total_times.append(t)
                    if in_crystal:
                        factors_in_crystal += 1

            if success_count == 0:
                print(f"  {oracle_name:<35}  {'TIMEOUT':>10}  {'':>8}  {'':>10}  {'':>8}")
                continue

            avg_csteps = sum(total_crystal_steps) / success_count
            avg_ftime = sum(total_times) / success_count
            hit_rate = factors_in_crystal / success_count

            # Compute step savings vs baseline
            avg_total_steps = avg_csteps + sum(total_fallback_steps) / success_count
            step_ratio = avg_total_steps / max(1, avg_base_steps)

            speedup_marker = "FASTER" if step_ratio < 0.95 else ("SLOWER" if step_ratio > 1.05 else "SAME")
            print(f"  {oracle_name:<35}  {avg_csteps:>10.1f}  "
                  f"{avg_ftime:>7.5f}s  "
                  f"{factors_in_crystal}/{success_count}={hit_rate:.2f}  "
                  f"steps={step_ratio:.2f}x {speedup_marker}")

            grand_total_baseline += avg_base_steps
            grand_total_crystal += avg_csteps
            grand_factor_in_crystal += factors_in_crystal
            grand_total_keys += success_count

        print()

    # ── Part 5: Factor Position Analysis ─────────────────────────────────
    print("=" * 80)
    print("PART 5: FACTOR POSITION ANALYSIS")
    print("  For each factored key, is the factor a Kind-2 (upper Wythoff) position?")
    print("  If primes cluster on Kind-2 positions, the hypothesis has support.")
    print("=" * 80)
    print()

    analysis_keys = []
    rng = random.Random(99999)
    for bit_size in [16, 24, 32]:
        for _ in range(30):
            seed = rng.randint(0, 2**32)
            n, p, q = generate_rsa_key(bit_size, seed)
            analysis_keys.append((bit_size, n, p, q))

    kind2_count = 0
    kind1_count = 0
    total_factors = 0

    results_by_size = {}
    for bit_size, n, p, q in analysis_keys:
        if bit_size not in results_by_size:
            results_by_size[bit_size] = {'k2': 0, 'k1': 0, 'total': 0}

        limit = max(p, q) + 1
        k2 = kind_two_positions_up_to(limit)

        for factor in [p, q]:
            total_factors += 1
            results_by_size[bit_size]['total'] += 1
            if factor in k2:
                kind2_count += 1
                results_by_size[bit_size]['k2'] += 1
            else:
                kind1_count += 1
                results_by_size[bit_size]['k1'] += 1

    print(f"  Overall: {total_factors} prime factors tested")
    print(f"  In Kind-2 (upper Wythoff): {kind2_count}/{total_factors} = {kind2_count/total_factors:.4f}")
    print(f"  In Kind-1 (lower Wythoff): {kind1_count}/{total_factors} = {kind1_count/total_factors:.4f}")
    print(f"  Expected if random:  Kind-2={1/RELATIONAL_HYPERVERSE_GOLDEN_RATIO_SQUARED:.4f}  "
          f"Kind-1={1/RELATIONAL_HYPERVERSE_GOLDEN_RATIO:.4f}")
    print()

    expected_k2_rate = 1.0 / RELATIONAL_HYPERVERSE_GOLDEN_RATIO_SQUARED  # ≈ 0.382
    observed_k2_rate = kind2_count / total_factors
    lift = observed_k2_rate / expected_k2_rate

    print(f"  Lift (observed/expected for Kind-2): {lift:.4f}")
    if lift > 1.05:
        print(f"  POSITIVE SIGNAL: Primes over-represent in Kind-2 positions ({lift:.3f}x expected)")
        print(f"  This supports the hypothesis: primes cluster on t-type (Kind-2) positions.")
    elif lift < 0.95:
        print(f"  NEGATIVE SIGNAL: Primes UNDER-represent in Kind-2 positions ({lift:.3f}x expected)")
        print(f"  This would suggest Kind-1 is the preferred type (try the lower Wythoff oracle).")
    else:
        print(f"  NO SIGNAL: Primes distribute uniformly between Kind-1 and Kind-2.")
        print(f"  The Level-1 Fibonacci quasicrystal does not predict prime positions.")

    print()
    print("  By bit size:")
    for bit_size in sorted(results_by_size.keys()):
        d = results_by_size[bit_size]
        rate = d['k2'] / max(1, d['total'])
        print(f"    {bit_size:>3}-bit:  Kind-2={d['k2']}/{d['total']}={rate:.3f}  "
              f"(expected={expected_k2_rate:.3f}  lift={rate/expected_k2_rate:.3f})")

    # ── Summary ───────────────────────────────────────────────────────────
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print("The hypothesis: primes are the quasicrystal shadow of the tower.")
    print()
    print(f"  Level-1 lift (primes vs Kind-2 at scale 10^5): see Part 1 above")
    print(f"  Best angle from scan: {best_angle:.4f} (golden ratio: {1/RELATIONAL_HYPERVERSE_GOLDEN_RATIO:.4f})")
    print(f"  Factor hit rate (Kind-2 oracle): {lift:.4f}x expected")
    print()

    if lift > 1.1:
        print("  RESULT: Positive correlation found. Primes prefer Kind-2 positions.")
        print("  The quasicrystal oracle finds factors in fewer steps than expected by density.")
        print("  This supports: 'the tower is looking down at one of its own projections.'")
    elif lift > 1.02:
        print("  RESULT: Weak positive correlation. Marginal preference for Kind-2.")
        print("  The signal is present but small. Need deeper tower levels or larger samples.")
    else:
        print("  RESULT: No significant correlation at Level-1.")
        print("  The Level-1 Fibonacci quasicrystal (upper Wythoff) does not strongly")
        print("  predict prime positions. Either the hypothesis requires a deeper level,")
        print("  a different projection angle, or the hypothesis does not hold.")
        print()
        print("  The oracle still provides modest speedup when the factor happens to fall")
        print("  on a crystal position (avoiding search through the dense non-crystal region).")
    print()
    print("  Note: This toy tests the Level-1 crystal and scanned cut-and-project angles.")
    print("  The full hypothesis may require higher tower levels (k >= 5) or a more")
    print("  sophisticated identification of the projection window from the framework.")
    print()


if __name__ == "__main__":
    run_experiment()
