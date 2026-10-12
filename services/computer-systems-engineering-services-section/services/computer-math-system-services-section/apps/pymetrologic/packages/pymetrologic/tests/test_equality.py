"""The two derived equalities (RelMath.Predicating.Equality)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import BL, classical_eq, diag_fiber, paraconsistent_eq

T_TOP = BL(True, False)  # t (true)
T_BOT = BL(False, True)  # f (false)
K_TOP = BL(True, True)  # ⊤ (both)
K_BOT = BL(False, False)  # ⊥ (none)


def test_diag_fiber() -> None:
    assert diag_fiber(3, 3) == [None]
    assert diag_fiber(3, 4) == []


@given(s=st.integers(0, 20), o=st.integers(0, 20))
def test_classical_equality_two_valued(s: int, o: int) -> None:
    # =_E(s,o) = t if s=o else f — derived, lands at the truth poles.
    assert classical_eq(s, o) == (T_TOP if s == o else T_BOT)


@given(s=st.integers(0, 20), o=st.integers(0, 20))
def test_paraconsistent_equality_two_valued(s: int, o: int) -> None:
    # Δᵏ_E(s,o) = ⊤ if s=o else ⊥ — derived, lands at the knowledge poles.
    assert paraconsistent_eq(s, o) == (K_TOP if s == o else K_BOT)


@given(s=st.integers(0, 20))
def test_reflexivity_in_both(s: int) -> None:
    assert classical_eq(s, s) == T_TOP
    assert paraconsistent_eq(s, s) == K_TOP


@given(s=st.integers(0, 20), o=st.integers(0, 20))
def test_agree_on_where_disagree_on_charge(s: int, o: int) -> None:
    # Both hold exactly on the diagonal...
    classical_holds = classical_eq(s, o) == T_TOP
    para_holds = paraconsistent_eq(s, o) == K_TOP
    assert classical_holds == para_holds == (s == o)
    # ...but classical lands at truth poles, paraconsistent at knowledge poles.
    assert classical_eq(s, o) in (T_TOP, T_BOT)
    assert paraconsistent_eq(s, o) in (K_TOP, K_BOT)


def test_charges_are_distinct_poles() -> None:
    # The truth poles and knowledge poles are genuinely different bilattice values.
    assert len({T_TOP, T_BOT, K_TOP, K_BOT}) == 4
