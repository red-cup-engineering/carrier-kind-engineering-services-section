"""Cellwise belief query: fold an event log's witnesses into a FOUR cell-state.

Round 13 / WOAH #1, runtime half. The substrate ``bilattice`` module
gives us the algebra; this module *applies* it: a "belief cell" is
identified by ``(target, attribute)``; its value is the knowledge-join
``join_k`` over the FOUR votes of every witness whose ``target`` (and,
optionally, ``details["key"]``) matches the cell key.

Why ``join_k`` and not ``meet_k``: ``join_k`` is the monotone
"combine-all" composition. Stacking witnesses can only *grow* the
cell's knowledge, never shrink it; contradictions surface as ⊤ rather
than silently overwriting one vote with the other. This is exactly the
property the *dispatch-monotonicity* and *closure-as-Fitting-fixpoint*
theorems require of cellwise belief assembly.

The query is intentionally read-only over the event log — it does not
mutate, does not write its own witness. The caller (a ``pyfars belief``
CLI verb, a future closure-rule engine, a federation merge, an audit)
gets back a ``BeliefCell`` carrying the four-valued state, the
witnesses that contributed, and a per-vote breakdown.

Cell key conventions:

  - ``target`` is the path string, exactly as the witness records it.
    No normalization beyond literal equality (the witness producer is
    canonical for the path it writes).

  - ``attribute`` is optional. When ``None``, the cell is "the whole
    target," and *every* witness whose ``target`` matches contributes.
    When set to a string ``K``, only witnesses whose ``details["key"]``
    equals ``K`` contribute — the convention the ``fm_*`` operators
    already follow. Other operators that touch only one attribute
    should populate ``details["key"]`` similarly; until they do, an
    attribute-scoped query just sees nothing from them, which is the
    correct conservative behavior.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

from pyfars.operator.witness import Witness
from pyfars.runtime.event_log import EventLog
from pyfars.substrate.bilattice import (
    EVIDENCE_THRESHOLD,
    TRUTH_THRESHOLD,
    BilatticeValue,
    from_truth_evidence,
    join_k,
)


@dataclass(frozen=True)
class BeliefVote:
    """One witness's contribution to a belief cell.

    Carries both the FOUR vote (the discrete state this witness alone
    would induce) and the original ``(truth, evidence)`` pair so
    consumers can render confidence breakdowns or re-fold under a
    different threshold without re-reading the log.
    """

    witness: Witness
    vote: BilatticeValue
    truth: float
    evidence: float


@dataclass(frozen=True)
class BeliefCell:
    """The four-valued state of one ``(target, attribute)`` cell.

    ``value`` is the knowledge-join over every contributing vote;
    ``votes`` is the chronologically-ordered list of contributions
    (the source witnesses still attached so audits can replay).

    Convenience predicates ``is_consistent`` (no contradiction) and
    ``is_settled`` (knowledge has accumulated past ⊥) let callers
    branch without re-deriving from ``value``.
    """

    target: str
    attribute: str | None
    value: BilatticeValue
    votes: tuple[BeliefVote, ...] = field(default_factory=tuple)

    @property
    def is_consistent(self) -> bool:
        """True iff no witness contradicts another (``value != ⊤``)."""
        return self.value is not BilatticeValue.TOP

    @property
    def is_settled(self) -> bool:
        """True iff at least one witness produced a non-⊥ vote.

        Equivalent to ``value != ⊥``. Note that ⊤ counts as settled —
        the cell *has* knowledge, just contradictory knowledge.
        """
        return self.value is not BilatticeValue.BOTTOM

    @property
    def supporting(self) -> tuple[BeliefVote, ...]:
        """Votes that backed the *truth* side (``vote == t``)."""
        return tuple(v for v in self.votes if v.vote is BilatticeValue.TRUE)

    @property
    def opposing(self) -> tuple[BeliefVote, ...]:
        """Votes that backed the *false* side (``vote == f``)."""
        return tuple(v for v in self.votes if v.vote is BilatticeValue.FALSE)


def _cell_match(
    w: Witness, target: str, attribute: str | None,
) -> bool:
    """Cell-key predicate: target equality, plus attribute scoping."""
    if w.target != target:
        return False
    if attribute is None:
        return True
    # Attribute-scoped: only witnesses that carry an explicit
    # ``details.key`` matching the requested attribute contribute.
    # Operators that touch the whole target stay out of an attribute-
    # scoped query — exactly what the conservative reading wants.
    return w.details.get("key") == attribute


def fold_witnesses(
    witnesses: Iterable[Witness],
    *,
    target: str,
    attribute: str | None = None,
    truth_threshold: float = TRUTH_THRESHOLD,
    evidence_threshold: float = EVIDENCE_THRESHOLD,
) -> BeliefCell:
    """Fold a witness stream into the FOUR state of one cell.

    Pure: takes any iterable of witnesses (no event-log dependency),
    matches by cell key, lifts each match to a vote via
    ``from_truth_evidence``, and reduces by ``join_k``. Used directly
    by tests and by federation-merge code paths that work over
    in-memory witness sequences (see WOAH #3).
    """
    votes: list[BeliefVote] = []
    folded: BilatticeValue = BilatticeValue.BOTTOM
    for w in witnesses:
        if not _cell_match(w, target, attribute):
            continue
        vote = from_truth_evidence(
            w.truth, w.evidence,
            truth_threshold=truth_threshold,
            evidence_threshold=evidence_threshold,
        )
        votes.append(BeliefVote(witness=w, vote=vote,
                                truth=w.truth, evidence=w.evidence))
        folded = join_k(folded, vote)
    return BeliefCell(target=target, attribute=attribute,
                      value=folded, votes=tuple(votes))


def belief(
    log: EventLog,
    target: str,
    *,
    attribute: str | None = None,
    channel: str | Iterable[str] | None = None,
    kind: str | Iterable[str] | None = None,
    truth_threshold: float = TRUTH_THRESHOLD,
    evidence_threshold: float = EVIDENCE_THRESHOLD,
) -> BeliefCell:
    """Compute the belief cell ``(target, attribute)`` over an event log.

    Thin convenience wrapper around ``fold_witnesses`` that pulls
    witnesses from the log and lets callers narrow by ``channel`` (the
    same channel-filter the rest of the runtime uses, so e.g. an
    auditor can ask for the cell-state restricted to the
    ``"governance"`` channel without seeing routine substrate noise)
    or by ``kind`` (Round 14 / WOAH #5 — restrict to one of the seven
    AOP operation-kinds, e.g. ``kind="learning"`` to see only what
    the platform's self-modification operations have asserted).
    """
    return fold_witnesses(
        log.read_all(channel=channel, kind=kind),
        target=target,
        attribute=attribute,
        truth_threshold=truth_threshold,
        evidence_threshold=evidence_threshold,
    )


__all__ = [
    "BeliefCell",
    "BeliefVote",
    "belief",
    "fold_witnesses",
]
