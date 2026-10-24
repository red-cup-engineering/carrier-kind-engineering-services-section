#!/usr/bin/env python3
"""
RSA Key Generator — Self-Generated Moduli Only
===============================================

Generates RSA moduli n = p * q with known factors p, q.
All keys are self-generated. No real cryptographic keys are used.
No network access. Pure arithmetic.

From the arithmetic-history-system.md:
  The history monoid for positive integers is (Z>0, *) with step set = Primes
  and full commutation: every pair of distinct primes commutes.
  n = p * q is a two-step history in this monoid: first step p, then step q,
  or equivalently first step q, then step p (commutativity of distinct primes).

The RSA modulus n is a HISTORY of exactly two prime steps.
Factoring n is finding which two prime steps compose to give n.
"""

import random
import math


# ══════════════════════════════════════════════════════════════════════════
# PRIMALITY TESTING
# ══════════════════════════════════════════════════════════════════════════

def miller_rabin_test(candidate, witness):
    """Single Miller-Rabin round with given witness."""
    if candidate == witness:
        return True
    n_minus_one = candidate - 1
    right_shift_count = 0
    odd_part = n_minus_one
    while odd_part % 2 == 0:
        right_shift_count += 1
        odd_part //= 2
    test_value = pow(witness, odd_part, candidate)
    if test_value == 1 or test_value == n_minus_one:
        return True
    for _ in range(right_shift_count - 1):
        test_value = test_value * test_value % candidate
        if test_value == n_minus_one:
            return True
    return False


def is_prime(candidate, rounds=20, rng=None):
    """
    Deterministic Miller-Rabin primality test.

    For candidates up to 3,317,044,064,679,887,385,961,981 the small witnesses
    {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37} suffice deterministically.
    For larger candidates we use random witnesses.
    """
    if candidate < 2:
        return False
    small_primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]
    if candidate in small_primes:
        return True
    if any(candidate % p == 0 for p in small_primes):
        return False
    # Use fixed witnesses for deterministic testing up to ~3.3 * 10^24
    witnesses = small_primes
    # Add random witnesses for extra security on large candidates
    if rng is not None:
        for _ in range(rounds):
            witnesses.append(rng.randrange(2, candidate - 1))
    for witness in witnesses:
        if witness >= candidate:
            continue
        if not miller_rabin_test(candidate, witness):
            return False
    return True


def generate_prime(bit_count, rng):
    """
    Generate a random prime of exactly bit_count bits.

    Bit count must be at least 4. The generated prime has its top bit
    and bottom bit set (so it is odd and has the right bit length).
    """
    assert bit_count >= 4
    while True:
        candidate = rng.getrandbits(bit_count)
        candidate |= (1 << (bit_count - 1))  # set top bit → correct bit length
        candidate |= 1                         # set bottom bit → odd
        if is_prime(candidate, rng=rng):
            return candidate


# ══════════════════════════════════════════════════════════════════════════
# RSA MODULUS GENERATION
# ══════════════════════════════════════════════════════════════════════════

def generate_rsa_modulus(total_bit_count, seed):
    """
    Generate n = p * q with known factors.

    Each prime is (total_bit_count // 2) bits. The modulus n = p * q has
    approximately total_bit_count bits. p and q are distinct primes.

    Returns: (n, p, q) where p < q and n = p * q.
    """
    rng = random.Random(seed)
    prime_bits = total_bit_count // 2
    attempts = 0
    while True:
        attempts += 1
        p = generate_prime(prime_bits, rng)
        q = generate_prime(prime_bits, rng)
        if p == q:
            continue
        n = p * q
        if n.bit_length() >= total_bit_count - 1:
            return n, min(p, q), max(p, q)


def generate_rsa_key_suite(sizes=None, seed=42):
    """
    Generate RSA moduli at standard sizes with known factors.

    Sizes are bit counts for the modulus. Returns list of
    (bit_size, n, p, q) tuples.
    """
    if sizes is None:
        sizes = [64, 128, 256, 512]
    rng = random.Random(seed)
    keys = []
    for bit_size in sizes:
        key_seed = rng.randint(0, 2**32)
        n, p, q = generate_rsa_modulus(bit_size, key_seed)
        keys.append((bit_size, n, p, q))
    return keys


# ══════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ══════════════════════════════════════════════════════════════════════════

def verify_rsa_modulus(n, p, q):
    """
    Verify that (n, p, q) is a valid RSA modulus with known factors.

    Checks: n = p * q, p and q are prime, p != q, p < q.
    """
    assert n == p * q, f"n != p*q: {n} != {p}*{q}"
    assert is_prime(p), f"p={p} is not prime"
    assert is_prime(q), f"q={q} is not prime"
    assert p != q, "p == q"
    assert p < q, f"p={p} >= q={q}"
    return True


if __name__ == "__main__":
    print("Generating RSA test key suite...")
    print()
    keys = generate_rsa_key_suite()
    for bit_size, n, p, q in keys:
        verify_rsa_modulus(n, p, q)
        print(f"  {bit_size:>4}-bit  n={n.bit_length()}bits  p={p.bit_length()}bits  q={q.bit_length()}bits")
        print(f"           p = {p}")
        print(f"           q = {q}")
        print(f"           n = {n}")
        print()
    print("All keys verified: n = p * q, p and q prime, p != q.")
