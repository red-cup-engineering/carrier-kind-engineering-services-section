"""Collatz affine traces (RelMath.Closure.Collatz.AffineTrace)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    AffineTrace,
    Branch,
    accel_step,
    descent_matches_coeff,
    is_terminal,
    odd_count,
    orbit,
    parity_word,
    reaches_terminal,
    trace_of_word,
)

words = st.lists(st.sampled_from(list(Branch)), max_size=12)


def test_accel_step() -> None:
    assert accel_step(2) == 1  # even halves
    assert accel_step(1) == 2  # (3+1)/2
    assert accel_step(3) == 5  # (9+1)/2
    assert accel_step(4) == 2


def test_closed_form_B_is_two_pow_length() -> None:
    for n in range(1, 200):
        for k in range(8):
            assert 2**k == trace_of_word(parity_word(n, k)).B


@given(word=words)
def test_closed_form_A_is_three_pow_oddcount(word: list[Branch]) -> None:
    assert 3 ** odd_count(word) == trace_of_word(word).A
    assert 2 ** len(word) == trace_of_word(word).B


@given(n=st.integers(1, 10_000), k=st.integers(0, 30))
def test_affine_trace_keystone(n: int, k: int) -> None:
    # B * T^k(n) = A * n + C  — the affine relation along any orbit.
    t = trace_of_word(parity_word(n, k))
    assert t.B * orbit(n, k) == t.A * n + t.C


@given(w1=words, w2=words)
def test_trace_concat_is_comp(w1: list[Branch], w2: list[Branch]) -> None:
    # Concatenation of parity words = composition of their traces ("w1 then w2").
    assert trace_of_word(w1 + w2) == trace_of_word(w2).comp(trace_of_word(w1))


def test_comp_associative_identity() -> None:
    idt = AffineTrace(1, 1, 0)
    g = AffineTrace(3, 2, 1)
    assert g.comp(idt) == g
    assert idt.comp(g) == g


@given(n=st.integers(1, 10_000), k=st.integers(0, 30))
def test_descent_iff_coeff(n: int, k: int) -> None:
    assert descent_matches_coeff(n, k)


@given(n=st.integers(1, 10_000), k=st.integers(0, 30))
def test_noncontracting_no_descent(n: int, k: int) -> None:
    # B ≤ A (coefficient-noncontracting) forbids descent: n ≤ T^k(n).
    t = trace_of_word(parity_word(n, k))
    if t.B <= t.A:
        assert n <= orbit(n, k)


@given(n=st.integers(1, 1000), a=st.integers(0, 20), b=st.integers(0, 20))
def test_orbit_add(n: int, a: int, b: int) -> None:
    assert orbit(n, a + b) == orbit(orbit(n, a), b)


def test_reaches_terminal_for_small_seeds() -> None:
    assert all(reaches_terminal(n) for n in range(1, 2000))


def test_terminal_cycle() -> None:
    assert is_terminal(1)
    assert is_terminal(2)
    assert accel_step(1) == 2
    assert accel_step(2) == 1
