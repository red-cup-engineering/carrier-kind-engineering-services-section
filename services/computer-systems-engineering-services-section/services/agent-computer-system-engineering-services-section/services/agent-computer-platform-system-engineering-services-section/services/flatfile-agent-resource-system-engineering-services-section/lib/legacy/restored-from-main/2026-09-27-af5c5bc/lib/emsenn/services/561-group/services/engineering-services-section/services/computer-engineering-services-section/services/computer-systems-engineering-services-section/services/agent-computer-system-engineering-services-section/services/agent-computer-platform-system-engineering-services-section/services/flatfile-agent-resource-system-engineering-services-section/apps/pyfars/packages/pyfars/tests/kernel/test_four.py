"""Tests for kernel.four — the WIT law over PyMetroLogic's proven FOUR
bilattice (design spec section 5B), checked against the same fixed cases
``four.mjs``'s own test suite exercises."""

from __future__ import annotations

import pytest
from hypothesis import given
from hypothesis import strategies as st
from pyfars.kernel.four import (
    BOTH,
    FALSE,
    NEITHER,
    TRUE,
    Four,
    NotOneWitError,
    four,
    is_knowledge_cover,
    join_knowledge,
    witness_bit,
)

_four_values = st.builds(four, st.booleans(), st.booleans())


def test_four_rejects_non_boolean_bits() -> None:
    with pytest.raises(TypeError):
        Four(1, False)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        Four(False, "no")  # type: ignore[arg-type]


def test_join_knowledge_is_the_pointwise_or_of_evidence_bits() -> None:
    assert join_knowledge(TRUE, FALSE) == BOTH
    assert join_knowledge(NEITHER, TRUE) == TRUE
    assert join_knowledge(NEITHER, NEITHER) == NEITHER


def test_is_knowledge_cover_accepts_only_a_single_legal_transition() -> None:
    assert is_knowledge_cover(NEITHER, TRUE) is True
    assert is_knowledge_cover(NEITHER, FALSE) is True
    assert is_knowledge_cover(TRUE, BOTH) is True
    assert is_knowledge_cover(FALSE, BOTH) is True


def test_is_knowledge_cover_rejects_a_decrement() -> None:
    assert is_knowledge_cover(TRUE, NEITHER) is False
    assert is_knowledge_cover(BOTH, TRUE) is False


def test_is_knowledge_cover_rejects_a_two_bit_jump() -> None:
    assert is_knowledge_cover(NEITHER, BOTH) is False


def test_is_knowledge_cover_rejects_a_no_op() -> None:
    assert is_knowledge_cover(TRUE, TRUE) is False
    assert is_knowledge_cover(NEITHER, NEITHER) is False


def test_witness_bit_names_the_bit_a_legal_wit_set() -> None:
    assert witness_bit(NEITHER, TRUE) == "pos"
    assert witness_bit(NEITHER, FALSE) == "neg"


def test_witness_bit_raises_not_one_wit_otherwise() -> None:
    with pytest.raises(NotOneWitError):
        witness_bit(NEITHER, BOTH)
    with pytest.raises(NotOneWitError):
        witness_bit(TRUE, NEITHER)


@given(before=_four_values, after=_four_values)
def test_knowledge_cover_implies_exactly_one_bit_flipped_zero_to_one(
    before: Four, after: Four
) -> None:
    if not is_knowledge_cover(before, after):
        return
    flips = [before.pos != after.pos, before.neg != after.neg]
    assert sum(flips) == 1
    assert not (before.pos and not after.pos)
    assert not (before.neg and not after.neg)


@given(before=_four_values, after=_four_values)
def test_witness_bit_agrees_with_is_knowledge_cover(before: Four, after: Four) -> None:
    if is_knowledge_cover(before, after):
        bit = witness_bit(before, after)
        assert bit in ("pos", "neg")
    else:
        with pytest.raises(NotOneWitError):
            witness_bit(before, after)
