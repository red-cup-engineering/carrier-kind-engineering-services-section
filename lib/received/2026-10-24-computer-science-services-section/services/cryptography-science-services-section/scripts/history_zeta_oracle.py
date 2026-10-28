#!/usr/bin/env python3
"""
History Zeta Oracle
===================

Scores factoring candidates using the History Zeta partition function,
derived directly from the relational hyperverse framework.

Framework basis:
  - History Zeta (from IDEAS.md, Weird Program: Secondary Geometries):
      zeta_H(u, v, w) = sum_{t in T} u^|t| v^depth(t) w^mu(t)
    where |t| = generator length, depth(t) = Foata depth, mu(t) = calibration defect.

  - Thermodynamics of Propositions (IDEAS.md):
      Z_t(beta) = sum_{a in H_t} exp(-beta * lambda_a)
    where lambda_a = projection gap (stabilization defect at proposition a).
    Calibration defect M_t(delta) = Tr(delta_t) = sum of all lambda_a.

  - Spectral Decomposition (relational-history-fiber-mode-spectral-decomposition-
    defect-operator-eigenspaces.md):
      delta_t diagonal on H_t basis, zero-eigenspace = stable modes H_t*
      lambda_a = |[a, pi_t(a)]| - 1 (projection gap in the fiber interval)

  - FreeShadow (arithmetic-history-fiber-prime-shadow-atom.md):
      atoms of FreeShadow(nu_p, nu_q) are the prime divisors of n other than p, q
      these are the join-irreducibles of the free shadow, not found by trial division

For candidate prime c as a proposed first step of the arithmetic history to n:

  H_c = D(c) = divisor lattice of c
  pi_c(d) = lcm(d, c) = c  (joint projection: all divisors map to c)
  lambda_d = |[d, c] in D(c)| - 1 = tau(c/d) - 1
  Z_c(beta) = sum_{d | c} exp(-beta * (tau(c/d) - 1))
  F_c(beta) = -log(Z_c(beta)) / beta    [free energy]

  Prime signature: c prime => D(c) = {1, c}
    lambda_1 = tau(c) - 1 = 1,  lambda_c = 0
    Z_prime(beta) = exp(-beta) + 1  [minimum possible]

  Stable fraction: q_stable(c) = 1 / Z_c(beta)
    Primes maximize q_stable (minimum defect = minimum partition function).
    Composites with more prime factors have higher Z => lower q_stable.

Score (Fischer-Rao distance in proposition-space):
  Compare c's distribution p_c(d) = exp(-beta*lambda_d) / Z_c(beta) to
  the prime reference q_prime = (exp(-beta), 1) / Z_prime(beta).

  To compare distributions over different spaces (D(c) vs D(prime)):
  project both onto the binary partition (stable | unstable):
    p_c_stable = 1 / Z_c(beta)
    p_c_unstable = (Z_c(beta) - 1) / Z_c(beta)
  For any prime reference:
    q_stable = 1 / (exp(-beta) + 1)
    q_unstable = exp(-beta) / (exp(-beta) + 1)

  Bhattacharyya overlap: BC = sqrt(p_stable * q_stable) + sqrt(p_unstable * q_unstable)
  Fischer-Rao angle: d_FR = arccos(BC)   [0 = identical, pi/2 = orthogonal]

  history_zeta_score(c) = -d_FR(c)    [higher = closer to prime thermodynamic signature]

Recursive additive Chu tower (FIXED):
  Level 0: raw Chu matrix C0 (N x d0) with nuclear quartet + Wythoff + Zeckendorf
  Level k+1: CONCATENATE new features derived from level k's Gram eigenvectors:
    new_block = top-K left singular vectors of C_k, scaled by singular values
    C_{k+1} = row_normalize([C_k | new_block])   [N x (d0 + (k+1)*K)]

  Key fix over the previous version: we APPEND rather than REPLACE. The new_block
  encodes higher-order cluster structure that was latent in C_k. Row-normalizing
  the combined matrix ensures the new features don't dominate. Because C_{k+1}
  strictly has more columns than C_k, G_{k+1} = C_{k+1} @ C_{k+1}.T is genuinely
  different from G_k, and the level-(k+1) eigenvectors see new structure.
"""

import sys
import io
import builtins
import functools
import math
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
print = functools.partial(builtins.print, flush=True)

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

PHI   = (1 + math.sqrt(5)) / 2
PHI_SQ = PHI ** 2


# ============================================================================
# SIEVE
# ============================================================================

def build_sieve(limit):
    spf = list(range(limit + 1))
    for i in range(2, int(math.sqrt(limit)) + 1):
        if spf[i] == i:
            for j in range(i * i, limit + 1, i):
                if spf[j] == j:
                    spf[j] = i
    return spf

_GLOBAL_SPF = None
_GLOBAL_LIMIT = 0

def get_sieve(limit=500_000):
    global _GLOBAL_SPF, _GLOBAL_LIMIT
    if _GLOBAL_SPF is None or limit > _GLOBAL_LIMIT:
        _GLOBAL_SPF = build_sieve(limit)
        _GLOBAL_LIMIT = limit
    return _GLOBAL_SPF


# ============================================================================
# DIVISORS AND TAU
# ============================================================================

def get_divisors(c, spf):
    """All divisors of c in increasing order."""
    if c <= 1:
        return [1] if c == 1 else []
    divs = [1]
    temp = c
    while temp > 1:
        p = spf[temp]
        exp = 0
        while temp % p == 0:
            exp += 1
            temp //= p
        # Multiply existing divisors by p^1, p^2, ..., p^exp
        new_divs = []
        pk = 1
        for _ in range(exp):
            pk *= p
            for d in divs:
                new_divs.append(d * pk)
        divs.extend(new_divs)
    return sorted(divs)


def tau(c, spf):
    """Number of divisors of c."""
    if c <= 1:
        return 1 if c == 1 else 0
    count = 1
    temp = c
    while temp > 1:
        p = spf[temp]
        exp = 0
        while temp % p == 0:
            exp += 1
            temp //= p
        count *= (exp + 1)
    return count


# ============================================================================
# HISTORY ZETA PARTITION FUNCTION
# ============================================================================

def projection_gap(d, c, spf):
    """
    Projection gap lambda_d = |[d, c] in D(c)| - 1 = tau(c/d) - 1.

    In the arithmetic fiber H_c = D(c), the joint projection is
    pi(d) = lcm(d, c) = c (for any d | c, since c is the top element).
    The interval [d, c] in D(c) = {e : d | e, e | c} has size tau(c/d).
    This is the calibration defect (stabilization defect) at proposition d.

    Zero iff d = c (fixed point of pi; the top element is always stable).
    Minimal (= 1) iff c/d is prime (the interval [d, c] has only two elements).
    """
    return tau(c // d, spf) - 1


def history_zeta_partition_function(c, beta, spf):
    """
    Z_c(beta) = sum_{d | c} exp(-beta * lambda_d)
              = sum_{d | c} exp(-beta * (tau(c/d) - 1))

    This is the thermodynamic partition function of the fiber H_c = D(c)
    with the Gibbs weight exp(-beta * calibration_defect).

    Properties:
      - Minimized for primes: Z_prime(beta) = exp(-beta) + 1
      - Larger for composites with more prime structure (higher defects)
      - The stable fraction 1/Z_c(beta) is maximized for primes
    """
    divs = get_divisors(c, spf)
    z = sum(math.exp(-beta * projection_gap(d, c, spf)) for d in divs)
    return z


def calibration_defect(c, spf):
    """
    M_c(delta) = Tr(delta_c) = sum_{d | c} lambda_d = sum_{d | c} (tau(c/d) - 1).

    This is the total spectral mass of the defect operator on H_c = D(c).
    Equals 0 only when c = 1 (trivial history).
    Primes have M = 1 (one unstable mode: d=1, lambda=1).
    """
    divs = get_divisors(c, spf)
    return sum(projection_gap(d, c, spf) for d in divs)


def stable_fraction(c, beta, spf):
    """
    q_stable(c) = 1 / Z_c(beta).

    Probability that a randomly drawn proposition (under Gibbs weight) is
    the stable ground state (d = c, lambda = 0). Maximized for primes.
    """
    z = history_zeta_partition_function(c, beta, spf)
    return 1.0 / z if z > 0 else 0.0


def history_zeta_score(c, beta, spf):
    """
    Score candidate c against the prime thermodynamic signature via
    Fischer-Rao distance in proposition-space.

    Projects both c's distribution and the prime reference onto the binary
    (stable | unstable) partition, then computes the Bhattacharyya angle.

    Higher score = closer to the prime signature = more likely to be prime.
    Range: (-pi/2, 0].  Zero = exactly prime-like.
    """
    z_c = history_zeta_partition_function(c, beta, spf)
    if z_c <= 0:
        return -math.pi / 2

    # c's binary distribution
    p_stable   = 1.0 / z_c
    p_unstable = (z_c - 1.0) / z_c  # weight of all non-fixed propositions

    # Prime reference distribution
    z_prime    = math.exp(-beta) + 1.0
    q_stable   = 1.0 / z_prime
    q_unstable = math.exp(-beta) / z_prime

    # Bhattacharyya coefficient (Fischer-Rao angle cosine)
    bc = math.sqrt(max(0, p_stable   * q_stable)) \
       + math.sqrt(max(0, p_unstable * q_unstable))
    bc = min(bc, 1.0)

    # Fischer-Rao angle: 0 = prime, pi/2 = maximally non-prime
    return -math.acos(bc)   # negated so higher = better


# ============================================================================
# ADDITIVE CHU TOWER (FIXED)
# ============================================================================

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
    rem = n
    for i in range(min(len(fibs), num_levels) - 1, -1, -1):
        if fibs[i] <= rem:
            bits[i] = 1
            rem -= fibs[i]
    return bits

def nuclear_quartet_amplitudes(n, spf):
    if n <= 1:
        return 0.0, 0.0, 1.0, 0.0
    rad_n, omega_n, big_omega_n = 1, 0, 0
    is_sq = True
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
            is_sq = False
    log2n = max(math.log2(n), 1.0)
    return (rad_n / n,
            (big_omega_n - omega_n) / log2n,
            1.0 if is_sq else 0.0,
            omega_n / log2n)

def chu_observable_vector(n, spf, fibs, num_fib_levels=16):
    sat, trans, joint, distinct = nuclear_quartet_amplitudes(n, spf)
    tau2 = 2 * math.pi
    zbits = zeckendorf_occupancy(n, fibs, num_fib_levels)
    obs = [
        1.0, sat, trans, joint, distinct,
        math.cos(tau2 * n / PHI),
        math.cos(tau2 * n / PHI_SQ),
        math.sin(tau2 * n / PHI),
        math.sin(tau2 * n / PHI_SQ),
    ] + zbits
    return obs

def build_chu_matrix_level0(n_start, n_end, spf, fibs, num_fib_levels=16):
    rows = [chu_observable_vector(n, spf, fibs, num_fib_levels)
            for n in range(n_start, n_end + 1)]
    C = np.array(rows, dtype=np.float64)
    norms = np.linalg.norm(C, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    return C / norms


def additive_chu_level(C_prev, keep_modes=10):
    """
    Build the next RecursiveChuLevel by APPENDING, not replacing.

    new_block = top-K left singular vectors of C_prev, scaled by singular values
    C_next = row_normalize( column_concat(C_prev, new_block) )

    This is the correct fix for the degeneracy in the previous implementation:
    - Previous: C_next = U[:, :k]  (orthonormal, SVD of C_next gives same U)
    - Fixed:    C_next = row_norm([C_prev | U*s])

    After concatenation, G_next = C_next @ C_next.T encodes BOTH the original
    structure AND the first-order cluster geometry. G_next != G_prev, so the
    level-(k+1) eigenvectors capture genuinely new structure.

    Returns (C_next, U, s, Vt) of the C_prev SVD used to build the new block.
    """
    U, s, Vt = np.linalg.svd(C_prev, full_matrices=False)
    k = min(keep_modes, U.shape[1])

    # New features: eigenvectors scaled by singular values (variance-preserving)
    new_block = U[:, :k] * s[:k]  # N x k

    # Concatenate onto existing observables
    C_next = np.concatenate([C_prev, new_block], axis=1)  # N x (d + k)

    # Row-normalize the combined matrix
    norms = np.linalg.norm(C_next, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    C_next = C_next / norms

    return C_next, U[:, :k], s[:k], Vt[:k, :]


def build_additive_chu_tower(C0, levels=3, keep_modes=10):
    """
    Build levels of the additive Chu tower, collecting all SVD data.

    Returns list of (C_level, U, s, Vt) for levels 0..levels.
    """
    tower = []
    C = C0
    for _ in range(levels):
        C, U, s, Vt = additive_chu_level(C, keep_modes=keep_modes)
        tower.append((C, U, s, Vt))
    return tower


def chu_amplitude_scores(U, s, n_start, zeros, num_zeros=20):
    """
    Amplitude-weighted scores using History-Zeta-derived or provided zeros.

    scores[i] = sum_k  U[i,k] * s[k] * 2*cos(gamma_k * log(n_start+i))
                / sqrt(n_start + i)

    If zeros are provided, uses them as frequencies.
    If zeros is None, falls back to a coarse set derived from s (the tower's
    own singular values, scaled to the Riemann-zero range as an approximation).
    """
    N = U.shape[0]
    k = min(U.shape[1], len(zeros) if zeros is not None else U.shape[1], num_zeros)
    ns = np.arange(n_start, n_start + N, dtype=np.float64)
    log_ns = np.log(ns)
    sqrt_ns = np.sqrt(ns)

    if zeros is None:
        # Derive approximate frequencies from the tower's singular values
        # Scale s to be in the range of Riemann zeros: s[0] maps to ~14.1
        if len(s) > 0 and s[0] > 0:
            scale = 14.134725 / s[0]
            zeros_use = [s[i] * scale for i in range(k)]
        else:
            zeros_use = [14.134725 * (i + 1) for i in range(k)]
    else:
        zeros_use = zeros

    scores = np.zeros(N)
    for ki in range(k):
        scores += U[:, ki] * s[ki] * 2.0 * np.cos(zeros_use[ki] * log_ns)
    return scores / sqrt_ns


# ============================================================================
# COMBINED ORACLE
# ============================================================================

def score_candidates_combined(candidates, spf, fibs, beta=1.0,
                               tower_levels=2, keep_modes=8,
                               zeta_weight=0.6, chu_weight=0.4):
    """
    Score a list of odd candidates using the combined History Zeta + Chu oracle.

    History Zeta component (zeta_weight):
      score_hz(c) = history_zeta_score(c, beta, spf)
      Grounded in: Thermodynamics of Propositions, partition function Z_c(beta).
      Discriminates primes from composites by thermodynamic signature.

    Chu amplitude component (chu_weight):
      score_chu(c) = amplitude-weighted score from the additive Chu tower.
      Uses NuclearShadow (arithmetic structure) from the Chu manifold.
      Fine-grained ranking within the prime cluster.

    Returns array of scores, same length as candidates.
    """
    if not candidates:
        return np.array([])

    c_min = candidates[0]
    c_max = candidates[-1]

    # --- History Zeta scores ---
    hz_raw = np.array([history_zeta_score(c, beta, spf) for c in candidates])
    # Normalize to [0, 1]
    hz_min, hz_max = hz_raw.min(), hz_raw.max()
    if hz_max > hz_min:
        hz_norm = (hz_raw - hz_min) / (hz_max - hz_min)
    else:
        hz_norm = np.zeros_like(hz_raw)

    if not NUMPY_AVAILABLE or chu_weight == 0:
        return hz_norm

    # --- Chu amplitude scores ---
    C0 = build_chu_matrix_level0(c_min, c_max, spf, fibs)
    tower = build_additive_chu_tower(C0, levels=tower_levels, keep_modes=keep_modes)
    C_final, U_final, s_final, _ = tower[-1]
    # Use tower-derived zeros (None = auto-derive from singular values)
    chu_raw = chu_amplitude_scores(U_final, s_final, c_min, zeros=None, num_zeros=15)
    # Normalize to [0, 1]
    ch_min, ch_max = chu_raw.min(), chu_raw.max()
    if ch_max > ch_min:
        chu_norm = (chu_raw - ch_min) / (ch_max - ch_min)
    else:
        chu_norm = np.zeros_like(chu_raw)

    # Only take scores at odd positions (candidates are odd, but C0 covers all integers)
    # Map candidate c to index: c - c_min
    c_indices = [c - c_min for c in candidates]
    chu_at_candidates = chu_norm[c_indices]

    return zeta_weight * hz_norm + chu_weight * chu_at_candidates


def history_zeta_factor(n, time_limit=None,
                         beta=1.0, tower_levels=2, keep_modes=8,
                         zeta_weight=0.6, chu_weight=0.4):
    """
    Factor n using the History Zeta oracle.

    Steps:
      1. Generate odd candidates c in [3, sqrt(n)].
      2. Score each candidate using combined History Zeta + Chu amplitude score.
         - History Zeta: thermodynamic prime signature (Z_c(beta))
         - Chu amplitude: additive tower manifold score
      3. Test candidates in decreasing score order.
      4. Return first divisor found.

    Returns (factor, elapsed_seconds, steps).
    """
    spf = get_sieve(max(n, 500_000))
    fibs = fibonacci_sequence(500_000)

    start = time.perf_counter()
    steps = 0

    if n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    sqrt_n = math.isqrt(n)
    if sqrt_n * sqrt_n == n:
        return sqrt_n, time.perf_counter() - start, 1

    candidates = list(range(3, sqrt_n + 1, 2))
    if not candidates:
        return None, time.perf_counter() - start, 0

    # Score all candidates
    scores = score_candidates_combined(
        candidates, spf, fibs, beta=beta,
        tower_levels=tower_levels, keep_modes=keep_modes,
        zeta_weight=zeta_weight, chu_weight=chu_weight
    )

    # Sort by score descending
    order = np.argsort(scores)[::-1] if NUMPY_AVAILABLE else range(len(candidates))

    for idx in order:
        steps += 1
        c = candidates[int(idx)]
        if time_limit and time.perf_counter() - start > time_limit:
            return None, time.perf_counter() - start, steps
        if n % c == 0:
            return c, time.perf_counter() - start, steps

    return None, time.perf_counter() - start, steps


# ============================================================================
# SELF-TEST
# ============================================================================

def _self_test():
    """Quick sanity checks on the partition function and scores."""
    spf = get_sieve(10_000)

    print("  History Zeta partition function Z_c(beta=1):")
    print(f"  {'c':>8}  {'type':<12}  {'Z_c':>8}  {'q_stable':>8}  {'score':>8}")
    print(f"  {'-'*8}  {'-'*12}  {'-'*8}  {'-'*8}  {'-'*8}")
    for c, label in [(2, "prime"), (3, "prime"), (7, "prime"), (97, "prime"),
                     (4, "p^2"), (9, "p^2"), (25, "p^2"),
                     (6, "p*q"), (15, "p*q"), (35, "p*q"), (77, "p*q"),
                     (30, "p*q*r"), (105, "p*q*r"),
                     (210, "p*q*r*s")]:
        z = history_zeta_partition_function(c, beta=1.0, spf=spf)
        qs = stable_fraction(c, 1.0, spf)
        sc = history_zeta_score(c, 1.0, spf)
        print(f"  {c:>8}  {label:<12}  {z:>8.4f}  {qs:>8.4f}  {sc:>8.5f}")

    print()
    print("  Expected: primes have lowest Z_c, highest q_stable, score closest to 0.")

    # Verify ordering
    z_prime = history_zeta_partition_function(97, 1.0, spf)
    z_semi  = history_zeta_partition_function(91, 1.0, spf)  # 7 * 13
    assert z_prime < z_semi, f"Prime should have lower Z than semiprime: {z_prime} vs {z_semi}"
    print("  Ordering check passed: Z_prime < Z_semiprime.")

    print()


if __name__ == "__main__":
    print("History Zeta Oracle — self-test")
    print("=" * 50)
    _self_test()
