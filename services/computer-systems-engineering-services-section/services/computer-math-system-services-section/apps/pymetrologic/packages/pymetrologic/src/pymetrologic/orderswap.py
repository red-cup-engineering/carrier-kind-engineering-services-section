"""Order-swap duality: σ transports knowledge to truth (RelMath.Positing.OrderSwapDuality).

FOUR carries two orders on the same charges — knowledge ``≤ₖ`` and truth ``≤ₜ``. Beyond the
Klein-four symmetry ``⟨∼, −⟩`` (each element preserving one order, reversing the other) there
is a fifth involution σ that belongs to *neither* order's automorphism group: it **exchanges**
the two orders. In slot coordinates ``σ⟨a,b⟩ = ⟨a, ¬b⟩`` (keep the positive slot, flip the
negative one), realizing the table ``σ: ⊥ₖ ↔ f, t ↔ ⊤ₖ``.

Proven here over Belnap FOUR (``pymetrologic.four``):

1. σ is involutive (``swap(swap c) = c``) and distinct from each Klein-four element.
2. σ is an order-iso ``(Charge,≤ₖ) ≅ (Charge,≤ₜ)``: ``leq_k(a,b) ⟺ leq_t(σa, σb)`` and back.
3. σ is a cross-order lattice homomorphism: ``σ(a ∨ₖ b) = σa ∨ₜ σb`` and dually for ∧ — the
   truth operations *are* the σ-images of the knowledge ones.
4. The transport meta-lemma: the conjugate ``conj j = σ ∘ j ∘ σ`` carries every ``≤ₖ``-closure
   to a ``≤ₜ``-closure (inflation, monotonicity, idempotence all transport). Truth-order closure
   theory need not be re-proved — it is σ-transported from knowledge theory.
"""

from __future__ import annotations

from collections.abc import Callable

from .bilattice import BL, four

__all__ = [
    "FOUR_CHARGES",
    "conj",
    "cross_order_hom_holds",
    "is_k_closure",
    "is_order_iso",
    "is_t_closure",
    "join_closure_k",
    "swap",
    "swap_distinct_from_klein",
    "transport_closure_holds",
]

_FOUR = four()  # Belnap FOUR = bilattice(boolean), carrier {0, 1}

# The four charges ⟨pro, con⟩: ⊥ₖ ⟨0,0⟩, f ⟨0,1⟩, t ⟨1,0⟩, ⊤ₖ ⟨1,1⟩.
FOUR_CHARGES: tuple[BL[int], ...] = (BL(0, 0), BL(0, 1), BL(1, 0), BL(1, 1))

Endo = Callable[[BL[int]], BL[int]]


def swap(x: BL[int]) -> BL[int]:
    """The order-swap involution σ: keep the positive slot, flip the negative —
    ``σ⟨a,b⟩ = ⟨a, ¬b⟩`` (``⊥ₖ ↔ f``, ``t ↔ ⊤ₖ``)."""
    return BL(x.pro, 1 - x.con)


def conj(j: Endo) -> Endo:
    """The σ-conjugate of an endomap: ``conj j = σ ∘ j ∘ σ`` (an involution on endomaps)."""
    return lambda a: swap(j(swap(a)))


def swap_distinct_from_klein(x: BL[int]) -> bool:
    """Whether σ differs from negation ``∼``, conflation ``−`` and ``∼−`` at ``x`` —
    σ is the symmetry of FOUR belonging to neither order's automorphism group."""
    return (
        swap(x) != _FOUR.neg(x)
        and swap(x) != _FOUR.conflate(x)
        and swap(x) != _FOUR.neg(_FOUR.conflate(x))
    )


def is_order_iso(a: BL[int], b: BL[int]) -> bool:
    """σ as the poset iso ``(Charge,≤ₖ) ≅ (Charge,≤ₜ)``: ``leq_k(a,b) ⟺ leq_t(σa, σb)`` and the
    converse ``leq_t(a,b) ⟺ leq_k(σa, σb)``."""
    fwd = _FOUR.leq_k(a, b) == _FOUR.leq_t(swap(a), swap(b))
    bwd = _FOUR.leq_t(a, b) == _FOUR.leq_k(swap(a), swap(b))
    return fwd and bwd


def cross_order_hom_holds(a: BL[int], b: BL[int]) -> bool:
    """σ as a cross-order lattice homomorphism: ``σ(a ∨ₖ b) = σa ∨ₜ σb``, ``σ(a ∧ₖ b) = σa ∧ₜ σb``,
    and the converses with the orders swapped."""
    sa, sb = swap(a), swap(b)
    return (
        swap(_FOUR.join_k(a, b)) == _FOUR.join_t(sa, sb)
        and swap(_FOUR.meet_k(a, b)) == _FOUR.meet_t(sa, sb)
        and swap(_FOUR.join_t(a, b)) == _FOUR.join_k(sa, sb)
        and swap(_FOUR.meet_t(a, b)) == _FOUR.meet_k(sa, sb)
    )


def is_k_closure(j: Endo) -> bool:
    """Whether ``j`` is a knowledge-order closure over FOUR: ``≤ₖ``-inflationary, ``≤ₖ``-monotone,
    and idempotent."""
    infl = all(_FOUR.leq_k(a, j(a)) for a in FOUR_CHARGES)
    mono = all(
        _FOUR.leq_k(j(a), j(b)) for a in FOUR_CHARGES for b in FOUR_CHARGES if _FOUR.leq_k(a, b)
    )
    idem = all(j(j(a)) == j(a) for a in FOUR_CHARGES)
    return infl and mono and idem


def is_t_closure(j: Endo) -> bool:
    """Whether ``j`` is a truth-order closure over FOUR (≤ₜ inflationary/monotone, idempotent)."""
    infl = all(_FOUR.leq_t(a, j(a)) for a in FOUR_CHARGES)
    mono = all(
        _FOUR.leq_t(j(a), j(b)) for a in FOUR_CHARGES for b in FOUR_CHARGES if _FOUR.leq_t(a, b)
    )
    idem = all(j(j(a)) == j(a) for a in FOUR_CHARGES)
    return infl and mono and idem


def transport_closure_holds(j: Endo) -> bool:
    """The transport meta-lemma: if ``j`` is a ``≤ₖ``-closure then its σ-conjugate ``conj j`` is a
    ``≤ₜ``-closure (vacuously ``True`` if ``j`` is not a knowledge closure)."""
    if not is_k_closure(j):
        return True
    return is_t_closure(conj(j))


def join_closure_k(k: BL[int]) -> Endo:
    """The canonical knowledge closure "raise toward ``k`` by ``∨ₖ``": ``a ↦ k ∨ₖ a``."""
    return lambda a: _FOUR.join_k(k, a)
