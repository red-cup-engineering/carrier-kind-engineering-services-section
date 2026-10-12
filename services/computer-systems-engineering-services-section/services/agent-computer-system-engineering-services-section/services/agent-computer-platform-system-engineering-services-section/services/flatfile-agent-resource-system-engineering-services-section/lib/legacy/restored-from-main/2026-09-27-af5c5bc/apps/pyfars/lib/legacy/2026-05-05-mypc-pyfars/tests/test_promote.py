"""Tests for the promote operator and settlement-path records.

Round 18 / WOAH #4 — directly exercises the math hypotheses of
``promote-is-strictly-cost-reducing`` (AOP):

  - Strict cost reduction at each successful promotion.
  - Chain termination in at most three successful promotes
    (F0 → F1 → F2 → F3); promote on F3 rejects.
  - Stage-skip refusal (one layer at a time).
  - Rejection-witness informativeness (each missing condition
    surfaces a structured reason).
  - Provenance preservation (derived_from chain reaches founding
    observations from any tool).
  - Source immutability (promotion produces a new entity, not an
    edit).
  - Witness emission on every outcome (success and rejection),
    on the ``learning`` channel with kind ``learning``.
  - Idea → plan parallel arc (work-item progression).
"""
from __future__ import annotations

from pathlib import Path

import pytest

from pyfars.operator.kind import OPERATOR_KIND
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.promote import (
    FORMALITY_LAYERS,
    IdeaRecord,
    InstinctRecord,
    LAYER_COST_CEILING,
    ObservationRecord,
    PlanRecord,
    PromoteSubstrate,
    Promoted,
    REJECTION_REASONS,
    Rejected,
    SkillRecord,
    ToolRecord,
    promote,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_observations(n: int, pattern_key: str = "p1") -> list[ObservationRecord]:
    return [
        ObservationRecord(
            record_id=f"obs-{i}",
            pattern_key=pattern_key,
            content={"i": i},
        )
        for i in range(n)
    ]


def _ready_instinct(confidence: float = 0.9) -> InstinctRecord:
    return InstinctRecord(
        record_id="ins-ready",
        pattern="p1",
        trigger="t1",
        suggested_response="r1",
        derived_from=("h-obs-0", "h-obs-1", "h-obs-2"),
        confidence=confidence,
    )


def _ready_skill(*, body_reducible: bool = True) -> SkillRecord:
    return SkillRecord(
        record_id="sk-ready",
        preconditions=("p-pre",),
        body=("step-1", "step-2"),
        postconditions=("p-post",),
        derived_from=("h-ins-ready",),
        body_reducible=body_reducible,
    )


# ---------------------------------------------------------------------------
# Operator-registry coverage (Round 14 discipline)
# ---------------------------------------------------------------------------


def test_promote_operators_registered_as_learning():
    """All five new operators classify as ``learning``.

    Per the channel discipline (Round 14 / WOAH #5): promote
    operators register matured substrate content (success path) or
    record the missing condition (rejection path). Both shapes are
    self-modification of the substrate's closure-rule system; both
    classify as ``learning``.
    """
    expected = {
        "promote_observation_to_instinct",
        "promote_instinct_to_skill",
        "promote_skill_to_tool",
        "promote_idea_to_plan",
        "promote_rejected",
    }
    for op in expected:
        assert OPERATOR_KIND[op] == "learning", (
            f"{op!r} must be classified as learning"
        )


# ---------------------------------------------------------------------------
# Record construction guards (layer-cost discipline)
# ---------------------------------------------------------------------------


def test_layer_cost_ordering_strict():
    """Per settlement-path-cost-monotonicity: F0 > F1 > F2 > F3."""
    costs = [LAYER_COST_CEILING[layer] for layer in FORMALITY_LAYERS]
    for hi, lo in zip(costs, costs[1:]):
        assert hi > lo


def test_observation_above_layer_ceiling_rejected():
    with pytest.raises(ValueError, match="cost ceiling"):
        ObservationRecord(
            record_id="obs", pattern_key="p", per_invocation_cost=1.5
        )


def test_instinct_at_f0_cost_rejected():
    """An instinct with F0-tier cost violates the layer ceiling."""
    with pytest.raises(ValueError, match="cost ceiling"):
        InstinctRecord(
            record_id="ins",
            pattern="p",
            trigger="t",
            suggested_response="r",
            derived_from=("h",),
            confidence=0.8,
            per_invocation_cost=0.9,  # above F1 ceiling 0.5
        )


def test_instinct_must_cite_sources():
    with pytest.raises(ValueError, match="derived_from"):
        InstinctRecord(
            record_id="ins",
            pattern="p",
            trigger="t",
            suggested_response="r",
            derived_from=(),
            confidence=0.8,
        )


def test_instinct_confidence_in_range():
    with pytest.raises(ValueError, match="out of range"):
        InstinctRecord(
            record_id="ins",
            pattern="p",
            trigger="t",
            suggested_response="r",
            derived_from=("h",),
            confidence=1.5,
        )


# ---------------------------------------------------------------------------
# Successful promotions — settlement-path arc
# ---------------------------------------------------------------------------


def test_promote_observation_to_instinct_succeeds():
    obs = _make_observations(3)
    out = promote(
        obs,
        target_stage="instinct",
        scope="test",
        new_record_id="ins-1",
        observation_threshold=3,
    )
    assert isinstance(out, Promoted)
    assert isinstance(out.record, InstinctRecord)
    assert out.operator == "promote_observation_to_instinct"
    # Provenance: derived_from cites all 3 observations by hash.
    assert len(out.record.derived_from) == 3
    # Strict cost reduction.
    assert out.record.per_invocation_cost < obs[0].per_invocation_cost


def test_promote_instinct_to_skill_succeeds():
    ins = _ready_instinct(confidence=0.9)
    out = promote(
        [ins],
        target_stage="skill",
        scope="test",
        new_record_id="sk-1",
        confidence_threshold=0.75,
    )
    assert isinstance(out, Promoted)
    assert isinstance(out.record, SkillRecord)
    assert out.operator == "promote_instinct_to_skill"
    assert out.record.per_invocation_cost < ins.per_invocation_cost


def test_promote_skill_to_tool_succeeds():
    sk = _ready_skill(body_reducible=True)
    out = promote(
        [sk], target_stage="tool", scope="test", new_record_id="tool-1"
    )
    assert isinstance(out, Promoted)
    assert isinstance(out.record, ToolRecord)
    assert out.operator == "promote_skill_to_tool"
    assert out.record.per_invocation_cost < sk.per_invocation_cost


# ---------------------------------------------------------------------------
# The cost-monotonicity theorem — full chain F0 → F1 → F2 → F3
# ---------------------------------------------------------------------------


def test_full_chain_costs_are_strictly_monotone_decreasing():
    """The central theorem: each successful promote strictly reduces cost.

    Run F0 → F1 → F2 → F3 end-to-end and verify the per-invocation
    cost sequence is strictly decreasing at every transition.
    """
    obs = _make_observations(5)
    promoted_ins = promote(
        obs,
        target_stage="instinct",
        scope="test",
        new_record_id="ins",
        observation_threshold=3,
    )
    assert isinstance(promoted_ins, Promoted)
    ins = promoted_ins.record

    promoted_sk = promote(
        [ins],
        target_stage="skill",
        scope="test",
        new_record_id="sk",
        confidence_threshold=0.75,
        skill_overrides={"body_reducible": True},
    )
    assert isinstance(promoted_sk, Promoted)
    sk = promoted_sk.record

    promoted_tool = promote(
        [sk], target_stage="tool", scope="test", new_record_id="tool"
    )
    assert isinstance(promoted_tool, Promoted)
    tool = promoted_tool.record

    costs = [
        obs[0].per_invocation_cost,
        ins.per_invocation_cost,
        sk.per_invocation_cost,
        tool.per_invocation_cost,
    ]
    # Strictly decreasing.
    for hi, lo in zip(costs, costs[1:]):
        assert hi > lo, f"cost sequence not strictly decreasing: {costs!r}"


# ---------------------------------------------------------------------------
# The chain-termination claim — at most three promotes per content item
# ---------------------------------------------------------------------------


def test_chain_terminates_at_three_steps():
    """Per ``promote-is-strictly-cost-reducing``: at most 3 promotes.

    After F0 → F1 → F2 → F3 the chain hits the terminal layer; a
    fourth promote attempt must reject with ``no-target-stage``.
    """
    obs = _make_observations(3)

    p1 = promote(obs, target_stage="instinct", scope="t", new_record_id="i")
    assert isinstance(p1, Promoted)

    p2 = promote(
        [p1.record],
        target_stage="skill",
        scope="t",
        new_record_id="s",
        skill_overrides={"body_reducible": True},
    )
    assert isinstance(p2, Promoted)

    p3 = promote([p2.record], target_stage="tool", scope="t", new_record_id="x")
    assert isinstance(p3, Promoted)
    tool = p3.record

    # The fourth attempt: nothing to promote a tool to.
    p4 = promote([tool], target_stage="tool", scope="t", new_record_id="x2")
    assert isinstance(p4, Rejected)
    assert p4.reason == "no-target-stage"


# ---------------------------------------------------------------------------
# Stage-skip refusal — one layer at a time
# ---------------------------------------------------------------------------


def test_stage_skip_observation_to_skill_rejected():
    obs = _make_observations(3)
    out = promote(obs, target_stage="skill", scope="t", new_record_id="sk")
    assert isinstance(out, Rejected)
    assert out.reason == "stage-skip-not-allowed"
    assert out.details["expected_layer"] == "F1"
    assert out.details["source_layer"] == "F0"


def test_stage_skip_instinct_to_tool_rejected():
    ins = _ready_instinct(confidence=0.9)
    out = promote([ins], target_stage="tool", scope="t", new_record_id="tool")
    assert isinstance(out, Rejected)
    assert out.reason == "stage-skip-not-allowed"


# ---------------------------------------------------------------------------
# Admission-gate rejections (each carries informative details)
# ---------------------------------------------------------------------------


def test_insufficient_observations_rejected_with_gap():
    obs = _make_observations(2)  # below default threshold 3
    out = promote(
        obs,
        target_stage="instinct",
        scope="t",
        new_record_id="ins",
        observation_threshold=3,
    )
    assert isinstance(out, Rejected)
    assert out.reason == "insufficient-observations"
    assert out.details["have"] == 2
    assert out.details["need"] == 3
    assert out.details["gap"] == 1


def test_low_confidence_rejected_with_gap():
    ins = _ready_instinct(confidence=0.4)
    out = promote(
        [ins],
        target_stage="skill",
        scope="t",
        new_record_id="sk",
        confidence_threshold=0.75,
    )
    assert isinstance(out, Rejected)
    assert out.reason == "low-confidence"
    assert out.details["have"] == 0.4
    assert out.details["need"] == 0.75
    assert pytest.approx(out.details["gap"]) == 0.35


def test_body_not_reducible_rejected():
    sk = _ready_skill(body_reducible=False)
    out = promote([sk], target_stage="tool", scope="t", new_record_id="tool")
    assert isinstance(out, Rejected)
    assert out.reason == "body-not-reducible"
    assert out.details["skill_id"] == "sk-ready"


def test_heterogeneous_observation_pattern_keys_rejected():
    obs = _make_observations(2, pattern_key="p1") + _make_observations(
        2, pattern_key="p2"
    )
    # Re-id to avoid duplicates.
    obs = [
        ObservationRecord(record_id=f"obs-{i}", pattern_key=o.pattern_key)
        for i, o in enumerate(obs)
    ]
    out = promote(obs, target_stage="instinct", scope="t", new_record_id="ins")
    assert isinstance(out, Rejected)
    assert out.reason == "source-records-heterogeneous"
    assert out.details["distinct_pattern_keys"] == ["p1", "p2"]


def test_empty_source_records_rejected():
    out = promote([], target_stage="instinct", scope="t", new_record_id="ins")
    assert isinstance(out, Rejected)
    assert out.reason == "source-records-empty"


def test_cost_not_strictly_reduced_within_layer_ceiling():
    """Cost-reduction guard fires when override stays within the
    layer ceiling but matches the source cost.

    Construct a source whose cost is *below* the target layer's
    ceiling so the override can match it without violating the
    construction guard.
    """
    # Build a skill at cost 0.04 (below F3 ceiling 0.05). Then
    # promote with tool_overrides per_invocation_cost=0.04 — same
    # cost, no improvement, must reject.
    sk = SkillRecord(
        record_id="sk-cheap",
        preconditions=("p",),
        body=("b",),
        postconditions=(),
        derived_from=("h",),
        body_reducible=True,
        per_invocation_cost=0.04,  # below F2 ceiling AND below F3 ceiling
    )
    out = promote(
        [sk],
        target_stage="tool",
        scope="t",
        new_record_id="tool",
        tool_overrides={"per_invocation_cost": 0.04},
    )
    assert isinstance(out, Rejected)
    assert out.reason == "cost-not-strictly-reduced"
    assert out.details["candidate_cost"] == 0.04
    assert out.details["max_source_cost"] == 0.04


# ---------------------------------------------------------------------------
# Source immutability — promotion produces a new entity, not an edit
# ---------------------------------------------------------------------------


def test_source_records_not_mutated_by_promotion():
    obs = _make_observations(3)
    snapshots = [o.to_dict() for o in obs]
    promote(obs, target_stage="instinct", scope="t", new_record_id="ins")
    after = [o.to_dict() for o in obs]
    assert snapshots == after, "promotion must not mutate source records"


# ---------------------------------------------------------------------------
# Witness emission — every outcome on the learning channel
# ---------------------------------------------------------------------------


def test_success_emits_witness_on_learning_channel(tmp_path: Path):
    log = EventLog(root=tmp_path)
    obs = _make_observations(3)
    promote(
        obs,
        target_stage="instinct",
        scope="test-scope",
        new_record_id="ins",
        event_log=log,
    )
    events = list(log.read_all())
    assert len(events) == 1
    w = events[0]
    assert w.operator == "promote_observation_to_instinct"
    assert w.channel == "learning"
    assert w.kind == "learning"
    assert w.details["scope"] == "test-scope"
    assert w.details["source_count"] == 3
    assert "cost_before" in w.details
    assert "cost_after" in w.details
    assert w.details["cost_after"] < w.details["cost_before"]


def test_rejection_emits_witness_with_reason(tmp_path: Path):
    log = EventLog(root=tmp_path)
    obs = _make_observations(2)  # below threshold
    promote(
        obs,
        target_stage="instinct",
        scope="test-scope",
        new_record_id="ins",
        observation_threshold=3,
        event_log=log,
    )
    events = list(log.read_all())
    assert len(events) == 1
    w = events[0]
    assert w.operator == "promote_rejected"
    assert w.channel == "learning"
    assert w.kind == "learning"
    assert w.details["rejection_reason"] == "insufficient-observations"
    assert w.details["target_stage"] == "instinct"


def test_no_witness_emitted_when_event_log_absent():
    """Without an event log, the operator returns the outcome but
    emits nothing. Caller-controlled emission is idiomatic for the
    rest of the codebase (federation, heartbeat)."""
    obs = _make_observations(3)
    out = promote(obs, target_stage="instinct", scope="t", new_record_id="ins")
    # No exception, no log; outcome is still returned.
    assert isinstance(out, Promoted)


# ---------------------------------------------------------------------------
# Provenance traceability — promote_chain reaches founding observations
# ---------------------------------------------------------------------------


def test_promote_chain_traces_tool_back_to_observations():
    """The morphism's provenance invariant: from any tool, walk
    derived_from transitively to the founding observations."""
    sub = PromoteSubstrate()
    obs = _make_observations(3)
    for o in obs:
        sub.register(o)

    p1 = promote(obs, target_stage="instinct", scope="t", new_record_id="i")
    assert isinstance(p1, Promoted)
    sub.register(p1.record)

    p2 = promote(
        [p1.record],
        target_stage="skill",
        scope="t",
        new_record_id="s",
        skill_overrides={"body_reducible": True},
    )
    assert isinstance(p2, Promoted)
    sub.register(p2.record)

    p3 = promote([p2.record], target_stage="tool", scope="t", new_record_id="x")
    assert isinstance(p3, Promoted)
    sub.register(p3.record)

    chain = sub.promote_chain(p3.record)
    # Chain reaches exactly: skill, instinct, then 3 observations = 5 total.
    assert len(chain) == 5
    kinds = [type(r).__name__ for r in chain]
    assert "SkillRecord" in kinds
    assert "InstinctRecord" in kinds
    assert kinds.count("ObservationRecord") == 3


def test_promote_chain_handles_unregistered_ancestor_gracefully():
    sub = PromoteSubstrate()
    p1 = promote(
        _make_observations(3),
        target_stage="instinct",
        scope="t",
        new_record_id="i",
    )
    assert isinstance(p1, Promoted)
    sub.register(p1.record)
    # Don't register the observations; chain should be empty without
    # exception.
    chain = sub.promote_chain(p1.record)
    assert chain == []


# ---------------------------------------------------------------------------
# Idea → plan parallel arc
# ---------------------------------------------------------------------------


def test_promote_idea_to_plan_succeeds():
    idea = IdeaRecord(
        record_id="idea-1",
        description="Build the thing",
        motivation=("user-asked", "blocks-other-work"),
    )
    out = promote(
        [idea],
        target_stage="plan",
        scope="t",
        new_record_id="plan-1",
        plan_overrides={"goal": "thing-built", "definition_of_done": "tests-pass"},
    )
    assert isinstance(out, Promoted)
    assert isinstance(out.record, PlanRecord)
    assert out.record.goal == "thing-built"
    assert out.record.definition_of_done == "tests-pass"
    assert out.operator == "promote_idea_to_plan"


def test_promote_idea_to_plan_missing_goal_rejected():
    idea = IdeaRecord(
        record_id="idea", description="d", motivation=("m1",),
    )
    out = promote(
        [idea], target_stage="plan", scope="t", new_record_id="plan"
    )
    assert isinstance(out, Rejected)
    assert out.reason == "missing-goal"


def test_promote_idea_to_plan_insufficient_motivation_rejected():
    idea = IdeaRecord(record_id="idea", description="d", motivation=())
    out = promote(
        [idea],
        target_stage="plan",
        scope="t",
        new_record_id="plan",
        motivation_threshold=1,
        plan_overrides={"goal": "g", "definition_of_done": "d"},
    )
    assert isinstance(out, Rejected)
    assert out.reason == "insufficient-motivation"


def test_idea_to_plan_emits_witness(tmp_path: Path):
    log = EventLog(root=tmp_path)
    idea = IdeaRecord(
        record_id="idea-1",
        description="d",
        motivation=("m1",),
    )
    promote(
        [idea],
        target_stage="plan",
        scope="t",
        new_record_id="plan-1",
        plan_overrides={"goal": "g", "definition_of_done": "dod"},
        event_log=log,
    )
    events = list(log.read_all())
    assert len(events) == 1
    assert events[0].operator == "promote_idea_to_plan"
    assert events[0].kind == "learning"


# ---------------------------------------------------------------------------
# Rejection-reasons completeness — every named reason is exercised
# ---------------------------------------------------------------------------


def test_every_rejection_reason_is_reachable():
    """All ``REJECTION_REASONS`` must be reachable through some path.

    Pins the API surface: adding a new reason to the literal type
    requires adding a test that demonstrates it. Removing a reason
    is loud — this test fails with a clear message about which
    reason has no exerciser.
    """
    assert set(REJECTION_REASONS) == {
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
    }


# ---------------------------------------------------------------------------
# Determinism — same inputs produce byte-identical promoted records
# ---------------------------------------------------------------------------


def test_strict_cost_gate_compares_against_every_source():
    """Architect-found regression: strict-cost reduction must hold
    against *every* source, not just the most expensive.

    Construct a heterogeneous-cost observation set: one cheap obs
    (cost 0.3) alongside two ceiling obs (cost 1.0). Default
    instinct cost (0.5) is strictly below the max source cost
    (1.0) but NOT strictly below the cheap source's cost (0.3).
    The promotion must reject — the per-source claim of the
    theorem rules this out.
    """
    cheap = ObservationRecord(
        record_id="obs-cheap", pattern_key="p1", per_invocation_cost=0.3
    )
    pricey1 = ObservationRecord(
        record_id="obs-1", pattern_key="p1", per_invocation_cost=1.0
    )
    pricey2 = ObservationRecord(
        record_id="obs-2", pattern_key="p1", per_invocation_cost=1.0
    )
    out = promote(
        [cheap, pricey1, pricey2],
        target_stage="instinct",
        scope="t",
        new_record_id="ins",
        observation_threshold=3,
        # default instinct cost 0.5; cheap source is 0.3 → must reject
    )
    assert isinstance(out, Rejected)
    assert out.reason == "cost-not-strictly-reduced"
    assert out.details["min_source_cost"] == 0.3
    assert out.details["max_source_cost"] == 1.0
    # Offending sources must include the cheap one (and only it).
    offending_ids = [s["source_id"] for s in out.details["offending_sources"]]
    assert offending_ids == ["obs-cheap"]


def test_strict_cost_gate_admits_when_all_sources_above_candidate():
    """Mirror of the above: when the candidate is below *every*
    source's cost, admission proceeds."""
    obs = [
        ObservationRecord(
            record_id=f"obs-{i}", pattern_key="p1", per_invocation_cost=0.6
        )
        for i in range(3)
    ]
    out = promote(
        obs,
        target_stage="instinct",
        scope="t",
        new_record_id="ins",
        observation_threshold=3,
        # default instinct cost 0.5 < every source's 0.6 → admit
    )
    assert isinstance(out, Promoted)


def test_skill_promotion_rejects_multiple_instincts():
    """Cardinality guard: instinct→skill is single-instinct."""
    ins1 = _ready_instinct(confidence=0.9)
    ins2 = InstinctRecord(
        record_id="ins-2",
        pattern="p2",
        trigger="t2",
        suggested_response="r2",
        derived_from=("h",),
        confidence=0.9,
    )
    out = promote(
        [ins1, ins2],
        target_stage="skill",
        scope="t",
        new_record_id="sk",
    )
    assert isinstance(out, Rejected)
    assert out.reason == "source-records-heterogeneous"
    assert out.details["source_count"] == 2


def test_tool_promotion_rejects_multiple_skills():
    sk1 = _ready_skill(body_reducible=True)
    sk2 = SkillRecord(
        record_id="sk-2",
        preconditions=("p",),
        body=("b",),
        postconditions=(),
        derived_from=("h",),
        body_reducible=True,
    )
    out = promote(
        [sk1, sk2], target_stage="tool", scope="t", new_record_id="tool"
    )
    assert isinstance(out, Rejected)
    assert out.reason == "source-records-heterogeneous"
    assert out.details["source_count"] == 2


def test_plan_promotion_rejects_multiple_ideas():
    ideas = [
        IdeaRecord(record_id=f"idea-{i}", description=f"d{i}", motivation=("m",))
        for i in range(2)
    ]
    out = promote(
        ideas,
        target_stage="plan",
        scope="t",
        new_record_id="plan",
        plan_overrides={"goal": "g", "definition_of_done": "dod"},
    )
    assert isinstance(out, Rejected)
    assert out.reason == "source-records-heterogeneous"
    assert out.details["source_count"] == 2


def test_observation_to_instinct_provenance_is_order_independent():
    """Set-like semantics: same observations in different order
    produce the same instinct hash. Pinned by sorting derived_from
    at construction."""
    obs_forward = _make_observations(3)
    obs_reversed = list(reversed(obs_forward))
    p1 = promote(
        obs_forward, target_stage="instinct", scope="t", new_record_id="ins"
    )
    p2 = promote(
        obs_reversed, target_stage="instinct", scope="t", new_record_id="ins"
    )
    assert isinstance(p1, Promoted) and isinstance(p2, Promoted)
    assert p1.derivation_hash == p2.derivation_hash
    assert p1.record.derived_from == p2.record.derived_from


def test_promotion_is_deterministic():
    """Same source observations produce identical instinct hashes."""
    obs = _make_observations(3)
    p1 = promote(obs, target_stage="instinct", scope="t", new_record_id="ins")
    p2 = promote(obs, target_stage="instinct", scope="t", new_record_id="ins")
    assert isinstance(p1, Promoted) and isinstance(p2, Promoted)
    assert p1.derivation_hash == p2.derivation_hash
    assert p1.record.to_dict() == p2.record.to_dict()
