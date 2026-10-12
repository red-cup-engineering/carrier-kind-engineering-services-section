"""Tests for DispatchTable's closure-rule-system surface.

Round 15 / WOAH #6 — pin that ``DispatchTable`` is now a substrate-
content closure-rule system per the AOP theorem
*dispatch-as-closure-rule-system*: every dispatch witness cites the
rule-system version that was active when it fired and the rule-id of
the firing rule, every rule-system edit produces a learning-channel
audit witness, and ``query`` is a free read."""
from __future__ import annotations

import pytest

from pyfars.runtime.closure_rule import (
    ClosureRule,
    ClosureRuleSystem,
    UnstableCallableError,
)
from pyfars.runtime.dispatch import DispatchTable
from pyfars.runtime.event_log import EventLog


def _named_handler() -> str:
    """Module-level named handler — process-stable identity."""
    return "ok"


class _UnstableCallable:
    def __call__(self) -> str:
        return "ok"


# --- system surface ---------------------------------------------------


def test_fresh_table_has_empty_default_system():
    dt = DispatchTable()
    assert isinstance(dt.system, ClosureRuleSystem)
    assert dt.system.id == "default"
    assert dt.system.rules == ()
    assert dt.system_version == dt.system.version_hash


def test_table_honours_explicit_system_id():
    dt = DispatchTable(system_id="strict")
    assert dt.system.id == "strict"
    # Two tables with different ids have different empty-system hashes
    # (the id is in the canonical form).
    assert dt.system_version != DispatchTable(system_id="default").system_version


def test_register_synthesizes_rule_and_rotates_version():
    dt = DispatchTable()
    v0 = dt.system_version
    dt.register("p", lambda: "x")
    v1 = dt.system_version
    assert v1 != v0
    assert dt.system.predecessor_hash == v0
    assert len(dt.system.rules) == 1
    rule = dt.system.rules[0]
    assert rule.predicate == "p"
    assert rule.kind == "procedure"
    # Synthesized id encodes both predicate and handler name.
    assert rule.id.startswith("p::")


def test_register_disambiguates_repeated_handler_with_counter():
    """Two registrations of the same callable for the same predicate
    must produce two distinct rule ids — the legacy semantics is
    that both fire, in order, on dispatch."""
    dt = DispatchTable()
    h = lambda: "x"  # noqa: E731
    dt.register("p", h)
    dt.register("p", h)
    ids = [r.id for r in dt.system.rules]
    assert len(ids) == 2
    assert ids[0] != ids[1]
    # First registration uses the bare synthesized id; second appends #2.
    assert ids[1].endswith("#2")


def test_register_rule_accepts_first_class_rule_with_explicit_id():
    dt = DispatchTable()
    rule = ClosureRule(id="my-rule", predicate="p", handler=lambda: 42,
                       kind="procedure", description="explicit")
    dt.register_rule(rule)
    assert dt.system.find("my-rule") is rule


def test_register_rule_rejects_duplicate_id():
    dt = DispatchTable()
    dt.register_rule(ClosureRule(id="r", predicate="p"))
    with pytest.raises(ValueError, match="already exists"):
        dt.register_rule(ClosureRule(id="r", predicate="q"))


def test_unregister_removes_rule_for_handler():
    dt = DispatchTable()
    h = lambda: "x"  # noqa: E731
    dt.register("p", h)
    assert len(dt.system.rules) == 1
    dt.unregister("p", h)
    assert dt.system.rules == ()


def test_unregister_rule_removes_by_id():
    dt = DispatchTable()
    dt.register_rule(ClosureRule(id="r", predicate="p", handler=lambda: 1))
    dt.unregister_rule("r")
    assert dt.system.find("r") is None


def test_replace_rule_swaps_handler_and_rotates_version():
    dt = DispatchTable()
    dt.register_rule(ClosureRule(id="r", predicate="p", handler=lambda: "old"))
    v0 = dt.system_version
    dt.replace_rule(ClosureRule(id="r", predicate="p", handler=lambda: "new"))
    assert dt.system_version != v0
    assert dt.dispatch("p") == ["new"]


def test_query_is_pure_read_emits_no_witness(tmp_path):
    """Per *cost-discipline-reads-free*: querying which rules would
    fire on a predicate must never produce a dispatch-channel
    witness. The dispatch table's ``query`` proxies the rule
    system's pure ``query`` method."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: "x")
    # Snapshot dispatch witnesses (ignoring the registration's
    # learning-channel audit, which IS a write).
    before = list(log.read_all(channel="dispatch"))
    for _ in range(10):
        dt.query("p")
        dt.query("absent")
    after = list(log.read_all(channel="dispatch"))
    assert len(before) == len(after) == 0


def test_query_returns_only_handler_carrying_rules_via_handlers_for():
    """Policy-only rules (handler=None) appear in ``query`` and
    contribute to the system, but are skipped by ``handlers_for``
    and by dispatch firing."""
    dt = DispatchTable()
    dt.register_rule(ClosureRule(id="policy-only", predicate="p",
                                 handler=None, description="shadow"))
    dt.register_rule(ClosureRule(id="real", predicate="p",
                                 handler=lambda: "ok"))
    matched = dt.query("p")
    assert [r.id for r in matched] == ["policy-only", "real"]
    handlers = dt.handlers_for("p")
    assert len(handlers) == 1


def test_dispatch_skips_policy_only_rules(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="shadow", predicate="p", handler=None))
    dt.register_rule(ClosureRule(id="real", predicate="p",
                                 handler=lambda: "ok"))
    assert dt.dispatch("p") == ["ok"]
    [hit] = [w for w in log.read_all(channel="dispatch")
             if w.details.get("outcome") == "hit"]
    assert hit.details["rule-ids"] == ["real"]
    assert hit.details["handler_count"] == 1


# --- witness rule-system-version stamping -----------------------------


def test_dispatch_hit_witness_carries_rule_system_version(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: "x")
    expected_version = dt.system_version
    dt.dispatch("p")
    [hit] = [w for w in log.read_all(channel="dispatch")
             if w.details.get("outcome") == "hit"]
    assert hit.details["rule-system-version"] == expected_version
    assert hit.details["rule-system-id"] == "default"
    assert len(hit.details["rule-ids"]) == 1
    assert hit.details["rule-ids"][0].startswith("p::")


def test_dispatch_miss_witness_carries_rule_system_version(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    expected_version = dt.system_version
    dt.dispatch("absent")
    [miss] = [w for w in log.read_all(channel="dispatch")
              if w.details.get("outcome") == "miss"]
    assert miss.details["rule-system-version"] == expected_version
    assert miss.details["rule-system-id"] == "default"


def test_dispatch_handler_error_witness_cites_firing_rule(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="bad-rule", predicate="p",
                                 handler=lambda: 1 / 0))
    expected_version = dt.system_version
    dt.dispatch_safe("p")
    [err] = [w for w in log.read_all(channel="dispatch")
             if w.details.get("outcome") == "handler_error"]
    assert err.details["rule-id"] == "bad-rule"
    assert err.details["rule-system-version"] == expected_version


def test_dispatch_hit_with_multiple_rules_lists_all_rule_ids(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="r-a", predicate="p", handler=lambda: 1))
    dt.register_rule(ClosureRule(id="r-b", predicate="p", handler=lambda: 2))
    dt.dispatch("p")
    [hit] = [w for w in log.read_all(channel="dispatch")
             if w.details.get("outcome") == "hit"]
    assert hit.details["rule-ids"] == ["r-a", "r-b"]
    assert hit.details["handler_count"] == 2


def test_diagnosis_witness_includes_rule_id_and_version(tmp_path):
    """The Reflexion-pattern diagnosis is what the failure-loop
    composes against. It must carry enough to recompute the
    decision: the firing rule and the rule-system version."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="r", predicate="p",
                                 handler=lambda: 1 / 0))
    expected_version = dt.system_version
    dt.dispatch_safe("p")
    [diag] = list(log.read_all(channel="learning", operator="diagnose"))
    assert diag.details["related"]["rule-id"] == "r"
    assert diag.details["related"]["rule-system-version"] == expected_version


# --- rule-edit audit witnesses ----------------------------------------


def test_register_emits_closure_rule_extend_witness(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    v0 = dt.system_version
    dt.register("p", lambda: "x")
    [edit] = list(log.read_all(operator="closure_rule_extend"))
    assert edit.channel == "learning"
    assert edit.kind == "learning"
    assert edit.before_hash == v0
    assert edit.after_hash == dt.system_version
    assert edit.details["prior-rule-system-version"] == v0
    assert edit.details["rule-system-version"] == dt.system_version
    assert edit.details["rule-predicate"] == "p"
    assert edit.details["rule-kind"] == "procedure"
    # Target IS the rule id — gives the audit a primary key.
    assert edit.target == edit.details["rule-id"]


def test_unregister_emits_closure_rule_retract_witness(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="r", predicate="p", handler=lambda: 1))
    v_before_retract = dt.system_version
    dt.unregister_rule("r")
    [retract] = list(log.read_all(operator="closure_rule_retract"))
    assert retract.channel == "learning"
    assert retract.target == "r"
    assert retract.before_hash == v_before_retract
    assert retract.after_hash == dt.system_version
    assert retract.details["rule-predicate"] == "p"


def test_replace_rule_emits_closure_rule_replace_witness(tmp_path):
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register_rule(ClosureRule(id="r", predicate="p", handler=lambda: 1))
    v_before = dt.system_version
    dt.replace_rule(ClosureRule(id="r", predicate="p", handler=lambda: 2,
                                description="upgraded"))
    [rep] = list(log.read_all(operator="closure_rule_replace"))
    assert rep.before_hash == v_before
    assert rep.after_hash == dt.system_version
    assert rep.target == "r"


def test_unregister_absent_id_emits_retract_with_outcome_absent(tmp_path):
    """Per the substrate-edit discipline: even attempts to retract a
    non-existent rule are recorded — the audit chain must be truthful
    about every edit attempt, not silently elide no-ops."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.unregister_rule("never-existed")
    [retract] = list(log.read_all(operator="closure_rule_retract"))
    assert retract.target == "never-existed"
    assert retract.details["outcome"] == "absent"


def test_rule_edit_witnesses_are_kind_learning(tmp_path):
    """Per OPERATOR_KIND registry (Round 14 / WOAH #5 + Round 15
    addition): closure_rule_* operators classify as learning, since
    editing the dispatch policy IS the substrate editing its own
    closure-rule system."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: 1)
    dt.register_rule(ClosureRule(id="r2", predicate="q", handler=lambda: 2))
    dt.unregister_rule("r2")
    edits = list(log.read_all(channel="learning"))
    assert len(edits) == 3
    assert all(w.kind == "learning" for w in edits)


def test_dispatch_channel_only_carries_decisions_not_edits(tmp_path):
    """A clean separation: rule-system edits ride the learning
    channel; the dispatch channel is reserved for dispatch decisions
    (hit / miss / handler_error). An audit join by rule-system
    version reconstructs the timeline."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: "ok")  # edit -> learning
    dt.dispatch("p")  # decision -> dispatch
    dt.dispatch("absent")  # decision -> dispatch
    dispatch_ops = {w.operator for w in log.read_all(channel="dispatch")}
    learning_ops = {w.operator for w in log.read_all(channel="learning")}
    assert dispatch_ops == {"dispatch"}
    assert "closure_rule_extend" in learning_ops


# --- replay discipline: same version, same dispatch ------------------


def test_two_tables_same_rules_have_same_version(tmp_path):
    """Per *settlement-determinism*: dispatch behavior is fully
    determined by ``(event log, rule-system version)``. Two tables
    constructed identically must produce identical version hashes —
    if not, replay across substrates becomes impossible."""
    rule = ClosureRule(id="r", predicate="p", handler=lambda: 1,
                       kind="procedure", description="d")
    dt1 = DispatchTable()
    dt1.register_rule(rule)
    dt2 = DispatchTable()
    dt2.register_rule(rule)
    assert dt1.system_version == dt2.system_version


def test_register_rejects_unstable_callable_with_corrective_error():
    """Per the dispatch-as-closure-rule-system theorem's
    settlement-determinism property: ``register`` must refuse a
    handler whose identity is not process-stable. The error names
    both fixes: wrap in a named function or use ``register_rule``
    with an explicit rule id."""
    dt = DispatchTable()
    from functools import partial
    p = partial(_named_handler)
    with pytest.raises(UnstableCallableError, match="wrap it in a named function"):
        dt.register("p", p)


def test_register_rule_accepts_unstable_callable_with_explicit_id():
    """The escape hatch: a caller who supplies an explicit id takes
    responsibility for stability, but ``canonical_form`` will still
    refuse to hash an unstable handler at version-hash time. So the
    escape hatch only works for *policy-only* (handler=None) rules
    or for handlers wrapped to override ``__repr__``."""
    dt = DispatchTable()
    # Rule registers fine (id is explicit), but version_hash will
    # fail because canonical_form refuses unstable handlers.
    dt.register_rule(ClosureRule(id="explicit",
                                 predicate="p",
                                 handler=_UnstableCallable()))
    with pytest.raises(UnstableCallableError):
        _ = dt.system_version


def test_register_named_function_is_process_stable():
    """Two DispatchTables, each registering the same module-level
    function, must produce identical synthesized rule ids and
    identical version hashes — the precondition for cross-process
    replay."""
    dt1 = DispatchTable()
    dt1.register("p", _named_handler)
    dt2 = DispatchTable()
    dt2.register("p", _named_handler)
    assert dt1.system_version == dt2.system_version
    assert [r.id for r in dt1.system.rules] == [r.id for r in dt2.system.rules]
    # The synthesized id is "predicate::module.qualname" — no address.
    assert " at 0x" not in dt1.system.rules[0].id


def test_predecessor_chain_is_traversable_via_event_log(tmp_path):
    """Per closure-rule-system.md *Audit*: an auditor can replay the
    rule-system's history by walking the predecessor chain. The
    chain is reconstructable from the learning-channel edit
    witnesses (each carries before_hash and after_hash)."""
    log = EventLog(root=tmp_path)
    dt = DispatchTable(event_log=log)
    dt.register("p", lambda: 1)
    dt.register("q", lambda: 2)
    dt.register("r", lambda: 3)
    edits = [w for w in log.read_all(operator="closure_rule_extend")]
    assert len(edits) == 3
    # Each edit's before_hash equals the prior edit's after_hash —
    # the chain is contiguous.
    for prior, nxt in zip(edits, edits[1:]):
        assert nxt.before_hash == prior.after_hash
    # Final after_hash equals the table's current version.
    assert edits[-1].after_hash == dt.system_version
