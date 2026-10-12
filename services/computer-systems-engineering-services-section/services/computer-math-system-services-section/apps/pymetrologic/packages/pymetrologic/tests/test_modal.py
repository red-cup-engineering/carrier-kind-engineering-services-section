"""The modal pair ◇⊣□ on valuations (RelMath.Closure.ModalPairAdjunction)."""

from __future__ import annotations

from pymetrologic import (
    BL,
    Bilattice,
    four,
    leK_valuation,
    modal_adjoint_holds,
    modal_closure,
    necessitate,
    possibilize,
)

bl: Bilattice[int] = four()
CELLS = ("0", "1", "2", "3")


def s5(a: str, b: str) -> bool:
    # An S5 (equivalence) frame: accessible iff same parity class.
    return int(a) % 2 == int(b) % 2


def _val(d: dict[str, BL[int]]) -> dict[str, BL[int]]:
    return {c: d.get(c, bl.none) for c in CELLS}


SAMPLES = [
    _val({"0": bl.true, "2": bl.false}),
    _val({"1": bl.conflict}),
    _val(dict.fromkeys(CELLS, bl.true)),
    _val({"0": bl.true, "1": bl.false, "2": bl.conflict, "3": bl.none}),
]


def test_possibilize_inflationary_necessitate_deflationary() -> None:
    for v in SAMPLES:
        assert leK_valuation(bl, v, possibilize(bl, CELLS, s5, v))  # v ≤ₖ ◇v
        assert leK_valuation(bl, necessitate(bl, CELLS, s5, v), v)  # □v ≤ₖ v


def test_modal_adjunction_dia_dashv_box() -> None:
    for v in SAMPLES:
        for w in SAMPLES:
            assert modal_adjoint_holds(bl, CELLS, s5, v, w)  # leK ◇v w ⟺ leK v □w


def test_modal_composite_is_a_closure() -> None:
    for v in SAMPLES:
        cl = modal_closure(bl, CELLS, s5, v)
        assert leK_valuation(bl, v, cl)  # extensive
        cl2 = modal_closure(bl, CELLS, s5, cl)
        assert cl2 == cl  # idempotent
