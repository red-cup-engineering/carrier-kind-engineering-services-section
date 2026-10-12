"""The Curry–Howard–Lambek IR — a simply-typed lambda calculus (RelMath.CurryHowardLambekQuartet).

PROOFS = PROGRAMS = MORPHISMS. The corpus realizes the correspondence for a minimal
STLC with products and a unit: de-Bruijn **terms** ``Var/Lam/App/Pair/Fst/Snd/Star``,
β/projection **reduction** (``(λ.t) u ↦ t[u]``, ``fst (pair a b) ↦ a``), which is
confluent (Church–Rosser), so normalization gives a unique normal form. The four
**type-formers** ``{unit, prod, arrow, base}`` (terminal / product / exponential /
dual) are the recurring nuclear FOUR — a bijection with :class:`pymetrologic.Corner`
(``chl_quartet_is_nuclear``).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .quartet import CORNERS, Corner

__all__ = [
    "App",
    "Former",
    "Fst",
    "Lam",
    "Pair",
    "Snd",
    "Star",
    "Term",
    "Var",
    "corner_to_former",
    "former_to_corner",
    "is_normal",
    "normalize",
    "shift",
    "step",
    "subst_top",
]


@dataclass(frozen=True)
class Var:
    """A de-Bruijn variable (the ``i``-th enclosing binder)."""

    i: int


@dataclass(frozen=True)
class Lam:
    """A lambda abstraction ``λ. body``."""

    body: Term


@dataclass(frozen=True)
class App:
    """An application ``fn arg``."""

    fn: Term
    arg: Term


@dataclass(frozen=True)
class Pair:
    """A pair ``(a, b)``."""

    a: Term
    b: Term


@dataclass(frozen=True)
class Fst:
    """The first projection ``fst t``."""

    t: Term


@dataclass(frozen=True)
class Snd:
    """The second projection ``snd t``."""

    t: Term


@dataclass(frozen=True)
class Star:
    """The unique inhabitant ``star`` of the unit type."""


Term = Var | Lam | App | Pair | Fst | Snd | Star


def shift(t: Term, d: int, cutoff: int = 0) -> Term:
    """Shift free de-Bruijn indices ``≥ cutoff`` by ``d``."""
    match t:
        case Var(i):
            return Var(i + d) if i >= cutoff else Var(i)
        case Lam(body):
            return Lam(shift(body, d, cutoff + 1))
        case App(fn, arg):
            return App(shift(fn, d, cutoff), shift(arg, d, cutoff))
        case Pair(a, b):
            return Pair(shift(a, d, cutoff), shift(b, d, cutoff))
        case Fst(inner):
            return Fst(shift(inner, d, cutoff))
        case Snd(inner):
            return Snd(shift(inner, d, cutoff))
        case _:
            return Star()


def _subst(t: Term, j: int, s: Term) -> Term:
    """Substitute ``s`` for the variable ``j`` (TAPL de-Bruijn substitution)."""
    match t:
        case Var(i):
            return s if i == j else Var(i)
        case Lam(body):
            return Lam(_subst(body, j + 1, shift(s, 1)))
        case App(fn, arg):
            return App(_subst(fn, j, s), _subst(arg, j, s))
        case Pair(a, b):
            return Pair(_subst(a, j, s), _subst(b, j, s))
        case Fst(inner):
            return Fst(_subst(inner, j, s))
        case Snd(inner):
            return Snd(_subst(inner, j, s))
        case _:
            return Star()


def subst_top(body: Term, arg: Term) -> Term:
    """β-substitution ``body[0 := arg]`` — substitute the argument for the bound variable."""
    return shift(_subst(body, 0, shift(arg, 1)), -1)


def step(t: Term) -> Term | None:
    """One β/projection reduction step (leftmost-outermost), or ``None`` if normal."""
    match t:
        case App(Lam(body), arg):
            return subst_top(body, arg)
        case Fst(Pair(a, _)):
            return a
        case Snd(Pair(_, b)):
            return b
        case App(fn, arg):
            red = step(fn)
            if red is not None:
                return App(red, arg)
            red = step(arg)
            return App(fn, red) if red is not None else None
        case Lam(body):
            red = step(body)
            return Lam(red) if red is not None else None
        case Pair(a, b):
            red = step(a)
            if red is not None:
                return Pair(red, b)
            red = step(b)
            return Pair(a, red) if red is not None else None
        case Fst(inner):
            red = step(inner)
            return Fst(red) if red is not None else None
        case Snd(inner):
            red = step(inner)
            return Snd(red) if red is not None else None
        case _:
            return None


def is_normal(t: Term) -> bool:
    """``True`` iff ``t`` has no redex (a normal form)."""
    return step(t) is None


def normalize(t: Term, *, max_steps: int = 10_000) -> Term:
    """Reduce ``t`` to its (unique, by confluence) normal form."""
    for _ in range(max_steps):
        red = step(t)
        if red is None:
            return t
        t = red
    raise RuntimeError("normalization did not terminate")


class Former(Enum):
    """The four CHL type-formers — the nuclear FOUR of categorical logic."""

    UNIT = "unit"  # terminal
    PROD = "prod"  # product
    ARROW = "arrow"  # exponential
    BASE = "base"  # the dual


_FORMER_TO_CORNER = dict(zip(Former, CORNERS, strict=True))
_CORNER_TO_FORMER = {c: f for f, c in _FORMER_TO_CORNER.items()}


def former_to_corner(f: Former) -> Corner:
    """The CHL former as a four-corner — terminal/product/exponential/dual ↔ the corners."""
    return _FORMER_TO_CORNER[f]


def corner_to_former(c: Corner) -> Former:
    """The inverse: a corner read as a CHL type-former."""
    return _CORNER_TO_FORMER[c]
