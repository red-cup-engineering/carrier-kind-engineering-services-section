"""Settling-associated sheaf (RelMath.Cohomology.SettlingAssociatedSheaf)."""

from __future__ import annotations

import pytest

from pymetrologic import four
from pymetrologic.associated_sheaf import (
    cochain_separated,
    combine,
    combine_split,
    designated_short_exact_sequence,
    dk_mask,
    dk_split_holds,
    dt_mask,
    dtop_mask,
    iota,
    iota_injective,
    pi,
    pi_surjective,
    proj_t,
    proj_top,
    restrict,
    restrict_comp,
    restrict_id,
    settling_associated_sheaf,
    supported,
    vanishes_on_top,
    zero_cochain,
)


def sample_valuation() -> dict[str, object]:
    bl = four()
    return {
        "truth": bl.true,
        "conflict": bl.conflict,
        "false": bl.false,
        "none": bl.none,
    }


def sample_cochain() -> dict[str, int]:
    return {"truth": 7, "conflict": -3, "false": 11, "none": 0}


def test_designation_masks_split_knowledge_designated_cells() -> None:
    valuation = sample_valuation()

    assert dt_mask(valuation) == frozenset({"truth"})  # type: ignore[arg-type]
    assert dtop_mask(valuation) == frozenset({"conflict"})  # type: ignore[arg-type]
    assert dk_mask(valuation) == frozenset({"truth", "conflict"})  # type: ignore[arg-type]
    assert dk_split_holds(valuation)  # type: ignore[arg-type]
    assert dt_mask(valuation).isdisjoint(dtop_mask(valuation))  # type: ignore[arg-type]


def test_restriction_laws_and_support() -> None:
    cochain = sample_cochain()
    truth = frozenset({"truth"})
    conflict = frozenset({"conflict"})

    assert restrict(truth, cochain) == {"truth": 7, "conflict": 0, "false": 0, "none": 0}
    assert supported(truth, restrict(truth, cochain))
    assert restrict_id(tuple(cochain), cochain)
    assert restrict_comp(truth, conflict, cochain)


def test_cover_separation_is_the_injectivity_half_of_sheaf_gluing() -> None:
    left = {"a": 1, "b": 2}
    same = {"a": 1, "b": 2}
    different = {"a": 1, "b": 3}
    cover = (frozenset({"a"}), frozenset({"b"}))

    assert cochain_separated(cover, left, same)
    assert cochain_separated(cover, left, different)
    assert not cochain_separated((frozenset({"a"}),), left, different)


def test_iota_pi_and_exactness_characterization() -> None:
    valuation = sample_valuation()
    cochain = sample_cochain()
    truth_part = {"truth": 7, "conflict": 0, "false": 0, "none": 0}
    top_part = {"truth": 0, "conflict": -3, "false": 0, "none": 0}

    assert iota(valuation, cochain) == truth_part  # type: ignore[arg-type]
    assert pi(valuation, cochain) == top_part  # type: ignore[arg-type]
    assert iota_injective(valuation, truth_part, truth_part)  # type: ignore[arg-type]
    assert pi_surjective(valuation, top_part)  # type: ignore[arg-type]
    assert vanishes_on_top(valuation, truth_part)  # type: ignore[arg-type]
    assert not vanishes_on_top(valuation, cochain)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="truth-supported"):
        iota_injective(valuation, cochain, cochain)  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="top-supported"):
        pi_surjective(valuation, cochain)  # type: ignore[arg-type]


def test_short_exact_sequence_splits_knowledge_supported_cochains() -> None:
    valuation = sample_valuation()
    cochain = {"truth": 7, "conflict": -3, "false": 0, "none": 0}

    assert combine(proj_t(valuation, cochain), proj_top(valuation, cochain)) == cochain  # type: ignore[arg-type]
    assert combine_split(valuation, cochain)  # type: ignore[arg-type]
    assert designated_short_exact_sequence(valuation, cochain).holds  # type: ignore[arg-type]

    with pytest.raises(ValueError, match="knowledge-supported"):
        combine_split(valuation, sample_cochain())  # type: ignore[arg-type]


def test_settling_associated_sheaf_witnesses_presheaf_and_gluing_laws() -> None:
    valuation = sample_valuation()
    cochain = sample_cochain()
    cover = (frozenset({"truth", "false"}), frozenset({"conflict", "none"}))
    witness = settling_associated_sheaf(valuation, cochain, cover)  # type: ignore[arg-type]

    assert zero_cochain(tuple(cochain)) == {"truth": 0, "conflict": 0, "false": 0, "none": 0}
    assert witness.restriction_lands_in_mask
    assert witness.presheaf_identity
    assert witness.presheaf_composition
    assert witness.designated_support_matches_truth
    assert witness.separated_on_cover
    assert witness.h1_zero_reused
    assert witness.holds
