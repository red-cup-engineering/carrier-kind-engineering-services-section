"""The fiber quantifier adjoints (RelMath.Predicating.Quantifying)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    BL,
    FiniteFibration,
    exists_adjunction_holds,
    exists_f,
    forall_adjunction_holds,
    forall_f,
    join_list,
    meet_list,
    mem_fiber_holds,
)

K_BOT, T_BOT, T_TOP, K_TOP = BL(0, 0), BL(0, 1), BL(1, 0), BL(1, 1)
CHARGES = (K_BOT, T_BOT, T_TOP, K_TOP)

# A collapse fibration: domain {a,b,c,d} → codomain {x,y}, base a,b ↦ x and c,d ↦ y.
FIB = FiniteFibration(
    domain=("a", "b", "c", "d"),
    codomain=("x", "y"),
    base={"a": "x", "b": "x", "c": "y", "d": "y"},
    fiber={"x": ("a", "b"), "y": ("c", "d")},
)

charges = st.sampled_from(CHARGES)
dom_val = st.fixed_dictionaries({c: charges for c in FIB.domain})
cod_val = st.fixed_dictionaries({c: charges for c in FIB.codomain})


def test_fibration_coherent() -> None:
    assert mem_fiber_holds(FIB)


def test_join_meet_list_bounds() -> None:
    assert join_list([]) == K_BOT  # ⊥ₖ on the empty list
    assert meet_list([]) == K_TOP  # ⊤ₖ on the empty list
    assert join_list([T_TOP, T_BOT]) == K_TOP  # t ∨ₖ f = ⊤ₖ
    assert meet_list([T_TOP, T_BOT]) == K_BOT  # t ∧ₖ f = ⊥ₖ


def test_exists_forall_shapes() -> None:
    v = {"a": T_TOP, "b": T_BOT, "c": K_BOT, "d": K_BOT}
    assert exists_f(FIB, v) == {"x": K_TOP, "y": K_BOT}  # ⊔ over each fiber
    assert forall_f(FIB, v) == {"x": K_BOT, "y": K_BOT}  # ⊓ over each fiber


@given(v=dom_val, w=cod_val)
def test_exists_adjunction(v: dict[str, BL[int]], w: dict[str, BL[int]]) -> None:
    # ∃_f ⊣ f*  :  (∃_f v ≤ₖ w) ⟺ (v ≤ₖ f* w)
    assert exists_adjunction_holds(FIB, v, w)


@given(v=cod_val, w=dom_val)
def test_forall_adjunction(v: dict[str, BL[int]], w: dict[str, BL[int]]) -> None:
    # f* ⊣ ∀_f  :  (f* v ≤ₖ w) ⟺ (v ≤ₖ ∀_f w)
    assert forall_adjunction_holds(FIB, v, w)


def test_bijection_fibration_singleton_fibers() -> None:
    # A bijection has singleton fibers; ∃_f and ∀_f then coincide (= reindex by the inverse).
    bij = FiniteFibration(
        domain=("a", "b"),
        codomain=("p", "q"),
        base={"a": "p", "b": "q"},
        fiber={"p": ("a",), "q": ("b",)},
    )
    assert mem_fiber_holds(bij)
    v = {"a": T_TOP, "b": K_BOT}
    assert exists_f(bij, v) == forall_f(bij, v) == {"p": T_TOP, "q": K_BOT}
