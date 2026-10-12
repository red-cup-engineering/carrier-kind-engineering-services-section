"""Conditional Collatz reduction witnesses (``RelMath.Closure.Collatz.Reduction``).

Lean assembles the frontier theorem

``ParentBarrierGap + EveryNonterminalHasCrossing -> accelerated Collatz termination``.

The two global premises still contain explicit frontier holes in Lean, so this
Python lab module keeps them honest: it represents coefficient crossings,
checks the first-passage/descent implications, and gives bounded executable
witnesses where the premises are verified by finite search.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass

from pymetrologic.affinetrace import Branch, descends_below, orbit, parity_word, reaches_terminal
from pymetrologic.firstpassage import (
    is_coeff_contracting,
    is_coeff_noncontracting,
    is_first_passage_word,
    is_parent_barrier,
)
from pymetrologic.semigroupgap import (
    in_two_gen_semigroup,
    parent_c,
    parent_d,
    parent_m,
)

__all__ = [
    "BoundedCollatzReductionWitness",
    "FirstCoeffCrossingWitness",
    "ParentGapPredicate",
    "ReductionStepWitness",
    "Word",
    "bounded_collatz_reduction_witness",
    "contracting_of_descent",
    "find_first_coeff_crossing",
    "first_coeff_crossing_word_is_first_passage",
    "is_first_coeff_crossing",
    "parent_barrier_gap_holds",
    "parity_word_prefix_matches",
    "reduction_step_witness",
]

Word = tuple[Branch, ...]
ParentGapPredicate = Callable[[Sequence[Branch]], bool]


def _word(seed: int, length: int) -> Word:
    return tuple(parity_word(seed, length))


def parity_word_prefix_matches(seed: int, length: int, prefix_length: int) -> bool:
    """``parityWord_take``: a shorter prefix is the shorter parity word."""
    if prefix_length < 0 or length < 0:
        raise ValueError("word lengths must be nonnegative")
    if prefix_length > length:
        raise ValueError("prefix length must be at most the word length")
    return _word(seed, length)[:prefix_length] == _word(seed, prefix_length)


def is_first_coeff_crossing(seed: int, length: int) -> bool:
    """The first prefix whose affine coefficient contracts: ``A < B``."""
    if seed <= 0:
        raise ValueError("seed must be positive")
    if length < 0:
        raise ValueError("length must be nonnegative")
    word = _word(seed, length)
    return is_coeff_contracting(word) and all(
        is_coeff_noncontracting(_word(seed, j)) for j in range(length)
    )


def first_coeff_crossing_word_is_first_passage(seed: int, length: int) -> bool:
    """A first coefficient crossing word is a first-passage word."""
    return (not is_first_coeff_crossing(seed, length)) or is_first_passage_word(_word(seed, length))


def find_first_coeff_crossing(
    seed: int,
    *,
    max_len: int = 300,
) -> FirstCoeffCrossingWitness | None:
    """Find the least contracting parity prefix within ``max_len``."""
    if seed <= 0:
        raise ValueError("seed must be positive")
    if max_len < 1:
        raise ValueError("max_len must be positive")
    for length in range(1, max_len + 1):
        if is_coeff_contracting(_word(seed, length)):
            return FirstCoeffCrossingWitness(seed=seed, length=length)
    return None


def contracting_of_descent(seed: int, length: int) -> bool:
    """Descent below self forces the prefix coefficient to have crossed."""
    if seed <= 0:
        raise ValueError("seed must be positive")
    if length < 0:
        raise ValueError("length must be nonnegative")
    return (not descends_below(seed, length)) or is_coeff_contracting(_word(seed, length))


def parent_barrier_gap_holds(parent: Sequence[Branch]) -> bool:
    """The checked parent-barrier gap: nontrivial barriers have no semigroup certificate."""
    p = tuple(parent)
    if not is_parent_barrier(p):
        return False
    if p in ((), (Branch.O,)):
        return True
    return not in_two_gen_semigroup(parent_c(p), parent_d(p), parent_m(p))


@dataclass(frozen=True, slots=True)
class FirstCoeffCrossingWitness:
    """Executable witness for ``FirstCoeffCrossing seed length``."""

    seed: int
    length: int

    @property
    def word(self) -> Word:
        return _word(self.seed, self.length)

    @property
    def contracting(self) -> bool:
        return is_coeff_contracting(self.word)

    @property
    def prior_noncontracting(self) -> bool:
        return all(is_coeff_noncontracting(_word(self.seed, j)) for j in range(self.length))

    @property
    def first_passage(self) -> bool:
        return is_first_passage_word(self.word)

    @property
    def holds(self) -> bool:
        return (
            self.seed > 0
            and self.length >= 0
            and self.contracting
            and self.prior_noncontracting
            and self.first_passage
            and first_coeff_crossing_word_is_first_passage(self.seed, self.length)
        )


@dataclass(frozen=True, slots=True)
class ReductionStepWitness:
    """One seed's conditional reduction step from crossing to descent."""

    seed: int
    crossing: FirstCoeffCrossingWitness
    parent_gap_holds: bool
    terminal_adjacent: bool
    descends: bool
    reaches_terminal: bool

    @property
    def word(self) -> Word:
        return self.crossing.word

    @property
    def parent(self) -> Word:
        if not self.word:
            return ()
        return self.word[:-1]

    @property
    def premises_hold(self) -> bool:
        return (
            self.seed > 2
            and self.crossing.holds
            and (self.terminal_adjacent or self.parent_gap_holds)
        )

    @property
    def holds(self) -> bool:
        return self.premises_hold and self.descends and self.reaches_terminal


def reduction_step_witness(
    seed: int,
    *,
    max_len: int = 300,
    parent_gap: ParentGapPredicate = parent_barrier_gap_holds,
) -> ReductionStepWitness:
    """Build the conditional reduction witness for one nonterminal seed."""
    if seed <= 2:
        raise ValueError("reduction step is for nonterminal seeds n > 2")
    crossing = find_first_coeff_crossing(seed, max_len=max_len)
    if crossing is None:
        raise ValueError(f"no coefficient crossing found within {max_len} steps")
    parent = crossing.word[:-1]
    terminal_adjacent = parent in ((), (Branch.O,))
    gap_holds = terminal_adjacent or parent_gap(parent)
    return ReductionStepWitness(
        seed=seed,
        crossing=crossing,
        parent_gap_holds=gap_holds,
        terminal_adjacent=terminal_adjacent,
        descends=orbit(seed, crossing.length) < seed,
        reaches_terminal=reaches_terminal(seed),
    )


@dataclass(frozen=True, slots=True)
class BoundedCollatzReductionWitness:
    """A bounded executable audit of the conditional reduction frontier."""

    limit: int
    max_len: int
    steps: tuple[ReductionStepWitness, ...]

    @property
    def seeds_checked(self) -> int:
        return len(self.steps)

    @property
    def all_crossings_first_passage(self) -> bool:
        return all(step.crossing.first_passage for step in self.steps)

    @property
    def all_gap_premises_hold(self) -> bool:
        return all(step.terminal_adjacent or step.parent_gap_holds for step in self.steps)

    @property
    def all_descend(self) -> bool:
        return all(step.descends for step in self.steps)

    @property
    def all_reach_terminal(self) -> bool:
        return all(step.reaches_terminal for step in self.steps)

    @property
    def holds(self) -> bool:
        return (
            self.limit >= 3
            and self.seeds_checked == self.limit - 2
            and all(step.holds for step in self.steps)
            and self.all_crossings_first_passage
            and self.all_gap_premises_hold
            and self.all_descend
            and self.all_reach_terminal
        )


def bounded_collatz_reduction_witness(
    limit: int,
    *,
    max_len: int = 300,
    parent_gap: ParentGapPredicate = parent_barrier_gap_holds,
) -> BoundedCollatzReductionWitness:
    """Check the Collatz reduction premises and conclusions for ``3 <= n <= limit``."""
    if limit < 3:
        raise ValueError("limit must be at least 3")
    steps = tuple(
        reduction_step_witness(seed, max_len=max_len, parent_gap=parent_gap)
        for seed in range(3, limit + 1)
    )
    return BoundedCollatzReductionWitness(limit=limit, max_len=max_len, steps=steps)
