#!/usr/bin/env python3
"""
Relational Ordering Factoring Engine
=====================================

Models integer factorization as an arithmetic history system and applies
the framework's named constructs from proof/empty.lean and the math files.

═══════════════════════════════════════════════════════════════════════════
THE ARITHMETIC HISTORY SYSTEM (from arithmetic-history-system.md)
═══════════════════════════════════════════════════════════════════════════

  Carrier T = (Z>0, |)        positive integers under divisibility
  Empty = 1                   the empty history: nothing has occurred yet
  Step set = Primes            each prime is one elementary event
  Extend(p, t) = p * t         prepend prime step p to history t
  Order(m, n) = (m | n)        m is a prefix of n: m divides n
  EventCommutation(p, q) = (p != q)  distinct primes commute

From arithmetic-history-system.md:
  "The history monoid M(Primes, I_full) ≅ (Z>0, *) with the identification:
  a history p1 ⋆ p2 ⋆ ⋯ ⋆ pk (primes with repetition, order irrelevant by
  full commutation) corresponds to their product p1 p2 ⋯ pk."

  "The Fundamental Theorem of Arithmetic is, in history-monoid language,
  the statement that M(Primes, I_full) is a free commutative monoid:
  every positive integer has a unique canonical normal form."

The factoring problem: given n = p * q (RSA semiprime), find the two prime
steps that compose to give n. Since distinct primes fully commute, n has a
UNIQUE canonical form (FTA = History Separation). The problem is to find
the canonical form without being told the steps.

═══════════════════════════════════════════════════════════════════════════
THE RECURSIVE COMMUTATION STRUCTURE
═══════════════════════════════════════════════════════════════════════════

From arithmetic-history-fiber-prime-shadow-atom.md, the nuclear quartet
applied to the divisor lattice D(n) can be used RECURSIVELY:

  Level 1: Apply Settled/DefectCollapse to eliminate composite candidates.
           All composites are Settled (test result derivable from prime factors).
           Only prime candidates survive. Equivalent to "test primes only."

  Level 2: Apply the commutation block structure to the prime candidates.
           Among prime candidates, identify commuting blocks via residue class.
           Candidates ≡ 1 or 5 (mod 6) are the FreeShadow of {ν_2, ν_3}.
           Apply canonical normal form: skip all positions outside FreeShadow.
           Equivalent to 6k±1 wheel factorization.

  Level 3: Apply the nuclear quartet recursively to the FreeShadow.
           Extend the wheel basis: {2, 3, 5}. Period = 30.
           FreeShadow = candidates ≡ 1, 7, 11, 13, 17, 19, 23, 29 (mod 30).
           Apply DefectCollapse within each period: 8 tests per 30 candidates
           instead of 10 tests per 30 candidates (the wheel saves 20% more).

  Level 4: Full recursive nuclear quartet.
           Extend wheel basis: {2, 3, 5, 7}. Period = 210.
           FreeShadow = φ(210) = 48 positions per 210 candidates.
           Applies DefectCollapse at scale: recursively skip all Settled
           positions at every level simultaneously.

The key insight from the user's note: COMMUTATION CAN BE APPLIED RECURSIVELY.
Each level collapses Settled positions at a different scale. The DefectCollapse
theorem fires at each level, and the surviving positions form a sparser and
sparser "defect map" — exactly as in the compression engine.

═══════════════════════════════════════════════════════════════════════════
NAMED CONSTRUCTS (from empty.lean)
═══════════════════════════════════════════════════════════════════════════

  DescentReach(event, history): history can be shown to satisfy the
    proposition by tracing descent steps in the event direction back toward
    Empty. In the factoring context: candidate d can be traced back to 1
    via event-directed divisions — d is a power of event.

  AscentReach(event, history): history is in every set closed under all
    event-directed ascending extensions. In the factoring context: all
    multiples of candidate d by the event value also divide n, so d divides n.

  Settled(event, history): history is in every set Q such that, for all h,
    Q(Extend(event, h)) → Q(history). In the factoring context: candidate d
    is Settled in event e if d's test result is derivable from e's test result.
    This happens when e | d and e ∤ n (e has already been confirmed as a
    non-factor, so d cannot be a factor either).

  DefectCollapse: Settled(ascending_event, position) +
                  EmptyPrimed(ascending_event, descending_event, position)
                  → Order(position, Empty).
    In the factoring context: a Settled candidate carrying the Primed charge
    (the assembled zone condition implies divisibility) yields a factor.

  EmptyPrimed: EmptyAssembled → Order(position, Empty).
    In the Fermat factoring interpretation: if both the ascending (a = k)
    and descending (b = k) zones assemble at (a, b) with a² - b² = n,
    then n is factored by (a-b)(a+b).

═══════════════════════════════════════════════════════════════════════════
"""

import math
import time
from collections import defaultdict


# ══════════════════════════════════════════════════════════════════════════
# ARITHMETIC HISTORY SYSTEM — THE SUBSTRATE
# ══════════════════════════════════════════════════════════════════════════

class ArithmeticHistorySystem:
    """
    The arithmetic history system: carrier = (Z>0, |), step set = Primes.

    From arithmetic-history-system.md:
      "Set the step set Sigma = Primes with the full commutation relation
      I = {(p, q) : p != q} — every pair of distinct primes commutes."
    """

    def order(self, smaller_history, larger_history):
        """Order(m, n): m is a prefix of n iff m | n (m divides n)."""
        if smaller_history == 0:
            return False
        return larger_history % smaller_history == 0

    def extend(self, prime_step, history):
        """Extend(p, t) = p * t: prepend prime step p to history t."""
        return prime_step * history

    def event_commutation(self, prime_step_one, prime_step_two):
        """EventCommutation(p, q): distinct primes commute (p != q)."""
        return prime_step_one != prime_step_two

    def empty_history(self):
        """Empty = 1: the empty history (nothing has occurred yet)."""
        return 1


# ══════════════════════════════════════════════════════════════════════════
# COMMUTATION RELATION FOR THE CANDIDATE SEARCH SPACE
# ══════════════════════════════════════════════════════════════════════════

class FactoringCommutationRelation:
    """
    Commutation relation on candidate divisors for the factoring search.

    Two candidates d1 and d2 commute if their divisibility tests are
    ALGEBRAICALLY INDEPENDENT: knowing the result of one test cannot
    tell us anything about the other.

    This occurs when gcd(d1, d2) = 1: coprime candidates have no shared
    prime structure and are fully independent.

    When d1 | d2 (d1 divides d2), they do NOT commute: if d1 ∤ n then
    d2 ∤ n (since any divisor of d2 would need to divide n). The test
    of d2 is derivable (Settled) from the test of d1.
    """

    def commutes(self, candidate_one, candidate_two):
        """
        Two candidates commute iff they are coprime.

        Non-commutation (d1 | d2) is the source of Settled positions:
        the larger candidate's test is derivable from the smaller one.
        """
        return math.gcd(candidate_one, candidate_two) == 1

    def is_settled_in(self, candidate, other_candidate):
        """
        Returns True iff candidate is Settled in other_candidate.

        Candidate d is Settled in other_candidate e if e | d:
        the test result for d is derivable from the test result for e.
        If e ∤ n, then d ∤ n (since e | d and e ∤ n implies d ∤ n).
        """
        if other_candidate <= 1:
            return False
        return candidate % other_candidate == 0


# ══════════════════════════════════════════════════════════════════════════
# THE FOUR NAMED CONSTRUCTS — FACTORING SPECIALIZATION
# ══════════════════════════════════════════════════════════════════════════

def descent_reach(candidate, event_candidate):
    """
    DescentReach(event_candidate)(candidate):

    "Candidate can be shown to satisfy the proposition (divide n) by
    tracing descent steps in the event_candidate direction back toward
    Empty (= 1)."

    In the factoring context: candidate can be traced back to 1 via
    repeated division by event_candidate — candidate is a power of
    event_candidate.

    If candidate = event_candidate^k for some k >= 1, then
    DescentReach holds: the divisibility of candidate by n is
    completely determined by the divisibility of event_candidate by n.
    """
    if event_candidate <= 1 or candidate <= 0:
        return False
    remainder = candidate
    while remainder > 1:
        if remainder % event_candidate != 0:
            return False
        remainder //= event_candidate
    return True


def ascent_reach(candidate, event_candidate, modulus_n):
    """
    AscentReach(event_candidate)(candidate):

    "Candidate is in every set closed under all event_candidate extensions."

    In the factoring context: if ALL extensions of candidate by event_candidate
    (that is, candidate * event_candidate^k for k = 1, 2, ...) divide n,
    then candidate itself divides n (since candidate | candidate*event_candidate).

    We check: does candidate * event_candidate divide n?
    If yes, then candidate divides n (the extension still divides n),
    so AscentReach holds at candidate in the event_candidate direction.
    """
    return modulus_n % (candidate * event_candidate) == 0


def settled(candidate, event_candidate, confirmed_non_factors):
    """
    Settled(event_candidate)(candidate):

    "Candidate is in every set Q such that, for all h,
    Q(Extend(event_candidate, h)) → Q(candidate)."

    In the factoring context: candidate is Settled in event_candidate
    if candidate's non-divisibility of n is already determined by a
    confirmed non-factor that divides candidate.

    Specifically: if event_candidate | candidate and event_candidate is
    a confirmed non-factor of n, then candidate cannot divide n either
    (since event_candidate would then need to divide n). The Settled
    bypass fires: skip testing candidate.

    The confirmed_non_factors set is built incrementally as we test
    and eliminate candidates.
    """
    if candidate <= 1:
        return True
    comm = FactoringCommutationRelation()
    for known_non_factor in confirmed_non_factors:
        if known_non_factor > 1 and comm.is_settled_in(candidate, known_non_factor):
            return True
    return False


def defect_collapse_fires(candidate, ascending_event, descending_event, modulus_n):
    """
    DefectCollapse(ascending_event, descending_event)(candidate):

    The central bypass theorem from empty.lean:
      "A Settled position carrying EmptyPrimed has ordered against Empty."

    In the Fermat factoring interpretation:
      ascending_event = a (the ascending Fermat search value)
      descending_event = b (the descending Fermat search value)
      candidate = a - b or a + b (the assembled zone)

    DefectCollapse fires when:
      1. The assembled zone holds: a^2 - b^2 = n
      2. Both factors are non-trivial: 1 < (a-b) < n

    Returns (factor_p, factor_q) if DefectCollapse fires, else None.
    """
    b_squared = ascending_event * ascending_event - modulus_n
    if b_squared < 0:
        return None
    b = math.isqrt(b_squared)
    if b * b != b_squared:
        return None
    # The assembled zone condition holds: a^2 - b^2 = n
    factor_p = ascending_event - b
    factor_q = ascending_event + b
    if 1 < factor_p < modulus_n and factor_p * factor_q == modulus_n:
        return factor_p, factor_q
    return None


# ══════════════════════════════════════════════════════════════════════════
# WHEEL GENERATION — RECURSIVE COMMUTATION BASIS
# ══════════════════════════════════════════════════════════════════════════

def build_commutation_wheel(wheel_basis_primes):
    """
    Build the commutation wheel for a given basis of small primes.

    The wheel basis primes {p1, p2, ..., pk} define the first k levels
    of the recursive commutation structure. Their product is the wheel
    period. The FreeShadow of the corresponding proposition-join nuclei
    consists of positions coprime to all basis primes.

    From arithmetic-history-fiber-prime-shadow-atom.md:
      "The atoms of the FreeShadow(ν_p, ν_q) are exactly the prime
      divisors of n other than p and q."

    Applied recursively with basis primes p1, ..., pk:
      FreeShadow = {d : gcd(d, p1*p2*...*pk) = 1}
      These are the candidates that survive all k levels of DefectCollapse.

    Returns:
      wheel_period: lcm of basis primes (= product for distinct primes)
      spoke_residues: list of residues in [1, wheel_period] coprime to all basis primes
    """
    wheel_period = 1
    for p in wheel_basis_primes:
        wheel_period *= p

    spoke_residues = [
        r for r in range(1, wheel_period + 1)
        if all(r % p != 0 for p in wheel_basis_primes)
    ]
    return wheel_period, spoke_residues


# Pre-computed wheels at each recursive level

# Level 1: no wheel (test all odd candidates)
WHEEL_LEVEL_1_PERIOD = 2
WHEEL_LEVEL_1_SPOKES = [1]  # Only odd candidates (already handled by +2 step)

# Level 2: wheel basis {2, 3}, period = 6
# FreeShadow = {1, 5} mod 6 → candidates ≡ 1 or 5 (mod 6)
WHEEL_LEVEL_2_PERIOD = 6
WHEEL_LEVEL_2_SPOKES = [1, 5]  # 2 positions out of 6

# Level 3: wheel basis {2, 3, 5}, period = 30
# FreeShadow = {1, 7, 11, 13, 17, 19, 23, 29} mod 30
WHEEL_LEVEL_3_PERIOD = 30
WHEEL_LEVEL_3_SPOKES = [1, 7, 11, 13, 17, 19, 23, 29]  # 8 out of 30

# Level 4: wheel basis {2, 3, 5, 7}, period = 210
# FreeShadow = φ(210) = 48 positions out of 210
_WHEEL_LEVEL_4_PERIOD, _WHEEL_LEVEL_4_SPOKES = build_commutation_wheel([2, 3, 5, 7])
WHEEL_LEVEL_4_PERIOD = _WHEEL_LEVEL_4_PERIOD
WHEEL_LEVEL_4_SPOKES = _WHEEL_LEVEL_4_SPOKES  # 48 out of 210


def generate_wheel_candidates(limit, wheel_period, spoke_residues, start_from=2):
    """
    Generate candidate divisors using a commutation wheel.

    The wheel encodes the FreeShadow of the proposition-join nuclei
    for all basis primes. Only candidates in the FreeShadow can be
    new prime factors — all others are Settled (derivable from basis
    prime tests).

    Yields candidates in [start_from, limit] that lie on wheel spokes.
    """
    # Handle small primes that define the wheel (they're before the wheel)
    # These are tested separately before calling this function.

    # Find the first candidate >= start_from on any spoke
    first_period_start = (start_from // wheel_period) * wheel_period

    period_start = first_period_start
    while period_start <= limit + wheel_period:
        for spoke in spoke_residues:
            candidate = period_start + spoke
            if candidate >= start_from and candidate <= limit:
                yield candidate
        period_start += wheel_period


# ══════════════════════════════════════════════════════════════════════════
# RO FACTORING ENGINE — FOUR RECURSIVE LEVELS
# ══════════════════════════════════════════════════════════════════════════

def ro_factor_level_1_settled_bypass(modulus_n, time_limit=None):
    """
    RO Level 1: Settled Bypass — "Test Primes Only"

    The first application of the bypass theorem (DefectCollapse, Level 1):
    Every composite candidate is Settled — its test result is derivable
    from the tests of its prime factors.

    If prime factor p | d and p has already been tested and found to NOT
    divide n, then d ∤ n (Settled). No need to test d.

    This is the first recursive application of DefectCollapse:
    the first commutation block (the entire search space) is analyzed
    and all Settled positions are bypassed.

    Result: only prime candidates are tested.
    Equivalent to trial division restricted to primes.
    Step savings: composites skipped = 1 - 1/ln(sqrt(n)) fraction.
    """
    start = time.perf_counter()
    step_count = 0
    bypass_count = 0

    if modulus_n <= 1:
        return None, time.perf_counter() - start, step_count, bypass_count
    if modulus_n % 2 == 0:
        return 2, time.perf_counter() - start, 1, 0

    limit = math.isqrt(modulus_n)
    confirmed_non_factors = [2]  # 2 is confirmed as a non-factor (n is odd)

    candidate = 3
    while candidate <= limit:
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count, bypass_count

        # Apply DefectCollapse Level 1: is this candidate Settled?
        if settled(candidate, candidate, confirmed_non_factors):
            # Bypass: candidate is derivable from a known non-factor.
            # DefectCollapse fires: Settled + (non-factor charge) → skip.
            bypass_count += 1
            candidate += 2
            continue

        # Candidate is NOT Settled — test it directly.
        step_count += 1
        if modulus_n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count, bypass_count

        # Candidate is a confirmed non-factor. Record for future Settled checks.
        confirmed_non_factors.append(candidate)
        candidate += 2

    return None, time.perf_counter() - start, step_count, bypass_count


def ro_factor_level_2_commutation_normal_form(modulus_n, time_limit=None):
    """
    RO Level 2: Commutation Normal Form — 6k±1 Wheel

    Second recursive application of the bypass theorem.

    After Level 1 establishes that only prime candidates matter, Level 2
    applies the commutation block structure to the PRIME candidates:

    The nuclear quartet with basis {2, 3}:
      ν_2(d) = lcm(d, 2), ν_3(d) = lcm(d, 3)
      FreeShadow({ν_2, ν_3}) = {d : 2∤d and 3∤d}
      = candidates ≡ 1 or 5 (mod 6)

    From arithmetic-history-fiber-prime-shadow-atom.md:
      "The atoms of FreeShadow(ν_p, ν_q) are exactly the prime divisors
      of n other than p and q."

    Applied at Level 2: after confirming 2∤n and 3∤n, all candidates
    that ARE divisible by 2 or 3 are in Fix(ν_2) ∪ Fix(ν_3) — they are
    NOT in the FreeShadow. Only FreeShadow candidates can be factors.

    The wheel period = 6, spokes = {1, 5}.
    Test only candidates ≡ 1 or 5 (mod 6) → 2/6 = 1/3 of all candidates.
    Compared to Level 1's ~1/2 of candidates (odd only), Level 2 gives
    another 1/3 reduction.
    """
    start = time.perf_counter()
    step_count = 0
    bypass_count = 0

    if modulus_n <= 1:
        return None, time.perf_counter() - start, step_count, bypass_count
    if modulus_n % 2 == 0:
        return 2, time.perf_counter() - start, 1, 0
    if modulus_n % 3 == 0:
        return 3, time.perf_counter() - start, 2, 0

    # Candidates not in FreeShadow({ν_2, ν_3}) are Settled after testing 2 and 3.
    # Count them as bypassed (they would have been tested in Level 0/1 but aren't here).

    limit = math.isqrt(modulus_n)

    # Generate candidates using the 6k±1 wheel (Level 2 FreeShadow)
    candidate = 5
    step = 2
    while candidate <= limit:
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count, bypass_count

        step_count += 1
        if modulus_n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count, bypass_count

        candidate += step
        step = 6 - step  # Toggle: +2, +4, +2, +4, ...
        # Each toggle corresponds to one spoke of the wheel period-6

    return None, time.perf_counter() - start, step_count, bypass_count


def ro_factor_level_3_recursive_nuclear_quartet(modulus_n, time_limit=None):
    """
    RO Level 3: Recursive Nuclear Quartet — Wheel Period 30

    Third recursive application of the bypass theorem.

    Extends the nuclear quartet basis to {2, 3, 5}:
      wheel_period = 30
      FreeShadow = {d : gcd(d, 30) = 1}
                 = candidates ≡ 1, 7, 11, 13, 17, 19, 23, 29 (mod 30)
      8 spokes out of 30 positions → 8/30 ≈ 26.7% of all candidates

    The recursive structure: Level 2 already applied the nuclear quartet
    at scale {2, 3}. Level 3 applies the SAME quartet structure again to
    the SURVIVORS of Level 2 — the FreeShadow({ν_2, ν_3}) — adding a new
    proposition-join nucleus ν_5 that further partitions the search space.

    The DefectCollapse at Level 3 says: any candidate d with 5|d is in
    Fix(ν_5) — it is Settled once 5 has been confirmed as a non-factor.
    The entire DefectCollapse chain fires recursively.

    From the quartet theorem (relational-history-fiber-nucleus-commutation-quartet.md):
      "The submonoid closes at exactly FOUR elements. Commutativity is the
      exact hinge: without it, longer alternating compositions need not
      collapse and there is no fourth sub-algebra."

    This quartet structure is what forces the wheel to have EXACTLY the
    structure it does: four corners from two nuclei, extending recursively.
    """
    start = time.perf_counter()
    step_count = 0

    if modulus_n <= 1:
        return None, time.perf_counter() - start, step_count
    if modulus_n % 2 == 0:
        return 2, time.perf_counter() - start, 1
    if modulus_n % 3 == 0:
        return 3, time.perf_counter() - start, 2
    if modulus_n % 5 == 0:
        return 5, time.perf_counter() - start, 3

    limit = math.isqrt(modulus_n)

    # The FreeShadow of {ν_2, ν_3, ν_5}: all candidates coprime to 30.
    # These are the only survivors after three levels of recursive DefectCollapse.
    for candidate in generate_wheel_candidates(limit, WHEEL_LEVEL_3_PERIOD, WHEEL_LEVEL_3_SPOKES, start_from=7):
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        step_count += 1
        if modulus_n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count

    return None, time.perf_counter() - start, step_count


def ro_factor_level_4_full_defect_collapse(modulus_n, time_limit=None):
    """
    RO Level 4: Full Recursive DefectCollapse — Two-Pass Fermat + Wheel 210

    Fourth and deepest recursive application of the bypass theorem.

    This level combines two complementary DefectCollapse strategies:

    PASS 1 — Fermat DefectCollapse:
      Ascending event: a = ceil(sqrt(n)), ceil(sqrt(n))+1, ...
      Descending event: b where a^2 - b^2 = n
      The assembled zone condition (a^2 - b^2 = n exactly) triggers
      DefectCollapse: both the ascending reach and descending reach
      assemble at (a, b), yielding the factor without further search.

      This exploits the commutativity of n = p*q = q*p:
      both orderings of the two prime events give the same n,
      and the DefectCollapse fires at the "center" a = (p+q)/2.

      For balanced RSA keys (p ≈ q ≈ sqrt(n)), this converges in
      O((p-q)^2 / (4n)) steps — potentially very fast.

    PASS 2 — Wheel-210 Trial Division:
      If Fermat DefectCollapse doesn't fire quickly (p and q are far apart),
      fall back to the deepest wheel:

      Wheel basis {2, 3, 5, 7}, period = 210.
      FreeShadow = φ(210) = 48 candidates per 210.
      48/210 ≈ 22.9% of candidates survive all four recursive DefectCollapses.

      Applied as the "defect map" encoding:
      only the genuine non-commuting positions in the factoring search
      are tested. Everything else is Settled and bypassed.

    The recursive commutation structure is applied at its maximum depth:
    four simultaneous levels of DefectCollapse, collapsing 77.1% of the
    search space as Settled before any actual divisibility test is performed.
    """
    start = time.perf_counter()
    step_count = 0
    fermat_steps = 0

    if modulus_n <= 1:
        return None, time.perf_counter() - start, step_count
    if modulus_n % 2 == 0:
        return 2, time.perf_counter() - start, 1

    # PASS 1: Fermat DefectCollapse
    # The commutation diamond: n = (a-b)(a+b) where a^2 - b^2 = n.
    # DefectCollapse fires when the assembled zone condition holds exactly.

    # Allocate at most 20% of time_limit to Fermat pass.
    fermat_limit = None
    if time_limit is not None:
        fermat_limit = time_limit * 0.20

    a = math.isqrt(modulus_n)
    if a * a == modulus_n:
        return a, time.perf_counter() - start, 1

    a += 1
    # Try Fermat for a bounded number of steps — good for balanced keys
    fermat_step_limit = min(1 << 20, modulus_n)  # Cap at 2^20 Fermat steps

    while fermat_steps < fermat_step_limit:
        fermat_steps += 1
        step_count += 1

        if fermat_limit is not None and (time.perf_counter() - start) > fermat_limit:
            break

        result = defect_collapse_fires(a, a, None, modulus_n)
        if result is not None:
            return result[0], time.perf_counter() - start, step_count
        a += 1

    # PASS 2: Wheel-210 trial division
    # Apply Level 4 recursive nuclear quartet: test only FreeShadow({ν_2, ν_3, ν_5, ν_7})
    for small_prime in [2, 3, 5, 7]:
        if modulus_n % small_prime == 0:
            return small_prime, time.perf_counter() - start, step_count

    limit = math.isqrt(modulus_n)
    for candidate in generate_wheel_candidates(
        limit, WHEEL_LEVEL_4_PERIOD, WHEEL_LEVEL_4_SPOKES, start_from=11
    ):
        if time_limit is not None and (time.perf_counter() - start) > time_limit:
            return None, time.perf_counter() - start, step_count
        step_count += 1
        if modulus_n % candidate == 0:
            return candidate, time.perf_counter() - start, step_count

    return None, time.perf_counter() - start, step_count


# ══════════════════════════════════════════════════════════════════════════
# COMMUTATION DENSITY ANALYSIS
# ══════════════════════════════════════════════════════════════════════════

def analyze_commutation_structure(modulus_n):
    """
    Analyze the commutation density of the factoring search space for n.

    Reports how much of the search space is eliminated at each recursive
    level of the DefectCollapse application.

    Returns a dict of analysis results.
    """
    limit = math.isqrt(modulus_n)

    # Count how many candidates survive each level
    all_candidates = range(2, limit + 1)
    total = max(1, limit - 1)

    # Level 0: all candidates
    level_0_count = total

    # Level 1: odd candidates only (2 settled)
    level_1_count = (total + 1) // 2  # Approx half

    # Level 2: FreeShadow({ν_2, ν_3}) = coprime to 6
    wheel_2_period, wheel_2_spokes = build_commutation_wheel([2, 3])
    level_2_density = len(wheel_2_spokes) / wheel_2_period
    level_2_count = int(total * level_2_density) + 1

    # Level 3: FreeShadow({ν_2, ν_3, ν_5}) = coprime to 30
    wheel_3_period, wheel_3_spokes = build_commutation_wheel([2, 3, 5])
    level_3_density = len(wheel_3_spokes) / wheel_3_period
    level_3_count = int(total * level_3_density) + 1

    # Level 4: FreeShadow({ν_2, ν_3, ν_5, ν_7}) = coprime to 210
    wheel_4_period, wheel_4_spokes = build_commutation_wheel([2, 3, 5, 7])
    level_4_density = len(wheel_4_spokes) / wheel_4_period
    level_4_count = int(total * level_4_density) + 1

    return {
        'modulus_bit_length': modulus_n.bit_length(),
        'search_space_size': total,
        'level_0_count': level_0_count,
        'level_0_density': 1.0,
        'level_1_count': level_1_count,
        'level_1_density': 0.5,
        'level_2_count': level_2_count,
        'level_2_density': level_2_density,
        'level_3_count': level_3_count,
        'level_3_density': level_3_density,
        'level_4_count': level_4_count,
        'level_4_density': level_4_density,
        'wheel_2_period': wheel_2_period,
        'wheel_2_spokes': len(wheel_2_spokes),
        'wheel_3_period': wheel_3_period,
        'wheel_3_spokes': len(wheel_3_spokes),
        'wheel_4_period': wheel_4_period,
        'wheel_4_spokes': len(wheel_4_spokes),
    }


def analyze_fermat_gap(modulus_n, factor_p, factor_q):
    """
    Analyze how quickly Fermat DefectCollapse would fire for this key.

    For n = p*q with p < q:
      a = (p+q)/2  (the Fermat center)
      b = (q-p)/2  (the Fermat gap)
      Fermat steps needed = a - ceil(sqrt(n))

    This measures the "defect distance" in the ascending direction —
    how far the assembled zone is from the start of the search.
    """
    if factor_p is None or factor_q is None:
        return None

    p, q = min(factor_p, factor_q), max(factor_p, factor_q)
    a_target = (p + q) // 2
    a_start = math.isqrt(modulus_n) + 1
    fermat_steps_needed = max(0, a_target - a_start + 1)

    return {
        'factor_gap': q - p,
        'fermat_center_a': a_target,
        'fermat_start_a': a_start,
        'fermat_steps_needed': fermat_steps_needed,
        'factor_balance': p / q,  # 1.0 = perfectly balanced, 0.0 = very unbalanced
    }
