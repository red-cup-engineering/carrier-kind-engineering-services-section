"""Closure rules and closure-rule systems — the substrate's programmable layer.

Round 15 / WOAH #6 — *dispatch is a sub-rule-system of the substrate's
closure-rule system* (per the AOP theorem
``dispatch-as-closure-rule-system``). The runtime dispatcher used to be a
procedural ``predicate -> handler`` map; it is now backed by a first-class
``ClosureRuleSystem`` of ``ClosureRule`` records. Three engineering payoffs
unlocked by the lift, per the theorem:

  - **Dispatch decisions are replayable.** Every dispatch witness now
    carries the ``rule-system-version`` hash that was active when it
    fired and the ``rule-id`` of the rule that fired. An auditor
    replaying the event log can verify *which* rule produced *which*
    decision under *which* configuration.

  - **Dispatch policy edits are substrate operations.** Adding,
    removing, or modifying a dispatch rule produces a *new* rule-system
    version with a `predecessor` link to the prior version. The history
    of how the dispatch policy evolved is a chain in substrate content,
    not an opaque diff in runtime code.

  - **Dispatch is queryable as a free read.** Per
    *cost-discipline-reads-free*, asking "which rules fire on this
    predicate?" never emits a witness — ``ClosureRuleSystem.query`` is
    pure. The same traversal that fires a dispatch can be invoked in
    dry-run mode by the caller.

Match-and-conclude discipline (per ``closure-rule.md``):

  - **Deterministic.** Given the same rule system and the same
    predicate, ``query`` returns the same rules in the same order
    (registration order, stable across iterations).
  - **Bounded match radius.** A rule's premise is ``rule.predicate ==
    incoming_predicate`` — a single substrate cell, the smallest possible
    radius. Glob/regex premises are out of scope for this round; if added
    later, the matcher must declare an explicit max-radius bound.
  - **First-class.** Each rule is a ``ClosureRule`` record with an
    explicit ``id``, queryable by predicate, hashable into the
    rule-system version.

The four-position ``closure-kind`` taxonomy applies (per
``closure-kind.md``): a procedural dispatch rule is kind ``"procedure"``
(routing — past-saturation stable, transfer-direction open). The other
three kinds (``"process"``, ``"derivation"``, ``"inquiry"``) are admitted
by the data model but are not yet emitted by the dispatch layer.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field, replace
from typing import Any, Callable, Literal


Handler = Callable[..., Any]


# CPython's default object __repr__ format embeds a memory address as
# "... at 0x...>". A handler whose stable identity falls back to that
# repr would hash differently across processes — breaking the
# settlement-determinism property the dispatch-as-closure-rule-system
# theorem requires (same rules → same version hash → same dispatch).
# We detect and reject such handlers up-front rather than silently
# producing process-variant rule ids.
_HEX_ADDRESS_RE = re.compile(r" at 0x[0-9a-fA-F]+>")


class UnstableCallableError(ValueError):
    """Raised when a handler lacks a process-stable identity.

    A handler is process-stable iff its identity digest does not depend
    on a runtime-allocated memory address. Plain functions, lambdas
    (including those assigned to variables in tests), bound methods,
    and classmethods all qualify because CPython gives them
    ``__qualname__``. Non-qualifying common cases include
    ``functools.partial`` instances, callable objects whose class does
    not override ``__repr__``, and lambdas constructed dynamically
    without a qualified name.

    The fix is either to wrap the unstable callable in a named function
    (the new function inherits its module + qualname from its
    definition site) or to construct the ``ClosureRule`` directly with
    an explicit ``id`` and use ``register_rule`` instead of
    ``register``. The error message names both options.
    """


def stable_callable_id(handler: Handler | None) -> str:
    """Return a process-stable identity string for ``handler``.

    Per the dispatch-as-closure-rule-system theorem: rule ids and the
    rule-system version hash must be reproducible across process
    restarts so that ``settlement-determinism`` holds (same event log
    + same rule-system version → byte-identical replay).

    Resolution order:
      1. ``None`` → ``"<none>"`` (policy-only rules are stable: their
         identity is the absence of a handler).
      2. ``__qualname__`` present (functions, lambdas, bound methods,
         classes) → ``module.qualname``.
      3. Fall back to ``repr(handler)`` *only if* the repr does not
         embed a hex memory address. (Callable objects whose class
         overrides ``__repr__`` to return a stable string are
         admissible; default-repr instances are not.)
      4. Otherwise raise :class:`UnstableCallableError` with corrective
         guidance — the caller must supply an explicit rule id via
         ``register_rule`` or wrap the callable in a named function.
    """
    if handler is None:
        return "<none>"
    qual = getattr(handler, "__qualname__", None)
    if qual:
        module = getattr(handler, "__module__", None) or "<unknown-module>"
        return f"{module}.{qual}"
    rep = repr(handler)
    if _HEX_ADDRESS_RE.search(rep) is None:
        return rep
    raise UnstableCallableError(
        f"handler {handler!r} has no __qualname__ and its repr embeds "
        f"a memory address, so its identity is not stable across "
        f"process restarts. Either wrap it in a named function (e.g. "
        f"`def my_handler(...): return ...; dt.register('p', "
        f"my_handler)`) or construct a ClosureRule with an explicit "
        f"`id` and use `register_rule` instead of `register`."
    )


ClosureKind = Literal["process", "derivation", "procedure", "inquiry"]
"""The four-position closure-kind taxonomy (per ``closure-kind.md``).

  - **process** — both closures stable; pure deterministic function.
  - **derivation** — past-recognition open (substrate is producing
    novel content under a fixed conclusion shape).
  - **procedure** — transfer-direction open (substrate is choosing
    the next step). Dispatch rules default to this.
  - **inquiry** — both closures open; unstructured exploration.

The mapping to the predication-categories formulation: closure kind
declares which of the substrate's two algebraic moves (extension via
twist-product fusion, restriction via twist-product right residual)
the operation leaves *open*."""


CLOSURE_KINDS: tuple[ClosureKind, ...] = (
    "process",
    "derivation",
    "procedure",
    "inquiry",
)
"""Canonical iteration order for closure-kind distribution reports."""


RuleLanguageFragment = Literal["quantifier-free", "with-forall-blocks"]
"""The two fragments of the closure-rule language that determine the
substrate's regime (per ``closure-rule-system.md`` and the
*four-regime-dichotomy* theorem).

  - **quantifier-free** — antecedents have no $\\forall$-blocks. The
    generated closure operator is Scott-continuous, so the substrate's
    closure ordinal is at most $\\omega$ and dispatch state is
    checkpointable (per *scott-continuity-as-checkpointability*). The
    current dispatch matcher (``rule.predicate == incoming``) is
    trivially quantifier-free, so dispatch rule systems default to
    this fragment.
  - **with-forall-blocks** — antecedents may use $\\forall$-blocks
    over the agent / cell population. The generated closure operator
    may be non-Scott-continuous (transfinite-bounded or aperiodic
    regime), which carries irreducible $H^1$ content and additional
    storage / replication / audit obligations. Reserved for future
    rule kinds (e.g. matching policies that quantify over agent
    capability sets); present in the data model so the regime
    classification is explicit substrate content."""

RULE_LANGUAGE_FRAGMENTS: tuple[RuleLanguageFragment, ...] = (
    "quantifier-free",
    "with-forall-blocks",
)


@dataclass(frozen=True)
class ClosureRule:
    """A first-class closure-rule record.

    Per ``closure-rule.md``: a unit of inference with a *premise* (the
    substrate pattern that triggers application) and a *conclusion*
    (what the rule produces). For the dispatch case the premise is the
    predicate-equality test ``incoming == self.predicate`` and the
    conclusion is the handler's effect.

    Fields:

      - ``id`` — kebab-case identifier, unique within a rule system.
        Used for replay (the witness cites this), for the version hash
        (the rule's contribution to the system's hash is keyed by id),
        and for ``query`` enumeration ordering.
      - ``predicate`` — the substrate predicate slug the rule matches.
        Single exact-match for now (bounded match radius = 1).
      - ``handler`` — the callable invoked when the rule fires. May be
        ``None`` for a "policy-only" rule that records intent without
        side-effects (useful for dry-run / shadow-deploy discipline).
      - ``kind`` — the closure-kind classification. Default
        ``"procedure"`` (the dispatch case).
      - ``description`` — one-line human-readable summary. Optional;
        included in the canonical form so changing the description
        rotates the version hash (descriptions are substrate content).
    """
    id: str
    predicate: str
    handler: Handler | None = None
    kind: ClosureKind = "procedure"
    description: str = ""

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("ClosureRule.id is required (kebab-case).")
        if not self.predicate:
            raise ValueError("ClosureRule.predicate is required.")
        if self.kind not in CLOSURE_KINDS:
            raise ValueError(
                f"ClosureRule.kind={self.kind!r} is not one of "
                f"{CLOSURE_KINDS}."
            )

    def canonical_form(self) -> bytes:
        """Deterministic byte form for hashing.

        Includes ``id``, ``predicate``, ``kind``, ``description``, and a
        stable-name digest of the handler. Two rules with the same
        substrate-visible content produce identical bytes; two rules
        differing in any field produce different bytes. Used as the
        per-rule contribution to ``ClosureRuleSystem.version_hash``.

        The handler digest is its qualified name when available (a
        ``FunctionType``), or its ``repr`` otherwise. This is *not*
        bytecode-comparable — two handlers with the same name but
        different bodies hash identically, by design: the substrate
        records *which rule* fired, not *which bytecode*. Bytecode
        identity belongs to the runtime audit, not the rule-system
        audit.
        """
        h = stable_callable_id(self.handler)
        # Use NUL separators; field names not encoded (positional
        # canonical form). Keep the order stable forever.
        parts = [
            f"id={self.id}",
            f"predicate={self.predicate}",
            f"kind={self.kind}",
            f"description={self.description}",
            f"handler={h}",
        ]
        return "\0".join(parts).encode("utf-8")


@dataclass(frozen=True)
class ClosureRuleSystem:
    """The substrate's complete *active rule set* for a region.

    Per ``closure-rule-system.md``: the queryable, versionable record
    of which rules the engine reads when it settles. For dispatch this
    is the dispatch table's policy.

    Fields:

      - ``id`` — kebab-case identifier (commonly ``"default"``,
        ``"strict"``, etc.).
      - ``rules`` — tuple of ``ClosureRule`` records, in registration
        order. Acts as the system's contents; the version hash is
        derived from this.
      - ``predecessor_hash`` — optional; the version hash of the prior
        rule-system version this one extends. Lets an auditor traverse
        the predecessor chain back to bootstrap.
      - ``predecessor_id`` — optional; the id of the prior version.
        Carried alongside the hash because two rule systems with the
        same content can have different ids.

    Operations are *substrate edits*: ``extend`` and ``without`` return
    *new* rule systems with the prior system as predecessor, never
    mutating the existing one. Frozen dataclass enforces immutability.
    """
    id: str = "default"
    rules: tuple[ClosureRule, ...] = ()
    predecessor_hash: str | None = None
    predecessor_id: str | None = None
    rule_language_fragment: RuleLanguageFragment = "quantifier-free"
    """The fragment of the closure-rule language the system's rules
    are drawn from. Determines the regime of the substrate's settling
    (per *four-regime-dichotomy*) and hence which engine disciplines
    apply (per *federation-convergence*, *wavefront-termination*).

    Default ``"quantifier-free"``: the current dispatch matcher is
    predicate-equality, which is trivially quantifier-free. A future
    matcher with $\\forall$-blocks must declare
    ``"with-forall-blocks"`` so the substrate's audit knows to apply
    the non-Scott-continuous discipline."""

    def __post_init__(self) -> None:
        if not self.id:
            raise ValueError("ClosureRuleSystem.id is required.")
        if self.rule_language_fragment not in RULE_LANGUAGE_FRAGMENTS:
            raise ValueError(
                f"rule_language_fragment={self.rule_language_fragment!r} "
                f"is not one of {RULE_LANGUAGE_FRAGMENTS}."
            )
        seen: set[str] = set()
        for rule in self.rules:
            if rule.id in seen:
                raise ValueError(
                    f"duplicate rule id {rule.id!r} in rule system "
                    f"{self.id!r}; rule ids must be unique."
                )
            seen.add(rule.id)

    @property
    def version_hash(self) -> str:
        """Canonical-form hash of the rule-system's content.

        Per ``closure-rule-system.md``: two rule systems with byte-
        identical content (same id, same rules in the same order, same
        predecessor link) produce identical version hashes; different
        content produces different hashes.

        Returns the first 16 hex chars of a sha256 — short enough for
        compact citation in witness ``details``, long enough that
        accidental collision is implausible (~10^-19) for any realistic
        substrate. Auditors who need a stronger guarantee can recompute
        the full digest from the system's content.
        """
        h = hashlib.sha256()
        h.update(f"system-id={self.id}\n".encode("utf-8"))
        h.update(
            f"fragment={self.rule_language_fragment}\n".encode("utf-8")
        )
        h.update(
            f"predecessor={self.predecessor_id or ''}:"
            f"{self.predecessor_hash or ''}\n".encode("utf-8")
        )
        for rule in self.rules:
            h.update(rule.canonical_form())
            h.update(b"\n")
        return h.hexdigest()[:16]

    def query(self, predicate: str) -> tuple[ClosureRule, ...]:
        """Enumerate rules whose premise matches ``predicate``.

        Per the dispatch theorem's *cost-discipline-reads-free*
        consequence: this method emits no witness and has no
        side-effects. Callers may use it for dry-run / shadow-deploy /
        policy-preview without polluting the dispatch channel.

        Match radius is 1: a rule matches iff ``rule.predicate ==
        predicate``. Order is registration order (stable across calls).
        """
        return tuple(r for r in self.rules if r.predicate == predicate)

    def find(self, rule_id: str) -> ClosureRule | None:
        """Return the rule with the given id, or ``None`` if absent."""
        for rule in self.rules:
            if rule.id == rule_id:
                return rule
        return None

    def predicates(self) -> tuple[str, ...]:
        """All predicates with at least one rule, in first-occurrence order.

        Used by audit / introspection paths that ask "what work types
        does this rule system route?"."""
        seen: list[str] = []
        seen_set: set[str] = set()
        for rule in self.rules:
            if rule.predicate not in seen_set:
                seen.append(rule.predicate)
                seen_set.add(rule.predicate)
        return tuple(seen)

    def kind_distribution(self) -> dict[ClosureKind, int]:
        """Count of rules per closure-kind, in canonical order.

        Per ``closure-rule-system.md``: the substrate exposes the
        rule-set's closure-kind distribution as a derived field, since
        it telegraphs what the substrate's settling computation looks
        like under this rule set. A dispatch system with all rules in
        ``"procedure"`` is pure routing; one with ``"derivation"`` rules
        is doing on-line content production during dispatch.
        """
        counts: dict[ClosureKind, int] = {k: 0 for k in CLOSURE_KINDS}
        for rule in self.rules:
            counts[rule.kind] += 1
        return counts

    # --- substrate-edit operations ---------------------------------

    def extend(self, rule: ClosureRule) -> "ClosureRuleSystem":
        """Return a new rule system with ``rule`` appended.

        Per ``closure-rule-system.md`` *Extend*: adding a rule produces
        a new rule-system version with a ``predecessor`` link to the
        prior version. The new system's version hash differs from the
        prior version's (because the canonical form has changed); the
        prior system is unmodified (frozen dataclass).

        Raises ``ValueError`` if a rule with ``rule.id`` already exists
        in the system — rule ids are unique per system.
        """
        if self.find(rule.id) is not None:
            raise ValueError(
                f"rule id {rule.id!r} already exists in rule system "
                f"{self.id!r}; use ``replace_rule`` to update."
            )
        return replace(
            self,
            rules=self.rules + (rule,),
            predecessor_hash=self.version_hash,
            predecessor_id=self.id,
        )

    def without(self, rule_id: str) -> "ClosureRuleSystem":
        """Return a new rule system with the rule of given id removed.

        No-op if the id is absent (returns a new system with the same
        rules but with the predecessor link updated, since the *intent*
        to retract is itself substrate content). To check first whether
        a rule is present, use ``find``.
        """
        new_rules = tuple(r for r in self.rules if r.id != rule_id)
        return replace(
            self,
            rules=new_rules,
            predecessor_hash=self.version_hash,
            predecessor_id=self.id,
        )

    def replace_rule(self, rule: ClosureRule) -> "ClosureRuleSystem":
        """Return a new rule system with ``rule.id`` replaced by ``rule``.

        Raises ``ValueError`` if no rule with ``rule.id`` exists. Used
        to update a rule's handler / kind / description while keeping
        its identity stable across a substrate edit.
        """
        if self.find(rule.id) is None:
            raise ValueError(
                f"rule id {rule.id!r} not present in rule system "
                f"{self.id!r}; use ``extend`` to add."
            )
        new_rules = tuple(rule if r.id == rule.id else r for r in self.rules)
        return replace(
            self,
            rules=new_rules,
            predecessor_hash=self.version_hash,
            predecessor_id=self.id,
        )


__all__ = [
    "CLOSURE_KINDS",
    "ClosureKind",
    "ClosureRule",
    "ClosureRuleSystem",
    "Handler",
    "RULE_LANGUAGE_FRAGMENTS",
    "RuleLanguageFragment",
    "UnstableCallableError",
    "stable_callable_id",
]
