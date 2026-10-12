"""Promote operator and the settlement-path record types — Round 18 / WOAH #4.

This module is FARS's substrate-level realization of the
``promote-is-strictly-cost-reducing`` theorem (AOP): the operator
that advances substrate content one stage along the settlement path
*observation → instinct → skill → tool*, with the parallel work-item
arc *idea → plan*. The operator's discipline pins three engineering
properties from the theorem:

  1. **Strict cost-reduction at each successful promotion.** A
     promotion that would not strictly reduce per-invocation cost is
     a promotion that does not satisfy the admission gate; it
     produces a rejection, not a promoted record. The
     ``per_invocation_cost`` field on each record is the substrate-
     level handle on this — the layer floors (``LAYER_COST_CEILING``)
     are enforced at construction; any candidate promoted record
     whose cost is not strictly below its source's is refused.

  2. **Chain termination in at most three successful promotes.** The
     four formality layers ``F0..F3`` are exhaustive; promote applied
     to a tool-layer record returns ``Rejected`` with reason
     ``"no-target-stage"``. Stage-skips
     (``promote(observation, target=skill)``) likewise reject with
     ``"stage-skip-not-allowed"`` — the chain progresses one layer
     at a time, by construction.

  3. **Rejection-witness as informative diagnostic.** Every
     ``Rejected`` outcome carries a structured ``reason`` (one of
     ``REJECTION_REASONS``) plus the missing-condition details (gap
     to threshold, count below window, body still inference-bearing).
     Auditors can use the rejection witness to identify what
     evidence is needed for the next attempt.

What *is* in this round (the operator + admission algebra):

  - ``ObservationRecord`` (F0), ``InstinctRecord`` (F1),
    ``SkillRecord`` (F2), ``ToolRecord`` (F3) — the four settlement-
    path record types as immutable, content-addressed dataclasses.
    Each carries a ``derived_from: tuple[str, ...]`` of canonical
    SHA-256 hashes citing source records (preserving provenance per
    the morphism's "Source citations preserved" invariant).

  - ``IdeaRecord`` and ``PlanRecord`` — the parallel work-item arc
    (per ``idea-record`` / ``plan-record`` AOP definitions). The
    same admission discipline applies: idea → plan succeeds when
    the idea has accumulated enough motivation evidence and a
    substrate-statable goal.

  - ``promote(source_records, target_stage, *, scope, ...)`` — the
    operator. Returns ``PromoteOutcome`` (``Promoted`` or
    ``Rejected``). All paths emit a witness on the ``"learning"``
    channel via the optional ``EventLog``; the kind is
    ``"learning"`` per the channel discipline (consolidation /
    promotion is self-modification of the substrate's matured
    content).

  - Five new operators registered with ``OPERATOR_KIND`` (all
    ``learning``):
      * ``promote_observation_to_instinct``
      * ``promote_instinct_to_skill``
      * ``promote_skill_to_tool``
      * ``promote_idea_to_plan``
      * ``promote_rejected``

  - ``PromoteSubstrate`` — an in-memory store of the produced
    records, with ``promote_chain`` for traversing provenance back
    from any record to its founding observations.

What is **deferred to a later round** (and why this scope cut is OK):

  - Body-reducibility verification for F2→F3. The theorem requires
    that a promoted tool's body is reducible to substrate-only
    operations (no inference-bearing skill-invocations remain). This
    round takes ``body_reducible: bool`` as a caller-asserted field
    on ``SkillRecord`` — the operator gates on the assertion, but
    does not synthesize the verification. The verification itself is
    a static-analysis pass over the skill's body predications; it
    composes naturally with the operator (the analysis pass would
    flip the bool, then promote would admit) and is cleaner as a
    separate operator (``verify_skill_reducible``) in a future round.

  - Pattern-stability synthesis for F0→F1. The morphism doc allows
    instinct initialization from "the count and consistency of the
    source observations" — this round implements exactly that: ≥N
    observations sharing a ``pattern_key`` admits promotion, with
    the new instinct's confidence initialized to the count-based
    measure. Higher-fidelity reflection-rule synthesis (deriving
    pattern + trigger + diagnosed-cause from observation bodies via
    closure-rule application) is a learning-channel rule run via
    ``settle``; the operator here is the substrate-edit primitive
    that the rule would invoke.

  - Confidence-as-closure-fixpoint-measure. Per
    ``instinct-confidence-is-closure-fixpoint-measure`` the proper
    confidence assessment is "applying the consolidation operator
    produces no further change at that pattern" — i.e. closure-
    measure under further training. This round uses a count-derived
    scalar in [0, 1] and a caller-supplied threshold; the closure-
    measure assessment is a settle composition that produces the
    confidence value, which then feeds this operator's gate.

References:
  AOP: morphisms / promote
  AOP: theorems / promote-is-strictly-cost-reducing
  AOP: theorems / settlement-path-cost-monotonicity
  AOP: concepts / settlement-path
  AOP: concepts / formality-layer
  AOP: objects / idea-record, plan-record
  AOP / FARS: concepts / consolidation-as-settlement
  AOP / FARS: concepts / three-tier-memory
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from typing import Any, Iterable, Literal, Mapping

from pyfars.operator.witness import make_witness
from pyfars.runtime.event_log import EventLog


FormalityLayer = Literal["F0", "F1", "F2", "F3"]
"""The four formality layers (per ``formality-layer`` AOP).

  - ``F0`` — observation: full inference per invocation.
  - ``F1`` — instinct: inference with structured prior.
  - ``F2`` — skill: structured procedure with bounded model use.
  - ``F3`` — tool: deterministic procedure with no inference.

The layers are exhaustive; there is no F4. Promote on an F3 record
returns ``Rejected`` with reason ``"no-target-stage"``.
"""

FORMALITY_LAYERS: tuple[FormalityLayer, ...] = ("F0", "F1", "F2", "F3")
"""Canonical iteration order over the four layers."""


TargetStage = Literal["instinct", "skill", "tool", "plan"]
"""The named target stage accepted by ``promote``.

The first three are settlement-path stages
(F1, F2, F3 respectively); ``"plan"`` is the work-item-arc target
(idea → plan, per ``idea-record`` / ``plan-record`` AOP).
"""


# Per-layer per-invocation cost ceilings. The values are abstract
# (unit-free); the discipline pinned is the strict per-layer ordering
#
#     LAYER_COST_CEILING[F0] > [F1] > [F2] > [F3] > 0
#
# Per ``settlement-path-cost-monotonicity``, a promoted record's
# per-invocation cost is bounded above by the target layer's ceiling
# AND must be strictly less than the source record's cost. The
# operator enforces both: any candidate promoted record built with a
# cost above its layer ceiling is rejected at construction; any
# candidate whose cost is not strictly below its source's is rejected
# by the admission gate. The numeric values here calibrate the
# default cost a record gets when the caller does not specify one;
# realizations may override per-record costs but cannot exceed the
# layer ceiling.
LAYER_COST_CEILING: dict[FormalityLayer, float] = {
    "F0": 1.0,
    "F1": 0.5,
    "F2": 0.2,
    "F3": 0.05,
}


# Map each settlement-path target-stage to its formality layer.
# (``"plan"`` is the work-item-arc target and is *not* a formality-
# layer transition — plans and ideas live alongside the four layers
# but the strict-cost-reduction theorem applies to the settlement
# path proper. The plan path enforces a parallel structural gate.)
TARGET_STAGE_LAYER: dict[TargetStage, FormalityLayer | None] = {
    "instinct": "F1",
    "skill": "F2",
    "tool": "F3",
    "plan": None,
}


# The valid (source-layer, target-stage) progressions. Stage-skips
# (``observation → skill``, ``instinct → tool``) are refused — the
# chain progresses one layer at a time per the morphism's "Promote
# proceeds in four phases per the target stage" discipline. Each
# phase has its own admission gate; skipping a phase would skip the
# corresponding evidence accumulation.
VALID_TRANSITIONS: dict[FormalityLayer, TargetStage] = {
    "F0": "instinct",
    "F1": "skill",
    "F2": "tool",
}


RejectionReason = Literal[
    "insufficient-observations",
    "low-confidence",
    "body-not-reducible",
    "no-target-stage",
    "stage-skip-not-allowed",
    "source-records-empty",
    "source-records-heterogeneous",
    "cost-not-strictly-reduced",
    "missing-goal",
    "insufficient-motivation",
]
"""The structured rejection reasons.

Each reason corresponds to one missing condition the auditor can
use to identify what evidence the source records would need to
admit a future promotion attempt:

  - ``"insufficient-observations"`` — F0→F1: fewer than the
    threshold ``N`` observations share the pattern key.
  - ``"low-confidence"`` — F1→F2: the instinct's ``confidence`` is
    below the declared promotion threshold.
  - ``"body-not-reducible"`` — F2→F3: the skill's
    ``body_reducible`` is False; inference-bearing operations
    remain in the body.
  - ``"no-target-stage"`` — promote on an F3 (tool) record; the
    chain has reached its terminal layer per ``promote-is-strictly-
    cost-reducing`` "termination in at most three steps."
  - ``"stage-skip-not-allowed"`` — the requested target_stage is
    not the next layer above the source's layer.
  - ``"source-records-empty"`` — caller passed an empty source set.
  - ``"source-records-heterogeneous"`` — source records are not
    all at the same formality layer or do not share the required
    pattern key.
  - ``"cost-not-strictly-reduced"`` — the candidate promoted
    record's per-invocation cost is not strictly less than the
    source's. The theorem's strict-inequality clause; the operator
    refuses to register a no-cost-improvement promotion.
  - ``"missing-goal"`` — idea→plan: idea lacks the substrate-
    statable goal that ``plan-record`` requires.
  - ``"insufficient-motivation"`` — idea→plan: idea has fewer than
    the threshold ``N`` motivation predications.
"""

REJECTION_REASONS: tuple[RejectionReason, ...] = (
    "insufficient-observations",
    "low-confidence",
    "body-not-reducible",
    "no-target-stage",
    "stage-skip-not-allowed",
    "source-records-empty",
    "source-records-heterogeneous",
    "cost-not-strictly-reduced",
    "missing-goal",
    "insufficient-motivation",
)


# ---------------------------------------------------------------------------
# Record types — settlement-path arc (F0..F3)
# ---------------------------------------------------------------------------


def _record_hash(record: "PromotableRecord") -> str:
    """Canonical SHA-256 over the record's wire-form fields.

    The hash is computed over the record's ``to_dict()`` minus the
    ``record_id`` field (so the id can be derived from the hash
    without circularity). Used for ``derived_from`` provenance
    citations and for the witness's ``after_hash``.
    """
    d = record.to_dict()
    d.pop("record_id", None)
    canonical = json.dumps(d, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ObservationRecord:
    """F0 substrate entity recording what happened.

    Per ``observation-record`` (AOP / FARS), an observation has
    *what-happened* predications and carries no claim about why or
    what to do. The ``pattern_key`` is the predicate the substrate's
    reflection rule matches on when consolidating observations into
    an instinct — observations sharing a pattern key are candidates
    for the same instinct.
    """

    record_id: str
    pattern_key: str
    content: Mapping[str, Any] = field(default_factory=dict)
    per_invocation_cost: float = LAYER_COST_CEILING["F0"]
    formality_layer: FormalityLayer = "F0"

    def __post_init__(self) -> None:
        _enforce_layer_cost(self.formality_layer, self.per_invocation_cost)
        if self.formality_layer != "F0":
            raise ValueError(
                f"ObservationRecord must be at F0; got {self.formality_layer!r}"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "observation",
            "pattern_key": self.pattern_key,
            "content": dict(self.content),
            "per_invocation_cost": self.per_invocation_cost,
            "formality_layer": self.formality_layer,
        }


@dataclass(frozen=True)
class InstinctRecord:
    """F1 substrate entity: pattern + trigger + suggested-response.

    Per ``instinct-record`` (AOP / FARS), an instinct is what
    reflection-on-observation produces: the pattern is named, the
    trigger is specified, the cause is recorded. ``confidence`` is
    the value-domain measure of how well-settled the instinct is;
    promotion to skill gates on ``confidence >= threshold``.
    """

    record_id: str
    pattern: str
    trigger: str
    suggested_response: str
    derived_from: tuple[str, ...]
    confidence: float
    per_invocation_cost: float = LAYER_COST_CEILING["F1"]
    formality_layer: FormalityLayer = "F1"

    def __post_init__(self) -> None:
        _enforce_layer_cost(self.formality_layer, self.per_invocation_cost)
        if self.formality_layer != "F1":
            raise ValueError(
                f"InstinctRecord must be at F1; got {self.formality_layer!r}"
            )
        if not (0.0 <= float(self.confidence) <= 1.0):
            raise ValueError(
                f"InstinctRecord.confidence={self.confidence!r} out of range "
                f"[0, 1]"
            )
        if not self.derived_from:
            raise ValueError(
                "InstinctRecord must cite at least one source observation "
                "via derived_from"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "instinct",
            "pattern": self.pattern,
            "trigger": self.trigger,
            "suggested_response": self.suggested_response,
            "derived_from": list(self.derived_from),
            "confidence": self.confidence,
            "per_invocation_cost": self.per_invocation_cost,
            "formality_layer": self.formality_layer,
        }


@dataclass(frozen=True)
class SkillRecord:
    """F2 substrate entity: structured procedure with bounded model use.

    Per ``skill-record`` (AOP), a skill carries preconditions, a
    body, and postconditions — a procedure the substrate dispatches
    deterministically for the structurally-determined steps,
    invoking the model only for steps that genuinely require natural-
    language interpretation. ``body_reducible`` is the caller-
    asserted predicate that gates promotion to tool: True iff the
    body has no inference-bearing skill-invocations remaining.
    """

    record_id: str
    preconditions: tuple[str, ...]
    body: tuple[str, ...]
    postconditions: tuple[str, ...]
    derived_from: tuple[str, ...]
    body_reducible: bool = False
    per_invocation_cost: float = LAYER_COST_CEILING["F2"]
    formality_layer: FormalityLayer = "F2"

    def __post_init__(self) -> None:
        _enforce_layer_cost(self.formality_layer, self.per_invocation_cost)
        if self.formality_layer != "F2":
            raise ValueError(
                f"SkillRecord must be at F2; got {self.formality_layer!r}"
            )
        if not self.derived_from:
            raise ValueError(
                "SkillRecord must cite at least one source instinct "
                "via derived_from"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "skill",
            "preconditions": list(self.preconditions),
            "body": list(self.body),
            "postconditions": list(self.postconditions),
            "derived_from": list(self.derived_from),
            "body_reducible": self.body_reducible,
            "per_invocation_cost": self.per_invocation_cost,
            "formality_layer": self.formality_layer,
        }


@dataclass(frozen=True)
class ToolRecord:
    """F3 substrate entity: deterministic procedure with no inference.

    Per ``tool`` in the settlement-path concept, a tool is a closure-
    rule application or composed substrate operator that performs
    work without invoking the model. ``per_invocation_cost`` is
    bounded by the substrate's per-operation overhead (the layer
    floor); the strict-regime engineering envelope makes this the
    cheapest possible per-invocation cost for the operation.
    """

    record_id: str
    body: tuple[str, ...]
    derived_from: tuple[str, ...]
    per_invocation_cost: float = LAYER_COST_CEILING["F3"]
    formality_layer: FormalityLayer = "F3"

    def __post_init__(self) -> None:
        _enforce_layer_cost(self.formality_layer, self.per_invocation_cost)
        if self.formality_layer != "F3":
            raise ValueError(
                f"ToolRecord must be at F3; got {self.formality_layer!r}"
            )
        if not self.derived_from:
            raise ValueError(
                "ToolRecord must cite at least one source skill "
                "via derived_from"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "tool",
            "body": list(self.body),
            "derived_from": list(self.derived_from),
            "per_invocation_cost": self.per_invocation_cost,
            "formality_layer": self.formality_layer,
        }


# ---------------------------------------------------------------------------
# Record types — work-item arc (idea / plan)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class IdeaRecord:
    """Work-item-arc substrate entity: uncommitted potential work.

    Per ``idea-record`` (AOP), an idea is a candidate; a plan is a
    commitment. ``motivation`` predications cite substrate content
    declaring why the idea is worth considering; promotion to plan
    gates on the motivation count meeting a threshold AND a
    substrate-statable goal being declarable.
    """

    record_id: str
    description: str
    motivation: tuple[str, ...] = ()
    proposed_by: str | None = None
    derived_from: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "idea",
            "description": self.description,
            "motivation": list(self.motivation),
            "proposed_by": self.proposed_by,
            "derived_from": list(self.derived_from),
        }


@dataclass(frozen=True)
class PlanRecord:
    """Work-item-arc substrate entity: committed-but-unexecuted work.

    Per ``plan-record`` (AOP), a plan declares what will be done.
    ``goal`` is the substrate-statable predication; ``definition_of_done``
    is the substrate-checkable predicate. ``promoted_from`` cites
    the source idea by its canonical hash, preserving provenance.
    """

    record_id: str
    description: str
    goal: str
    definition_of_done: str
    promoted_from: str
    assigned_to: str | None = None
    status: str = "proposed"

    def __post_init__(self) -> None:
        if not self.goal:
            raise ValueError(
                "PlanRecord.goal must be substrate-statable; "
                "empty goal is non-conformant"
            )
        if not self.definition_of_done:
            raise ValueError(
                "PlanRecord.definition_of_done must be checkable; "
                "empty definition is non-conformant"
            )

    def to_dict(self) -> dict[str, Any]:
        return {
            "record_id": self.record_id,
            "kind": "plan",
            "description": self.description,
            "goal": self.goal,
            "definition_of_done": self.definition_of_done,
            "promoted_from": self.promoted_from,
            "assigned_to": self.assigned_to,
            "status": self.status,
        }


# Type alias for the union of records that participate in the
# settlement-path strict-cost-reduction discipline.
PromotableRecord = (
    ObservationRecord | InstinctRecord | SkillRecord | ToolRecord
)


def _enforce_layer_cost(layer: FormalityLayer, cost: float) -> None:
    """Guard: per-invocation cost must lie in ``(0, layer_ceiling]``.

    Records constructed above the layer ceiling would violate the
    settlement-path-cost-monotonicity ordering on subsequent
    promotion attempts (the operator's strict-cost gate compares
    against the source's cost, and the layer ceiling is the upper
    bound on what the layer admits). Caught at record construction
    so the violation is loud at the point of origin, not later in
    the operator.
    """
    ceiling = LAYER_COST_CEILING[layer]
    if not (0.0 < float(cost) <= ceiling):
        raise ValueError(
            f"per_invocation_cost={cost!r} for layer {layer} must lie in "
            f"(0, {ceiling}] (the layer's cost ceiling)"
        )


# ---------------------------------------------------------------------------
# Promotion outcome
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Promoted:
    """A successful promotion: the new record + its provenance hash.

    ``record`` is the freshly-constructed target-stage entity.
    ``derivation_hash`` is the ``_record_hash`` of the new record,
    suitable for downstream ``derived_from`` citation. ``operator``
    names the ``OPERATOR_KIND``-registered promote operator that
    produced this record (one of the four ``promote_*_to_*`` names).
    """

    record: PromotableRecord | PlanRecord
    derivation_hash: str
    operator: str


@dataclass(frozen=True)
class Rejected:
    """A refused promotion: the structured reason + missing-condition details.

    ``reason`` is one of ``REJECTION_REASONS`` and is what auditors
    consume to identify what evidence the source records would need
    to admit a future attempt. ``details`` carries the missing-
    condition specifics (gap-to-threshold, count-below-window, etc.)
    """

    reason: RejectionReason
    details: Mapping[str, Any] = field(default_factory=dict)


PromoteOutcome = Promoted | Rejected


# ---------------------------------------------------------------------------
# Operator
# ---------------------------------------------------------------------------


_TARGET_TO_OPERATOR: dict[TargetStage, str] = {
    "instinct": "promote_observation_to_instinct",
    "skill": "promote_instinct_to_skill",
    "tool": "promote_skill_to_tool",
    "plan": "promote_idea_to_plan",
}


def promote(
    source_records: Iterable[Any],
    target_stage: TargetStage,
    *,
    scope: str,
    new_record_id: str,
    observation_threshold: int = 3,
    confidence_threshold: float = 0.75,
    motivation_threshold: int = 1,
    plan_overrides: Mapping[str, Any] | None = None,
    skill_overrides: Mapping[str, Any] | None = None,
    tool_overrides: Mapping[str, Any] | None = None,
    instinct_overrides: Mapping[str, Any] | None = None,
    event_log: EventLog | None = None,
    agent: str | None = None,
    origin: str | None = None,
) -> PromoteOutcome:
    """The promote operator.

    Per ``morphisms / promote`` (AOP): advance substrate content one
    stage along the settlement path (or one step along the work-item
    arc, when ``target_stage="plan"``). Returns ``Promoted`` on a
    successful admission, ``Rejected`` on any failed admission gate.
    Both outcomes emit a witness on the ``"learning"`` channel via
    ``event_log`` if provided.

    The operator dispatches on ``target_stage`` to one of four
    transition handlers:

      - ``"instinct"`` (F0→F1): expects ``ObservationRecord``s
        sharing a ``pattern_key``; gates on count ≥
        ``observation_threshold``.
      - ``"skill"`` (F1→F2): expects exactly one ``InstinctRecord``;
        gates on ``confidence >= confidence_threshold``.
      - ``"tool"`` (F2→F3): expects exactly one ``SkillRecord``;
        gates on ``body_reducible == True``.
      - ``"plan"`` (work-item arc): expects exactly one
        ``IdeaRecord``; gates on
        ``len(motivation) >= motivation_threshold`` and a goal
        being declarable via ``plan_overrides``.

    The strict-cost-reduction discipline (per ``promote-is-
    strictly-cost-reducing``) is enforced *after* the per-stage
    admission gate fires: the candidate promoted record's
    ``per_invocation_cost`` must be strictly less than every source
    record's cost; otherwise rejection with reason
    ``"cost-not-strictly-reduced"``. This catches misconfigured
    overrides that would silently violate the theorem.

    The ``*_overrides`` parameters let callers seed target-stage
    fields the operator cannot synthesize from sources alone (e.g.
    a skill's preconditions, a plan's goal). Each defaults to an
    empty mapping; missing required fields produce a structured
    rejection.
    """
    sources = list(source_records)

    # Stage-independent guards.
    if not sources:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-empty",
            details={"target_stage": target_stage},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Dispatch on target stage. Each handler returns ``PromoteOutcome``
    # and is responsible for its own admission gate, cost-reduction
    # check, and witness emission on success.
    if target_stage == "instinct":
        return _promote_to_instinct(
            sources,
            scope=scope,
            new_record_id=new_record_id,
            observation_threshold=observation_threshold,
            instinct_overrides=instinct_overrides or {},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )
    if target_stage == "skill":
        return _promote_to_skill(
            sources,
            scope=scope,
            new_record_id=new_record_id,
            confidence_threshold=confidence_threshold,
            skill_overrides=skill_overrides or {},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )
    if target_stage == "tool":
        return _promote_to_tool(
            sources,
            scope=scope,
            new_record_id=new_record_id,
            tool_overrides=tool_overrides or {},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )
    if target_stage == "plan":
        return _promote_to_plan(
            sources,
            scope=scope,
            new_record_id=new_record_id,
            motivation_threshold=motivation_threshold,
            plan_overrides=plan_overrides or {},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )
    raise ValueError(f"unknown target_stage={target_stage!r}")


def _promote_to_instinct(
    sources: list[Any],
    *,
    scope: str,
    new_record_id: str,
    observation_threshold: int,
    instinct_overrides: Mapping[str, Any],
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> PromoteOutcome:
    """F0 → F1 transition handler."""
    target_stage: TargetStage = "instinct"

    # Source layer / homogeneity guard. All sources must be at F0
    # (observations); a stage-skip (instinct → instinct, skill →
    # instinct) is refused with a structured reason.
    bad = _find_layer_violation(sources, expected_layer="F0")
    if bad is not None:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason=bad["reason"],
            details=bad["details"],
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Pattern-key homogeneity. Per the morphism doc, observations
    # being promoted to a single instinct must share the recurring
    # pattern; the substrate's reflection rule matches on the shared
    # pattern. Heterogeneous sources go to different instincts.
    pattern_keys = {s.pattern_key for s in sources}
    if len(pattern_keys) != 1:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-heterogeneous",
            details={
                "distinct_pattern_keys": sorted(pattern_keys),
                "count": len(sources),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Threshold gate: ≥N observations admit promotion. Below the
    # threshold the substrate's reflection rule does not produce a
    # derivable instinct (the "pattern not stable" failure mode in
    # the morphism doc).
    if len(sources) < observation_threshold:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="insufficient-observations",
            details={
                "have": len(sources),
                "need": observation_threshold,
                "gap": observation_threshold - len(sources),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Confidence init: count-derived measure saturating toward 1.0
    # (1 - 1/(1+n)). 3 obs → 0.75, 9 → 0.9, etc. The discipline
    # pinned is monotone-in-count; realizations can replace this
    # with the closure-fixpoint-measure once that's wired in.
    n = len(sources)
    init_confidence = 1.0 - 1.0 / (1.0 + n)

    # Build the candidate instinct from sources + overrides. The
    # caller may supply ``pattern``, ``trigger``, ``suggested_response``,
    # ``per_invocation_cost`` directly; defaults derive from the
    # shared pattern key.
    #
    # Provenance: ``derived_from`` cites all source observations by
    # canonical hash, sorted so that promotion of a set of
    # observations is order-independent (the same observation set
    # produces the same instinct hash regardless of input ordering).
    # This pins the "set-like" semantics of observation→instinct: the
    # observations are matched by pattern, not by sequence.
    pattern_key = next(iter(pattern_keys))
    candidate = InstinctRecord(
        record_id=new_record_id,
        pattern=instinct_overrides.get("pattern", pattern_key),
        trigger=instinct_overrides.get("trigger", f"observed-{pattern_key}"),
        suggested_response=instinct_overrides.get(
            "suggested_response", f"apply-pattern-{pattern_key}"
        ),
        derived_from=tuple(sorted(_record_hash(s) for s in sources)),
        confidence=instinct_overrides.get("confidence", init_confidence),
        per_invocation_cost=instinct_overrides.get(
            "per_invocation_cost", LAYER_COST_CEILING["F1"]
        ),
    )

    # Strict-cost-reduction guard. Theorem: C_F1(r') < C_F0(r) for
    # every source r. The layer ceilings already enforce this when
    # the caller takes the defaults; the explicit check catches
    # mis-configured overrides.
    return _admit_or_reject_on_cost(
        candidate=candidate,
        sources=sources,
        target_stage=target_stage,
        scope=scope,
        event_log=event_log,
        agent=agent,
        origin=origin,
    )


def _promote_to_skill(
    sources: list[Any],
    *,
    scope: str,
    new_record_id: str,
    confidence_threshold: float,
    skill_overrides: Mapping[str, Any],
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> PromoteOutcome:
    """F1 → F2 transition handler."""
    target_stage: TargetStage = "skill"

    bad = _find_layer_violation(sources, expected_layer="F1")
    if bad is not None:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason=bad["reason"],
            details=bad["details"],
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Cardinality: instinct→skill is a single-instinct lift per the
    # morphism doc ("a stable instinct-record (or family of them)").
    # This implementation pins the single-instinct path; multi-
    # instinct synthesis is a future composition step (multiple
    # instincts → skill via a separate ``compose-instincts`` morphism
    # that pre-folds instincts into a single canonical instinct
    # before the lift).
    if len(sources) != 1:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-heterogeneous",
            details={
                "explanation": (
                    "instinct→skill is a single-instinct lift; got "
                    f"{len(sources)} sources"
                ),
                "source_count": len(sources),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Confidence threshold gate: instinct must be settled enough
    # (per the closure-fixpoint discipline) for skill synthesis.
    instinct = sources[0]
    if instinct.confidence < confidence_threshold:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="low-confidence",
            details={
                "have": instinct.confidence,
                "need": confidence_threshold,
                "gap": confidence_threshold - instinct.confidence,
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Build the candidate skill. Body / preconditions /
    # postconditions are caller-supplied (the lifting from
    # suggested-response into a structured procedure is what the
    # caller brings); body_reducible defaults to False so a freshly
    # synthesized skill is not auto-promotable to tool.
    candidate = SkillRecord(
        record_id=new_record_id,
        preconditions=tuple(skill_overrides.get("preconditions", (instinct.trigger,))),
        body=tuple(skill_overrides.get("body", (instinct.suggested_response,))),
        postconditions=tuple(skill_overrides.get("postconditions", ())),
        derived_from=(_record_hash(instinct),),
        body_reducible=skill_overrides.get("body_reducible", False),
        per_invocation_cost=skill_overrides.get(
            "per_invocation_cost", LAYER_COST_CEILING["F2"]
        ),
    )

    return _admit_or_reject_on_cost(
        candidate=candidate,
        sources=sources,
        target_stage=target_stage,
        scope=scope,
        event_log=event_log,
        agent=agent,
        origin=origin,
    )


def _promote_to_tool(
    sources: list[Any],
    *,
    scope: str,
    new_record_id: str,
    tool_overrides: Mapping[str, Any],
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> PromoteOutcome:
    """F2 → F3 transition handler."""
    target_stage: TargetStage = "tool"

    # Source layer guard — but distinguish promote-on-F3 (no target
    # stage; the chain is bounded) from other layer violations.
    # ``promote(tool, target_stage="tool")`` is "no-target-stage"
    # because there is no F4. Other layer violations remain
    # ``stage-skip-not-allowed``.
    for s in sources:
        layer = getattr(s, "formality_layer", None)
        if layer == "F3":
            return _emit_rejection(
                target_stage,
                scope=scope,
                target_id=new_record_id,
                reason="no-target-stage",
                details={
                    "source_layer": "F3",
                    "explanation": "F3 is the terminal layer; no F4 exists",
                },
                event_log=event_log,
                agent=agent,
                origin=origin,
            )

    bad = _find_layer_violation(sources, expected_layer="F2")
    if bad is not None:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason=bad["reason"],
            details=bad["details"],
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Cardinality: skill→tool is a single-skill demotion per the
    # morphism doc ("Read the source skill; verify its body is
    # reducible..."). Multi-skill composition into a tool would
    # change the body-reducibility analysis surface and belongs in a
    # separate ``compose-tools`` morphism.
    if len(sources) != 1:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-heterogeneous",
            details={
                "explanation": (
                    "skill→tool is a single-skill demotion; got "
                    f"{len(sources)} sources"
                ),
                "source_count": len(sources),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Body-reducibility gate. Per the morphism doc: "a skill being
    # promoted to tool has body operations that are still inference-
    # bearing; the tool target requires substrate-only operations;
    # promote rejects."
    skill = sources[0]
    if not skill.body_reducible:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="body-not-reducible",
            details={
                "skill_id": skill.record_id,
                "body_operations": list(skill.body),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    candidate = ToolRecord(
        record_id=new_record_id,
        body=tuple(tool_overrides.get("body", skill.body)),
        derived_from=(_record_hash(skill),),
        per_invocation_cost=tool_overrides.get(
            "per_invocation_cost", LAYER_COST_CEILING["F3"]
        ),
    )

    return _admit_or_reject_on_cost(
        candidate=candidate,
        sources=sources,
        target_stage=target_stage,
        scope=scope,
        event_log=event_log,
        agent=agent,
        origin=origin,
    )


def _promote_to_plan(
    sources: list[Any],
    *,
    scope: str,
    new_record_id: str,
    motivation_threshold: int,
    plan_overrides: Mapping[str, Any],
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> PromoteOutcome:
    """Idea → plan transition handler (work-item arc).

    Per ``idea-record`` and ``plan-record`` (AOP): an idea is a
    candidate; a plan is a commitment. The admission gate is
    structural rather than cost-based — the cost-monotonicity
    theorem is about the settlement-path arc; the work-item arc has
    its own discipline (motivation accumulated; goal substrate-
    statable; definition-of-done checkable).
    """
    target_stage: TargetStage = "plan"

    if any(not isinstance(s, IdeaRecord) for s in sources):
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-heterogeneous",
            details={"explanation": "idea→plan requires IdeaRecord sources"},
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    # Cardinality: PlanRecord.promoted_from is a single hash per
    # ``plan-record`` AOP — a plan cites *the* idea it was promoted
    # from. Multi-idea synthesis would require a different
    # provenance shape and is outside this round's contract.
    if len(sources) != 1:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="source-records-heterogeneous",
            details={
                "explanation": (
                    "idea→plan is a single-idea promotion; "
                    "PlanRecord.promoted_from is a single hash"
                ),
                "source_count": len(sources),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    idea = sources[0]
    if len(idea.motivation) < motivation_threshold:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="insufficient-motivation",
            details={
                "have": len(idea.motivation),
                "need": motivation_threshold,
                "idea_id": idea.record_id,
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    goal = plan_overrides.get("goal")
    if not goal:
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=new_record_id,
            reason="missing-goal",
            details={
                "idea_id": idea.record_id,
                "explanation": (
                    "plan_overrides must include a 'goal' field; "
                    "ideas declare motivation but not goals"
                ),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    candidate = PlanRecord(
        record_id=new_record_id,
        description=plan_overrides.get("description", idea.description),
        goal=goal,
        definition_of_done=plan_overrides.get(
            "definition_of_done", f"goal-achieved:{goal}"
        ),
        promoted_from=_record_hash(idea),
        assigned_to=plan_overrides.get("assigned_to"),
        status=plan_overrides.get("status", "proposed"),
    )

    operator_name = _TARGET_TO_OPERATOR[target_stage]
    derivation_hash = hashlib.sha256(
        json.dumps(
            {k: v for k, v in candidate.to_dict().items() if k != "record_id"},
            sort_keys=True,
            ensure_ascii=False,
        ).encode("utf-8")
    ).hexdigest()
    _emit_promotion_witness(
        operator=operator_name,
        scope=scope,
        target_id=new_record_id,
        sources=sources,
        candidate_hash=derivation_hash,
        cost_before=None,
        cost_after=None,
        event_log=event_log,
        agent=agent,
        origin=origin,
    )
    return Promoted(
        record=candidate,
        derivation_hash=derivation_hash,
        operator=operator_name,
    )


# ---------------------------------------------------------------------------
# Shared helpers — layer guards, cost gate, witness emission
# ---------------------------------------------------------------------------


def _find_layer_violation(
    sources: list[Any], *, expected_layer: FormalityLayer
) -> dict[str, Any] | None:
    """Return ``None`` if all sources are at ``expected_layer``.

    Otherwise return a structured rejection payload distinguishing
    homogeneous-but-wrong-layer (stage skip) from heterogeneous
    sources (mixed layers in one promotion call).
    """
    layers = {getattr(s, "formality_layer", None) for s in sources}
    if layers == {expected_layer}:
        return None
    if len(layers) == 1:
        # All sources at same layer, but it's the wrong one.
        wrong = next(iter(layers))
        return {
            "reason": "stage-skip-not-allowed",
            "details": {
                "expected_layer": expected_layer,
                "source_layer": wrong,
                "explanation": (
                    "promote progresses one layer at a time per "
                    "morphism phase discipline"
                ),
            },
        }
    return {
        "reason": "source-records-heterogeneous",
        "details": {
            "expected_layer": expected_layer,
            "source_layers": sorted(str(layer) for layer in layers),
        },
    }


def _admit_or_reject_on_cost(
    *,
    candidate: PromotableRecord,
    sources: list[Any],
    target_stage: TargetStage,
    scope: str,
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> PromoteOutcome:
    """Apply the strict-cost-reduction gate and emit the outcome witness.

    Per ``promote-is-strictly-cost-reducing``: the promoted record's
    per-invocation cost must be strictly less than every source's
    cost. The check is run *after* the per-stage admission gate so
    rejection messages are informative — a low-confidence rejection
    is more useful than a downstream cost-not-reduced rejection
    when the underlying problem is the confidence.
    """
    operator_name = _TARGET_TO_OPERATOR[target_stage]

    # Per the theorem: C_target(r') < C_source(r) for *every* source r.
    # Compare against the cheapest source, not the most expensive — a
    # promotion that is cheaper than the dearest source but as
    # expensive as a thrifty source would silently violate the per-
    # source claim. The strict gate is "below every source's cost",
    # i.e. "below the minimum source cost".
    min_source_cost = min(s.per_invocation_cost for s in sources)
    max_source_cost = max(s.per_invocation_cost for s in sources)
    if candidate.per_invocation_cost >= min_source_cost:
        offending = [
            {"source_id": s.record_id, "source_cost": s.per_invocation_cost}
            for s in sources
            if candidate.per_invocation_cost >= s.per_invocation_cost
        ]
        return _emit_rejection(
            target_stage,
            scope=scope,
            target_id=candidate.record_id,
            reason="cost-not-strictly-reduced",
            details={
                "candidate_cost": candidate.per_invocation_cost,
                "min_source_cost": min_source_cost,
                "max_source_cost": max_source_cost,
                "offending_sources": offending,
                "explanation": (
                    "promote-is-strictly-cost-reducing requires "
                    "C_target(r') < C_source(r) for every source r"
                ),
            },
            event_log=event_log,
            agent=agent,
            origin=origin,
        )

    derivation_hash = _record_hash(candidate)
    _emit_promotion_witness(
        operator=operator_name,
        scope=scope,
        target_id=candidate.record_id,
        sources=sources,
        candidate_hash=derivation_hash,
        cost_before=max_source_cost,
        cost_after=candidate.per_invocation_cost,
        event_log=event_log,
        agent=agent,
        origin=origin,
    )
    return Promoted(
        record=candidate,
        derivation_hash=derivation_hash,
        operator=operator_name,
    )


def _emit_promotion_witness(
    *,
    operator: str,
    scope: str,
    target_id: str,
    sources: list[Any],
    candidate_hash: str,
    cost_before: float | None,
    cost_after: float | None,
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> None:
    """Emit the success-side promotion witness on the learning channel.

    The witness's ``details`` carry the source-record hashes, the
    cost-before / cost-after pair (for the settlement-path arc),
    and the scope. Auditors querying the learning channel filter
    on these to reconstruct provenance and verify the strict-cost-
    reduction property holds across the audit window.
    """
    if event_log is None:
        return
    details: dict[str, Any] = {
        "scope": scope,
        "source_hashes": [_record_hash(s) for s in sources],
        "source_count": len(sources),
    }
    if cost_before is not None:
        details["cost_before"] = cost_before
    if cost_after is not None:
        details["cost_after"] = cost_after
    w = make_witness(
        operator=operator,
        target=f"promotion/{target_id}",
        before_hash=None,
        after_hash=candidate_hash,
        details=details,
        agent=agent,
        channel="learning",
        origin=origin,
    )
    event_log.append(w)


def _emit_rejection(
    target_stage: TargetStage,
    *,
    scope: str,
    target_id: str,
    reason: RejectionReason,
    details: Mapping[str, Any],
    event_log: EventLog | None,
    agent: str | None,
    origin: str | None,
) -> Rejected:
    """Emit the rejection-side promotion witness and build ``Rejected``.

    The witness is always emitted (when an event_log is present)
    even though no substrate state changed — per the morphism
    invariant that every promotion attempt produces a witness, and
    per the engineering consequence that "the rejection is not a
    failure of the promote operator but a correctly-implemented
    admissibility gate."
    """
    full_details = dict(details)
    full_details["target_stage"] = target_stage
    full_details["scope"] = scope
    full_details["rejection_reason"] = reason
    if event_log is not None:
        w = make_witness(
            operator="promote_rejected",
            target=f"promotion/{target_id}",
            before_hash=None,
            after_hash=None,
            details=full_details,
            agent=agent,
            channel="learning",
            origin=origin,
        )
        event_log.append(w)
    return Rejected(reason=reason, details=full_details)


# ---------------------------------------------------------------------------
# Substrate (in-memory store + provenance walks)
# ---------------------------------------------------------------------------


@dataclass
class PromoteSubstrate:
    """In-memory store of promoted records, keyed by canonical hash.

    The substrate accepts ``register(record)`` for any record type
    and answers provenance queries via ``promote_chain(record)`` —
    the list of records the given record was derived from,
    transitively, terminating at observations / ideas (records with
    no ``derived_from``). The chain is the substrate-level handle on
    the morphism's "an auditor can ask 'where did this instinct
    come from?' and traverse to the answer" property.
    """

    by_hash: dict[str, Any] = field(default_factory=dict)

    def register(self, record: Any) -> str:
        """Insert a record; return its canonical hash."""
        if isinstance(record, PlanRecord):
            # Plans are content-addressed over the same field shape
            # as PromotableRecords for substrate-storage purposes.
            d = record.to_dict()
            d.pop("record_id", None)
            h = hashlib.sha256(
                json.dumps(d, sort_keys=True, ensure_ascii=False).encode("utf-8")
            ).hexdigest()
        else:
            h = _record_hash(record)
        self.by_hash[h] = record
        return h

    def promote_chain(self, record: Any) -> list[Any]:
        """Walk ``derived_from`` transitively; deepest-first.

        Returns the list of records this record was derived from
        (excluding the input itself), terminating at root records
        with no derivation. A tool's chain reaches its skill, the
        skill's instinct, the instinct's observations.
        """
        chain: list[Any] = []
        visited: set[str] = set()
        derived: tuple[str, ...] | None = getattr(record, "derived_from", None)
        if derived is None:
            promoted_from = getattr(record, "promoted_from", None)
            derived = (promoted_from,) if promoted_from else ()

        frontier = list(derived)
        while frontier:
            h = frontier.pop(0)
            if h in visited or h not in self.by_hash:
                continue
            visited.add(h)
            ancestor = self.by_hash[h]
            chain.append(ancestor)
            ancestor_derived = getattr(ancestor, "derived_from", None)
            if ancestor_derived is None:
                pf = getattr(ancestor, "promoted_from", None)
                ancestor_derived = (pf,) if pf else ()
            frontier.extend(ancestor_derived)
        return chain


__all__ = [
    "FORMALITY_LAYERS",
    "FormalityLayer",
    "IdeaRecord",
    "InstinctRecord",
    "LAYER_COST_CEILING",
    "ObservationRecord",
    "PlanRecord",
    "PromotableRecord",
    "Promoted",
    "PromoteOutcome",
    "PromoteSubstrate",
    "REJECTION_REASONS",
    "Rejected",
    "RejectionReason",
    "SkillRecord",
    "TARGET_STAGE_LAYER",
    "TargetStage",
    "ToolRecord",
    "VALID_TRANSITIONS",
    "promote",
]
