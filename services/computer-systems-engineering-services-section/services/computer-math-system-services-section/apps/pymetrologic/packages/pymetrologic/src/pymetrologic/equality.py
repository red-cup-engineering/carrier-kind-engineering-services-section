"""The two derived equalities (RelMath.Predicating.Equality).

The predication hyperdoctrine carries two parallel adjoint systems — ``∃ᵏ ⊣ f* ⊣ ∀ᵏ`` in
the knowledge order and ``∃ᵗ ⊣ f* ⊣ ∀ᵗ`` in the truth order. From these, **equality is
derived, not postulated** (Lawvere's diagonal-Σ, applied in each order):

* **Classical equality** ``=_E := ∃ᵗ_g(1ᵗ)`` — the truth-order existential image of the
  diagonal ``t``-terminal. Off the diagonal the truth ``∃`` extends by ``f``. So
  ``=_E(s,o) = t`` if ``s = o``, ``f`` otherwise — classical two-valued equality.
* **Paraconsistent equality** ``Δᵏ_E := ∃ᵏ_g(1ᵏ)`` — the knowledge-order existential image
  of the diagonal ``⊤``-terminal. Off the diagonal the knowledge ``∃`` extends by ``⊥``. So
  ``Δᵏ_E(s,o) = ⊤`` if ``s = o``, ``⊥`` otherwise.

Both fall out of the dual adjoint triple over Belnap FOUR (``pymetrologic.four``), where ``∃`` in
each order is that order's fiber-join: classical lands at the truth poles ``t``/``f``
(``⟨T,F⟩``/``⟨F,T⟩``), paraconsistent at the knowledge poles ``⊤``/``⊥`` (``⟨T,T⟩``/``⟨F,F⟩``).
"""

from __future__ import annotations

from .bilattice import BL, four

__all__ = ["classical_eq", "diag_fiber", "paraconsistent_eq"]

_FOUR = four()  # Belnap FOUR = bilattice(boolean), with carrier {0, 1}

# The four charge poles as bilattice values ⟨pro, con⟩ (booleans modeled as 0/1).
_T_TOP: BL[int] = BL(1, 0)  # truth top: t (true)
_T_BOT: BL[int] = BL(0, 1)  # truth bottom: f (false)
_K_TOP: BL[int] = BL(1, 1)  # knowledge top: ⊤ (both)
_K_BOT: BL[int] = BL(0, 0)  # knowledge bottom: ⊥ (none)


def diag_fiber(s: object, o: object) -> list[None]:
    """The diagonal fiber over ``(s, o)``: a single point when ``s = o``, empty otherwise —
    the preimage of the diagonal sub-support under ``e ↦ (e, e)``."""
    return [None] if s == o else []


def classical_eq(s: object, o: object) -> BL[int]:
    """Classical equality ``=_E = ∃ᵗ_g(1ᵗ)``: the truth-order existential image of the
    diagonal ``t``-terminal — ``t`` on the diagonal, ``f`` off it. Derived, not postulated."""
    acc = _T_BOT  # truth bottom (f): the empty truth-join
    for _ in diag_fiber(s, o):
        acc = _FOUR.join_t(acc, _T_TOP)
    return acc


def paraconsistent_eq(s: object, o: object) -> BL[int]:
    """Paraconsistent equality ``Δᵏ_E = ∃ᵏ_g(1ᵏ)``: the knowledge-order existential image of
    the diagonal ``⊤``-terminal — ``⊤`` on the diagonal, ``⊥`` off it. Derived, not postulated."""
    acc = _K_BOT  # knowledge bottom (⊥): the empty knowledge-join
    for _ in diag_fiber(s, o):
        acc = _FOUR.join_k(acc, _K_TOP)
    return acc
