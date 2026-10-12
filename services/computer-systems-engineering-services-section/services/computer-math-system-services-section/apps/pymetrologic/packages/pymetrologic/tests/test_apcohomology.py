"""Finite Anderson–Putnam cohomology witnesses (RelMath.Aperiodic.Witness.JeandelRao)."""

from __future__ import annotations

from pymetrologic import OneVertexComplex, coboundary, is_cocycle, is_nonzero_h1

# A one-vertex complex shaped after the Jeandel–Rao marker-ring core: the cocycle
# condition forces q1 = q2 = q5, so b3 = q1 + q2 + q5 is a nonzero H¹ class.
CX = OneVertexComplex(
    edges=("q1", "q2", "q3", "q4", "q5"),
    faces=("f1", "f2"),
    delta1={"f1": {"q1": 1, "q2": -1}, "f2": {"q2": 1, "q5": -1}},
)
B3 = {"q1": 1, "q2": 1, "q5": 1}


def test_b3_is_a_nonzero_h1_class() -> None:
    assert coboundary(CX, B3) == {"f1": 0, "f2": 0}  # closed
    assert is_cocycle(CX, B3)
    assert is_nonzero_h1(CX, B3)  # nonzero cocycle, and δ⁰=0 on a one-vertex complex


def test_a_non_cocycle() -> None:
    bad = {"q1": 1}  # q1 ≠ q2 -> δ¹ on f1 is nonzero
    assert coboundary(CX, bad)["f1"] == 1
    assert not is_cocycle(CX, bad)
    assert not is_nonzero_h1(CX, bad)


def test_zero_cochain_is_a_cocycle_but_not_a_nonzero_class() -> None:
    zero = dict.fromkeys(CX.edges, 0)
    assert is_cocycle(CX, zero)
    assert not is_nonzero_h1(CX, zero)  # the trivial class
