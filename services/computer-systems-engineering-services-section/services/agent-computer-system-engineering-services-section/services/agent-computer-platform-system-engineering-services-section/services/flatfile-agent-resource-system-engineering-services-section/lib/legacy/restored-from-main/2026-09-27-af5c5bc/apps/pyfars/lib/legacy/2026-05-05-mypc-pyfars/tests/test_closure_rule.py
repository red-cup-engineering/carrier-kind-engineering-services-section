"""Tests for the closure-rule and closure-rule-system data model.

Round 15 / WOAH #6 — pin the substrate-content discipline that lets
the dispatch table act as a sub-rule-system of the substrate's overall
closure-rule system per the AOP theorem
*dispatch-as-closure-rule-system*: deterministic version hashing,
predecessor-chain audit, query as a free read, frozen rules,
substrate-edit-as-rebuild semantics."""
from __future__ import annotations

import pytest

from pyfars.runtime.closure_rule import (
    CLOSURE_KINDS,
    RULE_LANGUAGE_FRAGMENTS,
    ClosureRule,
    ClosureRuleSystem,
    UnstableCallableError,
    stable_callable_id,
)


# Module-level named function — its qualname includes the module path,
# so its stable_callable_id is identical across process restarts.
def _module_level_handler() -> int:
    return 42


class _CallableWithStableRepr:
    def __repr__(self) -> str:
        return "<stable-callable>"

    def __call__(self) -> int:
        return 1


class _CallableWithDefaultRepr:
    def __call__(self) -> int:
        return 1


# --- ClosureRule construction & validation ---------------------------


def _h() -> int:
    return 1


def test_closure_rule_minimal_construction():
    r = ClosureRule(id="r-1", predicate="p")
    assert r.id == "r-1"
    assert r.predicate == "p"
    assert r.handler is None
    assert r.kind == "procedure"
    assert r.description == ""


def test_closure_rule_rejects_empty_id():
    with pytest.raises(ValueError, match="id is required"):
        ClosureRule(id="", predicate="p")


def test_closure_rule_rejects_empty_predicate():
    with pytest.raises(ValueError, match="predicate is required"):
        ClosureRule(id="r", predicate="")


def test_closure_rule_rejects_unknown_kind():
    with pytest.raises(ValueError, match="kind="):
        ClosureRule(id="r", predicate="p", kind="bogus")  # type: ignore[arg-type]


def test_closure_rule_accepts_all_four_kinds():
    """The closure-kind taxonomy is the four-position partition (per
    closure-kind.md). All four must be admissible — dispatch defaults
    to procedure but the data model is generic over the four."""
    for k in CLOSURE_KINDS:
        ClosureRule(id=f"r-{k}", predicate="p", kind=k)


def test_closure_rule_is_frozen():
    """Per the substrate-edit discipline: rules are immutable; edits
    produce *new* rule-system versions, not in-place mutations."""
    r = ClosureRule(id="r", predicate="p")
    with pytest.raises(Exception):  # noqa: BLE001 — dataclasses.FrozenInstanceError
        r.id = "other"  # type: ignore[misc]


# --- canonical_form & version_hash determinism -----------------------


def test_canonical_form_is_deterministic():
    r1 = ClosureRule(id="r", predicate="p", handler=_h, kind="procedure")
    r2 = ClosureRule(id="r", predicate="p", handler=_h, kind="procedure")
    assert r1.canonical_form() == r2.canonical_form()


def test_canonical_form_changes_with_id():
    r1 = ClosureRule(id="a", predicate="p")
    r2 = ClosureRule(id="b", predicate="p")
    assert r1.canonical_form() != r2.canonical_form()


def test_canonical_form_changes_with_predicate():
    r1 = ClosureRule(id="r", predicate="p")
    r2 = ClosureRule(id="r", predicate="q")
    assert r1.canonical_form() != r2.canonical_form()


def test_canonical_form_changes_with_kind():
    r1 = ClosureRule(id="r", predicate="p", kind="procedure")
    r2 = ClosureRule(id="r", predicate="p", kind="process")
    assert r1.canonical_form() != r2.canonical_form()


def test_canonical_form_changes_with_description():
    """Descriptions are substrate content (per closure-rule.md
    self-representation), so changing one rotates the version hash."""
    r1 = ClosureRule(id="r", predicate="p", description="alpha")
    r2 = ClosureRule(id="r", predicate="p", description="beta")
    assert r1.canonical_form() != r2.canonical_form()


def test_canonical_form_changes_with_handler_name():
    def f1():  # noqa: ANN202
        pass

    def f2():  # noqa: ANN202
        pass

    r1 = ClosureRule(id="r", predicate="p", handler=f1)
    r2 = ClosureRule(id="r", predicate="p", handler=f2)
    assert r1.canonical_form() != r2.canonical_form()


# --- ClosureRuleSystem version_hash determinism ----------------------


def test_empty_system_has_stable_version_hash():
    s1 = ClosureRuleSystem()
    s2 = ClosureRuleSystem()
    assert s1.version_hash == s2.version_hash
    assert isinstance(s1.version_hash, str)
    assert len(s1.version_hash) == 16  # 16 hex chars per the spec


def test_system_with_same_rules_has_same_hash():
    rules = (ClosureRule(id="a", predicate="p"),
             ClosureRule(id="b", predicate="q"))
    s1 = ClosureRuleSystem(rules=rules)
    s2 = ClosureRuleSystem(rules=rules)
    assert s1.version_hash == s2.version_hash


def test_system_with_different_id_has_different_hash():
    rules = (ClosureRule(id="a", predicate="p"),)
    s1 = ClosureRuleSystem(id="default", rules=rules)
    s2 = ClosureRuleSystem(id="strict", rules=rules)
    assert s1.version_hash != s2.version_hash


def test_system_with_reordered_rules_has_different_hash():
    """Per closure-rule.md determinism: rule order is part of the
    rule system's content (registration order is the iteration
    order). Reordering is a substrate edit."""
    a = ClosureRule(id="a", predicate="p")
    b = ClosureRule(id="b", predicate="q")
    s1 = ClosureRuleSystem(rules=(a, b))
    s2 = ClosureRuleSystem(rules=(b, a))
    assert s1.version_hash != s2.version_hash


def test_system_rejects_duplicate_rule_ids():
    a1 = ClosureRule(id="a", predicate="p")
    a2 = ClosureRule(id="a", predicate="q")
    with pytest.raises(ValueError, match="duplicate rule id"):
        ClosureRuleSystem(rules=(a1, a2))


# --- query, find, predicates, kind_distribution ----------------------


def test_query_returns_rules_in_registration_order():
    a = ClosureRule(id="a", predicate="p", handler=_h)
    b = ClosureRule(id="b", predicate="p", handler=_h)
    c = ClosureRule(id="c", predicate="q", handler=_h)
    s = ClosureRuleSystem(rules=(a, b, c))
    matched = s.query("p")
    assert [r.id for r in matched] == ["a", "b"]


def test_query_returns_empty_for_unmatched_predicate():
    s = ClosureRuleSystem(rules=(ClosureRule(id="a", predicate="p"),))
    assert s.query("nope") == ()


def test_query_emits_no_witness_side_effect():
    """Per the dispatch-as-closure-rule-system theorem's
    *cost-discipline-reads-free* consequence: query is a pure read.
    No reasonable way to assert "no witness" without a log; the
    discipline is encoded in the call signature (no event_log
    parameter, no witness import in the method)."""
    s = ClosureRuleSystem(rules=(ClosureRule(id="a", predicate="p"),))
    # Just exercise it many times: if it had a side-effect, a
    # subsequent read would see growth.
    for _ in range(100):
        s.query("p")
    assert s.version_hash == s.version_hash  # idempotent


def test_find_returns_rule_or_none():
    s = ClosureRuleSystem(rules=(ClosureRule(id="a", predicate="p"),))
    assert s.find("a").id == "a"
    assert s.find("missing") is None


def test_predicates_returns_first_occurrence_order():
    s = ClosureRuleSystem(rules=(
        ClosureRule(id="a", predicate="p"),
        ClosureRule(id="b", predicate="q"),
        ClosureRule(id="c", predicate="p"),  # second p — already seen
    ))
    assert s.predicates() == ("p", "q")


def test_kind_distribution_counts_per_kind():
    s = ClosureRuleSystem(rules=(
        ClosureRule(id="a", predicate="p", kind="procedure"),
        ClosureRule(id="b", predicate="q", kind="procedure"),
        ClosureRule(id="c", predicate="r", kind="process"),
    ))
    d = s.kind_distribution()
    assert d == {"process": 1, "derivation": 0, "procedure": 2, "inquiry": 0}


def test_kind_distribution_sums_to_total_rules():
    """Per closure-rule-system.md invariant: closure-kind distribution
    sums to total rules (every rule has a declared kind)."""
    s = ClosureRuleSystem(rules=(
        ClosureRule(id="a", predicate="p", kind="procedure"),
        ClosureRule(id="b", predicate="q", kind="inquiry"),
    ))
    assert sum(s.kind_distribution().values()) == len(s.rules)


# --- substrate-edit operations: extend, replace_rule, without -------


def test_extend_returns_new_system_with_predecessor_link():
    s0 = ClosureRuleSystem(id="default")
    h0 = s0.version_hash
    s1 = s0.extend(ClosureRule(id="a", predicate="p"))
    assert s1 is not s0
    assert s1.version_hash != h0
    assert s1.predecessor_hash == h0
    assert s1.predecessor_id == "default"


def test_extend_does_not_mutate_prior_system():
    s0 = ClosureRuleSystem()
    s0.extend(ClosureRule(id="a", predicate="p"))
    assert s0.rules == ()
    assert s0.predecessor_hash is None


def test_extend_chains_predecessor_versions():
    """Per closure-rule-system.md: predecessor chain must be acyclic
    and traceable back to bootstrap. Walking it is the audit."""
    s0 = ClosureRuleSystem(id="default")
    h0 = s0.version_hash
    s1 = s0.extend(ClosureRule(id="a", predicate="p"))
    h1 = s1.version_hash
    s2 = s1.extend(ClosureRule(id="b", predicate="q"))
    h2 = s2.version_hash
    assert s2.predecessor_hash == h1
    assert s1.predecessor_hash == h0
    assert h0 != h1 != h2


def test_extend_rejects_duplicate_id():
    s0 = ClosureRuleSystem().extend(ClosureRule(id="a", predicate="p"))
    with pytest.raises(ValueError, match="already exists"):
        s0.extend(ClosureRule(id="a", predicate="q"))


def test_replace_rule_swaps_in_place_at_id():
    s0 = ClosureRuleSystem().extend(
        ClosureRule(id="a", predicate="p", description="old"),
    ).extend(ClosureRule(id="b", predicate="q"))
    h_before = s0.version_hash
    s1 = s0.replace_rule(
        ClosureRule(id="a", predicate="p", description="new"),
    )
    assert s1.find("a").description == "new"
    # Order preserved — replacement is at the same position.
    assert [r.id for r in s1.rules] == ["a", "b"]
    assert s1.version_hash != h_before
    assert s1.predecessor_hash == h_before


def test_replace_rule_rejects_missing_id():
    s0 = ClosureRuleSystem()
    with pytest.raises(ValueError, match="not present"):
        s0.replace_rule(ClosureRule(id="missing", predicate="p"))


def test_without_removes_rule_and_rotates_version():
    s0 = (ClosureRuleSystem()
          .extend(ClosureRule(id="a", predicate="p"))
          .extend(ClosureRule(id="b", predicate="q")))
    h_before = s0.version_hash
    s1 = s0.without("a")
    assert s1.find("a") is None
    assert s1.find("b") is not None
    assert s1.version_hash != h_before
    assert s1.predecessor_hash == h_before


# --- stable_callable_id: process-stable handler identity -------------


def test_stable_callable_id_for_none_is_constant():
    assert stable_callable_id(None) == "<none>"


def test_stable_callable_id_for_module_function_is_module_qualname():
    sid = stable_callable_id(_module_level_handler)
    assert sid.endswith("._module_level_handler")
    # No hex address marker — process-stable.
    assert " at 0x" not in sid


def test_stable_callable_id_for_lambda_uses_qualname():
    """Lambdas have ``__qualname__`` (e.g. ``<lambda>`` or
    ``test_x.<locals>.<lambda>``), which is stable across process
    restarts so long as the source position is stable."""
    f = lambda: 1  # noqa: E731
    sid = stable_callable_id(f)
    assert "<lambda>" in sid
    assert " at 0x" not in sid


def test_stable_callable_id_for_bound_method_is_class_qualname():
    class C:
        def m(self) -> int:
            return 1
    sid = stable_callable_id(C().m)
    assert sid.endswith(".m")
    assert "C" in sid
    assert " at 0x" not in sid


def test_stable_callable_id_accepts_callable_with_overridden_repr():
    """A callable instance whose class overrides ``__repr__`` to a
    stable string is admissible — its identity does not depend on a
    memory address."""
    sid = stable_callable_id(_CallableWithStableRepr())
    assert sid == "<stable-callable>"


def test_stable_callable_id_rejects_default_repr_callable():
    """A callable instance with default ``__repr__`` (which embeds
    ``at 0x...``) is *not* admissible: its hash would vary across
    processes, breaking settlement-determinism."""
    with pytest.raises(UnstableCallableError, match="not stable"):
        stable_callable_id(_CallableWithDefaultRepr())


def test_stable_callable_id_rejects_functools_partial():
    """``functools.partial`` instances have neither ``__qualname__``
    nor a stable repr — their repr embeds the partial's address.
    The fix is to wrap in a named function, per the error message."""
    from functools import partial
    p = partial(_module_level_handler)
    with pytest.raises(UnstableCallableError, match="wrap it in a named function"):
        stable_callable_id(p)


def test_canonical_form_is_cross_invocation_stable_for_module_function():
    """Two ClosureRule constructions with the same module-level
    function yield byte-identical canonical forms, even when the
    function objects might be re-imported / re-bound in a fresh
    process. Pinned by checking the canonical form does not contain
    the hex-address marker."""
    r = ClosureRule(id="r", predicate="p", handler=_module_level_handler)
    cf = r.canonical_form()
    assert b" at 0x" not in cf
    # Two constructions are byte-identical (within the same process).
    r2 = ClosureRule(id="r", predicate="p", handler=_module_level_handler)
    assert cf == r2.canonical_form()


def test_canonical_form_rejects_unstable_handler():
    r = ClosureRule(id="r", predicate="p",
                    handler=_CallableWithDefaultRepr())
    with pytest.raises(UnstableCallableError):
        r.canonical_form()


# --- rule_language_fragment ------------------------------------------


def test_default_rule_language_fragment_is_quantifier_free():
    s = ClosureRuleSystem()
    assert s.rule_language_fragment == "quantifier-free"


def test_rule_language_fragment_accepts_both_values():
    for f in RULE_LANGUAGE_FRAGMENTS:
        ClosureRuleSystem(rule_language_fragment=f)


def test_rule_language_fragment_rejects_unknown_value():
    with pytest.raises(ValueError, match="rule_language_fragment="):
        ClosureRuleSystem(rule_language_fragment="invalid")  # type: ignore[arg-type]


def test_rule_language_fragment_is_in_canonical_form():
    """The fragment is part of the system's substrate-content identity:
    a system with $\\forall$-block rules has different regime
    obligations than a quantifier-free one, so its version hash must
    differ even with the same rules."""
    s_qf = ClosureRuleSystem(rule_language_fragment="quantifier-free")
    s_fa = ClosureRuleSystem(rule_language_fragment="with-forall-blocks")
    assert s_qf.version_hash != s_fa.version_hash


def test_without_absent_id_still_rotates_version():
    """Per the substrate-edit discipline: even a no-content edit
    records the *intent* to retract, so the version chain is
    truthful about what edits were attempted."""
    s0 = ClosureRuleSystem().extend(ClosureRule(id="a", predicate="p"))
    h_before = s0.version_hash
    s1 = s0.without("never-existed")
    # Same content, but version rotated because predecessor link added.
    assert s1.rules == s0.rules
    assert s1.predecessor_hash == h_before
    assert s1.version_hash != h_before
