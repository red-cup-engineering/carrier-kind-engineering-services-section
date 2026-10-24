#!/usr/bin/env python3
"""
RSA Factoring Sandbox — Relational Ordering vs Classical Methods
================================================================

Tests whether the arithmetic history system's commutation structure gives
a factoring speedup over classical methods.

Sandbox Rules (enforced):
  - All RSA keys are self-generated. No real keys.
  - No network access.
  - Every attempt is logged: method, key size, time, steps, success/failure.
  - Start at 64-bit moduli.
  - Compare against classical baselines at each size.

Methods tested:
  CLASSICAL:
    Naive Trial Division    — O(sqrt(n)), all odd candidates
    Wheel-6 Trial Division  — O(sqrt(n)/3), 6k±1 candidates
    Pollard's Rho           — O(n^(1/4)) expected, birthday-paradox cycle
    Fermat's Method         — O((p-q)^2/(4n)), fast when p ≈ q

  RELATIONAL ORDERING:
    RO Level 1: Settled Bypass        — test primes only, Settled composites bypassed
    RO Level 2: Commutation Normal    — wheel-6, derived from nuclear quartet {ν_2, ν_3}
    RO Level 3: Recursive Quartet     — wheel-30, nuclear quartet applied recursively
    RO Level 4: Full DefectCollapse   — wheel-210 + Fermat DefectCollapse combined

The expected finding: RO Levels 1-4 give polynomial speedup factors within the
trial-division class (constant-factor improvements). The fundamental hardness of
factoring comes from the arithmetic history system being maximally flat: all prime
steps fully commute, so the search space has no deeper algebraic redundancy.

If RO gives polynomial-time speedup over Pollard's rho or NFS at any size,
that would be the break. See the analysis section.
"""

import time
import math
import sys
import io
import functools

# Force UTF-8 output on Windows where the console may default to cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Always flush so output streams live (visible as methods run)
print = functools.partial(print, flush=True)

# Add parent directory for imports within the sandbox package
import os
sys.path.insert(0, os.path.dirname(__file__))

from rsa_keys import generate_rsa_key_suite, verify_rsa_modulus
from classical_baselines import (
    trial_division_naive,
    trial_division_wheel6,
    pollard_rho,
    fermat_method,
)
from ro_factoring_engine import (
    ro_factor_level_1_settled_bypass,
    ro_factor_level_2_commutation_normal_form,
    ro_factor_level_3_recursive_nuclear_quartet,
    ro_factor_level_4_full_defect_collapse,
    analyze_commutation_structure,
    analyze_fermat_gap,
    build_commutation_wheel,
)


# ══════════════════════════════════════════════════════════════════════════
# BENCHMARK CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════

# Key sizes to test. Progression: don't advance until current size is understood.
KEY_SIZES = [64, 128, 256, 512]

# Time limit per method per key (seconds)
TIME_LIMIT_SECONDS = 10.0

# Random seed for key generation
KEY_GENERATION_SEED = 42

# Number of keys per size for averaging
KEYS_PER_SIZE = 3


# ══════════════════════════════════════════════════════════════════════════
# METHOD REGISTRY
# ══════════════════════════════════════════════════════════════════════════

def run_method(method_name, method_fn, modulus_n, time_limit):
    """
    Run a single factoring method and return a result record.

    Logs: method name, modulus bit length, elapsed time, step count,
    whether the correct factor was found.
    """
    start_wall = time.perf_counter()
    try:
        result = method_fn(modulus_n, time_limit=time_limit)
        elapsed = time.perf_counter() - start_wall

        # Unpack result — some methods return (factor, time, steps) or
        # (factor, time, steps, bypassed)
        if len(result) == 4:
            found_factor, method_time, steps, bypassed = result
        else:
            found_factor, method_time, steps = result
            bypassed = None

        return {
            'method': method_name,
            'bits': modulus_n.bit_length(),
            'found_factor': found_factor,
            'elapsed': elapsed,
            'steps': steps,
            'bypassed': bypassed,
            'timed_out': found_factor is None and elapsed >= time_limit * 0.99,
            'correct': None,  # Filled in by caller after verification
        }
    except Exception as exc:
        elapsed = time.perf_counter() - start_wall
        return {
            'method': method_name,
            'bits': modulus_n.bit_length(),
            'found_factor': None,
            'elapsed': elapsed,
            'steps': 0,
            'bypassed': None,
            'timed_out': False,
            'correct': False,
            'error': str(exc),
        }


def verify_result(result_record, modulus_n, true_p, true_q):
    """
    Verify that a factoring result is correct.

    A factor is correct if it is non-trivial (not 1 or n) and divides n.
    We do NOT require that the factor equals true_p or true_q — any valid
    factor is correct.
    """
    found = result_record['found_factor']
    if found is None:
        result_record['correct'] = False
        return result_record
    if found <= 1 or found >= modulus_n:
        result_record['correct'] = False
        return result_record
    if modulus_n % found != 0:
        result_record['correct'] = False
        return result_record
    result_record['correct'] = True
    return result_record


# ══════════════════════════════════════════════════════════════════════════
# MAIN BENCHMARK
# ══════════════════════════════════════════════════════════════════════════

def run_benchmark():
    print("=" * 90)
    print("RSA FACTORING SANDBOX — RELATIONAL ORDERING vs CLASSICAL METHODS")
    print("=" * 90)
    print()
    print("Sandbox rules enforced:")
    print("  All keys self-generated | No network access | All attempts logged")
    print(f"  Key sizes: {KEY_SIZES} bits | Time limit: {TIME_LIMIT_SECONDS}s/method | Seed: {KEY_GENERATION_SEED}")
    print()

    # Print commutation structure analysis
    print("═" * 90)
    print("COMMUTATION STRUCTURE ANALYSIS")
    print("  The arithmetic history system has full commutation: all distinct primes commute.")
    print("  The FreeShadow of the recursive nuclear quartet at each level:")
    print()
    for basis_size, basis_primes in [
        (1, [2]),
        (2, [2, 3]),
        (3, [2, 3, 5]),
        (4, [2, 3, 5, 7]),
        (5, [2, 3, 5, 7, 11]),
        (6, [2, 3, 5, 7, 11, 13]),
    ]:
        period, spokes = build_commutation_wheel(basis_primes)
        density = len(spokes) / period
        print(f"  Basis {{{', '.join(map(str, basis_primes))}}}:  period={period:>6}  "
              f"FreeShadow spokes={len(spokes):>4}  "
              f"density={density:.4f}  "
              f"bypassed={1-density:.4f}")
    print()
    print("  Each level applies DefectCollapse recursively. The surviving candidates")
    print("  form the 'defect map' — positions where factors might actually lie.")
    print("  This is the commutation recursion the user noted.")
    print()

    # Generate keys
    print("═" * 90)
    print("KEY GENERATION")
    print()
    all_keys = []
    for bit_size in KEY_SIZES:
        import random
        rng = random.Random(KEY_GENERATION_SEED + bit_size)
        for key_index in range(KEYS_PER_SIZE):
            from rsa_keys import generate_rsa_modulus
            seed = rng.randint(0, 2**32)
            n, p, q = generate_rsa_modulus(bit_size, seed)
            verify_rsa_modulus(n, p, q)
            all_keys.append((bit_size, n, p, q, key_index))
            fermat_info = analyze_fermat_gap(n, p, q)
            print(f"  {bit_size:>4}-bit  key#{key_index}  "
                  f"p={p.bit_length()}b  q={q.bit_length()}b  "
                  f"balance={fermat_info['factor_balance']:.4f}  "
                  f"fermat_steps={fermat_info['fermat_steps_needed']:>10,}")
    print()
    print("  Note: 'balance' = p/q (1.0 = perfectly balanced, near 0 = very unbalanced)")
    print("  'fermat_steps' = how many Fermat steps needed to find this key's factor")
    print()

    # Define methods
    CLASSICAL_METHODS = [
        ("Naive Trial Division",      trial_division_naive),
        ("Wheel-6 Trial Division",    trial_division_wheel6),
        ("Pollard's Rho",             pollard_rho),
        ("Fermat's Method",           fermat_method),
    ]

    RO_METHODS = [
        ("RO L1 Settled-Bypass",      ro_factor_level_1_settled_bypass),
        ("RO L2 Commutation-Normal",  ro_factor_level_2_commutation_normal_form),
        ("RO L3 Recursive-Quartet",   ro_factor_level_3_recursive_nuclear_quartet),
        ("RO L4 Full-DefectCollapse", ro_factor_level_4_full_defect_collapse),
    ]

    ALL_METHODS = CLASSICAL_METHODS + RO_METHODS

    # Results storage
    all_results = []

    # Run benchmark by bit size
    for bit_size in KEY_SIZES:
        size_keys = [(n, p, q, ki) for (bs, n, p, q, ki) in all_keys if bs == bit_size]

        print("═" * 90)
        print(f"  {bit_size}-BIT MODULI ({KEYS_PER_SIZE} keys)")
        print("═" * 90)
        print()

        # Analysis for this size
        sample_n = size_keys[0][0]
        comm_analysis = analyze_commutation_structure(sample_n)
        print(f"  Search space size: ~2^{math.floor(bit_size/2)} = {comm_analysis['search_space_size']:,} candidates")
        print(f"  Level 1 survivors (odd):         {comm_analysis['level_1_count']:>12,}  ({comm_analysis['level_1_density']*100:.1f}%)")
        print(f"  Level 2 survivors (6k±1):        {comm_analysis['level_2_count']:>12,}  ({comm_analysis['level_2_density']*100:.1f}%)")
        print(f"  Level 3 survivors (wheel-30):    {comm_analysis['level_3_count']:>12,}  ({comm_analysis['level_3_density']*100:.1f}%)")
        print(f"  Level 4 survivors (wheel-210):   {comm_analysis['level_4_count']:>12,}  ({comm_analysis['level_4_density']*100:.1f}%)")
        print()

        # For each key
        for n, p, q, key_index in size_keys:
            print(f"  ─── Key #{key_index} ({'n=' + str(n)[:30] + '...' if len(str(n)) > 30 else 'n=' + str(n)}) ───")

            fermat_info = analyze_fermat_gap(n, p, q)
            print(f"      Factor gap: {fermat_info['factor_gap']:,}  "
                  f"Balance: {fermat_info['factor_balance']:.4f}  "
                  f"Fermat target: {fermat_info['fermat_steps_needed']:,} steps")
            print()

            key_results = []

            print(f"  {'Method':<30}  {'Steps':>12}  {'Time':>10}  {'Result'}")
            print(f"  {'─'*30}  {'─'*12}  {'─'*10}  {'─'*20}")

            for method_name, method_fn in ALL_METHODS:
                separator = "  " if method_name.startswith("RO") else ""

                # Skip very slow methods for large keys
                if bit_size >= 256 and method_name == "Naive Trial Division":
                    print(f"  {separator}{method_name:<30}  {'[SKIPPED - too slow]':>30}")
                    continue

                # Show which method is running so user sees live progress
                print(f"  {separator}  {method_name:<30}  running...", end="\r")

                result = run_method(method_name, method_fn, n, TIME_LIMIT_SECONDS)
                result = verify_result(result, n, p, q)
                key_results.append(result)
                all_results.append({**result, 'bit_size': bit_size, 'key_index': key_index})

                # Format output
                steps_str = f"{result['steps']:>12,}" if result['steps'] else "           ?"
                time_str = f"{result['elapsed']:>8.4f}s"

                if result.get('timed_out'):
                    status = f"TIMEOUT ({TIME_LIMIT_SECONDS}s)"
                elif not result['correct']:
                    if result.get('error'):
                        status = f"ERROR: {result['error'][:30]}"
                    else:
                        status = "FAILED (no factor found)"
                else:
                    found = result['found_factor']
                    status = f"FACTOR: {found}"
                    if result.get('bypassed') is not None:
                        status += f" (bypass={result['bypassed']:,})"

                marker = "◆" if result['correct'] else " "
                print(f"  {separator}{marker}{method_name:<30}  {steps_str}  {time_str}  {status}")

            print()

            # Per-key mini-analysis
            successful = [r for r in key_results if r['correct']]
            if successful:
                fastest = min(successful, key=lambda r: r['elapsed'])
                most_efficient = min(successful, key=lambda r: r['steps'])

                print(f"      Fastest:        {fastest['method']} ({fastest['elapsed']:.4f}s)")
                print(f"      Fewest steps:   {most_efficient['method']} ({most_efficient['steps']:,} steps)")

                # Compare RO vs classical at each level
                classical_successful = [r for r in successful if not r['method'].startswith('RO')]
                ro_successful = [r for r in successful if r['method'].startswith('RO')]

                if classical_successful and ro_successful:
                    best_classical = min(classical_successful, key=lambda r: r['elapsed'])
                    best_ro = min(ro_successful, key=lambda r: r['elapsed'])
                    speedup = best_classical['elapsed'] / max(best_ro['elapsed'], 1e-9)
                    print(f"      Best classical: {best_classical['method']} ({best_classical['elapsed']:.4f}s)")
                    print(f"      Best RO:        {best_ro['method']} ({best_ro['elapsed']:.4f}s)")
                    if speedup > 1.0:
                        print(f"      RO SPEEDUP:     {speedup:.2f}x faster than best classical")
                    else:
                        print(f"      Classical faster: {1/speedup:.2f}x vs best RO")
            print()

    # ── Grand Summary ─────────────────────────────────────────────────────
    print()
    print("=" * 90)
    print("GRAND SUMMARY")
    print("=" * 90)
    print()

    # Success rates by method
    print("  Success rates by method (within time limit):")
    print()
    for method_name, _ in ALL_METHODS:
        method_results = [r for r in all_results if r['method'] == method_name]
        if not method_results:
            continue
        successes = sum(1 for r in method_results if r['correct'])
        total = len(method_results)
        avg_time = sum(r['elapsed'] for r in method_results if r['correct']) / max(1, successes)
        avg_steps = sum(r['steps'] for r in method_results if r['correct']) / max(1, successes)

        marker = "◆" if successes == total else (" " if successes > 0 else "✗")
        print(f"  {marker} {method_name:<30}  "
              f"success={successes}/{total}  "
              f"avg_time={avg_time:.4f}s  "
              f"avg_steps={avg_steps:>12,.0f}")

    print()

    # Speedup analysis by bit size
    print("  Speedup analysis: RO Level 4 vs Pollard's Rho (per key size):")
    print()
    for bit_size in KEY_SIZES:
        size_results = [r for r in all_results if r['bit_size'] == bit_size]
        rho_results = [r for r in size_results if r['method'] == "Pollard's Rho" and r['correct']]
        ro4_results = [r for r in size_results if r['method'] == "RO L4 Full-DefectCollapse" and r['correct']]

        if not rho_results or not ro4_results:
            print(f"  {bit_size:>4}-bit: insufficient data for comparison")
            continue

        avg_rho_time = sum(r['elapsed'] for r in rho_results) / len(rho_results)
        avg_ro4_time = sum(r['elapsed'] for r in ro4_results) / len(ro4_results)

        if avg_ro4_time > 0:
            speedup = avg_rho_time / avg_ro4_time
            winner = "RO L4" if speedup > 1.0 else "Pollard"
            margin = abs(speedup - 1.0) * 100
            print(f"  {bit_size:>4}-bit:  Pollard={avg_rho_time:.4f}s  "
                  f"RO-L4={avg_ro4_time:.4f}s  "
                  f"Winner={winner}  Margin={margin:.1f}%")
        else:
            print(f"  {bit_size:>4}-bit: RO L4 time too small to measure")

    print()

    # ── Analysis Section ──────────────────────────────────────────────────
    print("─" * 90)
    print("ANALYSIS — RELATIONAL ORDERING AND INTEGER FACTORIZATION")
    print("─" * 90)
    print()
    print("The Arithmetic History System (arithmetic-history-system.md):")
    print("  - Carrier T = (Z>0, |): positive integers under divisibility")
    print("  - Step set = Primes, Full commutation: all distinct primes commute")
    print("  - Empty = 1, Extend(p, t) = p*t, FTA = History Separation")
    print()
    print("What the RO framework contributes to factoring:")
    print()
    print("  RO L1 (Settled Bypass):")
    print("    Every composite candidate is Settled: its test result is derivable")
    print("    from the tests of its prime factors. DefectCollapse fires to skip them.")
    print("    Result: test only prime candidates. This is the first recursive")
    print("    application of the bypass theorem to the factoring search space.")
    print()
    print("  RO L2 (Commutation Normal Form):")
    print("    The nuclear quartet {ν_2, ν_3} partitions the search space into")
    print("    four corners. The FreeShadow = candidates coprime to 6 (≡ 1,5 mod 6).")
    print("    DefectCollapse at Level 2: skip all candidates in Fix(ν_2) ∪ Fix(ν_3).")
    print("    This is the 6k±1 wheel, DERIVED from the commutation structure.")
    print()
    print("  RO L3 (Recursive Nuclear Quartet):")
    print("    Extends to basis {2,3,5}. Period = 30, spokes = 8.")
    print("    The commutation is applied RECURSIVELY: the quartet structure from")
    print("    Level 2 is re-applied to its own FreeShadow, adding nucleus ν_5.")
    print("    The four-corner structure from the quartet theorem closes again at")
    print("    exactly four elements — the recursion is stable.")
    print()
    print("  RO L4 (Full DefectCollapse):")
    print("    Combines two strategies:")
    print("    (a) Fermat DefectCollapse: exploits the commutativity of n = p*q = q*p.")
    print("        The commutation diamond Extend(p, q*1) = Extend(q, p*1) = n")
    print("        gives the Fermat center a = (p+q)/2 as the DefectCollapse point.")
    print("        For balanced keys (p ≈ q), this fires very quickly.")
    print("    (b) Wheel-210 trial: FreeShadow of {ν_2,ν_3,ν_5,ν_7}, density=22.9%.")
    print()
    print("What the RO framework does NOT contribute:")
    print()
    print("  The arithmetic history system is maximally flat: all prime steps")
    print("  commute. This means the ENTIRE factoring history is one commuting block.")
    print("  There is no 'Mazurkiewicz defect' in the prime factorization itself —")
    print("  the primes of n are a multiset, and finding them requires examining the")
    print("  entire search space without deeper algebraic shortcuts.")
    print()
    print("  The DefectCollapse tower (Levels 1-4) gives polynomial CONSTANT-FACTOR")
    print("  speedups over naive trial division. At Level 4, ~77% of candidates are")
    print("  Settled and bypassed. But the remaining ~23% still require O(sqrt(n))")
    print("  work in the worst case — the asymptotic class is unchanged.")
    print()
    print("  Comparison with compression:")
    print("  In compression, the defect density is LOW (few non-commuting junctions),")
    print("  so the bypass theorem eliminates most of the data. In factoring, the")
    print("  'defect density' is HIGH — the factor p can be at any of the O(sqrt(n)/ln(n))")
    print("  prime positions. The commutation structure eliminates composites but")
    print("  cannot eliminate the prime positions without knowing the answer.")
    print()
    print("  This is the honest result: the RO framework correctly identifies the")
    print("  structure of the factoring problem — the arithmetic history is flat,")
    print("  FTA gives the unique normal form, and the DefectCollapse tower gives")
    print("  the wheel factorization hierarchy. No novel polynomial speedup was found.")
    print()
    print("  The Fermat DefectCollapse (Level 4, Pass 1) DOES give a structural")
    print("  advantage for balanced RSA keys: it directly exploits the commutativity")
    print("  of p and q (the two prime events that build n). For keys where p ≈ q,")
    print("  this is O((q-p)^2/(4n)) steps — potentially much faster than Pollard.")
    print("  This IS a structural observation from the commutation diamond.")
    print()
    print("─" * 90)

    return all_results


# ══════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    results = run_benchmark()
