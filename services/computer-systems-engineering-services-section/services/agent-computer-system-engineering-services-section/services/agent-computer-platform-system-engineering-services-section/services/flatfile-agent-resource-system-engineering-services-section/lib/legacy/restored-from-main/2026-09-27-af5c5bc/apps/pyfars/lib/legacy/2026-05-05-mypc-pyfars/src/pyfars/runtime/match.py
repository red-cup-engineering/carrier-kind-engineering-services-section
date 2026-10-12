"""Office-to-task matching by fiber composition (⊙) over predicate sets.

Implements the FARS dispatch-and-matching analysis: dispatch must
compute from *predicates*, not categories or keywords. Voyager
matches by description-fiber, RimWorld by per-work-type priority,
SWE-agent by tool-set constraint — every system that does dispatch
well computes it from properties. The synthesis: score each office's
predicate fiber against the task's predicate fiber via composition
``⊙`` (overlap visible) rather than restriction ``⇒`` (mismatch
washes out).

This module is the *matching* layer (which office *should* take this
task?). It sits underneath the *routing* layer in
``pyfars.runtime.dispatch`` (which handler runs for which predicate
slug?) — those are different responsibilities and intentionally not
fused. A typical flow:

    candidates = match_offices(task, group)
    chosen = candidates[0].office          # best fit
    table.dispatch(task.action, chosen, …) # route to handler

The matching is a pure function of the loaded ``Group`` and the
``TaskQuery``; no I/O, no witnesses. Witness emission belongs to
the caller (typically the dispatch CLI) so the matching can be
re-evaluated cheaply during a Voyager-style re-dispatch loop
without polluting the event log with intermediate scoring runs.

Scoring vocabulary (Hohfeldian fields on ``OfficeRecord``):

  may       — actions the office is privileged to perform
  must      — actions the office bears a duty to perform
  must_not  — actions the office is forbidden from performing

A task carries:

  requires  — predicates the doer must be able to perform
  forbids   — predicates the doer must NOT be willing to do
              (e.g. "leak-confidential-data" forbidden across the
              board, regardless of which office handles it)
  prefers   — predicates that boost score if the office bears them
              as a *duty* (must), reflecting RimWorld-style priority

The score on each office decomposes into four buckets:

  agreement  = |requires ∩ (office.may ∪ office.must)|     (⊤ ⊙ ⊤)
  conflict   = |requires ∩ office.must_not|
             + |forbids  ∩ permitted_clean|                (⊤ ⊙ ⊥)
             where permitted_clean = (office.may ∪ office.must)
                                       - office.must_not
             — must_not is authoritative when an office record is
             internally contradictory (X listed in both ``may`` and
             ``must_not``); a future validator should surface that
             contradiction, but the matcher treats the prohibition
             as binding so dispatch and authorization agree.
  duty_boost = |prefers  ∩ office.must|                    (RimWorld)
  silent     = |requires - office.may - office.must - office.must_not|
                                                           (⊥ ⊙ anything)

Ranking discipline (per the analysis's "⊙ exposes mismatch" point):

  1. ``conflict == 0`` partition first — any office in conflict on
     a required predicate or forbidden one is *eliminable*, even if
     it scores high on agreement. SWE-agent's "the constraint IS
     the dispatch" insight: the wrong agent can't do the action.
  2. Within the conflict-free partition, rank by descending
     ``agreement + duty_boost`` (the ⊤-side mass).
  3. Tiebreak by ascending ``silent`` (less "no opinion" = more
     fiber overlap, fewer surprises during execution).
  4. Final tiebreak: alphabetical by office slug, for determinism.

Conflicting offices are still returned (after the conflict-free
ones), so the caller can reason about *why* nothing matched and
whether to enrich the task and re-match (Voyager pattern).
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Optional

from pyfars.runtime.group import Group, OfficeRecord


@dataclass(frozen=True)
class TaskQuery:
    """The task side of a match — pure predicate sets, no semantics
    about the wider corpus.

    A caller composing a TaskQuery from a corpus task record reads
    the task's ``requires:`` / ``forbids:`` / ``prefers:`` frontmatter
    fields directly. The match doesn't care where the predicates
    came from, only that they're stable slugs the office records
    use the same way.

    ``slug`` is informational — it travels into the MatchScore so
    callers can correlate scores back to the originating task.
    """
    slug: str = ""
    requires: frozenset[str] = field(default_factory=frozenset)
    forbids: frozenset[str] = field(default_factory=frozenset)
    prefers: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class MatchScore:
    """One office's score against one TaskQuery.

    Carries the four bucket counts plus the conflict / agreement
    *details* — the actual predicate slugs in each bucket — so a
    caller debugging a non-match can see exactly which predicate
    blocked the office, not just the count.

    ``rank_key`` is what the sort uses; it's exposed so callers can
    test sort stability. Lower is better.
    """
    office: OfficeRecord
    task_slug: str
    agreement: int
    conflict: int
    duty_boost: int
    silent: int
    agreement_predicates: frozenset[str]
    conflict_predicates: frozenset[str]
    duty_boost_predicates: frozenset[str]

    @property
    def is_eligible(self) -> bool:
        """True iff the office has zero conflicts on the task's
        required-or-forbidden predicates. The hard filter."""
        return self.conflict == 0

    @property
    def positive_score(self) -> int:
        """Agreement + duty boost — the ⊤-side mass of the
        composition. Higher is better."""
        return self.agreement + self.duty_boost

    @property
    def rank_key(self) -> tuple[int, int, int, str]:
        """Sort key (lower wins): conflict-bucket first (0 then 1),
        then descending positive_score, then ascending silent, then
        slug for determinism."""
        return (
            0 if self.is_eligible else 1,
            -self.positive_score,
            self.silent,
            self.office.slug,
        )

    def explain(self) -> str:
        """One-line human-readable summary of the score breakdown."""
        verdict = "eligible" if self.is_eligible else "CONFLICT"
        return (f"{self.office.slug} [{verdict}] "
                f"agree={self.agreement} duty+={self.duty_boost} "
                f"silent={self.silent} conflict={self.conflict}")


def score_office(office: OfficeRecord, task: TaskQuery) -> MatchScore:
    """Compute one office's MatchScore against one TaskQuery.

    Pure function. Set algebra over the office's may/must/must-not
    and the task's requires/forbids/prefers. The four buckets are
    disjoint by construction (a predicate that's both ``may`` and
    ``must_not`` would mean the office record itself is internally
    contradictory; we treat ``must_not`` as authoritative because
    a forbid is a stronger declaration than a permit, but a future
    validator should surface that case).
    """
    permitted = office.may | office.must
    # must_not wins over may/must when both contain a predicate (a
    # contradiction in the office record; the conservative reading
    # is that the prohibition stands).
    permitted_clean = permitted - office.must_not

    agreement_preds = task.requires & permitted_clean
    # Two ways to conflict: required action is forbidden, or
    # forbidden action is permitted/required by the office.
    req_blocked = task.requires & office.must_not
    forbid_offered = task.forbids & permitted_clean
    conflict_preds = req_blocked | forbid_offered

    duty_boost_preds = task.prefers & office.must
    silent = len(task.requires - permitted_clean - office.must_not)

    return MatchScore(
        office=office,
        task_slug=task.slug,
        agreement=len(agreement_preds),
        conflict=len(conflict_preds),
        duty_boost=len(duty_boost_preds),
        silent=silent,
        agreement_predicates=frozenset(agreement_preds),
        conflict_predicates=frozenset(conflict_preds),
        duty_boost_predicates=frozenset(duty_boost_preds),
    )


def match_offices(task: TaskQuery, offices: Iterable[OfficeRecord],
                  *, include_conflicts: bool = True,
                  include_silent: bool = True) -> list[MatchScore]:
    """Score every office against the task and return the ranked list.

    Ordering is the four-tier ``rank_key``: eligible-first, then
    descending positive score, then ascending silent, then slug.

    Filters:
      include_conflicts — when False, drop ineligible (conflict>0)
        offices entirely. Useful for "show me only the offices I
        could actually dispatch to" listings.
      include_silent — when False, drop offices that scored zero
        across all of agreement/conflict/duty_boost — they have no
        opinion at all on the task and clutter the report.
    """
    scores = [score_office(o, task) for o in offices]
    if not include_conflicts:
        scores = [s for s in scores if s.is_eligible]
    if not include_silent:
        scores = [s for s in scores
                  if s.agreement or s.conflict or s.duty_boost]
    scores.sort(key=lambda s: s.rank_key)
    return scores


def best_office(task: TaskQuery,
                offices: Iterable[OfficeRecord]) -> Optional[OfficeRecord]:
    """The single best office for the task, or None if no eligible
    office scored anything. Convenience wrapper for the common case.

    "No eligible office scored anything" specifically means: every
    office is either ineligible (conflict>0) OR has zero positive
    score (silent across all required predicates). Returning None
    in that case is the Voyager re-dispatch trigger — the caller
    should enrich the task with failure context and re-match.
    """
    ranked = match_offices(task, offices, include_conflicts=False,
                           include_silent=False)
    if not ranked or ranked[0].positive_score == 0:
        return None
    return ranked[0].office


def match_offices_in_group(task: TaskQuery, group: Group, *,
                           ship_slug: Optional[str] = None,
                           **kwargs) -> list[MatchScore]:
    """Match restricted to a Group's offices, optionally narrowed
    further to a specific ship's embarked crew.

    The ship-narrowing is the natural composition with the
    governance layer: a task issued via ``command(group, ship,
    action, …)`` should be matched only against offices embarked
    on that ship, not against the whole polity. This mirrors the
    crew-membership authorization gate in ``pyfars.runtime.group.command``
    so dispatch and authorization agree on "who's on this ship."

    When ``ship_slug`` is None the candidate pool is every office
    in the group.
    """
    if ship_slug is None:
        candidates: Iterable[OfficeRecord] = group.offices.values()
    else:
        ship = group.ship(ship_slug)
        if ship.crewed_by_offices:
            candidates = [group.offices[s] for s in ship.crewed_by_offices
                          if s in group.offices]
        else:
            # Bootstrap state: ship has no enumerated crew yet —
            # fall back to the whole polity, matching the auth gate.
            candidates = group.offices.values()
    return match_offices(task, candidates, **kwargs)


def enrich_for_redispatch(task: TaskQuery, *,
                          drop_requires: Iterable[str] = (),
                          add_requires: Iterable[str] = (),
                          add_prefers: Iterable[str] = ()) -> TaskQuery:
    """Voyager-style re-dispatch: enrich the task with what the
    failed first attempt taught us, then re-match.

    The classic Voyager loop: first match returns no eligible
    office (or the chosen one fails); re-match with the failure
    context folded into the query (drop a require that proved
    unmeetable, add a require that the failure mode demanded,
    boost preference for offices that have shown competence on
    related predicates).

    Returns a new TaskQuery; the input is untouched (TaskQuery is
    frozen). Conflict-with-itself (e.g. a predicate dropped from
    ``requires`` and added back) is not specifically prevented —
    callers building the enrichment from a learning loop are
    expected to know what they're asking for.
    """
    new_requires = (task.requires - frozenset(drop_requires)
                    ) | frozenset(add_requires)
    new_prefers = task.prefers | frozenset(add_prefers)
    return TaskQuery(
        slug=task.slug,
        requires=new_requires,
        forbids=task.forbids,
        prefers=new_prefers,
    )
