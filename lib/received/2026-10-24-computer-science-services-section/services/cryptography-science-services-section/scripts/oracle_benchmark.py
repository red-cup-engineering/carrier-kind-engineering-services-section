#!/usr/bin/env python3
"""
Parameterizable Oracle Benchmark
=================================

A lightweight harness for comparing factoring oracles.

Usage:
    python oracle_benchmark.py

Designed to accept any list of (name, callable) method pairs.
Each callable must have signature:  fn(n, time_limit=T) -> (factor, elapsed, steps)

Add new oracles by appending to ORACLE_METHODS at the bottom.
"""

import sys
import os
import time
import math
import random
import functools
import io

# stdout redirect handled by history_zeta_oracle on import
print = functools.partial(print, flush=True)

sys.path.insert(0, os.path.dirname(__file__))

from rsa_keys import generate_rsa_modulus, verify_rsa_modulus
from classical_baselines import (
    trial_division_naive,
    trial_division_wheel6,
    pollard_rho,
    fermat_method,
)
from history_zeta_oracle import history_zeta_factor


# ============================================================================
# HARNESS CORE
# ============================================================================

def run_one(name, fn, n, time_limit):
    """Run a single method, return a result dict."""
    t0 = time.perf_counter()
    try:
        raw = fn(n, time_limit=time_limit)
        elapsed = time.perf_counter() - t0
        # Support 3-tuple (factor, time, steps) or 4-tuple (factor, time, steps, aux)
        factor, _, steps = raw[0], raw[1], raw[2]
        return dict(name=name, factor=factor, elapsed=elapsed,
                    steps=steps, error=None, timed_out=(factor is None and elapsed >= time_limit * 0.98))
    except Exception as e:
        return dict(name=name, factor=None, elapsed=time.perf_counter() - t0,
                    steps=0, error=str(e), timed_out=False)


def verify(result, n):
    f = result['factor']
    result['ok'] = (f is not None and 1 < f < n and n % f == 0)
    return result


def run_oracle_benchmark(methods, key_sizes, time_limit=10.0, keys_per_size=3, seed=42):
    """
    Run every method in `methods` against RSA keys of each size in `key_sizes`.

    methods: list of (name: str, fn: callable)
    key_sizes: list of int (bit sizes)
    time_limit: seconds per method per key
    keys_per_size: how many random keys per bit size
    seed: RNG seed for key generation
    """
    print("=" * 80)
    print("ORACLE BENCHMARK — parameterizable RSA factoring harness")
    print("=" * 80)
    print(f"  Methods:      {[m[0] for m in methods]}")
    print(f"  Key sizes:    {key_sizes} bits")
    print(f"  Keys/size:    {keys_per_size}")
    print(f"  Time limit:   {time_limit}s / method / key")
    print(f"  Seed:         {seed}")
    print()

    # Generate all keys up front
    all_keys = []
    print("Key generation:")
    for bits in key_sizes:
        rng = random.Random(seed + bits)
        for ki in range(keys_per_size):
            s = rng.randint(0, 2**32)
            n, p, q = generate_rsa_modulus(bits, s)
            verify_rsa_modulus(n, p, q)
            all_keys.append((bits, n, p, q, ki))
            print(f"  {bits:>4}-bit  key#{ki}  p={p.bit_length()}b  q={q.bit_length()}b  "
                  f"n={str(n)[:24]}{'...' if n.bit_length() > 80 else ''}")
    print()

    all_results = []

    for bits in key_sizes:
        size_keys = [(n, p, q, ki) for (b, n, p, q, ki) in all_keys if b == bits]
        print("=" * 80)
        print(f"  {bits}-BIT KEYS")
        print("=" * 80)
        print()

        for n, p, q, ki in size_keys:
            n_str = str(n)
            n_disp = n_str[:28] + '...' if len(n_str) > 28 else n_str
            print(f"  Key #{ki}  n={n_disp}")
            print(f"  {'Method':<32}  {'Steps':>14}  {'Time':>10}  Result")
            print(f"  {'─'*32}  {'─'*14}  {'─'*10}  {'─'*30}")

            for name, fn in methods:
                # Skip naive trial division for large keys
                if bits >= 256 and name == "Naive Trial Division":
                    print(f"  {'  ' + name:<34}  [skipped — too slow for {bits}-bit]")
                    continue

                print(f"  {'  ' + name:<34}  running...", end="\r")
                rec = run_one(name, fn, n, time_limit)
                rec = verify(rec, n)
                rec.update(bits=bits, key_index=ki)
                all_results.append(rec)

                steps_s = f"{rec['steps']:>14,}" if rec['steps'] else f"{'?':>14}"
                time_s  = f"{rec['elapsed']:>9.4f}s"
                if rec['timed_out']:
                    status = f"TIMEOUT ({time_limit}s)"
                elif rec['error']:
                    status = f"ERROR: {rec['error'][:35]}"
                elif rec['ok']:
                    status = f"FACTOR {rec['factor']}"
                else:
                    status = "no factor"
                marker = "◆" if rec['ok'] else " "
                print(f"  {marker} {name:<32}  {steps_s}  {time_s}  {status}")

            # Per-key fastest
            good = [r for r in all_results if r['bits'] == bits and r['key_index'] == ki and r['ok']]
            if good:
                fastest = min(good, key=lambda r: r['elapsed'])
                print(f"      fastest: {fastest['name']} ({fastest['elapsed']:.4f}s)")
            print()

    # ── Summary ──────────────────────────────────────────────────────────────
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print(f"  {'Method':<32}  {'Success':>8}  {'Avg time':>10}  {'Avg steps':>14}")
    print(f"  {'─'*32}  {'─'*8}  {'─'*10}  {'─'*14}")
    for name, _ in methods:
        recs = [r for r in all_results if r['name'] == name]
        if not recs:
            continue
        good = [r for r in recs if r['ok']]
        rate = f"{len(good)}/{len(recs)}"
        avg_t = sum(r['elapsed'] for r in good) / max(1, len(good))
        avg_s = sum(r['steps']   for r in good) / max(1, len(good))
        print(f"  {name:<32}  {rate:>8}  {avg_t:>9.4f}s  {avg_s:>14,.0f}")

    print()

    # Speedup table: each oracle vs Pollard's Rho as baseline
    baseline_name = "Pollard's Rho"
    print(f"  Speedup vs {baseline_name}:")
    print()
    for bits in key_sizes:
        b_recs = [r for r in all_results if r['bits'] == bits and r['name'] == baseline_name and r['ok']]
        if not b_recs:
            continue
        b_avg = sum(r['elapsed'] for r in b_recs) / len(b_recs)
        for name, _ in methods:
            if name == baseline_name:
                continue
            m_recs = [r for r in all_results if r['bits'] == bits and r['name'] == name and r['ok']]
            if not m_recs:
                continue
            m_avg = sum(r['elapsed'] for r in m_recs) / len(m_recs)
            ratio = b_avg / m_avg if m_avg > 0 else float('inf')
            arrow = "faster" if ratio > 1 else "slower"
            print(f"  {bits:>4}-bit  {name:<32}  {ratio:>6.2f}x {arrow} than {baseline_name}")
        print()

    return all_results


# ============================================================================
# ENTRY POINT — plug in your oracles here
# ============================================================================

CLASSICAL_METHODS = [
    ("Naive Trial Division",    trial_division_naive),
    ("Wheel-6 Trial Division",  trial_division_wheel6),
    ("Pollard's Rho",           pollard_rho),
    ("Fermat's Method",         fermat_method),
]

ORACLE_METHODS = [
    ("History Zeta Oracle",     history_zeta_factor),
]

# To add more oracles:
#   from chu_zeta_oracle import chu_zeta_factor
#   ORACLE_METHODS.append(("Chu Zeta Oracle", chu_zeta_factor))

ALL_METHODS = CLASSICAL_METHODS + ORACLE_METHODS

if __name__ == "__main__":
    run_oracle_benchmark(
        methods=ALL_METHODS,
        key_sizes=[16, 24, 32],   # start small; widen when confirmed working
        time_limit=30.0,
        keys_per_size=3,
        seed=42,
    )
