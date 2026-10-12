from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import Branch, descends_below, is_first_passage_word, parity_word
from pymetrologic.collatz_reduction import (
    BoundedCollatzReductionWitness,
    FirstCoeffCrossingWitness,
    ReductionStepWitness,
    bounded_collatz_reduction_witness,
    contracting_of_descent,
    find_first_coeff_crossing,
    first_coeff_crossing_word_is_first_passage,
    is_first_coeff_crossing,
    parent_barrier_gap_holds,
    parity_word_prefix_matches,
    reduction_step_witness,
)


@given(
    seed=st.integers(1, 10_000),
    length=st.integers(0, 40),
    prefix_length=st.integers(0, 40),
)
def test_parity_word_take_matches_shorter_parity_word(
    seed: int,
    length: int,
    prefix_length: int,
) -> None:
    prefix_length = min(prefix_length, length)

    assert parity_word_prefix_matches(seed, length, prefix_length)


def test_first_coefficient_crossing_is_first_passage_for_real_seeds() -> None:
    for seed in range(3, 600):
        crossing = find_first_coeff_crossing(seed)

        assert isinstance(crossing, FirstCoeffCrossingWitness)
        assert crossing.holds
        assert is_first_coeff_crossing(seed, crossing.length)
        assert first_coeff_crossing_word_is_first_passage(seed, crossing.length)
        assert is_first_passage_word(crossing.word)
        assert list(crossing.word) == parity_word(seed, crossing.length)


@given(seed=st.integers(1, 10_000), length=st.integers(0, 40))
def test_descent_forces_contracting_prefix(seed: int, length: int) -> None:
    assert contracting_of_descent(seed, length)
    if descends_below(seed, length):
        assert find_first_coeff_crossing(seed, max_len=max(1, length)) is not None


def test_parent_barrier_gap_checked_on_bounded_real_crossings() -> None:
    for seed in range(3, 800):
        crossing = find_first_coeff_crossing(seed)
        assert crossing is not None
        parent = crossing.word[:-1]

        if parent not in ((), (Branch.O,)):
            assert parent_barrier_gap_holds(parent)


def test_reduction_step_witnesses_descent_and_terminal_reachability() -> None:
    for seed in range(3, 250):
        witness = reduction_step_witness(seed)

        assert isinstance(witness, ReductionStepWitness)
        assert witness.holds
        assert witness.crossing.holds
        assert witness.word[-1] is Branch.E
        assert witness.descends
        assert witness.reaches_terminal


def test_bounded_collatz_reduction_witness_keeps_frontier_explicit() -> None:
    witness = bounded_collatz_reduction_witness(350)

    assert isinstance(witness, BoundedCollatzReductionWitness)
    assert witness.holds
    assert witness.seeds_checked == 348
    assert witness.all_crossings_first_passage
    assert witness.all_gap_premises_hold
    assert witness.all_descend
    assert witness.all_reach_terminal


def test_reduction_rejects_out_of_scope_inputs() -> None:
    with pytest.raises(ValueError, match="nonterminal"):
        reduction_step_witness(2)
    with pytest.raises(ValueError, match="positive"):
        find_first_coeff_crossing(0)
    with pytest.raises(ValueError, match="at least 3"):
        bounded_collatz_reduction_witness(2)
    with pytest.raises(ValueError, match="prefix length"):
        parity_word_prefix_matches(7, 2, 3)
