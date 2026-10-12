"""Heartbeat scheduler — selects unsettled flatfiles and emits ticks.

The heartbeat is the loop of a long-running FARS process. Each cycle:
  1. Reload the substrate (cheap; cached parses, mtime-based invalidation).
  2. Apply a *selection policy* to find unsettled flatfiles — by default,
     "fails one or more closure rules."
  3. For each unsettled flatfile, emit a tick to the dispatch table
     under a predicate naming why it's unsettled.

Initial policy is the simplest possible: re-run the closure rule set
and treat any flatfile mentioned in any diagnostic as "unsettled."
Later policies will use rule-firing semantics, predication-fiber
unsettled cells, etc.

Round 16 / WOAH #2 — *the heartbeat is the agential reflection of the
substrate's wavefront* (per ``heartbeat.md``). One ``tick()`` is one
*layer* of the wavefront — a breadth-first pass that emits one tick
per currently-unsettled (flatfile, predicate) pair. ``run_to_quiescence``
iterates layers until one of three terminal conditions is reached:

  - **Quiescence** (per ``heartbeat-quiescence-as-cohomological-calm``).
    The selection policy returns no pairs — the registration view is
    empty, the substrate's settling-associated sheaf $\\mathcal{F}_U|_{>0}$
    is zero on the scope. A ``wavefront_quiesced`` witness is emitted
    naming the layer count.

  - **Fuel exhaustion** (per ``fuel-bound.md``: declared, per-layer,
    witness-recorded). Fuel decrements once per layer (NOT per tick —
    the layer is the operational unit of iterated closure). A
    ``wavefront_fuel_exhausted`` witness is emitted with the consumed
    fuel and the unsettled pairs at exhaustion.

  - **H¹ obstruction** (per the theorem's Part 3: a pair that re-
    registers across consecutive layers is a Mayer-Vietoris cocycle
    $\\delta^0(s)$ — the structural witness of a re-registration loop
    that no monotone policy can clear). A ``wavefront_h1_obstruction``
    witness names the offending pairs as the cohomological certificate.

The single-pass ``tick()`` semantics are preserved for back-compat;
``run_to_quiescence`` is the new wavefront-faithful entrypoint.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Literal

from pyfars.operator.witness import make_witness
from pyfars.runtime.dispatch import DispatchTable
from pyfars.runtime.event_log import EventLog
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.store import Substrate
from pyfars.substrate.types.diagnostic import Diagnostic


WavefrontOutcomeKind = Literal[
    "quiesced", "fuel_exhausted", "h1_obstruction",
]
"""The three terminal conditions ``run_to_quiescence`` admits.

Per ``heartbeat-quiescence-as-cohomological-calm``: a heartbeat over
a CALM-compatible scope reaches ``quiesced`` in finite layers under
any monotone policy; ``h1_obstruction`` is the substrate-level
witness of a non-vanishing $H^1$-class on the settling-associated
sheaf; ``fuel_exhausted`` is the engineering safety net per
``fuel-bound.md`` for substrates whose regime exceeds the scope's
declared fuel."""


@dataclass(frozen=True)
class WavefrontOutcome:
    """Result of ``Heartbeat.run_to_quiescence``.

    Fields:

      - ``outcome`` — which terminal condition fired.
      - ``layers`` — number of layers executed (≥ 0). For quiescence,
        the layer that returned an empty selection is *not* counted
        (it's the no-op layer that observed the fixed point).
      - ``ticks_emitted`` — total ticks across all layers.
      - ``fuel_initial`` / ``fuel_consumed`` — declared fuel and
        layers-actually-run, per the per-layer accounting discipline.
      - ``persistent_pairs`` — for ``h1_obstruction``, the
        ``(slug, predicate)`` pairs that re-registered across
        ``h1_threshold`` consecutive layers (the cohomological
        certificate per the theorem's Part 3). Empty otherwise.
      - ``unsettled_at_exit`` — for ``fuel_exhausted``, the
        ``(slug, predicate)`` pairs still in the selection view at
        the moment fuel ran out. For ``quiesced`` this is empty by
        definition; for ``h1_obstruction`` it includes all pairs
        that the final layer would have ticked, including the
        persistent ones.
    """
    outcome: WavefrontOutcomeKind
    layers: int
    ticks_emitted: int
    fuel_initial: int
    fuel_consumed: int
    persistent_pairs: tuple[tuple[str, str], ...] = ()
    unsettled_at_exit: tuple[tuple[str, str], ...] = ()


SelectionPolicy = Callable[[Substrate], "list[tuple[Flatfile, str]]"]
"""A selection policy returns a list of (flatfile, predicate-slug) pairs.
Each pair is one reason a flatfile is unsettled; the heartbeat emits
one tick per pair."""


def diagnostics_policy(rule_runner: Callable[[Substrate], list[Diagnostic]]) -> SelectionPolicy:
    """Build a selection policy that runs a rule set and treats every
    flatfile in any diagnostic as unsettled, with the diagnostic's
    ``code`` as the predicate.
    """
    def policy(substrate: Substrate) -> list[tuple[Flatfile, str]]:
        diagnostics = rule_runner(substrate)
        by_path: dict[Path, Flatfile] = {ff.path: ff for ff in substrate.notes}
        pairs: list[tuple[Flatfile, str]] = []
        for diag in diagnostics:
            if diag.path is None:
                continue
            ff = by_path.get(diag.path)
            if ff is None:
                continue
            pairs.append((ff, diag.code))
        return pairs
    return policy


@dataclass
class Heartbeat:
    """A single-pass heartbeat. Call ``tick()`` per cycle.

    If ``event_log`` is provided, every emitted tick records a
    ``Witness`` on the ``"heartbeat"`` channel with operator
    ``"tick"`` and origin ``"heartbeat:<predicate>"``. This realizes
    the Bussard-derived "communication names its conduit" principle
    end-to-end: the simple-iteration tick (Bussard ``server.update``)
    is itself audited on a named channel, and downstream consumers
    can replay just the heartbeat stream via
    ``event_log.read_all(channel="heartbeat")``.

    ``policy_name`` is folded into the origin tag so a single event
    log can carry multiple selection policies (diagnostics, mtime,
    rule-firing) without their ticks colliding.
    """
    substrate: Substrate
    selection: SelectionPolicy
    dispatch: DispatchTable | None = None
    on_tick: Callable[[Flatfile, str], None] | None = None
    event_log: EventLog | None = None
    agent: str | None = None
    policy_name: str = "selection"

    def tick(self) -> int:
        """Run one cycle (one wavefront layer). Returns ticks emitted.

        Per ``wavefront.md``: each call is one breadth-first layer of
        closure-rule application — the registration view is sampled
        once, every pair is ticked, and the layer ends. Subsequent
        layers must be driven by ``run_to_quiescence`` (which iterates
        ``tick()`` with fuel and termination detection) or by an
        external loop (Bussard-style ``server.update``).
        """
        return len(self._tick_layer())

    def _tick_layer(self) -> list[tuple[Flatfile, str]]:
        """Internal: run one layer and return the pairs that ticked.

        Used by both the public ``tick()`` (which discards the pair
        list and returns the count) and ``run_to_quiescence`` (which
        needs the pair set to detect H¹ re-registration loops). Keeps
        the single-pass semantics intact for the back-compat path."""
        pairs = list(self.selection(self.substrate))
        for flatfile, pred in pairs:
            self._emit(flatfile, pred)
        return pairs

    # ------------------------------------------------------------------
    # Wavefront-faithful loop (Round 16 / WOAH #2)
    # ------------------------------------------------------------------

    def run_to_quiescence(
        self,
        fuel: int,
        *,
        h1_threshold: int = 3,
    ) -> WavefrontOutcome:
        """Iterate layers until quiescence, fuel exhaustion, or H¹.

        Per ``wavefront-termination`` the size-independent work bound
        applies; per ``heartbeat-quiescence-as-cohomological-calm`` a
        CALM-compatible scope quiesces in finite layers under any
        monotone policy. This loop is the engine that *exhibits* both:
        layers run breadth-first, the registration view is re-derived
        from the substrate state per layer (so quiescence is observed
        when the policy returns the empty set), and H¹ obstructions
        are detected as pairs that re-register across consecutive
        layers without the substrate making progress on them.

        Parameters:

          - ``fuel`` — declared per-layer budget. Decrements once per
            *layer* (per ``fuel-bound.md`` "per-layer not per-
            application"), NOT once per emitted tick. ``fuel=0`` is
            admissible: the loop returns ``quiesced`` immediately if
            the first layer's selection is empty, else
            ``fuel_exhausted``. Must be ≥ 0.
          - ``h1_threshold`` — number of consecutive layers a pair
            must persist (re-register after firing) before declaring
            ``h1_obstruction``. Default 3: one re-registration could
            be honest cascade work; three in a row is the cocycle.

        Returns a :class:`WavefrontOutcome`. Witness emission:

          - One ``wavefront_layer`` witness per executed layer (with
            the layer index, ticks emitted, and selection size).
          - One terminal witness — ``wavefront_quiesced``,
            ``wavefront_fuel_exhausted``, or ``wavefront_h1_obstruction``
            — naming the outcome and (where applicable) the
            unsettled / persistent pairs.

        All witnesses ride ``channel="heartbeat"`` and carry
        ``origin="heartbeat:<policy_name>"`` for the cycle-level
        events (no per-predicate suffix — the layer / outcome events
        aggregate across predicates).
        """
        if fuel < 0:
            raise ValueError(f"fuel must be >= 0, got {fuel}")
        if h1_threshold < 1:
            raise ValueError(
                f"h1_threshold must be >= 1, got {h1_threshold}"
            )

        fuel_initial = fuel
        layers_run = 0
        ticks_total = 0
        # Pairs that ticked in the previous layer — used to detect
        # re-registrations. A pair is *persistent* if it appears in
        # consecutive layers' selections (i.e., it fired and then
        # came back). The count of consecutive persistences is the
        # cocycle indicator.
        prior_layer_pairs: set[tuple[str, str]] = set()
        # pair → consecutive-layer persistence count.
        persistence_count: dict[tuple[str, str], int] = {}

        while True:
            # First check: did fuel run out *before* this layer? Per
            # the per-layer accounting discipline, the layer about to
            # run consumes one fuel unit; if none remains, abort.
            # We sample the selection BEFORE any fuel charge so we can
            # report the unsettled view in the exhaustion witness.
            if fuel == 0:
                # Out of fuel: sample the registration view (free read
                # — selection is the policy's substrate observation,
                # not a layer of work) and emit the exhaustion witness.
                unsettled = self._pair_keys(self.selection(self.substrate))
                if not unsettled:
                    # Boundary case: fuel=0 AND already at fixed point.
                    # This is honest quiescence, not exhaustion.
                    outcome = WavefrontOutcome(
                        outcome="quiesced",
                        layers=layers_run,
                        ticks_emitted=ticks_total,
                        fuel_initial=fuel_initial,
                        fuel_consumed=layers_run,
                    )
                    self._emit_terminal_witness(outcome)
                    return outcome
                outcome = WavefrontOutcome(
                    outcome="fuel_exhausted",
                    layers=layers_run,
                    ticks_emitted=ticks_total,
                    fuel_initial=fuel_initial,
                    fuel_consumed=layers_run,
                    unsettled_at_exit=tuple(sorted(unsettled)),
                )
                self._emit_terminal_witness(outcome)
                return outcome

            # Run one layer and capture its pair set.
            layer_pairs = self._tick_layer()
            layer_keys = self._pair_keys(layer_pairs)

            # Quiescence: empty layer is the fixed-point observation.
            # Per the theorem, this is the registration view becoming
            # empty — no fuel is consumed by an observation-only pass.
            if not layer_pairs:
                outcome = WavefrontOutcome(
                    outcome="quiesced",
                    layers=layers_run,
                    ticks_emitted=ticks_total,
                    fuel_initial=fuel_initial,
                    fuel_consumed=layers_run,
                )
                self._emit_terminal_witness(outcome)
                return outcome

            # The layer did work; charge one fuel unit.
            layers_run += 1
            ticks_total += len(layer_pairs)
            fuel -= 1
            self._emit_layer_witness(
                layer_index=layers_run,
                pair_count=len(layer_pairs),
                fuel_remaining=fuel,
                selected_pairs=layer_pairs,
            )

            # Update persistence tracking. A pair persists if it was
            # in the prior layer's selection AND is in this layer's
            # selection — it fired last layer and was re-registered.
            new_persistence: dict[tuple[str, str], int] = {}
            for key in layer_keys:
                if key in prior_layer_pairs:
                    new_persistence[key] = persistence_count.get(key, 0) + 1
                else:
                    new_persistence[key] = 1
            persistence_count = new_persistence

            # H¹ obstruction: any pair that has persisted for
            # h1_threshold consecutive layers is the cocycle. Per the
            # theorem's Part 3, the persistent pair set IS the
            # certificate δ⁰(s) ≠ 0.
            persistent = sorted(
                k for k, n in persistence_count.items()
                if n >= h1_threshold
            )
            if persistent:
                outcome = WavefrontOutcome(
                    outcome="h1_obstruction",
                    layers=layers_run,
                    ticks_emitted=ticks_total,
                    fuel_initial=fuel_initial,
                    fuel_consumed=layers_run,
                    persistent_pairs=tuple(persistent),
                    unsettled_at_exit=tuple(sorted(layer_keys)),
                )
                self._emit_terminal_witness(outcome)
                return outcome

            prior_layer_pairs = layer_keys

    # ------------------------------------------------------------------
    # Witness helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _pair_keys(
        pairs: Iterable[tuple[Flatfile, str]],
    ) -> set[tuple[str, str]]:
        """Reduce (flatfile, predicate) pairs to (slug, predicate) keys.

        Used for set membership and persistence accounting. The slug
        is substrate-relative and stable across layers (the same
        flatfile re-fetched yields the same slug); flatfile object
        identity is not (the substrate may re-parse and produce a
        new instance).
        """
        return {(ff.slug, pred) for ff, pred in pairs}

    def _emit_layer_witness(
        self, *, layer_index: int, pair_count: int,
        fuel_remaining: int,
        selected_pairs: list[tuple[Flatfile, str]],
    ) -> None:
        """Per heartbeat-scheduler.md witness format: cycle index,
        selected entities IN ORDER, ticks emitted, policy. The ordered
        selected-pairs list is the auditor's primary handle for
        reconstructing per-cycle membership and correlating to the
        per-tick witnesses that share this layer's cycle index — both
        ride channel="heartbeat" so a single channel-filtered replay
        recovers the full layer/tick chain. The pair list mirrors the
        order the policy returned (the policy's iteration order IS the
        deterministic selection sequence per heartbeat-scheduler.md's
        "deterministic policy → byte-identical replay" requirement)."""
        if self.event_log is None:
            return
        self.event_log.append(make_witness(
            operator="wavefront_layer",
            target=f"heartbeat:{self.policy_name}",
            before_hash=None,
            after_hash=None,
            details={
                "layer-index": layer_index,
                "ticks-emitted": pair_count,
                "fuel-remaining": fuel_remaining,
                "policy": self.policy_name,
                # Ordered list of [slug, predicate] pairs; the i-th
                # entry corresponds to the i-th tick witness emitted on
                # this channel after this layer witness's index.
                "selected-pairs": [
                    [ff.slug, pred] for ff, pred in selected_pairs
                ],
            },
            agent=self.agent,
            channel="heartbeat",
            origin=f"heartbeat:{self.policy_name}",
        ))

    def _emit_terminal_witness(self, outcome: WavefrontOutcome) -> None:
        if self.event_log is None:
            return
        op_map = {
            "quiesced": "wavefront_quiesced",
            "fuel_exhausted": "wavefront_fuel_exhausted",
            "h1_obstruction": "wavefront_h1_obstruction",
        }
        details: dict[str, Any] = {
            "outcome": outcome.outcome,
            "layers": outcome.layers,
            "ticks-emitted": outcome.ticks_emitted,
            "fuel-initial": outcome.fuel_initial,
            "fuel-consumed": outcome.fuel_consumed,
            "policy": self.policy_name,
        }
        if outcome.persistent_pairs:
            # Cohomological certificate per the theorem's Part 3.
            details["persistent-pairs"] = [
                list(p) for p in outcome.persistent_pairs
            ]
        if outcome.unsettled_at_exit:
            details["unsettled-at-exit"] = [
                list(p) for p in outcome.unsettled_at_exit
            ]
        # Truth/evidence reflect the outcome's epistemic flavor:
        # quiescence = certain (truth=1.0); exhaustion / obstruction
        # are observed-but-incomplete (truth=0.0, the work is NOT
        # complete; evidence=1.0, the OBSERVATION is certain).
        truth = 1.0 if outcome.outcome == "quiesced" else 0.0
        self.event_log.append(make_witness(
            operator=op_map[outcome.outcome],
            target=f"heartbeat:{self.policy_name}",
            before_hash=None,
            after_hash=None,
            details=details,
            agent=self.agent,
            channel="heartbeat",
            origin=f"heartbeat:{self.policy_name}",
            truth=truth,
            evidence=1.0,
        ))

    def _emit(self, flatfile: Flatfile, predicate: str) -> None:
        if self.dispatch is not None:
            self.dispatch.dispatch(predicate, flatfile)
        if self.on_tick is not None:
            self.on_tick(flatfile, predicate)
        if self.event_log is not None:
            # Resolve target to a substrate-relative path; never leak an
            # absolute host path into the event log. Out-of-root or
            # path-less flatfiles fall back to a stable ``flatfile:<slug>``
            # opaque token so audit lines remain canonical.
            # Flatfile.path may be substrate-relative already, or
            # absolute under substrate.root. Either way the goal is the
            # same canonical relative string and never an absolute host
            # path in the audit line.
            target: str
            try:
                fp = Path(flatfile.path)
                if not fp.is_absolute():
                    target = str(fp)
                else:
                    root = Path(self.substrate.root).resolve()
                    target = str(fp.resolve().relative_to(root))
            except (AttributeError, ValueError, OSError):
                target = f"flatfile:{flatfile.slug}"
            self.event_log.append(make_witness(
                operator="tick",
                target=target,
                before_hash=None,
                after_hash=None,
                details={"slug": flatfile.slug, "predicate": predicate},
                agent=self.agent,
                channel="heartbeat",
                origin=f"heartbeat:{self.policy_name}:{predicate}",
            ))
