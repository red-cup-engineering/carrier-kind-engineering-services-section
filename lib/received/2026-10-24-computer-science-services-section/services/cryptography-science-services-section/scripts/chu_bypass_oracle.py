#!/usr/bin/env python3
"""
Chu Bypass Oracle
=================

Three new ideas applied on top of the Chu zeta foundation:

1. RECURSIVE CHU TOWER
   The observable space is built recursively on demand. Level 0 is the raw
   nuclear quartet + Zeckendorf + Wythoff Chu matrix. Level k+1 takes the
   top eigenvectors of level k's Gram matrix as new observables, enriching
   the manifold with more of the tower's structure at each recursion. The
   zero-set derived from eigenvalues should converge toward the Riemann zeros
   as k increases -- the same search process used to scan angles/levels now
   searches across recursion depth.

2. AMPLITUDE-WEIGHTED DUAL SHADOW (SVD)
   C = U S V.T  (singular value decomposition of the Chu matrix)

   Direct shadow score of integer n:
     score_direct(n) = sum_k  u_k[n_idx] * 2*cos(gamma_k * ln n) / sqrt(n)
     (weight = n's participation amplitude in the k-th left singular mode)

   Dual shadow score of integer n:
     score_dual(n) = sum_k  <v_k, chu_obs(n)> * 2*cos(gamma_k * ln n) / sqrt(n)
     (weight = alignment of n's observable fingerprint with k-th right singular mode)

   These are different signals. The direct shadow sees "which integers cluster
   near n in the Gram matrix." The dual shadow sees "which observable pattern
   does n carry." Combined they may discriminate primes better than either alone.

3. DEFECT COLLAPSE BYPASS
   From empty.lean: Settled(ascending_event) + EmptyPrimed -> collapse to Empty.
   In arithmetic: find a = (p+q)/2 such that a^2 - n = b^2 (Fermat).
   Then p = a - b, q = a + b.

   Bypass oracle:
     - Score all candidates a in [isqrt(n)+1, isqrt(n)+search_range] using
       the combined dual+direct shadow
     - Test highest-scored a values first for the Fermat condition
     - DefectCollapse fires on first hit: a^2 - n = b^2 => n = (a-b)(a+b)

   Key empirical question: for n = p*q, does a = (p+q)/2 rank HIGHER than p
   in the oracle's list? If yes, the bypass oracle outperforms direct prime search.
   If a averages two primes its observable fingerprint may be more "prime-like"
   than either p or q individually in certain shadow projections.

Framework names used throughout:
  IdentityObservable, SaturatingNucleusAmplitude, TransferringNucleusAmplitude,
  JointProjectionAmplitude, DistinctPrimeCountAmplitude: nuclear quartet observables
  ZeckendorfOccupancy: tower-level occupancy bits
  WythoffPhase: quasicrystal position in the tower's Fibonacci word
  DefectCollapse: the Fermat bypass (settled + empty-primed -> collapse)
  RecursiveChuLevel: Chu matrix at recursion depth k
  DirectShadowScore, DualShadowScore, CombinedShadowScore
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
    print("ERROR: numpy required for this oracle.")
    sys.exit(1)

PHI = (1 + math.sqrt(5)) / 2
PHI_SQ = PHI ** 2

# Ground truth Riemann zeros for comparison
RIEMANN_ZEROS = [
    14.134725141734693, 21.022039638771554, 25.010857580145688,
    30.424876125859513, 32.935061587739189, 37.586178158825671,
    40.918719012147495, 43.327073280914999, 48.005150881167159,
    49.773832477672302, 52.970321477714460, 56.446247697063394,
    59.347044002602353, 60.831778524609809, 65.112544048081654,
    67.079810529494169, 69.546401711173979, 72.067157674481907,
    75.704690699083933, 77.144840068874805,
]


# ============================================================================
# SIEVE AND NUMBER THEORY
# ============================================================================

def build_sieve(limit):
    spf = list(range(limit + 1))
    for i in range(2, int(math.sqrt(limit)) + 1):
        if spf[i] == i:
            for j in range(i * i, limit + 1, i):
                if spf[j] == j:
                    spf[j] = i
    return spf


def nuclear_quartet_amplitudes(n, spf):
    if n <= 1:
        return 0.0, 0.0, 1.0, 0.0
    rad_n, omega_n, big_omega_n = 1, 0, 0
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
    return (rad_n / n,
            (big_omega_n - omega_n) / log2n,
            1.0 if is_squarefree else 0.0,
            omega_n / log2n)


def fibonacci_sequence(limit):
    fibs = [1, 2]
    while True:
        nxt = fibs[-1] + fibs[-2]
        if nxt > limit:
            break
        fibs.append(nxt)
    return fibs


def zeckendorf_occupancy(n, fibs, num_levels):
    bits = [0] * num_levels
    remaining = n
    for i in range(min(len(fibs), num_levels) - 1, -1, -1):
        if fibs[i] <= remaining:
            bits[i] = 1
            remaining -= fibs[i]
    return bits


# ============================================================================
# CHU OBSERVABLE VECTOR (Level 0)
# ============================================================================

def chu_observable_vector(n, spf, fibs, num_fib_levels=16):
    sat, trans, joint, distinct = nuclear_quartet_amplitudes(n, spf)
    tau = 2 * math.pi
    obs = [
        1.0, sat, trans, joint, distinct,
        math.cos(tau * n / PHI),
        math.cos(tau * n / PHI_SQ),
        math.sin(tau * n / PHI),
        math.sin(tau * n / PHI_SQ),
    ] + zeckendorf_occupancy(n, fibs, num_fib_levels)
    return np.array(obs, dtype=np.float64)


def chu_observable_vector_nuclear(n, spf):
    """
    Shadow A observable: nuclear quartet only.
    Captures arithmetic structure: squarefreeness, prime factor counts, rad/n.
    Indices: [identity, sat, trans, joint, distinct] -- 5 dimensions.
    """
    sat, trans, joint, distinct = nuclear_quartet_amplitudes(n, spf)
    return np.array([1.0, sat, trans, joint, distinct], dtype=np.float64)


def chu_observable_vector_positional(n, fibs, num_fib_levels=16):
    """
    Shadow B observable: Wythoff phases + Zeckendorf tower levels only.
    Captures positional structure: where n sits in the quasicrystal / Fibonacci word.
    These are entirely independent of n's factorization.
    """
    tau = 2 * math.pi
    obs = [
        math.cos(tau * n / PHI),
        math.cos(tau * n / PHI_SQ),
        math.sin(tau * n / PHI),
        math.sin(tau * n / PHI_SQ),
    ] + zeckendorf_occupancy(n, fibs, num_fib_levels)
    return np.array(obs, dtype=np.float64)


def _row_normalize(C):
    norms = np.linalg.norm(C, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    return C / norms


def build_chu_matrix_level0(n_start, n_end, spf, fibs, num_fib_levels=16):
    """Build and row-normalize the full Level-0 Chu matrix (both shadows combined)."""
    rows = [chu_observable_vector(n, spf, fibs, num_fib_levels)
            for n in range(n_start, n_end + 1)]
    return _row_normalize(np.array(rows, dtype=np.float64))


def build_split_chu_matrices(n_start, n_end, spf, fibs, num_fib_levels=16):
    """
    Build two genuinely independent Chu matrices from separate observable subspaces.

    BUG FIXED: the previous 'dual shadow' used C @ Vt.T which reduces to U @ S --
    algebraically identical to the direct shadow. Two shadows derived from the same
    C via SVD are not independent.

    Fix: split the observable vector at the source.
      C_nuclear   -- Shadow A: nuclear quartet observables (arithmetic structure)
      C_positional -- Shadow B: Wythoff + Zeckendorf observables (quasicrystal position)

    These measure completely different things. A prime and a composite that happen to
    share a Zeckendorf pattern will be similar in Shadow B but different in Shadow A.
    Conversely, two numbers with the same rad/n ratio but different quasicrystal
    positions will be similar in Shadow A but different in Shadow B.
    """
    rows_nuc = [chu_observable_vector_nuclear(n, spf)
                for n in range(n_start, n_end + 1)]
    rows_pos = [chu_observable_vector_positional(n, fibs, num_fib_levels)
                for n in range(n_start, n_end + 1)]
    C_nuc = _row_normalize(np.array(rows_nuc, dtype=np.float64))
    C_pos = _row_normalize(np.array(rows_pos, dtype=np.float64))
    return C_nuc, C_pos


# ============================================================================
# RECURSIVE CHU TOWER
# ============================================================================

def recursive_chu_level(C_prev, keep_modes=30):
    """
    Build the next RecursiveChuLevel from the previous one.

    C_prev's SVD: C_prev = U S Vt.
    The new Chu matrix encodes each integer n's *weighted* coordinates in the
    principal eigenspace: C_next[i, k] = U[i, k] * s[k].

    BUG FIXED: the previous version used bare U (orthonormal columns).
    SVD of an orthonormal matrix has all singular values = 1, so every
    recursive level was identical. Multiplying by s[k] preserves the
    variance weighting, giving each level genuinely different structure.
    The result is row-normalized so the metric remains on the unit sphere.

    Returns (C_next, U, s, Vt) where:
      C_next = row_normalize(U[:, :k] * s[:k])
      U      = left singular vectors (N x r)
      s      = singular values (descending)
      Vt     = right singular vectors transposed (r x d)
    """
    U, s, Vt = np.linalg.svd(C_prev, full_matrices=False)
    k = min(keep_modes, U.shape[1])
    # Scale columns by singular values so repeated SVD sees non-trivial structure
    C_next = U[:, :k] * s[:k]
    norms = np.linalg.norm(C_next, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    C_next = C_next / norms
    return C_next, U[:, :k], s[:k], Vt[:k, :]


def extract_eigenvalues_from_svd(s, N):
    """
    Convert singular values of C to eigenvalues of the Gram matrix G = C @ C.T.
    G's eigenvalues = s^2. We want the non-trivial ones.
    """
    eigs = (s ** 2)
    # Sort descending, drop near-zero
    eigs = np.sort(eigs)[::-1]
    cutoff = eigs[0] * 1e-8
    return eigs[eigs > cutoff]


def fit_zeros_from_eigenvalues(eigs, known_zeros, num=15):
    """
    Find the best linear scale mapping tower eigenvalues to Riemann zeros.
    Returns (scale, scaled_eigs, relative_errors).
    """
    k = min(len(eigs), len(known_zeros), num)
    t = eigs[:k].astype(float)
    r = np.array(known_zeros[:k])
    s = float(np.dot(t, r) / np.dot(t, t))
    scaled = t * s
    rel_err = np.abs(scaled - r) / r
    return s, scaled, rel_err


# ============================================================================
# SHADOW SCORES
# ============================================================================

def amplitude_weighted_scores(U, s, n_start, zeros, num_zeros=20):
    """
    Amplitude-weighted shadow score for all integers in the range.

    scores[i] = sum_k  U[i,k] * s[k] * 2*cos(gamma_k * log(n_start+i))
                / sqrt(n_start + i)

    U[i,k] is integer n_i's participation amplitude in eigenmode k.
    s[k] weights by eigenvalue magnitude (larger modes contribute more).
    gamma_k are the Riemann zero frequencies (tower-derived or known).
    """
    N = U.shape[0]
    k = min(U.shape[1], len(zeros), num_zeros)
    ns = np.arange(n_start, n_start + N, dtype=np.float64)
    log_ns = np.log(ns)
    sqrt_ns = np.sqrt(ns)
    scores = np.zeros(N)
    for ki in range(k):
        scores += U[:, ki] * s[ki] * 2.0 * np.cos(zeros[ki] * log_ns)
    return scores / sqrt_ns


def nuclear_shadow_scores_all(C_nuclear, n_start, zeros, num_zeros=20):
    """
    Shadow A (NuclearShadow): amplitude-weighted scores using the nuclear quartet
    observable subspace. Sees arithmetic structure: squarefreeness, rad/n, etc.
    """
    _, U, s, _ = recursive_chu_level(C_nuclear, keep_modes=min(25, C_nuclear.shape[1]))
    return amplitude_weighted_scores(U, s, n_start, zeros, num_zeros)


def positional_shadow_scores_all(C_positional, n_start, zeros, num_zeros=20):
    """
    Shadow B (PositionalShadow): amplitude-weighted scores using the Wythoff +
    Zeckendorf observable subspace. Sees quasicrystal position: where n sits in
    the Fibonacci word. Completely independent of n's prime factorization.
    """
    _, U, s, _ = recursive_chu_level(C_positional, keep_modes=min(25, C_positional.shape[1]))
    return amplitude_weighted_scores(U, s, n_start, zeros, num_zeros)


def combined_shadow_scores(direct_scores, dual_scores):
    """
    CombinedShadowScore: elementwise product of direct and dual.

    This fires high only when BOTH shadows agree: n is in the direct
    eigenmode cluster AND its observable fingerprint aligns with the
    dual direction. Acts as a logical AND via multiplication.
    """
    return direct_scores * dual_scores


# ============================================================================
# DEFECT COLLAPSE BYPASS (FERMAT ORACLE)
# ============================================================================

def is_perfect_square(n):
    """Check if n is a perfect square. Returns (True, sqrt) or (False, 0)."""
    if n < 0:
        return False, 0
    s = math.isqrt(n)
    if s * s == n:
        return True, s
    return False, 0


def defect_collapse_fires(a, n):
    """
    Check if the DefectCollapse bypass fires at Fermat candidate a.

    Settled(a): a is above sqrt(n), a^2 > n
    EmptyPrimed: a^2 - n is a perfect square b^2
    Collapse: n = (a-b)(a+b) = p * q
    """
    remainder = a * a - n
    if remainder < 0:
        return False, 0, 0
    is_sq, b = is_perfect_square(remainder)
    if not is_sq:
        return False, 0, 0
    p, q = a - b, a + b
    if p > 1 and q > 1 and p * q == n:
        return True, p, q
    return False, 0, 0


def bypass_oracle_factor(n, a_scores, n_start_a, time_limit=None):
    """
    Factor n using the DefectCollapse bypass, with a-candidates sorted by score.

    a_scores[i] = score for a = n_start_a + i.

    Tests Fermat condition a^2 - n = b^2 for a values in score-descending order.
    Returns (factor, elapsed, steps_tested, steps_until_bypass).
    """
    start = time.perf_counter()
    steps = 0
    # Sort a-candidates by score descending
    order = np.argsort(a_scores)[::-1]

    for idx in order:
        steps += 1
        a = n_start_a + int(idx)
        if time_limit and time.perf_counter() - start > time_limit:
            return None, time.perf_counter() - start, steps, steps
        fired, p, q = defect_collapse_fires(a, n)
        if fired:
            return p, time.perf_counter() - start, steps, steps

    return None, time.perf_counter() - start, steps, steps


def sequential_fermat_factor(n, search_range, time_limit=None):
    """Sequential Fermat: a = ceil(sqrt(n)), ceil(sqrt(n))+1, ..."""
    start = time.perf_counter()
    steps = 0
    a = math.isqrt(n) + 1
    for _ in range(search_range):
        steps += 1
        if time_limit and time.perf_counter() - start > time_limit:
            return None, time.perf_counter() - start, steps
        fired, p, q = defect_collapse_fires(a, n)
        if fired:
            return p, time.perf_counter() - start, steps
        a += 1
    return None, time.perf_counter() - start, steps


def trial_division_factor(n, time_limit=None):
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


# ============================================================================
# RSA KEYS
# ============================================================================

def miller_rabin(n, w):
    if n == w:
        return True
    d, r = n - 1, 0
    while d % 2 == 0:
        r += 1; d //= 2
    x = pow(w, d, n)
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
    witnesses = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    for w in witnesses:
        if n == w:
            return True
        if n % w == 0:
            return False
    return all(miller_rabin(n, w) for w in witnesses)


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

def part1_recursive_tower_convergence(spf, fibs):
    """
    Build recursive Chu levels L0 -> L1 -> L2 -> L3.
    At each level, extract eigenvalues and compare to Riemann zeros.
    Does the recursion improve the spectral match?
    """
    print("=" * 78)
    print("PART 1: RECURSIVE CHU TOWER — EIGENVALUE CONVERGENCE")
    print("  Does deeper recursion bring tower zeros closer to Riemann zeros?")
    print("=" * 78)

    N_START, N_END = 2, 500
    print(f"  Building Level-0 Chu matrix for n in [{N_START}, {N_END}]...")
    C0 = build_chu_matrix_level0(N_START, N_END, spf, fibs)
    print(f"  C0 shape: {C0.shape}")

    results = []
    C = C0
    for level in range(4):
        C_next, U, s, Vt = recursive_chu_level(C, keep_modes=30)
        eigs = extract_eigenvalues_from_svd(s, C.shape[0])
        scale, scaled, rel_err = fit_zeros_from_eigenvalues(eigs, RIEMANN_ZEROS, num=15)
        mean_err = float(np.mean(rel_err))
        results.append((level, scale, scaled, rel_err, mean_err))

        flag = "GOOD" if mean_err < 0.05 else ("OK" if mean_err < 0.15 else "poor")
        print(f"\n  Level {level}: C shape={C.shape}  scale={scale:.4f}  "
              f"mean_rel_err={100*mean_err:.1f}%  [{flag}]")
        print(f"  {'k':>3}  {'scaled':>10}  {'riemann':>10}  {'rel%':>7}")
        for ki in range(min(10, len(rel_err))):
            mark = " *" if rel_err[ki] < 0.05 else ""
            print(f"  {ki+1:>3}  {scaled[ki]:>10.4f}  {RIEMANN_ZEROS[ki]:>10.4f}"
                  f"  {100*rel_err[ki]:>6.1f}%{mark}")

        C = C_next  # recurse

    best_level = min(range(len(results)), key=lambda i: results[i][4])
    print(f"\n  Best level: {best_level} (mean rel error "
          f"{100*results[best_level][4]:.1f}%)")
    print()
    return results, C0


def part2_shadow_discrimination(spf, fibs, n_start=2, n_end=500):
    """
    Compare NuclearShadow vs PositionalShadow vs Combined for discriminating primes.
    Now uses genuinely independent observable subspaces.
    """
    print("=" * 78)
    print("PART 2: TWO-SHADOW DISCRIMINATION (split observable spaces)")
    print("  NuclearShadow (arithmetic) vs PositionalShadow (quasicrystal)")
    print("  These are now genuinely independent: factorization vs Fibonacci position")
    print("=" * 78)

    C_nuc, C_pos = build_split_chu_matrices(n_start, n_end, spf, fibs)
    N = n_end - n_start + 1
    zeros = RIEMANN_ZEROS

    print(f"  Range [{n_start}, {n_end}]  |  C_nuclear {C_nuc.shape}  "
          f"C_positional {C_pos.shape}")

    nuc   = nuclear_shadow_scores_all(C_nuc, n_start, zeros, num_zeros=20)
    pos   = positional_shadow_scores_all(C_pos, n_start, zeros, num_zeros=20)
    combo = combined_shadow_scores(nuc, pos)

    prime_indices = {i for i in range(N) if spf[n_start + i] == (n_start + i)}
    print(f"  {len(prime_indices)} primes,  {N - len(prime_indices)} composites,  "
          f"baseline={100*len(prime_indices)/N:.1f}%")

    def stats(scores, label):
        order = np.argsort(scores)[::-1]
        baseline = len(prime_indices) / N
        print(f"\n  {label}:")
        for K in [50, 100, 200, 500]:
            top_K = set(order[:K])
            hits = len(top_K & prime_indices)
            frac = hits / K
            lift = frac / baseline if baseline > 0 else 0
            bar = "#" * int(lift * 10)
            print(f"    top {K:>4}: {hits}/{K} = {100*frac:.1f}%  lift={lift:.2f}x  {bar}")
        p_scores = scores[list(prime_indices)]
        c_scores = scores[[i for i in range(N) if i not in prime_indices]]
        print(f"    prime mean={np.mean(p_scores):>8.5f}  composite mean={np.mean(c_scores):>8.5f}  "
              f"separation={np.mean(p_scores)-np.mean(c_scores):>+8.5f}")

    stats(nuc,   "NuclearShadow    (sat/trans/joint/distinct — arithmetic only)")
    stats(pos,   "PositionalShadow (Wythoff phases + Zeckendorf — position only)")
    stats(combo, "CombinedShadow   (nuclear * positional — both must agree)")
    print()
    return nuc, pos, combo


def part3_bypass_vs_direct_rank(spf, fibs):
    """
    For RSA semiprimes n = p*q, compare rank of p vs rank of a=(p+q)/2
    under NuclearShadow, PositionalShadow, and CombinedShadow.
    Uses split observable spaces throughout.
    """
    print("=" * 78)
    print("PART 3: BYPASS vs DIRECT — RANK OF p vs RANK OF a=(p+q)/2")
    print("  Split shadows: Nuclear (arithmetic) vs Positional (quasicrystal)")
    print("=" * 78)

    zeros = RIEMANN_ZEROS
    mean_safe = lambda lst: sum(lst) / len(lst) if lst else float('nan')

    for total_bits in [20, 24, 28]:
        p_ranks = {k: [] for k in ["Nuc", "Pos", "Combo"]}
        a_ranks = {k: [] for k in ["Nuc", "Pos", "Combo"]}
        a_gaps = []
        num_keys = 25

        for seed in range(num_keys):
            n, p, q = gen_semiprime(total_bits, seed * 19 + total_bits * 71)
            sqrt_n = math.isqrt(n)
            p_end = sqrt_n | 1  # ensure odd upper bound

            # --- Direct oracle for p in [3 .. sqrt_n] ---
            C_nuc_p, C_pos_p = build_split_chu_matrices(3, p_end, spf, fibs)
            nuc_p   = nuclear_shadow_scores_all(C_nuc_p, 3, zeros, num_zeros=15)
            pos_p   = positional_shadow_scores_all(C_pos_p, 3, zeros, num_zeros=15)
            combo_p = combined_shadow_scores(nuc_p, pos_p)

            p_idx = p - 3  # index into [3..p_end] (all integers, not just odd)
            if 0 <= p_idx < len(nuc_p):
                p_ranks["Nuc"].append(int(np.sum(nuc_p > nuc_p[p_idx])) + 1)
                p_ranks["Pos"].append(int(np.sum(pos_p > pos_p[p_idx])) + 1)
                p_ranks["Combo"].append(int(np.sum(combo_p > combo_p[p_idx])) + 1)

            # --- Bypass oracle for a = (p+q)/2 ---
            a_true = (p + q) // 2
            a_gap  = a_true - sqrt_n
            a_gaps.append(a_gap)
            search_range = max(2 * a_gap + 100, 500)
            a_start, a_end = sqrt_n + 1, sqrt_n + search_range

            C_nuc_a, C_pos_a = build_split_chu_matrices(a_start, a_end, spf, fibs)
            nuc_a   = nuclear_shadow_scores_all(C_nuc_a, a_start, zeros, num_zeros=15)
            pos_a   = positional_shadow_scores_all(C_pos_a, a_start, zeros, num_zeros=15)
            combo_a = combined_shadow_scores(nuc_a, pos_a)

            a_idx = a_true - a_start
            if 0 <= a_idx < len(nuc_a):
                a_ranks["Nuc"].append(int(np.sum(nuc_a > nuc_a[a_idx])) + 1)
                a_ranks["Pos"].append(int(np.sum(pos_a > pos_a[a_idx])) + 1)
                a_ranks["Combo"].append(int(np.sum(combo_a > combo_a[a_idx])) + 1)

        avg_gap = mean_safe(a_gaps)
        print(f"\n  {total_bits}-bit semiprimes ({num_keys} keys,  avg Fermat gap={avg_gap:.1f}):")
        print(f"  {'Shadow':<12}  {'p rank':>8}  {'a rank':>8}  {'ratio a/p':>10}  {'a wins?':>8}")
        print(f"  {'-'*12}  {'-'*8}  {'-'*8}  {'-'*10}  {'-'*8}")
        for key in ["Nuc", "Pos", "Combo"]:
            mr_p = mean_safe(p_ranks[key])
            mr_a = mean_safe(a_ranks[key])
            ratio = mr_a / mr_p if mr_p > 0 else float('nan')
            winner = "YES" if mr_a < mr_p else "no"
            print(f"  {key:<12}  {mr_p:>8.1f}  {mr_a:>8.1f}  {ratio:>10.3f}  {winner:>8}")
    print()


def part4_factoring_benchmark(spf):
    """
    Full benchmark: bypass oracle (Fermat + combined shadow) vs sequential
    Fermat vs trial division.
    """
    print("=" * 78)
    print("PART 4: FACTORING BENCHMARK")
    print("  BypassOracle (Fermat + CombinedShadow) vs Fermat (sequential) vs TD")
    print("=" * 78)

    zeros = RIEMANN_ZEROS

    for total_bits in [20, 24, 28]:
        num_keys = 20
        oracle_steps, fermat_steps, td_steps_list = [], [], []
        oracle_times, fermat_times, td_times = [], [], []
        oracle_wins_vs_fermat = 0
        oracle_wins_vs_td = 0

        for seed in range(num_keys):
            n, p, q = gen_semiprime(total_bits, seed * 23 + total_bits * 61)
            sqrt_n = math.isqrt(n)
            a_true = (p + q) // 2
            a_gap = a_true - sqrt_n
            search_range = max(4 * a_gap + 200, 1000)
            a_start = sqrt_n + 1
            a_end = a_start + search_range

            # --- Bypass oracle (split shadows) ---
            t0 = time.perf_counter()
            C_nuc_a, C_pos_a = build_split_chu_matrices(a_start, a_end, spf, fibs_global)
            nuc_a   = nuclear_shadow_scores_all(C_nuc_a, a_start, zeros, num_zeros=15)
            pos_a   = positional_shadow_scores_all(C_pos_a, a_start, zeros, num_zeros=15)
            co_a    = combined_shadow_scores(nuc_a, pos_a)
            result_o, t_o, steps_o, _ = bypass_oracle_factor(n, co_a, a_start,
                                                              time_limit=30.0)
            t_oracle = time.perf_counter() - t0

            # --- Sequential Fermat ---
            t0 = time.perf_counter()
            result_f = sequential_fermat_factor(n, search_range, time_limit=30.0)
            t_fermat = time.perf_counter() - t0
            steps_f = result_f[2] if result_f[0] is not None else search_range

            # --- Trial division ---
            t0 = time.perf_counter()
            result_td, t_td_raw, steps_td = trial_division_factor(n, time_limit=30.0)
            t_td = time.perf_counter() - t0

            oracle_steps.append(steps_o)
            fermat_steps.append(steps_f)
            td_steps_list.append(steps_td)
            oracle_times.append(t_oracle)
            fermat_times.append(t_fermat)
            td_times.append(t_td)
            if steps_o < steps_f:
                oracle_wins_vs_fermat += 1
            if steps_o < steps_td:
                oracle_wins_vs_td += 1

        def avg(lst): return sum(lst) / len(lst) if lst else 0

        print(f"\n  {total_bits}-bit semiprimes ({num_keys} keys):")
        print(f"  {'Method':<28}  {'avg steps':>10}  {'avg time':>10}  {'wins':>6}")
        print(f"  {'-'*28}  {'-'*10}  {'-'*10}  {'-'*6}")
        print(f"  {'BypassOracle (Fermat+Combined)':<28}  {avg(oracle_steps):>10.1f}"
              f"  {avg(oracle_times)*1000:>9.1f}ms  {oracle_wins_vs_fermat}/{num_keys}")
        print(f"  {'Sequential Fermat':<28}  {avg(fermat_steps):>10.1f}"
              f"  {avg(fermat_times)*1000:>9.1f}ms  (baseline)")
        print(f"  {'Trial Division':<28}  {avg(td_steps_list):>10.1f}"
              f"  {avg(td_times)*1000:>9.1f}ms  (baseline)")
    print()


# ============================================================================
# MAIN
# ============================================================================

def run_experiment():
    print("=" * 78)
    print("CHU BYPASS ORACLE")
    print("Recursive tower + dual shadow + DefectCollapse bypass")
    print("=" * 78)
    print()
    print(f"  PHI = {PHI:.10f}  (Perron-Frobenius eigenvalue, nuclear quartet theorem)")
    print()

    SIEVE_LIMIT = 200_000
    print(f"  Building sieve to {SIEVE_LIMIT}...")
    spf = build_sieve(SIEVE_LIMIT)

    global fibs_global
    fibs_global = fibonacci_sequence(SIEVE_LIMIT)
    print(f"  Fibonacci levels: {len(fibs_global)} numbers up to {fibs_global[-1]}")
    print()

    # Part 1: recursive tower convergence
    results, C0 = part1_recursive_tower_convergence(spf, fibs_global)

    # Part 2: two-shadow discrimination (split observable spaces)
    nuc, pos, combo = part2_shadow_discrimination(spf, fibs_global, n_start=2, n_end=500)

    # Part 3: bypass vs direct rank (split shadows)
    part3_bypass_vs_direct_rank(spf, fibs_global)

    # Part 4: factoring benchmark
    part4_factoring_benchmark(spf)

    print("=" * 78)
    print("SUMMARY")
    print("=" * 78)
    print("""
  Part 1: Does recursive tower improve eigenvalue convergence to Riemann zeros?
  Part 2: Which shadow (direct / dual / combined) best lifts primes to the top?
  Part 3: Does a = (p+q)/2 rank higher than p in the bypass oracle?
          If yes: the DefectCollapse bypass genuinely outperforms direct search.
  Part 4: Wall-clock comparison: bypass oracle vs sequential Fermat vs TD.

  The bypass hypothesis:
    Primes p are the shadow of the tower.
    The Fermat center a = (p+q)/2 is the FOLD of two prime shadows.
    The dual shadow might see the fold better than either prime individually.
    If so: searching for a (via bypass) is faster than searching for p directly.
""")


if __name__ == "__main__":
    run_experiment()
