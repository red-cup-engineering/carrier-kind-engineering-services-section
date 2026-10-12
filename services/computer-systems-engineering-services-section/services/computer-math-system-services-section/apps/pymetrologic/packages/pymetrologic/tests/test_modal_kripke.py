"""Four-valued Kripke hierarchy (RelMath.Positing.ModalKripkeFourValued)."""

from __future__ import annotations

from pymetrologic import four
from pymetrologic.modal_kripke import (
    KFrame,
    S4Frame,
    S5Frame,
    TFrame,
    box,
    diamond,
    kripke_hierarchy,
    s4_box_is_interior,
    s4_diamond_is_closure,
    sample_s4_frame,
    sample_s5_frame,
    twist_split,
    twist_split_negate,
)

FOUR = four()


def test_frame_axiom_hierarchy_and_forgetful_inclusions() -> None:
    witness = kripke_hierarchy()

    assert witness.holds
    assert witness.k_data
    assert witness.t_adds_reflexivity
    assert witness.s4_adds_transitivity
    assert witness.s5_adds_symmetry
    assert witness.forgetful_inclusions


def test_frame_classes_detect_reflexive_transitive_symmetric_axioms() -> None:
    k = KFrame(("a", "b"), frozenset({("a", "b")}))
    t = TFrame(("a", "b"), frozenset({("a", "a"), ("b", "b"), ("a", "b")}))
    s4 = sample_s4_frame()
    s5 = sample_s5_frame()

    assert not k.is_reflexive()
    assert t.is_reflexive()
    assert not t.is_transitive() or not t.is_symmetric()
    assert s4.is_reflexive() and s4.is_transitive()
    assert not s4.is_symmetric()
    assert s5.is_reflexive() and s5.is_transitive() and s5.is_symmetric()
    assert isinstance(s4, S4Frame)
    assert isinstance(s5, S5Frame)


def test_modal_operators_are_accessible_join_and_meet() -> None:
    frame = S4Frame(
        cells=("a", "b"),
        relation=frozenset({("a", "a"), ("b", "b"), ("a", "b")}),
    )
    valuation = {"a": FOUR.true, "b": FOUR.false}

    assert diamond(frame, valuation) == {"a": FOUR.conflict, "b": FOUR.false}
    assert box(frame, valuation) == {"a": FOUR.none, "b": FOUR.false}


def test_s4_box_is_interior_and_diamond_is_closure_without_symmetry() -> None:
    frame = sample_s4_frame()
    witness = s4_box_is_interior(frame)

    assert witness.holds
    assert witness.box_deflationary
    assert witness.box_monotone
    assert witness.box_idempotent
    assert witness.diamond_extensive
    assert witness.diamond_monotone
    assert witness.diamond_idempotent
    assert witness.symmetry_not_required
    assert s4_diamond_is_closure(frame)


def test_s5_frame_recovers_existing_modal_adjoint_setting() -> None:
    frame = sample_s5_frame()
    valuation = {"0": FOUR.true, "1": FOUR.false, "2": FOUR.none, "3": FOUR.conflict}

    assert frame.is_symmetric()
    assert diamond(frame, valuation) == {
        "0": FOUR.true,
        "1": FOUR.conflict,
        "2": FOUR.true,
        "3": FOUR.conflict,
    }
    assert box(frame, valuation) == {
        "0": FOUR.none,
        "1": FOUR.false,
        "2": FOUR.none,
        "3": FOUR.false,
    }


def test_twist_split_negation_swaps_positive_and_negative_components() -> None:
    assert twist_split(FOUR.none) == (False, False)
    assert twist_split(FOUR.true) == (True, False)
    assert twist_split(FOUR.false) == (False, True)
    assert twist_split(FOUR.conflict) == (True, True)
    assert all(
        twist_split_negate(charge) for charge in (FOUR.none, FOUR.true, FOUR.false, FOUR.conflict)
    )
