"""Negative-paraconsistent sheaf masks."""

from __future__ import annotations

import pytest

from pymetrologic import BL, four
from pymetrologic.negative_paraconsistent import (
    combine_cochains,
    d_f_only,
    d_k,
    d_neg,
    d_t,
    d_top,
    is_negative_section,
    negate_valuation,
    negative_paraconsistent_split,
    negative_sheaf_is_negation_mirror,
    proj_f,
    proj_top_neg,
    restrict_cochain,
    restrict_neg,
    vanishes,
)


def sample_valuation() -> dict[str, BL[int]]:
    bl = four()
    return {
        "none": bl.none,
        "truth": bl.true,
        "false": bl.false,
        "top": bl.conflict,
    }


def test_negative_masks_are_the_falsity_or_top_side() -> None:
    valuation = sample_valuation()

    assert [d_k(valuation, cell) for cell in valuation] == [False, True, False, True]
    assert [d_t(valuation, cell) for cell in valuation] == [False, True, False, False]
    assert [d_neg(valuation, cell) for cell in valuation] == [False, False, True, True]
    assert [d_f_only(valuation, cell) for cell in valuation] == [False, False, True, False]
    assert [d_top(valuation, cell) for cell in valuation] == [False, False, False, True]


def test_non_four_valuation_charges_are_rejected() -> None:
    with pytest.raises(ValueError, match="not one of Belnap FOUR"):
        d_neg({"wild": BL(2, 0)}, "wild")


def test_negative_sheaf_is_the_negation_mirror_of_positive_mask() -> None:
    bl = four()
    valuation = sample_valuation()
    negated = negate_valuation(valuation)

    assert negated == {
        "none": bl.none,
        "truth": bl.false,
        "false": bl.true,
        "top": bl.conflict,
    }
    assert all(d_neg(valuation, cell) == d_k(negated, cell) for cell in valuation)
    assert all(d_f_only(valuation, cell) == d_t(negated, cell) for cell in valuation)
    assert all(d_top(negated, cell) == d_top(valuation, cell) for cell in valuation)
    assert negative_sheaf_is_negation_mirror([valuation]).holds


def test_restriction_to_negative_mask_lands_in_sections() -> None:
    valuation = sample_valuation()
    cochain = {"none": 5, "truth": 7, "false": 11, "top": 13}

    restricted = restrict_neg(valuation, cochain)
    assert restricted == {"none": 0, "truth": 0, "false": 11, "top": 13}
    assert is_negative_section(valuation, restricted)
    assert not is_negative_section(valuation, cochain)

    full = restrict_cochain(lambda _cell: True, cochain)
    assert full == cochain
    tighter = restrict_cochain(lambda cell: cell == "top", restricted)
    composed = restrict_cochain(
        lambda cell: (cell == "top") and d_neg(valuation, cell),
        cochain,
    )
    assert tighter == composed
    assert vanishes(lambda cell: cell == "top", tighter)


def test_negative_split_reconstructs_supported_cochains() -> None:
    valuation = sample_valuation()
    cochain = {"none": 0, "truth": 0, "false": 11, "top": 13}

    assert is_negative_section(valuation, cochain)
    assert proj_f(valuation, cochain) == {"none": 0, "truth": 0, "false": 11, "top": 0}
    assert proj_top_neg(valuation, cochain) == {
        "none": 0,
        "truth": 0,
        "false": 0,
        "top": 13,
    }
    assert combine_cochains(proj_f(valuation, cochain), proj_top_neg(valuation, cochain)) == cochain


def test_negative_paraconsistent_split_witness() -> None:
    valuation = sample_valuation()
    witness = negative_paraconsistent_split([valuation])

    assert witness.holds
    assert witness.disjoint_split
    assert witness.union_split
    assert witness.shared_top_seam
    assert witness.f_only_lies_in_dneg
    assert witness.reconstructs
    assert witness.unique_decomposition
