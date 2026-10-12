"""The Belnap–Fitting four-valued bilattice ``FOUR`` and its operations.

Round 13 / WOAH #1 — bilattice-valued state across FARS. The witness
record already carries ``(truth, evidence) ∈ [0, 1]²`` (predication-
algebra-model bilattice axes). Production sites compute these honestly
(``runtime.dispatch`` writes ``truth=0.0, evidence=1.0`` on hard
failure; ``runtime.ledger.Posting`` weights amounts by truth or by the
``k_meet`` floor of the two; ``cli.hook_dispatch`` caps evidence at
0.5 on truncation). What was missing was a single algebra that
*interprets* these pairs as one of four discrete states a cell can
inhabit:

  ⊥  bottom / no-info   — no witness has spoken
  t  true               — every witness that spoke agrees the cell holds
  f  false              — every witness that spoke agrees the cell does not hold
  ⊤  top / contested    — at least one witness says t, at least one says f

Two partial orders give FOUR its bilattice structure:

  truth order      f ≤_t ⊥, ⊤ ≤_t t
                       (f at bottom, t at top, ⊥ and ⊤ incomparable middle)
  knowledge order  ⊥ ≤_k t, f ≤_k ⊤
                       (⊥ at bottom, ⊤ at top, t and f incomparable middle)

Each order yields a meet / join, giving four binary ops:

  ``meet_t``   truth meet  (glb in truth order)        — Belnap "AND"
  ``join_t``  truth join  (lub in truth order)        — Belnap "OR"
  ``meet_k``  knowledge meet (glb in knowledge order)  — "consensus" / agree-only
  ``join_k``  knowledge join (lub in knowledge order)  — "gullible" / combine-all

The two unary involutions:

  ``negate``     t ↔ f, ⊥ and ⊤ fixed     — Belnap negation
  ``conflate``   ⊥ ↔ ⊤, t and f fixed     — knowledge-axis flip

This module is *just* the algebra: enum + tables + closed-form
``from_truth_evidence`` lifting a single witness's bilattice axes to
its FOUR vote. Cellwise composition of multiple witnesses lives in
``pyfars.runtime.belief`` (queries the event log; substrate code stays
event-log-agnostic).

References:
  Belnap, "A useful four-valued logic" (1977).
  Fitting, "Bilattices and the semantics of logic programming" (1991).
  Library: predication-categories / bilattice-operation-table,
  closure-as-fitting-fixpoint.
"""
from __future__ import annotations

from enum import Enum


class BilatticeValue(Enum):
    """The four points of FOUR.

    Names spelled out so log/JSON output is human-readable; the
    ``symbol`` property gives the conventional ⊥/t/f/⊤ glyph for
    compact display in CLI tables.
    """

    BOTTOM = "bottom"
    """⊥ — no witness has spoken to this cell."""

    TRUE = "true"
    """t — at least one witness; every speaker agrees the cell holds."""

    FALSE = "false"
    """f — at least one witness; every speaker agrees the cell does not hold."""

    TOP = "top"
    """⊤ — speakers disagree; at least one claimed true and one claimed false."""

    @property
    def symbol(self) -> str:
        """Single-glyph display form: ⊥ / t / f / ⊤."""
        return _SYMBOL[self]

    def __str__(self) -> str:
        return self.symbol


_SYMBOL = {
    BilatticeValue.BOTTOM: "⊥",
    BilatticeValue.TRUE: "t",
    BilatticeValue.FALSE: "f",
    BilatticeValue.TOP: "⊤",
}


# Index in tabular ops below — order chosen so the diagonal is identity.
_INDEX = {
    BilatticeValue.BOTTOM: 0,
    BilatticeValue.TRUE: 1,
    BilatticeValue.FALSE: 2,
    BilatticeValue.TOP: 3,
}
_FROM_INDEX = (
    BilatticeValue.BOTTOM,
    BilatticeValue.TRUE,
    BilatticeValue.FALSE,
    BilatticeValue.TOP,
)


# -- the four binary ops, expressed as 4×4 tables ------------------
#
# Rows / columns are ordered (⊥, t, f, ⊤). Tables are derived from the
# Hasse diagrams of the truth and knowledge orders and verified by the
# property tests in tests/test_bilattice.py — every op must be
# commutative, associative, idempotent, and the two orders must agree
# with their respective meets/joins.

# truth order Hasse diagram:        knowledge order Hasse diagram:
#         t                                   ⊤
#        / \                                 / \
#       ⊥   ⊤                               t   f
#        \ /                                 \ /
#         f                                   ⊥

_MEET_T = (
    # ⊥, t, f, ⊤
    (BilatticeValue.BOTTOM, BilatticeValue.BOTTOM, BilatticeValue.FALSE, BilatticeValue.FALSE),  # ⊥
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.FALSE, BilatticeValue.TOP),    # t
    (BilatticeValue.FALSE,  BilatticeValue.FALSE,  BilatticeValue.FALSE, BilatticeValue.FALSE),  # f
    (BilatticeValue.FALSE,  BilatticeValue.TOP,    BilatticeValue.FALSE, BilatticeValue.TOP),    # ⊤
)

_JOIN_T = (
    # ⊥, t, f, ⊤
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.BOTTOM, BilatticeValue.TRUE),  # ⊥
    (BilatticeValue.TRUE,   BilatticeValue.TRUE,   BilatticeValue.TRUE,   BilatticeValue.TRUE),  # t
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.FALSE,  BilatticeValue.TOP),   # f
    (BilatticeValue.TRUE,   BilatticeValue.TRUE,   BilatticeValue.TOP,    BilatticeValue.TOP),   # ⊤
)

_MEET_K = (
    # ⊥, t, f, ⊤
    (BilatticeValue.BOTTOM, BilatticeValue.BOTTOM, BilatticeValue.BOTTOM, BilatticeValue.BOTTOM),  # ⊥
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.BOTTOM, BilatticeValue.TRUE),    # t
    (BilatticeValue.BOTTOM, BilatticeValue.BOTTOM, BilatticeValue.FALSE,  BilatticeValue.FALSE),   # f
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.FALSE,  BilatticeValue.TOP),     # ⊤
)

_JOIN_K = (
    # ⊥, t, f, ⊤
    (BilatticeValue.BOTTOM, BilatticeValue.TRUE,   BilatticeValue.FALSE, BilatticeValue.TOP),  # ⊥
    (BilatticeValue.TRUE,   BilatticeValue.TRUE,   BilatticeValue.TOP,   BilatticeValue.TOP),  # t
    (BilatticeValue.FALSE,  BilatticeValue.TOP,    BilatticeValue.FALSE, BilatticeValue.TOP),  # f
    (BilatticeValue.TOP,    BilatticeValue.TOP,    BilatticeValue.TOP,   BilatticeValue.TOP),  # ⊤
)


def meet_t(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Truth meet (Belnap "AND") — glb in the truth order f ≤_t ⊥, ⊤ ≤_t t."""
    return _MEET_T[_INDEX[a]][_INDEX[b]]


def join_t(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Truth join (Belnap "OR") — lub in the truth order."""
    return _JOIN_T[_INDEX[a]][_INDEX[b]]


def meet_k(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Knowledge meet ("consensus") — glb in the knowledge order ⊥ ≤_k t, f ≤_k ⊤.

    The "agree-only" composition: information present in both inputs;
    information present in only one side is discarded. ``meet_k(t, f) = ⊥``
    because the two sides have nothing in common.
    """
    return _MEET_K[_INDEX[a]][_INDEX[b]]


def join_k(a: BilatticeValue, b: BilatticeValue) -> BilatticeValue:
    """Knowledge join ("gullible") — lub in the knowledge order.

    The "combine-all" composition that yields ⊤ when one side says t
    and the other says f. This is the cellwise composition operator
    used by ``pyfars.runtime.belief`` to fold many witnesses' votes into
    a single cell-state: stacking evidence is monotone in knowledge,
    and contradiction surfaces explicitly as ⊤ (rather than silently
    overwriting one vote with the other).
    """
    return _JOIN_K[_INDEX[a]][_INDEX[b]]


def negate(v: BilatticeValue) -> BilatticeValue:
    """Belnap negation: t ↔ f; ⊥ and ⊤ are fixed.

    Truth-axis involution. The two contested/unknown states stay put
    because negation can flip a definite verdict but cannot turn
    "no info" into anything else, and cannot resolve a contradiction.
    """
    if v is BilatticeValue.TRUE:
        return BilatticeValue.FALSE
    if v is BilatticeValue.FALSE:
        return BilatticeValue.TRUE
    return v


def conflate(v: BilatticeValue) -> BilatticeValue:
    """Knowledge-axis involution: ⊥ ↔ ⊤; t and f fixed.

    Useful when reasoning about closed-world / open-world flips:
    interpreting "no info" as "contested" and vice versa.
    """
    if v is BilatticeValue.BOTTOM:
        return BilatticeValue.TOP
    if v is BilatticeValue.TOP:
        return BilatticeValue.BOTTOM
    return v


def leq_t(a: BilatticeValue, b: BilatticeValue) -> bool:
    """``a ≤_t b`` — true iff ``meet_t(a, b) == a`` (equivalently ``join_t = b``)."""
    return meet_t(a, b) is a


def leq_k(a: BilatticeValue, b: BilatticeValue) -> bool:
    """``a ≤_k b`` — true iff ``meet_k(a, b) == a``.

    The knowledge order encodes "b knows at least as much as a." The
    *dispatch-monotonicity* theorem (predication-categories) says
    sound dispatch decisions only ever move *up* in this order as
    evidence accumulates: a decision from a low-knowledge state
    cannot be retracted by adding evidence, only sharpened.
    """
    return meet_k(a, b) is a


# -- lifting (truth, evidence) ∈ [0, 1]² to a single witness's vote --


# The default thresholds for ``from_truth_evidence``. Pulled out as
# module-level constants so the few callers that want a different
# discipline (e.g. a stricter belief query for governance audit) can
# import and pass them rather than restating the literal.
EVIDENCE_THRESHOLD = 0.0
"""Default ``evidence_threshold`` for ``from_truth_evidence``.

A witness with ``evidence`` strictly less than or equal to this value
is treated as silent — it produces ⊥ no matter what its truth axis
says. The default is 0.0 (only literally-zero evidence is silent),
matching the convention that ``runtime.dispatch`` writes
``evidence=1.0`` on hard failure and that the witness constructor
defaults ``evidence=1.0``. Callers that want to discount weak hooks
can pass e.g. ``0.5`` to require above-half-confidence to vote.
"""

TRUTH_THRESHOLD = 0.5
"""Default ``truth_threshold`` for ``from_truth_evidence``.

Truth strictly above the threshold votes t; strictly below votes f;
exactly equal abstains as ⊥ (the witness is "agnostic" — it has
evidence but no truth-axis lean). The default is 0.5.
"""


def from_truth_evidence(
    truth: float,
    evidence: float,
    *,
    truth_threshold: float = TRUTH_THRESHOLD,
    evidence_threshold: float = EVIDENCE_THRESHOLD,
) -> BilatticeValue:
    """Lift a witness's ``(truth, evidence)`` pair to its FOUR vote.

    The mapping is the obvious rectangular partition of the unit square
    into the four FOUR-states:

      evidence ≤ ``evidence_threshold``    →  ⊥  (witness silent)
      evidence > t   and truth >  ``truth_threshold``  →  t
      evidence > t   and truth <  ``truth_threshold``  →  f
      evidence > t   and truth == ``truth_threshold``  →  ⊥  (agnostic)

    A single witness *cannot* vote ⊤ — ⊤ arises only at the cell level,
    when the knowledge-join over multiple witnesses' votes encounters
    one ``t`` and one ``f``. That distinction is structural: ``⊤`` is
    a property of the *cell*, not of any single observation.

    Out-of-range axes raise ``ValueError`` rather than silently
    clamping; the witness constructor enforces the same range, so a
    real ``Witness`` cannot reach this function with invalid axes.
    """
    if not (0.0 <= float(truth) <= 1.0):
        raise ValueError(f"truth={truth!r} out of range [0, 1]")
    if not (0.0 <= float(evidence) <= 1.0):
        raise ValueError(f"evidence={evidence!r} out of range [0, 1]")
    if evidence <= evidence_threshold:
        return BilatticeValue.BOTTOM
    if truth > truth_threshold:
        return BilatticeValue.TRUE
    if truth < truth_threshold:
        return BilatticeValue.FALSE
    return BilatticeValue.BOTTOM


__all__ = [
    "BilatticeValue",
    "EVIDENCE_THRESHOLD",
    "TRUTH_THRESHOLD",
    "conflate",
    "from_truth_evidence",
    "join_k",
    "join_t",
    "leq_k",
    "leq_t",
    "meet_k",
    "meet_t",
    "negate",
]
