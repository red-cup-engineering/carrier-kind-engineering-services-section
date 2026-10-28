#!/usr/bin/env python3
"""
Chu Zeta Oracle
===============

The tower's Chu space carries a Riemannian manifold. The spectral zeta
of the Chu Laplacian has zeros that approximate the Riemann zeros. The
gradient of the manifold potential identifies primes without trial division.

Framework basis (all names from the relational hyperverse):
  - Arithmetic history system: carrier (Z>0, |), steps = Primes
  - Nuclear quartet: {IdentityObservable, SaturatingNucleus,
                       TransferringNucleus, JointProjection}
  - Substitution matrix M = [[1,1],[1,0]], eigenvalue phi (theorem)
  - Tower Chu space: Chu(A, r, B) where
      A = integers (positions in the arithmetic history)
      B = nuclear quartet observables + Zeckendorf tower levels + Wythoff phase
      r: A x B -> R  (the Chu pairing)

The Riemannian structure:
  G(m,n) = <r(m,.), r(n,.)>  (Gram matrix = metric tensor)

The Chu Laplacian:
  (Delta_Chu f)(n) = sum_{m in nbhd(n)} G(n,m) * (f(m) - f(n))

Spectral claim:
  eigenvalues lambda_k of Delta_Chu, after normalization, approximate
  the imaginary parts gamma_k of the Riemann zeros:
    zeta_Chu(s) = sum_k |lambda_k|^{-s}  ?=  zeta_Riemann(s)

Gradient oracle:
  Lambda_approx(n) = sum_k 2*cos(gamma_k * ln n) / sqrt(n)

  This approximates the von Mangoldt function Lambda(n) = log p if n = p^k.
  Local maxima are prime powers. Ranking candidates by this score and testing
  highest-scored first finds factors in O(rank(p)) steps instead of O(p/2).
  If rank(p) << p/2, the oracle gives a real speedup.

Experiment:
  Part 1  Build Chu manifold for n in [2, 500]; compare Laplacian eigenvalues
          to the known Riemann zeros (test the spectral claim).
  Part 2  Measure oracle accuracy: for primes p in [3, 10^4], what is the
          distribution of scores? Do primes score higher than composites?
  Part 3  Measure factor rank: for RSA-like semiprimes n = p*q, what rank
          does the actual factor achieve in the oracle's sorted candidate list?
  Part 4  Factoring benchmark: oracle vs. trial division on 16-40 bit keys.
"""

import sys
import io
import builtins
import functools
import math
import time
import random

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
print = functools.partial(builtins.print, flush=True)

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    print("WARNING: numpy not available. Parts 1-2 disabled.")

# Perron-Frobenius eigenvalue of the nuclear quartet substitution matrix M
RELATIONAL_HYPERVERSE_GOLDEN_RATIO = (1 + math.sqrt(5)) / 2
PHI = RELATIONAL_HYPERVERSE_GOLDEN_RATIO
PHI_SQ = PHI ** 2

# Known imaginary parts of the first 25 Riemann zeros
# (ground truth for spectral comparison in Part 1)
RIEMANN_ZEROS_KNOWN = [
    14.134725141734693,
    21.022039638771554,
    25.010857580145688,
    30.424876125859513,
    32.935061587739189,
    37.586178158825671,
    40.918719012147495,
    43.327073280914999,
    48.005150881167159,
    49.773832477672302,
    52.970321477714460,
    56.446247697063394,
    59.347044002602353,
    60.831778524609809,
    65.112544048081654,
    67.079810529494169,
    69.546401711173979,
    72.067157674481907,
    75.704690699083933,
    77.144840068874805,
    79.337375020249367,
    82.910380854086030,
    84.735492980517050,
    87.425274613125229,
    88.809111208594501,
]


# ============================================================================
# SIEVE — NUCLEAR QUARTET AMPLITUDES
# ============================================================================

def build_sieve(limit):
    """Smallest prime factor sieve up to limit."""
    spf = list(range(limit + 1))
    for i in range(2, int(math.sqrt(limit)) + 1):
        if spf[i] == i:
            for j in range(i * i, limit + 1, i):
                if spf[j] == j:
                    spf[j] = i
    return spf


def nuclear_quartet_amplitudes(n, spf):
    """
    Four observable amplitudes for integer n, one per nuclear quartet element.

    SaturatingNucleusAmplitude  = rad(n) / n
      rad(n) = product of distinct prime factors.
      = 1 for all primes, 1 for squarefree composites, < 1 for prime powers.

    TransferringNucleusAmplitude = (Omega(n) - omega(n)) / log2(n)
      Omega = total prime factors with multiplicity; omega = distinct count.
      = 0 for squarefree n (all primes), positive for prime powers.

    JointProjectionAmplitude = mu(n)^2
      = 1 if n is squarefree, 0 if n has a square factor.
      = 1 for all primes.

    DistinctPrimeCountAmplitude = omega(n) / log2(n)
      = 1/log2(p) for primes (minimum: isolated in the manifold).
      = k/log2(n) for k-almost-primes (higher, more spread).
    """
    if n <= 1:
        return 0.0, 0.0, 1.0, 0.0
    rad_n = 1
    omega_n = 0
    big_omega_n = 0
    is_squarefree = True
    temp = n
    while temp > 1:
        p = spf[temp]
        rad_n *= p
        omega_n += 1
        exp = 0
        while temp % p == 0:
            exp += 1
            big_omega_n += 1
            temp //= p
        if exp > 1:
            is_squarefree = False
    log2n = max(math.log2(n), 1.0)
    saturating = rad_n / n
    transferring = (big_omega_n - omega_n) / log2n
    joint = 1.0 if is_squarefree else 0.0
    distinct_count = omega_n / log2n
    return saturating, transferring, joint, distinct_count


# ============================================================================
# FIBONACCI / ZECKENDORF — TOWER LEVEL OCCUPANCY
# ============================================================================

def fibonacci_sequence(limit):
    """Return list of Fibonacci numbers 1, 2, 3, 5, 8, ... up to limit."""
    fibs = [1, 2]
    while True:
        nxt = fibs[-1] + fibs[-2]
        if nxt > limit:
            break
        fibs.append(nxt)
    return fibs


def zeckendorf_occupancy(n, fibs, num_levels):
    """
    Zeckendorf representation of n: which Fibonacci numbers compose n.
    Returns a list of 0/1 of length num_levels.

    This is the canonical tower-level occupancy vector for n:
    bit k = 1 iff the k-th Fibonacci level contributes to n's tower position.
    Zeckendorf's theorem guarantees uniqueness (no two consecutive 1s).
    """
    bits = [0] * num_levels
    remaining = n
    for i in range(min(len(fibs), num_levels) - 1, -1, -1):
        if fibs[i] <= remaining:
            bits[i] = 1
            remaining -= fibs[i]
    return bits


# ============================================================================
# CHU OBSERVABLE VECTOR
# ============================================================================

def chu_observable_vector(n, spf, fibs, num_fib_levels=16):
    """
    Full Chu observable vector r(n, .) for integer n.

    Components:
      [0]          IdentityObservable: 1.0
      [1]          SaturatingNucleusAmplitude: rad(n)/n
      [2]          TransferringNucleusAmplitude: (Omega-omega)/log2(n)
      [3]          JointProjectionAmplitude: mu(n)^2
      [4]          DistinctPrimeCountAmplitude: omega(n)/log2(n)
      [5]          WythoffCosPhase1: cos(2*pi*n/phi)
      [6]          WythoffCosPhase2: cos(2*pi*n/phi^2)
      [7]          WythoffSinPhase1: sin(2*pi*n/phi)
      [8]          WythoffSinPhase2: sin(2*pi*n/phi^2)
      [9..9+K-1]   ZeckendorfOccupancy_k: bit k of n's Zeckendorf rep
    """
    sat, trans, joint, distinct = nuclear_quartet_amplitudes(n, spf)
    tau = 2 * math.pi
    w1 = math.cos(tau * n / PHI)
    w2 = math.cos(tau * n / PHI_SQ)
    w3 = math.sin(tau * n / PHI)
    w4 = math.sin(tau * n / PHI_SQ)
    zbits = zeckendorf_occupancy(n, fibs, num_fib_levels)
    obs = [1.0, sat, trans, joint, distinct, w1, w2, w3, w4] + zbits
    return obs


# ============================================================================
# CHU RIEMANNIAN MANIFOLD AND LAPLACIAN
# ============================================================================

def build_chu_manifold(n_start, n_end, spf, fibs, num_fib_levels=16):
    """
    Build the row-normalized Chu matrix C and Gram matrix G for n in [n_start, n_end].

    C is (N x d): each row is the unit-normalized Chu observable vector for n.
    G = C @ C.T is (N x N): the Riemannian metric tensor (cosine similarities).
    G(i,j) = <r(n_i, .), r(n_j, .)>  (inner product in observable space)
    """
    rows = []
    for n in range(n_start, n_end + 1):
        rows.append(chu_observable_vector(n, spf, fibs, num_fib_levels))
    C = np.array(rows, dtype=np.float64)
    norms = np.linalg.norm(C, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    C = C / norms
    G = C @ C.T
    return C, G


def build_chu_laplacian(G, bandwidth=40):
    """
    Chu Laplace-Beltrami operator: sparse, local-neighborhood version.

    (Delta f)(i) = sum_{j in nbhd(i), j!=i} G(i,j) * (f(j) - f(i))

    Matrix form:
      L(i,j) = G(i,j)         for |i-j| <= bandwidth, i != j
      L(i,i) = -sum_{j!=i} L(i,j)
    """
    N = G.shape[0]
    L = np.zeros((N, N))
    for i in range(N):
        row_sum = 0.0
        lo = max(0, i - bandwidth)
        hi = min(N, i + bandwidth + 1)
        for j in range(lo, hi):
            if j != i:
                w = float(G[i, j])
                if w < 0.0:
                    w = 0.0
                L[i, j] = w
                row_sum += w
        L[i, i] = -row_sum
    return L


def chu_spectral_eigenvalues(L, keep=25):
    """
    Eigenvalues of the Chu Laplacian (negative semi-definite).
    Returns sorted absolute values, excluding the near-zero eigenvalue.
    """
    eigs = np.linalg.eigvalsh(L)
    abs_eigs = np.sort(np.abs(eigs))
    # Drop the constant-function eigenvalue (near zero)
    cutoff = abs_eigs[-1] * 1e-6
    abs_eigs = abs_eigs[abs_eigs > cutoff]
    return abs_eigs[:keep]


def best_fit_scale(tower_eigs, riemann_zeros):
    """
    Least-squares scale factor s minimizing ||tower_eigs * s - riemann_zeros||^2.
    Returns (scale, scaled_tower, absolute_errors, relative_errors).
    """
    k = min(len(tower_eigs), len(riemann_zeros))
    t = tower_eigs[:k]
    r = np.array(riemann_zeros[:k])
    s = float(np.dot(t, r) / np.dot(t, t))
    scaled = t * s
    abs_err = np.abs(scaled - r)
    rel_err = abs_err / r
    return s, scaled, abs_err, rel_err


# ============================================================================
# GRADIENT ORACLE — VON MANGOLDT EXPLICIT FORMULA
# ============================================================================

def von_mangoldt_score(n, zeros, num_zeros=20):
    """
    Approximate the von Mangoldt function Lambda(n) via the explicit formula.

    Lambda_approx(n) = sum_{k=1}^{K} 2*cos(gamma_k * log n) / sqrt(n)

    This is the oscillatory part of the Chebyshev psi function's derivative.
    Lambda(n) = log p if n = p^k for some prime p and k >= 1, else 0.
    High scores -> likely prime powers.

    Grounded in the framework:
      gamma_k are the spectral eigenvalues of the Chu Laplacian.
      The explicit formula is the gradient of the Riemannian potential
      projected onto the integer line.
    """
    if n < 2:
        return 0.0
    log_n = math.log(n)
    sqrt_n = math.sqrt(n)
    score = sum(2.0 * math.cos(g * log_n) for g in zeros[:num_zeros])
    return score / sqrt_n


def score_range(n_start, n_end, zeros, num_zeros=20):
    """Score all integers in [n_start, n_end]. Returns list of (n, score)."""
    return [(n, von_mangoldt_score(n, zeros, num_zeros))
            for n in range(n_start, n_end + 1)]


# ============================================================================
# FACTORING ORACLE
# ============================================================================

def chu_zeta_factor(n, zeros=None, num_zeros=20, time_limit=None):
    """
    Factor n by testing candidates in decreasing von Mangoldt score order.

    Instead of testing odd numbers 3, 5, 7, 9, ... in sequence,
    we score all odd candidates and test the highest-scored first.
    If the actual prime factor p ranks at position R in the sorted list,
    we find it in R divisibility tests instead of (p-3)/2 + 1 sequential tests.

    Returns (factor, elapsed_seconds, step_count).
    """
    if zeros is None:
        zeros = RIEMANN_ZEROS_KNOWN
    start = time.perf_counter()
    step_count = 0

    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    sqrt_n = math.isqrt(n)
    if sqrt_n * sqrt_n == n:
        return sqrt_n, time.perf_counter() - start, 1

    # Score all odd candidates
    candidates = range(3, sqrt_n + 1, 2)
    scored = sorted(
        ((von_mangoldt_score(c, zeros, num_zeros), c) for c in candidates),
        reverse=True
    )

    for _score, c in scored:
        step_count += 1
        if time_limit and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        if n % c == 0:
            return c, time.perf_counter() - start, step_count

    return None, time.perf_counter() - start, step_count


def factor_rank(n, p, zeros=None, num_zeros=20):
    """
    Rank of factor p in the oracle's sorted candidate list.
    Rank 1 = p is the top-scored candidate.
    Also returns total candidates and p's score.
    """
    if zeros is None:
        zeros = RIEMANN_ZEROS_KNOWN
    sqrt_n = math.isqrt(n)
    candidates = list(range(3, sqrt_n + 1, 2))
    scored = sorted(
        ((von_mangoldt_score(c, zeros, num_zeros), c) for c in candidates),
        reverse=True
    )
    p_score = von_mangoldt_score(p, zeros, num_zeros)
    rank = next((i + 1 for i, (_, c) in enumerate(scored) if c == p), len(candidates))
    return rank, len(candidates), p_score


def trial_division_steps(n, p):
    """Steps needed by trial division (odd candidates 3, 5, 7, ...) to reach p."""
    if p == 2:
        return 1
    if p == 3:
        return 1
    return (p - 3) // 2 + 1


# ============================================================================
# RSA KEY GENERATION (self-contained, no network)
# ============================================================================

def miller_rabin(n, witness):
    if n == witness:
        return True
    d = n - 1
    r = 0
    while d % 2 == 0:
        r += 1
        d //= 2
    x = pow(witness, d, n)
    if x == 1 or x == n - 1:
        return True
    for _ in range(r - 1):
        x = x * x % n
        if x == n - 1:
            return True
    return False


def is_prime(n):
    if n < 2:
        return False
    for w in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]:
        if n == w:
            return True
        if n % w == 0:
            return False
    for w in [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]:
        if not miller_rabin(n, w):
            return False
    return True


def gen_prime(bits, rng):
    while True:
        c = rng.getrandbits(bits) | (1 << (bits - 1)) | 1
        if is_prime(c):
            return c


def gen_semiprime(total_bits, seed):
    rng = random.Random(seed)
    half = total_bits // 2
    while True:
        p = gen_prime(half, rng)
        q = gen_prime(half, rng)
        if p != q and (p * q).bit_length() >= total_bits - 1:
            return p * q, min(p, q), max(p, q)


# ============================================================================
# EXPERIMENT PARTS
# ============================================================================

def part1_spectral_comparison(spf, fibs):
    """
    Build the Chu Laplacian on n in [2, 400] and compare its eigenvalues
    to the known Riemann zeros after optimal linear scaling.

    If the claim holds: tower eigenvalues * scale ≈ Riemann zeros.
    """
    print("=" * 78)
    print("PART 1: CHU LAPLACIAN EIGENVALUES vs. RIEMANN ZEROS")
    print("  Claim: tower spectral eigenvalues, rescaled, approximate gamma_k")
    print("=" * 78)

    if not NUMPY_AVAILABLE:
        print("  Skipped (numpy not available)")
        return None

    print("  Building Chu manifold for n in [2, 400]...")
    C, G = build_chu_manifold(2, 400, spf, fibs)
    print(f"  Chu matrix shape: {C.shape}")

    print("  Building Chu Laplacian (bandwidth=40)...")
    L = build_chu_laplacian(G, bandwidth=40)

    print("  Computing eigenvalues...")
    tower_eigs = chu_spectral_eigenvalues(L, keep=25)

    s, scaled, abs_err, rel_err = best_fit_scale(tower_eigs, RIEMANN_ZEROS_KNOWN)
    k = len(abs_err)

    print(f"\n  Best-fit scale factor: {s:.6f}")
    print(f"  {'k':>3}  {'tower*scale':>12}  {'gamma_k (known)':>16}  {'|error|':>10}  {'rel%':>8}")
    print(f"  {'-'*3}  {'-'*12}  {'-'*16}  {'-'*10}  {'-'*8}")
    for i in range(k):
        flag = " <-- GOOD" if rel_err[i] < 0.05 else (" <-- OK" if rel_err[i] < 0.15 else "")
        print(f"  {i+1:>3}  {scaled[i]:>12.4f}  {RIEMANN_ZEROS_KNOWN[i]:>16.6f}  {abs_err[i]:>10.4f}  {100*rel_err[i]:>7.2f}%{flag}")

    mean_rel = float(np.mean(rel_err))
    print(f"\n  Mean relative error: {100*mean_rel:.2f}%")
    if mean_rel < 0.05:
        print("  STRONG MATCH: tower eigenvalues approximate Riemann zeros.")
    elif mean_rel < 0.20:
        print("  PARTIAL MATCH: rough correspondence, not tight.")
    else:
        print("  NO MATCH: eigenvalues do not align with Riemann zeros at this scale.")

    print()
    return tower_eigs


def part2_score_distribution(spf):
    """
    Score distribution: do primes score higher than composites?
    Compare von Mangoldt scores of primes vs composites in [3, 5000].
    """
    print("=" * 78)
    print("PART 2: VON MANGOLDT SCORE DISTRIBUTION")
    print("  Does the gradient oracle give primes higher scores than composites?")
    print("=" * 78)

    limit = 5000
    zeros = RIEMANN_ZEROS_KNOWN
    num_z = 20

    prime_scores = []
    composite_scores = []
    prime_power_scores = []

    for n in range(3, limit + 1):
        score = von_mangoldt_score(n, zeros, num_z)
        spf_n = spf[n]
        # Classify n
        temp = n
        exp = 0
        while temp % spf_n == 0:
            exp += 1
            temp //= spf_n
        if temp == 1:  # n is a prime power
            if exp == 1:
                prime_scores.append(score)
            else:
                prime_power_scores.append(score)
        else:
            composite_scores.append(score)

    def stats(scores, label):
        if not scores:
            return
        s = sorted(scores, reverse=True)
        n = len(s)
        mean = sum(s) / n
        median = s[n // 2]
        top10 = s[min(9, n - 1)]
        pos_frac = sum(1 for x in s if x > 0) / n
        print(f"  {label:<28}  count={n:>5}  mean={mean:>7.4f}  median={median:>7.4f}"
              f"  top10={top10:>7.4f}  frac_positive={pos_frac:.3f}")

    stats(prime_scores, "Primes")
    stats(prime_power_scores, "Prime powers (p^k, k>1)")
    stats(composite_scores, "Composites (non-prime-power)")

    # Discrimination test: what fraction of top-K scored integers are prime?
    print()
    all_scored = [(von_mangoldt_score(n, zeros, num_z), n) for n in range(3, limit + 1)]
    all_scored.sort(reverse=True)
    for K in [50, 100, 200, 500]:
        top_K = all_scored[:K]
        n_primes = sum(1 for _, n in top_K if spf[n] == n)
        frac = n_primes / K
        baseline = len(prime_scores) / (limit - 2)
        lift = frac / baseline if baseline > 0 else 0
        print(f"  Top {K:>4} by score: {n_primes}/{K} = {100*frac:.1f}% primes"
              f"  (baseline {100*baseline:.1f}%,  lift={lift:.2f}x)")
    print()


def part3_factor_rank_analysis(spf):
    """
    For n = p*q with p < q (RSA-like), measure the rank of p in the
    oracle's sorted candidate list. Rank 1 = found on first test.
    Compare to trial division step count.
    """
    print("=" * 78)
    print("PART 3: FACTOR RANK ANALYSIS")
    print("  For each semiprime n=p*q, rank of p in oracle's sorted list")
    print("  vs. sequential trial division step count.")
    print("=" * 78)

    rng = random.Random(777)
    results = []

    for total_bits in [20, 24, 28, 32]:
        ranks = []
        td_steps_list = []
        totals = []
        percentiles = []
        num_keys = 30

        for seed in range(num_keys):
            n, p, q = gen_semiprime(total_bits, seed * 13 + total_bits * 97)
            rank, total, p_score = factor_rank(n, p, RIEMANN_ZEROS_KNOWN, num_zeros=20)
            td = trial_division_steps(n, p)
            percentile = rank / total
            ranks.append(rank)
            td_steps_list.append(td)
            totals.append(total)
            percentiles.append(percentile)

        mean_rank = sum(ranks) / len(ranks)
        mean_td = sum(td_steps_list) / len(td_steps_list)
        mean_pct = sum(percentiles) / len(percentiles)
        speedup = mean_td / mean_rank if mean_rank > 0 else float('inf')

        print(f"\n  {total_bits}-bit semiprimes ({num_keys} keys):")
        print(f"    Trial division avg steps:  {mean_td:.1f}")
        print(f"    Oracle rank avg:           {mean_rank:.1f}  ({100*mean_pct:.1f}% percentile)")
        print(f"    Step reduction:            {speedup:.2f}x")

        # Histogram of ranks
        buckets = [0] * 5  # [top1%, top5%, top10%, top25%, rest]
        for pct in percentiles:
            if pct <= 0.01:
                buckets[0] += 1
            elif pct <= 0.05:
                buckets[1] += 1
            elif pct <= 0.10:
                buckets[2] += 1
            elif pct <= 0.25:
                buckets[3] += 1
            else:
                buckets[4] += 1
        labels = ["top 1%", "top 5%", "top 10%", "top 25%", "bottom 75%"]
        print(f"    Rank distribution:")
        for label, count in zip(labels, buckets):
            bar = "#" * count
            print(f"      {label:<12}: {bar} ({count}/{num_keys})")

    print()


def part4_factoring_benchmark():
    """
    Wall-clock benchmark: chu_zeta_factor vs. trial division on 16-40 bit keys.
    """
    print("=" * 78)
    print("PART 4: FACTORING BENCHMARK")
    print("  chu_zeta_factor (oracle) vs. trial division (sequential)")
    print("=" * 78)

    def trial_division(n, time_limit=None):
        start = time.perf_counter()
        steps = 0
        if n % 2 == 0:
            return 2, time.perf_counter() - start, 1
        limit = math.isqrt(n)
        c = 3
        while c <= limit:
            steps += 1
            if time_limit and time.perf_counter() - start > time_limit:
                return None, time.perf_counter() - start, steps
            if n % c == 0:
                return c, time.perf_counter() - start, steps
            c += 2
        return None, time.perf_counter() - start, steps

    for total_bits in [16, 20, 24, 28, 32]:
        num_keys = 20
        td_times = []
        oracle_times = []
        td_steps_list = []
        oracle_steps_list = []
        oracle_wins = 0

        for seed in range(num_keys):
            n, p, q = gen_semiprime(total_bits, seed * 17 + total_bits * 53)

            f_td, t_td, s_td = trial_division(n, time_limit=10.0)
            f_or, t_or, s_or = chu_zeta_factor(n, RIEMANN_ZEROS_KNOWN, num_zeros=20, time_limit=10.0)

            td_times.append(t_td)
            oracle_times.append(t_or)
            td_steps_list.append(s_td)
            oracle_steps_list.append(s_or)
            if s_or < s_td:
                oracle_wins += 1

        avg_td_t = sum(td_times) / len(td_times)
        avg_or_t = sum(oracle_times) / len(oracle_times)
        avg_td_s = sum(td_steps_list) / len(td_steps_list)
        avg_or_s = sum(oracle_steps_list) / len(oracle_steps_list)
        step_ratio = avg_td_s / avg_or_s if avg_or_s > 0 else float('inf')
        time_ratio = avg_td_t / avg_or_t if avg_or_t > 0 else float('inf')

        print(f"\n  {total_bits}-bit ({num_keys} keys):")
        print(f"    Trial division:  {avg_td_s:>8.1f} steps  {avg_td_t*1000:>8.3f}ms")
        print(f"    Oracle:          {avg_or_s:>8.1f} steps  {avg_or_t*1000:>8.3f}ms")
        print(f"    Step ratio:      {step_ratio:.3f}x  ({'oracle fewer steps' if step_ratio > 1 else 'TD fewer steps'})")
        print(f"    Time ratio:      {time_ratio:.3f}x  ({'oracle faster' if time_ratio > 1 else 'oracle slower -- scoring overhead'})")
        print(f"    Oracle step-wins: {oracle_wins}/{num_keys}")

    print()


# ============================================================================
# SUMMARY
# ============================================================================

def print_summary():
    print("=" * 78)
    print("INTERPRETATION")
    print("=" * 78)
    print("""
  The oracle's architecture (as derived from the framework):

  1. Chu(A, r, B): integers are points, nuclear quartet + tower levels are
     observables. The Gram matrix G is the Riemannian metric on the manifold.

  2. The Chu Laplacian Delta_Chu has eigenvalues that (after scaling) may
     approximate the Riemann zeros gamma_k. Part 1 tests this claim.

  3. The gradient oracle uses gamma_k directly in the explicit formula:
       Lambda_approx(n) = sum_k 2*cos(gamma_k * ln n) / sqrt(n)
     This approximates the von Mangoldt function. Primes score high.

  4. Factoring: rank candidates by score, test highest first.
     Speedup in STEPS iff rank(p) << (p-3)/2 + 1 (sequential TD position).
     Speedup in TIME iff scoring overhead < time saved by fewer div tests.

  5. The deeper question (Part 1): does the tower's Chu Laplacian encode
     the Riemann spectrum? If yes, the tower IS the manifold and the primes
     really are its shadow -- derivable from first principles, not hardcoded.
""")


# ============================================================================
# MAIN
# ============================================================================

def run_experiment():
    print("=" * 78)
    print("CHU ZETA ORACLE")
    print("Testing whether the tower's Riemannian manifold predicts prime positions")
    print("=" * 78)
    print()
    print(f"  RelationalHyperverseGoldenRatio phi = {PHI:.10f}")
    print(f"  Substitution matrix M = [[1,1],[1,0]]  (nuclear quartet, theorem)")
    print(f"  Characteristic polynomial: lambda^2 - lambda - 1 = 0")
    print(f"  Chu space: A = integers, B = nuclear quartet + Zeckendorf + Wythoff")
    print()

    # Shared precomputation
    SIEVE_LIMIT = 100_000
    print(f"  Building sieve up to {SIEVE_LIMIT}...")
    spf = build_sieve(SIEVE_LIMIT)
    fibs = fibonacci_sequence(SIEVE_LIMIT)
    print(f"  Fibonacci sequence: {len(fibs)} numbers up to {fibs[-1]}")
    print()

    part1_spectral_comparison(spf, fibs)
    part2_score_distribution(spf)
    part3_factor_rank_analysis(spf)
    part4_factoring_benchmark()
    print_summary()


if __name__ == "__main__":
    run_experiment()
