"""Dispatch table — predication-cell-based message routing.

A DispatchTable maps a predicate (a string slug naming a kind of work)
to a handler — either a callable or a registered agent. When the
heartbeat selects an unsettled flatfile and emits a tick under some
predicate, the dispatch table routes it to the right handler.

This is distinct from the CLI dispatch in ``pyfars.cli`` (which routes
verb-name → CLI subcommand). Dispatch here is *predication-cell-based*:
the routing key is a predicate slug naming the work type.

Round 15 / WOAH #6: the table is now backed by a first-class
:class:`ClosureRuleSystem` (per the AOP theorem
*dispatch-as-closure-rule-system*). Each ``register`` call synthesizes a
``ClosureRule`` record and extends the system, producing a new
rule-system version. Every emitted dispatch witness carries the
``rule-system-version`` hash that was active when it fired and (for
hits) the ``rule-id`` of the firing rule, so an auditor can replay any
past dispatch and verify *which rule under which configuration* produced
*which decision*. The closure-rule layer is the substrate's
*programmable* layer; the runtime is plumbing.

Per the FARS dispatch-and-matching analysis (Voyager re-retrieval-on-
failure, the messaging-and-events synthesis on named conduits) the
table optionally writes a ``Witness`` per dispatch call on
``channel="dispatch"`` with ``origin="dispatch:<predicate>"``. A miss
(no handler registered) records ``truth=0.0`` so consumers can replay
just the misses via ``event_log.read_all(channel="dispatch", ...)``
and feed them into a re-dispatch loop.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from pyfars.operator.witness import make_diagnosis_witness, make_witness
from pyfars.runtime.closure_rule import (
    ClosureRule,
    ClosureRuleSystem,
    Handler,
    stable_callable_id,
)
from pyfars.runtime.event_log import EventLog

__all__ = [
    "DispatchTable",
    "Diagnoser",
    "Handler",
    "HandlerError",
    "MissHandler",
]

MissHandler = Callable[[str, tuple, dict], Any]
"""``(predicate, args, kwargs) -> Any``. Fires when ``dispatch`` is
called with no registered handler for the predicate. The return value
is appended to the dispatch result list, so a miss handler can stand
in as a default response (Voyager re-dispatch pattern)."""

Diagnoser = Callable[[str, BaseException, tuple, dict], "tuple[str, str | None]"]
"""``(predicate, exception, args, kwargs) -> (cause, suggested_response?)``.
Converts a captured handler exception into a structured natural-language
diagnosis for the Reflexion-style learning loop. Returns a 2-tuple of
``(cause, suggested_response)`` — the suggested response may be ``None``
if no remediation is known. Used by ``dispatch_safe`` to write a
``make_diagnosis_witness`` on the ``learning`` channel for every
handler exception."""


def _default_diagnose(predicate: str, exc: BaseException,
                      args: tuple, kwargs: dict) -> tuple[str, str | None]:
    """Fallback diagnoser: extract the exception type and message.

    Per the FARS learning-and-feedback analysis (Reflexion pattern):
    a failure should produce a natural-language WHY that the next
    dispatch can compose against, not just an opaque error code.
    """
    cause = f"{type(exc).__name__}: {exc}"
    return cause, None


@dataclass
class HandlerError:
    """Captured exception from a safe-mode handler invocation.

    Returned in place of the handler's value when ``dispatch_safe``
    catches an exception, so the caller can distinguish ``None``-as-
    return from ``None``-as-failure. The original exception is kept
    on ``exception`` for re-raise / logging if the caller wants it.
    """
    predicate: str
    handler: Handler
    exception: BaseException


def _synthesize_rule_id(predicate: str, handler: Handler) -> str:
    """Build a process-stable id for a rule synthesized from ``register``.

    The id encodes both the predicate (so two handlers under different
    predicates with the same name don't collide) and the handler's
    process-stable identity from ``stable_callable_id`` (module +
    qualname for functions / lambdas / bound methods). Per the
    dispatch-as-closure-rule-system theorem's settlement-determinism
    property, rule ids must be reproducible across process restarts.
    Unstable callables (``functools.partial``, default-repr callable
    instances) raise :class:`UnstableCallableError` here; the caller
    should wrap them in a named function or construct a
    :class:`ClosureRule` with an explicit id and use
    :meth:`DispatchTable.register_rule` instead.
    """
    return f"{predicate}::{stable_callable_id(handler)}"


@dataclass
class DispatchTable:
    """Map from predicate slug to handler, backed by a closure-rule system.

    For each predicate, register one or more handlers. ``dispatch``
    invokes all handlers in registration order and returns their
    results as a list. Single-handler dispatch can ``[0]`` the result.

    Round 15 / WOAH #6: ``register`` synthesizes a :class:`ClosureRule`
    and extends the underlying :class:`ClosureRuleSystem`, producing a
    new rule-system version. The current version is exposed via
    ``system_version`` and is included in every emitted dispatch
    witness's ``details``.

    Optional fields:

    - ``event_log`` — if set, every ``dispatch`` / ``dispatch_safe``
      call records witnesses on ``channel="dispatch"``.
    - ``agent`` — recorded as ``Witness.agent`` on emitted witnesses.
    - ``on_miss`` — invoked when ``dispatch`` is called with no
      registered handler for the predicate; its return value is
      appended to the result list. Per Voyager: this is the hook for
      enriching the query with miss context and retrying.
    - ``system_id`` — the underlying rule-system's id (default
      ``"default"``). Pass an explicit id when running multiple
      dispatch tables side-by-side so their version chains stay
      distinct in the audit log.
    """
    event_log: EventLog | None = None
    agent: str | None = None
    on_miss: MissHandler | None = None
    diagnose: Diagnoser | None = None
    """Optional natural-language diagnoser. When set (or implicitly
    defaulted while ``event_log`` is set), every captured handler
    exception in ``dispatch_safe`` additionally writes a
    ``make_diagnosis_witness`` on ``channel="learning"`` per the
    Reflexion failure-diagnosis pattern."""
    system_id: str = "default"
    _system: ClosureRuleSystem = field(init=False)

    def __post_init__(self) -> None:
        self._system = ClosureRuleSystem(id=self.system_id)

    # ------------------------------------------------------------------
    # Closure-rule-system surface (Round 15 / WOAH #6)
    # ------------------------------------------------------------------

    @property
    def system(self) -> ClosureRuleSystem:
        """The underlying :class:`ClosureRuleSystem`.

        Frozen — callers may inspect (``query``, ``find``,
        ``predicates``, ``kind_distribution``, ``version_hash``,
        ``predecessor_hash``) but should not mutate. Substrate edits go
        through ``register`` / ``register_rule`` / ``unregister`` /
        ``unregister_rule``, which produce new system versions and emit
        the appropriate audit witnesses.
        """
        return self._system

    @property
    def system_version(self) -> str:
        """Current rule-system version hash.

        Stamped on every emitted dispatch witness's ``details`` so the
        audit can replay "what dispatch policy was active when this
        decision fired"."""
        return self._system.version_hash

    def register_rule(self, rule: ClosureRule) -> None:
        """Add a first-class :class:`ClosureRule` to the rule system.

        Per the dispatch-as-closure-rule-system theorem, the addition
        is itself a substrate edit: the rule system's version hash
        rotates and the new system links back to the prior via
        ``predecessor_hash``. When ``event_log`` is set the edit also
        emits a ``closure_rule_extend`` witness so the audit chain has
        an explicit record of the policy change.

        Raises ``ValueError`` if a rule with ``rule.id`` already
        exists; use :meth:`replace_rule` to modify in place.
        """
        prior_version = self._system.version_hash
        self._system = self._system.extend(rule)
        self._witness_rule_edit("closure_rule_extend", rule, prior_version)

    def replace_rule(self, rule: ClosureRule) -> None:
        """Replace the rule with id ``rule.id`` in the rule system.

        Substrate-edit: rotates the version hash and emits a
        ``closure_rule_replace`` witness when ``event_log`` is set.
        Raises ``ValueError`` if no rule with that id exists.
        """
        prior_version = self._system.version_hash
        self._system = self._system.replace_rule(rule)
        self._witness_rule_edit("closure_rule_replace", rule, prior_version)

    def unregister_rule(self, rule_id: str) -> None:
        """Remove the rule with the given id from the rule system.

        No-op (in the substrate-content sense) if the id is absent —
        the system still rotates because the *intent* to retract is
        itself recorded. When ``event_log`` is set, emits a
        ``closure_rule_retract`` witness referencing ``rule_id``.
        """
        prior_version = self._system.version_hash
        prior_rule = self._system.find(rule_id)
        self._system = self._system.without(rule_id)
        self._witness_rule_edit_id(
            "closure_rule_retract", rule_id, prior_rule, prior_version,
        )

    def query(self, predicate: str) -> tuple[ClosureRule, ...]:
        """Enumerate rules whose premise matches ``predicate``.

        Per *cost-discipline-reads-free*: pure read, no witness
        emitted. Order is registration order (stable). Use this for
        dry-run dispatch / policy preview without touching the audit
        channel."""
        return self._system.query(predicate)

    # ------------------------------------------------------------------
    # Back-compat: handler-centric register/unregister
    # ------------------------------------------------------------------

    def register(self, predicate: str, handler: Handler) -> None:
        """Register a handler for a predicate. Multiple handlers per
        predicate are allowed; they fire in registration order.

        Equivalent to constructing a :class:`ClosureRule` with
        ``predicate=predicate``, ``handler=handler``, ``kind="procedure"``,
        and an id synthesized from the predicate and handler name, then
        calling :meth:`register_rule`. Use :meth:`register_rule`
        directly when the rule needs an explicit id, kind, or
        description."""
        rule_id = _synthesize_rule_id(predicate, handler)
        # Two registrations of the same handler for the same predicate
        # would collide on the synthesized id. Disambiguate by
        # appending an instance counter — keeps the legacy behavior
        # (multiple registrations -> multiple firings in order).
        if self._system.find(rule_id) is not None:
            n = 2
            while self._system.find(f"{rule_id}#{n}") is not None:
                n += 1
            rule_id = f"{rule_id}#{n}"
        self.register_rule(ClosureRule(
            id=rule_id,
            predicate=predicate,
            handler=handler,
            kind="procedure",
        ))

    def unregister(self, predicate: str, handler: Handler) -> None:
        """Remove the first synthesized rule matching ``(predicate, handler)``.

        No-op if absent. Removes by handler identity (not equality) to
        match the legacy semantics; if multiple registrations of the
        same handler exist, removes the lowest-numbered instance."""
        for rule in self._system.rules:
            if rule.predicate != predicate:
                continue
            if rule.handler is handler:
                self.unregister_rule(rule.id)
                return

    def handlers_for(self, predicate: str) -> list[Handler]:
        """Return registered handlers for a predicate (empty if none).

        Skips rules whose ``handler`` is ``None`` (policy-only rules);
        callers wanting the rules themselves should use ``query``."""
        return [r.handler for r in self._system.query(predicate)
                if r.handler is not None]

    def predicates(self) -> list[str]:
        """All predicates with at least one registered rule."""
        return list(self._system.predicates())

    # ------------------------------------------------------------------
    # Dispatch (default semantics: exceptions propagate)
    # ------------------------------------------------------------------

    def dispatch(self, predicate: str, *args: Any, **kwargs: Any) -> list[Any]:
        """Invoke all handlers registered for ``predicate``.

        Returns a list of return values, in registration order. If no
        handler is registered, the optional ``on_miss`` is consulted
        (its return value becomes the sole list entry); otherwise the
        result is ``[]``. Handler exceptions propagate — use
        ``dispatch_safe`` for exception capture.

        Each emitted witness includes the rule-system version that was
        active at dispatch time and (for hits) the ids of the rules
        that fired."""
        rules = self._system.query(predicate)
        firing = [r for r in rules if r.handler is not None]
        if not firing:
            return self._handle_miss(predicate, args, kwargs)
        results: list[Any] = []
        succeeded = 0
        try:
            for rule in firing:
                results.append(rule.handler(*args, **kwargs))
                succeeded += 1
        finally:
            self._witness_hits(
                predicate, firing,
                errors=len(firing) - succeeded
                if succeeded < len(firing) else 0,
                succeeded_override=succeeded,
            )
        return results

    # ------------------------------------------------------------------
    # Dispatch (safe semantics: per-handler exception capture)
    # ------------------------------------------------------------------

    def dispatch_safe(self, predicate: str, *args: Any,
                      **kwargs: Any) -> list[Any | HandlerError]:
        """Like ``dispatch`` but each handler's exception is captured
        as a ``HandlerError`` in its slot of the result list.

        One bad handler does not abort the rest — the bilattice-valued
        match strength view from the dispatch analysis. Each captured
        error becomes its own witness with ``truth=0.0`` and the
        exception summary in ``details``.
        """
        rules = self._system.query(predicate)
        firing = [r for r in rules if r.handler is not None]
        if not firing:
            return self._handle_miss(predicate, args, kwargs)
        results: list[Any | HandlerError] = []
        errors = 0
        for rule in firing:
            try:
                results.append(rule.handler(*args, **kwargs))
            except BaseException as exc:  # noqa: BLE001 — intentional broad capture
                results.append(HandlerError(predicate=predicate,
                                            handler=rule.handler,
                                            exception=exc))
                errors += 1
                self._witness_handler_error(predicate, rule, exc)
                self._witness_diagnosis(predicate, rule, exc, args, kwargs)
        self._witness_hits(predicate, firing, errors=errors)
        return results

    # ------------------------------------------------------------------
    # Internal: miss handling and witness emission
    # ------------------------------------------------------------------

    def _handle_miss(self, predicate: str, args: tuple,
                     kwargs: dict) -> list[Any]:
        self._witness_miss(predicate)
        if self.on_miss is None:
            return []
        return [self.on_miss(predicate, args, kwargs)]

    def _dispatch_details(self, **extra: Any) -> dict[str, Any]:
        """Build the common ``details`` dict for a dispatch witness.

        Always includes ``rule-system-version`` (per Round 15 / WOAH #6
        — every dispatch witness cites the rule-system version that
        was active when it fired). Additional kwargs are merged in,
        with the rule-system version always taking precedence so the
        audit field cannot be accidentally shadowed."""
        details: dict[str, Any] = dict(extra)
        details["rule-system-version"] = self._system.version_hash
        details["rule-system-id"] = self._system.id
        return details

    def _witness_miss(self, predicate: str) -> None:
        if self.event_log is None:
            return
        self.event_log.append(make_witness(
            operator="dispatch",
            target=predicate,
            before_hash=None,
            after_hash=None,
            details=self._dispatch_details(outcome="miss", handler_count=0),
            agent=self.agent,
            channel="dispatch",
            origin=f"dispatch:{predicate}",
            truth=0.0,
            evidence=1.0,
        ))

    def _witness_hits(self, predicate: str, firing: list[ClosureRule],
                      *, errors: int,
                      succeeded_override: int | None = None) -> None:
        if self.event_log is None or not firing:
            return
        handler_count = len(firing)
        if succeeded_override is not None:
            succeeded = succeeded_override
        else:
            succeeded = handler_count - errors
        # Truth = fraction of handlers that returned cleanly. Evidence
        # grows with handler_count (more witnesses, more confidence).
        truth = succeeded / handler_count if handler_count else 0.0
        evidence = min(1.0, handler_count / 4.0) if handler_count else 0.0
        details = self._dispatch_details(
            outcome="hit",
            handler_count=handler_count,
            succeeded=succeeded,
            errors=errors,
        )
        # Cite the rules that fired so the audit can map decisions back
        # to specific rule-system entries.
        details["rule-ids"] = [r.id for r in firing]
        self.event_log.append(make_witness(
            operator="dispatch",
            target=predicate,
            before_hash=None,
            after_hash=None,
            details=details,
            agent=self.agent,
            channel="dispatch",
            origin=f"dispatch:{predicate}",
            truth=truth,
            evidence=evidence,
        ))

    def _witness_handler_error(self, predicate: str, rule: ClosureRule,
                               exc: BaseException) -> None:
        if self.event_log is None:
            return
        handler = rule.handler
        details = self._dispatch_details(
            outcome="handler_error",
            handler=getattr(handler, "__qualname__",
                            getattr(handler, "__name__", repr(handler))),
            exception_type=type(exc).__name__,
            exception_message=str(exc),
        )
        details["rule-id"] = rule.id
        self.event_log.append(make_witness(
            operator="dispatch",
            target=predicate,
            before_hash=None,
            after_hash=None,
            details=details,
            agent=self.agent,
            channel="dispatch",
            origin=f"dispatch:{predicate}",
            truth=0.0,
            evidence=1.0,
        ))

    def _witness_diagnosis(self, predicate: str, rule: ClosureRule,
                           exc: BaseException, args: tuple,
                           kwargs: dict) -> None:
        """Emit a Reflexion-style diagnosis on the learning channel.

        Per the FARS learning-and-feedback analysis: failure produces
        a natural-language WHY that the next dispatch can compose
        against, not just an opaque error code. Skipped when there
        is no event log: the diagnoser's only sink is the learning-
        channel witness, so without a log there is nothing to write
        and the diagnoser would be pure cost (and any exception it
        raised would leak into ``dispatch_safe``'s otherwise safe
        loop). Wire ``event_log`` to opt in to learning; do not
        overload ``diagnose`` as a side-effect-free observer.
        """
        if self.event_log is None:
            return
        diagnoser = self.diagnose or _default_diagnose
        cause, suggested = diagnoser(predicate, exc, args, kwargs)
        handler = rule.handler
        self.event_log.append(make_diagnosis_witness(
            target=predicate,
            cause=cause,
            failed_operator="dispatch",
            suggested_response=suggested,
            related={
                "predicate": predicate,
                "handler": getattr(handler, "__qualname__",
                                   getattr(handler, "__name__",
                                           repr(handler))),
                "exception_type": type(exc).__name__,
                "rule-id": rule.id,
                "rule-system-version": self._system.version_hash,
            },
            agent=self.agent,
            origin=f"dispatch:{predicate}",
        ))

    # ------------------------------------------------------------------
    # Internal: rule-edit witness emission (Round 15 / WOAH #6)
    # ------------------------------------------------------------------

    def _witness_rule_edit(self, operator: str, rule: ClosureRule,
                           prior_version: str) -> None:
        """Emit a witness for a substrate-content rule-system edit.

        Per the dispatch-as-closure-rule-system theorem: dispatch
        policy edits are rule-system edits, and rule-system edits are
        substrate operations that produce witnesses. The witness's
        ``details`` records both the new and prior version hashes so
        an auditor can traverse the predecessor chain without having
        to keep the prior system in memory.
        """
        if self.event_log is None:
            return
        self.event_log.append(make_witness(
            operator=operator,
            target=rule.id,
            before_hash=prior_version,
            after_hash=self._system.version_hash,
            details={
                "rule-system-id": self._system.id,
                "rule-system-version": self._system.version_hash,
                "prior-rule-system-version": prior_version,
                "rule-id": rule.id,
                "rule-predicate": rule.predicate,
                "rule-kind": rule.kind,
            },
            agent=self.agent,
            # Rule-system edits are self-modification (learning kind);
            # they ride the "learning" channel so the dispatch channel
            # remains a clean stream of dispatch *decisions*. An audit
            # joining the two channels by ``rule-system-version`` can
            # reconstruct which decisions ran under which policy.
            channel="learning",
            origin=f"dispatch:{self._system.id}",
            truth=1.0,
            evidence=1.0,
        ))

    def _witness_rule_edit_id(self, operator: str, rule_id: str,
                              prior_rule: ClosureRule | None,
                              prior_version: str) -> None:
        """Like ``_witness_rule_edit`` but for retractions (no rule object).

        ``prior_rule`` is the rule as it existed before retraction (or
        ``None`` if the id was absent — in which case the witness
        records the *intent* to retract, per the substrate-edit
        discipline that even no-op edits rotate the version chain)."""
        if self.event_log is None:
            return
        details: dict[str, Any] = {
            "rule-system-id": self._system.id,
            "rule-system-version": self._system.version_hash,
            "prior-rule-system-version": prior_version,
            "rule-id": rule_id,
        }
        if prior_rule is not None:
            details["rule-predicate"] = prior_rule.predicate
            details["rule-kind"] = prior_rule.kind
        else:
            details["outcome"] = "absent"
        self.event_log.append(make_witness(
            operator=operator,
            target=rule_id,
            before_hash=prior_version,
            after_hash=self._system.version_hash,
            details=details,
            agent=self.agent,
            channel="learning",
            origin=f"dispatch:{self._system.id}",
            truth=1.0,
            evidence=1.0,
        ))
