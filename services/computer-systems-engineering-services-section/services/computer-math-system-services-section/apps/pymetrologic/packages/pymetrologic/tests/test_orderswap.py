"""Order-swap duality (RelMath.Positing.OrderSwapDuality)."""

from __future__ import annotations

from hypothesis import given
from hypothesis import strategies as st

from pymetrologic import (
    BL,
    FOUR_CHARGES,
    conj,
    cross_order_hom_holds,
    is_k_closure,
    is_order_iso,
    is_t_closure,
    join_closure_k,
    swap,
    swap_distinct_from_klein,
    transport_closure_holds,
)

charges = st.sampled_from(FOUR_CHARGES)

K_BOT, T_BOT, T_TOP, K_TOP = BL(0, 0), BL(0, 1), BL(1, 0), BL(1, 1)


def test_swap_table() -> None:
    assert swap(K_BOT) == T_BOT  # ⊥ₖ ↦ f
    assert swap(T_BOT) == K_BOT  # f ↦ ⊥ₖ
    assert swap(T_TOP) == K_TOP  # t ↦ ⊤ₖ
    assert swap(K_TOP) == T_TOP  # ⊤ₖ ↦ t


@given(x=charges)
def test_swap_involutive_and_distinct(x: BL[int]) -> None:
    assert swap(swap(x)) == x
    assert swap_distinct_from_klein(x)


@given(a=charges, b=charges)
def test_order_iso(a: BL[int], b: BL[int]) -> None:
    assert is_order_iso(a, b)


@given(a=charges, b=charges)
def test_cross_order_homomorphism(a: BL[int], b: BL[int]) -> None:
    assert cross_order_hom_holds(a, b)


@given(j_seed=charges)
def test_conj_is_involution_on_endomaps(j_seed: BL[int]) -> None:
    j = join_closure_k(j_seed)
    cc = conj(conj(j))
    assert all(cc(a) == j(a) for a in FOUR_CHARGES)


def test_transport_of_canonical_closures() -> None:
    # Each "raise toward k by ∨ₖ" is a knowledge closure; its σ-conjugate is a truth closure.
    for k in FOUR_CHARGES:
        j = join_closure_k(k)
        assert is_k_closure(j)  # "raise toward k by ∨ₖ" is a knowledge closure
        assert is_t_closure(conj(j))  # its σ-conjugate IS a truth closure
        assert transport_closure_holds(j)


def test_transport_vacuous_for_non_closure() -> None:
    # A non-monotone map is not a k-closure, so the transport claim holds vacuously.
    def weird(x: BL[int]) -> BL[int]:
        return swap(x)  # σ is not ≤ₖ-inflationary (it swaps orders)

    assert not is_k_closure(weird)
    assert transport_closure_holds(weird)
