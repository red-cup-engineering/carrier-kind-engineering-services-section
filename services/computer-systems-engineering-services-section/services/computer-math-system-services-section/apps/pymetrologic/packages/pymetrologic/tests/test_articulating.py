"""Recursive articulating spine from RelMath.Articulating."""

from __future__ import annotations

from pymetrologic.articulating import (
    Articulating,
    ArticulatingRecursionWitness,
    articulating_depth,
    articulating_floor,
    articulating_floor_utter,
    articulating_head,
    articulating_pair,
    articulating_path,
    articulating_recursion_witness,
    articulating_utter,
    articulating_utter_ne_pair,
    sample_articulating,
)
from pymetrologic.articulating_primitives import (
    Mark,
    Utterance,
)


def utterance(name: str) -> Utterance:
    return Utterance(Mark(f"{name}:token"), Mark(f"{name}:claim"))


def test_leaf_articulation_has_zero_depth_and_self_floor() -> None:
    inner = utterance("inner")
    articulation = articulating_utter(inner)

    assert isinstance(articulation, Articulating)
    assert articulation.is_utter
    assert not articulation.is_pair
    assert articulating_head(articulation) == inner
    assert articulating_depth(articulation) == 0
    assert articulating_floor(articulation) == inner
    assert articulating_path(articulation) == (inner,)
    assert articulating_floor_utter(inner)


def test_pair_articulation_reads_head_depth_floor_and_path() -> None:
    inner = utterance("inner")
    middle = utterance("middle")
    outer = utterance("outer")
    articulation = articulating_pair(outer, articulating_pair(middle, articulating_utter(inner)))

    assert articulation.is_pair
    assert not articulation.is_utter
    assert articulating_head(articulation) == outer
    assert articulating_depth(articulation) == 2
    assert articulating_floor(articulation) == inner
    assert articulating_path(articulation) == (outer, middle, inner)


def test_utter_constructor_is_distinct_from_pair_constructor() -> None:
    inner = utterance("inner")
    outer = utterance("outer")

    assert articulating_utter_ne_pair(inner, outer, articulating_utter(inner))
    assert articulating_utter(inner) != articulating_pair(inner, articulating_utter(inner))


def test_articulating_recursion_witness_bundles_the_lean_laws() -> None:
    sample = sample_articulating()
    witness = articulating_recursion_witness()

    assert isinstance(witness, ArticulatingRecursionWitness)
    assert witness.holds
    assert witness.depth == articulating_depth(sample)
    assert witness.path_length == len(articulating_path(sample))
