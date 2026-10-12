"""Collatz first-passage words and parent barriers (RelMath.Closure.Collatz.FirstPassage)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    Branch,
    is_coeff_contracting,
    is_first_passage_word,
    is_parent_barrier,
    odd_count,
    parity_word,
    power_bounds_hold,
    trace_of_word,
    trace_step,
)

words = st.lists(st.sampled_from(list(Branch)), max_size=14)
E, O = Branch.E, Branch.O


def first_passage_of_seed(n: int, *, max_len: int = 300) -> list[Branch] | None:
    """The first contracting prefix of the orbit of ``n`` (which is first-passage)."""
    for k in range(1, max_len + 1):
        w = parity_word(n, k)
        if is_coeff_contracting(w):
            return w
    return None


def test_single_even_is_first_passage() -> None:
    assert is_first_passage_word([E])
    assert is_parent_barrier([])  # the empty parent barrier generates [E]


@given(w=words, v=words)
def test_oddcount_append(w: list[Branch], v: list[Branch]) -> None:
    assert odd_count(w + v) == odd_count(w) + odd_count(v)


@given(w=words)
def test_trace_append_letter(w: list[Branch]) -> None:
    assert trace_of_word([*w, E]) == trace_step(trace_of_word(w), E)
    assert trace_of_word([*w, O]) == trace_step(trace_of_word(w), O)


@given(p=words)
def test_append_E_iff_parent_barrier(p: list[Branch]) -> None:
    # w = p + [E] is first-passage  <=>  p is a parent barrier.
    assert is_first_passage_word([*p, E]) == is_parent_barrier(p)


@given(w=words)
def test_first_passage_ends_in_E(w: list[Branch]) -> None:
    if w and is_first_passage_word(w):
        assert w[-1] is E


@given(w=words)
def test_power_bounds(w: list[Branch]) -> None:
    assert power_bounds_hold(w)


def test_real_seed_first_passages() -> None:
    for n in range(3, 600):
        w = first_passage_of_seed(n)
        assert w is not None
        assert is_first_passage_word(w)
        assert w[-1] is E
        assert power_bounds_hold(w)
        # the structural equivalence on the real crossing word
        assert is_parent_barrier(w[:-1])
