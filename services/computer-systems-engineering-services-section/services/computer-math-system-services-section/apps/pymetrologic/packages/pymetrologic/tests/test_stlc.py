"""The Curry–Howard–Lambek STLC IR (RelMath.CurryHowardLambekQuartet)."""

from __future__ import annotations

from pymetrologic import (
    CORNERS,
    App,
    Former,
    Fst,
    Lam,
    Pair,
    Snd,
    Star,
    Var,
    corner_to_former,
    former_to_corner,
    is_normal,
    normalize,
)

IDENTITY = Lam(Var(0))  # λx. x
K = Lam(Lam(Var(1)))  # λx.λy. x


def test_beta_reduction() -> None:
    assert normalize(App(IDENTITY, Star())) == Star()
    # K a b -> a
    assert normalize(App(App(K, Star()), Lam(Var(0)))) == Star()


def test_projection_reduction() -> None:
    assert normalize(Fst(Pair(Star(), IDENTITY))) == Star()
    assert normalize(Snd(Pair(Star(), IDENTITY))) == IDENTITY


def test_normal_forms() -> None:
    assert is_normal(Star())
    assert is_normal(IDENTITY)  # a value
    assert not is_normal(App(IDENTITY, Star()))  # a redex


def test_substitution_under_binders() -> None:
    # (λx. λy. x) z  -> λy. z   (capture-avoiding de Bruijn substitution)
    z = Pair(Star(), Star())
    assert normalize(App(K, z)) == Lam(z)  # the bound y is shifted correctly


def test_chl_quartet_is_nuclear() -> None:
    # The four type-formers biject with the four corners (the nuclear FOUR).
    assert len(list(Former)) == 4
    for f in Former:
        assert corner_to_former(former_to_corner(f)) is f
    for c in CORNERS:
        assert former_to_corner(corner_to_former(c)) is c
