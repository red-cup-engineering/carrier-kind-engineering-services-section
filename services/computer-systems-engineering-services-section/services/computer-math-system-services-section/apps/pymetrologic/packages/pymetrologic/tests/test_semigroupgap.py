"""Collatz parent-barrier semigroup gap (RelMath.Closure.Collatz.{SemigroupGap,ResidueGap})."""

from __future__ import annotations

from math import gcd

from hypothesis import assume, given
from hypothesis import strategies as st

from pymetrologic import (
    AffineTrace,
    Branch,
    has_semigroup_certificate,
    in_two_gen_semigroup,
    is_coeff_contracting,
    is_parent_barrier,
    is_trivial_parent_barrier,
    least_residue,
    membership_matches_residue,
    orbit,
    parent_a,
    parent_b,
    parent_c,
    parent_d,
    parent_d_coprime_parent_m,
    parent_m,
    parity_word,
    residue_gap_holds,
    residue_gap_margin,
    trace_of_word,
)

E, O = Branch.E, Branch.O


def first_passage_of_seed(n: int, *, max_len: int = 300) -> list[Branch] | None:
    for k in range(1, max_len + 1):
        w = parity_word(n, k)
        if is_coeff_contracting(w):
            return w
    return None


def test_in_two_gen_semigroup_basic() -> None:
    # <3,5>: 0,3,5,6,8,9,10,11,... ; 1,2,4,7 are the gaps (Frobenius number 7).
    members = {x for x in range(20) if in_two_gen_semigroup(x, 3, 5)}
    assert members == {0, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19}
    for gap in (1, 2, 4, 7):
        assert not in_two_gen_semigroup(gap, 3, 5)


@given(a=st.integers(1, 60), b=st.integers(1, 60), x=st.integers(0, 400))
def test_in_two_gen_matches_witness(a: int, b: int, x: int) -> None:
    expected = any((x - b * n) >= 0 and (x - b * n) % a == 0 for n in range(x // b + 1))
    assert in_two_gen_semigroup(x, a, b) == expected


@given(d=st.integers(1, 200), k=st.integers(0, 12), c=st.integers(0, 5000))
def test_residue_characterization_coprime(d: int, k: int, c: int) -> None:
    # D odd, M = 2^k+1-shaped power of two => coprime, exactly the parent-barrier shape.
    m = 2 ** (k + 1)
    d_odd = d | 1  # force odd
    r = least_residue(c, d_odd, m)
    assert 0 <= r < m
    assert (d_odd * r) % m == c % m  # r is the modular inverse image
    assert in_two_gen_semigroup(c, d_odd, m) == (d_odd * r <= c)
    assert membership_matches_residue(c, d_odd, m)


@given(d=st.integers(1, 300), m=st.integers(1, 300), c=st.integers(0, 3000))
def test_residue_characterization_general(d: int, m: int, c: int) -> None:
    assume(gcd(d % m, m) == 1)
    assert membership_matches_residue(c, d, m)


def test_parent_barrier_number_theory() -> None:
    # Over real parent barriers (the prefix p of each seed's first-passage word p+[E]):
    # D is odd, M = 2^(len+1) a power of two, gcd(D,M)=1, D>0.
    for n in range(3, 500):
        w = first_passage_of_seed(n)
        assert w is not None
        p = w[:-1]
        assert is_parent_barrier(p)
        d, m = parent_d(p), parent_m(p)
        assert d > 0
        assert d % 2 == 1  # D = 2B - A odd
        assert m == 2 ** (len(p) + 1)  # M power of two
        assert gcd(d, m) == 1
        assert parent_d_coprime_parent_m(p)


def test_trace_parent_append_E() -> None:
    for n in range(3, 200):
        w = first_passage_of_seed(n)
        assert w is not None
        p = w[:-1]
        assert trace_of_word([*p, E]) == AffineTrace(parent_a(p), 2 * parent_b(p), parent_c(p))


def test_nondescent_certificate_on_real_seeds() -> None:
    # The central equivalence: for the first-passage word w = p+[E] of seed n,
    #   2B * orbit(n,|w|) = A*n + C   (the affine relation), and
    #   (orbit >= n)  <=>  C has the semigroup certificate at n.
    # First-passage words descend, so orbit < n and the certificate is absent.
    for n in range(3, 800):
        w = first_passage_of_seed(n)
        assert w is not None
        p = w[:-1]
        y = orbit(n, len(w))
        assert 2 * parent_b(p) * y == parent_a(p) * n + parent_c(p)
        certificate = has_semigroup_certificate(parent_c(p), parent_d(p), parent_m(p), n)
        assert (y >= n) == certificate
        assert y < n  # genuine descent
        assert not certificate


def test_parent_barrier_gap_search() -> None:
    # Reproduce the corpus's Python evidence: every *nontrivial* parent barrier from a real
    # seed fails to represent C in <D, M> (C ∉ ⟨D, M⟩).
    for n in range(3, 1500):
        w = first_passage_of_seed(n)
        assert w is not None
        p = w[:-1]
        if p in ([], [O]):  # trivial parent barriers are the only represented cases
            continue
        assert not in_two_gen_semigroup(parent_c(p), parent_d(p), parent_m(p))


def test_parent_barrier_residue_gap_search() -> None:
    # The sharper ResidueGap form: C < D*r, where r = C*D^-1 mod M.
    for n in range(3, 1500):
        w = first_passage_of_seed(n)
        assert w is not None
        p = w[:-1]
        if is_trivial_parent_barrier(p):
            continue
        c, d, m = parent_c(p), parent_d(p), parent_m(p)
        assert residue_gap_holds(c, d, m)
        assert residue_gap_margin(c, d, m) > 0
        assert not in_two_gen_semigroup(c, d, m)
