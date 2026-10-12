"""The fiber quantifier adjoints (RelMath.Predicating.Quantifying).

For a base map ``f`` with finite preimages, the quantifiers over the predication
hyperdoctrine are the fiber join / meet of the value lattice ``Charge`` (Belnap FOUR):

    ``(∃_f v)(φ) = ⨆ { v ψ : f ψ = φ }``     ``(∀_f v)(φ) = ⨅ { v ψ : f ψ = φ }``

and the **adjoint triple** ``∃_f ⊣ f* ⊣ ∀_f`` holds, where ``f*`` is reindexing
(precomposition with ``f``). A valuation assigns a charge to each predication cell; a
``FiniteFibration`` carries each cell's preimage as a finite list, the data that makes the
quantifiers constructive. The only assumption is that each preimage is finitely enumerable.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from .bilattice import BL, four

_FOUR = four()  # Belnap FOUR = bilattice(boolean), carrier {0, 1}

Charge = BL[int]
Valuation = Mapping[str, Charge]

__all__ = [
    "FiniteFibration",
    "exists_adjunction_holds",
    "exists_f",
    "forall_adjunction_holds",
    "forall_f",
    "join_list",
    "meet_list",
    "mem_fiber_holds",
    "reindex_valuation",
    "valuation_le_k",
]


def join_list(charges: Sequence[Charge]) -> Charge:
    """The knowledge-join of a finite list of charges (``⊥ₖ`` on the empty list)."""
    acc: Charge = BL(0, 0)  # kBot
    for c in charges:
        acc = _FOUR.join_k(acc, c)
    return acc


def meet_list(charges: Sequence[Charge]) -> Charge:
    """The knowledge-meet of a finite list of charges (``⊤ₖ`` on the empty list)."""
    acc: Charge = BL(1, 1)  # kTop
    for c in charges:
        acc = _FOUR.meet_k(acc, c)
    return acc


@dataclass
class FiniteFibration:
    """A base map with each codomain cell's preimage as a finite list — the data making
    ``∃_f`` / ``∀_f`` constructive."""

    domain: tuple[str, ...]
    codomain: tuple[str, ...]
    base: Mapping[str, str]  # f : domain → codomain
    fiber: Mapping[str, tuple[str, ...]]  # φ ↦ preimage f⁻¹(φ)


def mem_fiber_holds(f: FiniteFibration) -> bool:
    """The fibration is coherent: ``ψ ∈ fiber φ ⟺ base ψ = φ`` for all domain/codomain cells."""
    return all(
        (psi in f.fiber[phi]) == (f.base[psi] == phi) for psi in f.domain for phi in f.codomain
    )


def exists_f(f: FiniteFibration, v: Valuation) -> dict[str, Charge]:
    """The existential quantifier ``∃_f v``: the fiber knowledge-join over each preimage."""
    return {phi: join_list([v[psi] for psi in f.fiber[phi]]) for phi in f.codomain}


def forall_f(f: FiniteFibration, v: Valuation) -> dict[str, Charge]:
    """The universal quantifier ``∀_f v``: the fiber knowledge-meet over each preimage."""
    return {phi: meet_list([v[psi] for psi in f.fiber[phi]]) for phi in f.codomain}


def reindex_valuation(f: FiniteFibration, w: Valuation) -> dict[str, Charge]:
    """Reindexing ``f* w``: pull a codomain valuation back along ``f`` (``ψ ↦ w(f ψ)``)."""
    return {psi: w[f.base[psi]] for psi in f.domain}


def valuation_le_k(v: Valuation, w: Valuation, cells: Sequence[str]) -> bool:
    """The pointwise knowledge order on valuations over ``cells``: ``∀ c, v(c) ≤ₖ w(c)``."""
    return all(_FOUR.leq_k(v[c], w[c]) for c in cells)


def exists_adjunction_holds(f: FiniteFibration, v: Valuation, w: Valuation) -> bool:
    """``∃_f ⊣ f*``: ``(∃_f v ≤ₖ w)  ⟺  (v ≤ₖ f* w)`` (``v`` over domain, ``w`` over codomain)."""
    lhs = valuation_le_k(exists_f(f, v), w, f.codomain)
    rhs = valuation_le_k(v, reindex_valuation(f, w), f.domain)
    return lhs == rhs


def forall_adjunction_holds(f: FiniteFibration, v: Valuation, w: Valuation) -> bool:
    """``f* ⊣ ∀_f``: ``(f* v ≤ₖ w)  ⟺  (v ≤ₖ ∀_f w)`` (``v`` over codomain, ``w`` over domain)."""
    lhs = valuation_le_k(reindex_valuation(f, v), w, f.domain)
    rhs = valuation_le_k(v, forall_f(f, w), f.codomain)
    return lhs == rhs
