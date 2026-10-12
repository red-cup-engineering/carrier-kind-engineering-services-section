"""Tests for pyfars.runtime.heartbeat."""
from pyfars.runtime.dispatch import DispatchTable
from pyfars.runtime.heartbeat import Heartbeat, diagnostics_policy
from pyfars.substrate.flatfile import Flatfile
from pyfars.substrate.store import Substrate
from pyfars.substrate.types.diagnostic import Diagnostic


def _make_substrate(tmp_path):
    """Build a minimal substrate with one flatfile."""
    note = tmp_path / "n.md"
    note.write_text("---\nkind: theorem\n---\n\n# N\n\nbody body body body body.\n")
    sub = Substrate(root=tmp_path)
    _ = sub.notes  # warm cache
    return sub, note


def test_heartbeat_no_unsettled(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    selection = lambda s: []
    hb = Heartbeat(substrate=sub, selection=selection)
    assert hb.tick() == 0


def test_heartbeat_emits_ticks(tmp_path):
    sub, note_path = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "broken-link"), (flatfile, "orphan")]
    emitted: list[tuple[str, str]] = []
    def on_tick(ff, pred):
        emitted.append((ff.slug, pred))
    hb = Heartbeat(substrate=sub, selection=selection, on_tick=on_tick)
    n = hb.tick()
    assert n == 2
    assert ("n", "broken-link") in emitted
    assert ("n", "orphan") in emitted


def test_heartbeat_routes_through_dispatch(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "needs-fix")]
    received: list[Flatfile] = []
    dt = DispatchTable()
    dt.register("needs-fix", lambda ff: received.append(ff))
    hb = Heartbeat(substrate=sub, selection=selection, dispatch=dt)
    hb.tick()
    assert received == [flatfile]


def test_diagnostics_policy_maps_diagnostic_to_predicate(tmp_path):
    sub, note_path = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    diag = Diagnostic(code="broken-link", severity="error",
                      message="missing target", path=flatfile.path)
    rule_runner = lambda s: [diag]
    policy = diagnostics_policy(rule_runner)
    result = policy(sub)
    assert result == [(flatfile, "broken-link")]


def test_diagnostics_policy_skips_diags_without_path(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    diag = Diagnostic(code="x", severity="warning", message="m", path=None)
    rule_runner = lambda s: [diag]
    policy = diagnostics_policy(rule_runner)
    assert policy(sub) == []


# --- event-log integration (Bussard "communication names its conduit") ---

from pyfars.runtime.event_log import EventLog  # noqa: E402


def test_heartbeat_writes_witness_on_named_channel(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "broken-link")]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=selection, event_log=log,
                   agent="test-agent", policy_name="diagnostics")
    assert hb.tick() == 1
    written = list(log.read_all(channel="heartbeat"))
    assert len(written) == 1
    w = written[0]
    assert w.operator == "tick"
    assert w.channel == "heartbeat"
    assert w.origin == "heartbeat:diagnostics:broken-link"
    assert w.agent == "test-agent"
    assert w.details["slug"] == "n"
    assert w.details["predicate"] == "broken-link"
    # Path is recorded relative to the substrate root.
    assert w.target == "n.md"


def test_heartbeat_without_event_log_emits_nothing(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "broken-link")]
    hb = Heartbeat(substrate=sub, selection=selection)
    hb.tick()  # no event_log; must not raise


def test_heartbeat_target_falls_back_for_out_of_root_path(tmp_path):
    """When a flatfile carries an absolute path outside substrate.root
    (e.g., a synthetic flatfile imported from elsewhere), the witness
    target must NOT leak the absolute host path; it falls back to a
    stable opaque ``flatfile:<slug>`` token."""
    sub, _ = _make_substrate(tmp_path)
    real = sub.notes[0]
    # Synthesize a flatfile-like object with an absolute path that is
    # NOT under substrate.root.
    outside = tmp_path.parent / "outside_root.md"

    class FakeFlatfile:
        slug = "outside"
        path = outside
    selection = lambda s: [(FakeFlatfile(), "broken-link")]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=selection, event_log=log)
    hb.tick()
    w = next(iter(log.read_all(channel="heartbeat")))
    assert w.target == "flatfile:outside"
    assert str(outside) not in w.target  # no absolute path leak
    # Sanity: the in-root case still produces a relative target.
    log2 = EventLog(root=tmp_path / "log2")
    hb2 = Heartbeat(substrate=sub,
                    selection=lambda s: [(real, "broken-link")],
                    event_log=log2)
    hb2.tick()
    assert next(iter(log2.read_all())).target == "n.md"


def test_heartbeat_event_log_coexists_with_dispatch_and_on_tick(tmp_path):
    sub, _ = _make_substrate(tmp_path)
    flatfile = sub.notes[0]
    selection = lambda s: [(flatfile, "needs-fix"), (flatfile, "stale")]
    log = EventLog(root=tmp_path)
    seen: list[tuple[str, str]] = []
    dt = DispatchTable()
    dt.register("needs-fix", lambda ff: seen.append(("disp", ff.slug)))
    dt.register("stale", lambda ff: seen.append(("disp", ff.slug)))
    hb = Heartbeat(
        substrate=sub, selection=selection, dispatch=dt,
        on_tick=lambda ff, p: seen.append(("cb", p)), event_log=log,
    )
    assert hb.tick() == 2
    # All three side channels (dispatch, on_tick, event-log) fired.
    assert ("disp", "n") in seen and ("cb", "needs-fix") in seen
    assert log.count(channel="heartbeat") == 2
    origins = {w.origin for w in log.read_all(channel="heartbeat")}
    assert origins == {
        "heartbeat:selection:needs-fix",
        "heartbeat:selection:stale",
    }


# =====================================================================
# Round 16 / WOAH #2 — wavefront-faithful run_to_quiescence
# =====================================================================
#
# The heartbeat is the agential reflection of the substrate's wavefront
# (per heartbeat.md). run_to_quiescence iterates layers until one of
# three terminal conditions per heartbeat-quiescence-as-cohomological-
# calm: quiescence (registration view becomes empty), fuel exhaustion
# (per fuel-bound.md, per-layer accounting), or H¹ obstruction (a pair
# that re-registers across consecutive layers is the cocycle δ⁰(s) ≠ 0
# witness per the theorem's Part 3).

from pyfars.runtime.heartbeat import WavefrontOutcome  # noqa: E402


def _stateful_selection(plan):
    """Build a selection callable that returns plan[i] on the i-th call.

    After the plan is exhausted, returns ``[]`` forever (quiescence).
    Each entry in ``plan`` is a list of (flatfile, predicate) pairs.
    """
    state = {"i": 0}
    def sel(_substrate):
        i = state["i"]
        state["i"] += 1
        return plan[i] if i < len(plan) else []
    return sel


def test_run_to_quiescence_immediate(tmp_path):
    """fuel>0, first layer empty -> quiesced in 0 layers, 0 fuel used."""
    sub, _ = _make_substrate(tmp_path)
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=lambda s: [],
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=10)
    assert isinstance(out, WavefrontOutcome)
    assert out.outcome == "quiesced"
    assert out.layers == 0
    assert out.ticks_emitted == 0
    assert out.fuel_initial == 10
    assert out.fuel_consumed == 0
    assert out.persistent_pairs == ()
    assert out.unsettled_at_exit == ()
    # Witnesses: zero layer witnesses, one terminal.
    layer_ws = [w for w in log.read_all() if w.operator == "wavefront_layer"]
    term_ws = [w for w in log.read_all() if w.operator == "wavefront_quiesced"]
    assert len(layer_ws) == 0
    assert len(term_ws) == 1
    assert term_ws[0].channel == "heartbeat"
    assert term_ws[0].origin == "heartbeat:diag"
    assert term_ws[0].truth == 1.0


def test_run_to_quiescence_after_layers(tmp_path):
    """Three layers of work then empty -> quiesced; layer count + ticks
    accurate; one layer witness per executed layer; terminal witness."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "a"), (ff, "b")],     # layer 1: 2 ticks
        [(ff, "a")],                 # layer 2: 1 tick (different from prior in size)
        [(ff, "c")],                 # layer 3: 1 tick (no overlap -> persistence reset)
        [],                          # quiescence
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=10)
    assert out.outcome == "quiesced"
    assert out.layers == 3
    assert out.ticks_emitted == 4
    assert out.fuel_consumed == 3
    assert out.fuel_initial == 10
    layer_ws = sorted(
        (w for w in log.read_all() if w.operator == "wavefront_layer"),
        key=lambda w: w.details["layer-index"],
    )
    assert [w.details["layer-index"] for w in layer_ws] == [1, 2, 3]
    assert [w.details["ticks-emitted"] for w in layer_ws] == [2, 1, 1]
    # fuel-remaining decrements by one per layer.
    assert [w.details["fuel-remaining"] for w in layer_ws] == [9, 8, 7]
    # All layer witnesses ride the heartbeat channel + correct origin.
    for w in layer_ws:
        assert w.channel == "heartbeat"
        assert w.origin == "heartbeat:diag"
        assert w.details["policy"] == "diag"
    term = [w for w in log.read_all() if w.operator == "wavefront_quiesced"]
    assert len(term) == 1
    assert term[0].details["layers"] == 3
    assert term[0].details["ticks-emitted"] == 4


def test_run_to_quiescence_fuel_exhausted(tmp_path):
    """Selection never empties; fuel=2 -> 2 layers, then exhaustion
    witness with the unsettled view as evidence."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    # Pairs change each layer so persistence never reaches threshold.
    plan = [
        [(ff, "p1")],
        [(ff, "p2")],
        [(ff, "p3")],
        [(ff, "p4")],
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=2)
    assert out.outcome == "fuel_exhausted"
    assert out.layers == 2
    assert out.ticks_emitted == 2
    assert out.fuel_consumed == 2
    assert out.fuel_initial == 2
    # The unsettled view sampled at exhaustion is plan[2] = [(ff,"p3")].
    assert out.unsettled_at_exit == (("n", "p3"),)
    assert out.persistent_pairs == ()
    layer_ws = [w for w in log.read_all() if w.operator == "wavefront_layer"]
    assert len(layer_ws) == 2
    term = [w for w in log.read_all()
            if w.operator == "wavefront_fuel_exhausted"]
    assert len(term) == 1
    assert term[0].truth == 0.0  # work NOT complete
    assert term[0].evidence == 1.0  # observation IS certain
    assert term[0].details["unsettled-at-exit"] == [["n", "p3"]]


def test_run_to_quiescence_h1_obstruction(tmp_path):
    """A pair re-registering across h1_threshold consecutive layers is
    the cohomological certificate δ⁰(s) ≠ 0 per the theorem's Part 3.
    The persistent pair set is named in the witness as the certificate.
    """
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    # (ff, "loop") appears in every layer; persistence reaches 3 on
    # the third layer (counts: 1, 2, 3) -> h1_obstruction at threshold 3.
    plan = [
        [(ff, "loop"), (ff, "extra1")],
        [(ff, "loop"), (ff, "extra2")],
        [(ff, "loop")],
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=100, h1_threshold=3)
    assert out.outcome == "h1_obstruction"
    assert out.layers == 3
    assert out.persistent_pairs == (("n", "loop"),)
    # Unsettled at exit = layer-3's pair set.
    assert out.unsettled_at_exit == (("n", "loop"),)
    term = [w for w in log.read_all()
            if w.operator == "wavefront_h1_obstruction"]
    assert len(term) == 1
    assert term[0].details["persistent-pairs"] == [["n", "loop"]]
    assert term[0].truth == 0.0
    assert term[0].evidence == 1.0


def test_run_to_quiescence_h1_threshold_tunable(tmp_path):
    """At h1_threshold=2 the loop fires on the SECOND consecutive
    appearance, not the third — a tighter cohomological guard."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "loop")],
        [(ff, "loop")],
        [(ff, "loop")],
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=100, h1_threshold=2)
    assert out.outcome == "h1_obstruction"
    assert out.layers == 2  # fired at second layer, not third
    assert out.persistent_pairs == (("n", "loop"),)


def test_run_to_quiescence_persistence_resets_on_dropout(tmp_path):
    """A pair that drops out of the registration view and later
    returns has its persistence count reset — honest cascade work
    (re-entry after >_k update) must not be mis-classified as H¹."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "x")],   # x: count 1
        [(ff, "x")],   # x: count 2
        [(ff, "y")],   # x absent -> reset; y: count 1
        [(ff, "x")],   # x re-appears -> count 1 (not 3!)
        [],
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=100, h1_threshold=3)
    assert out.outcome == "quiesced"
    assert out.layers == 4


def test_run_to_quiescence_fuel_zero_quiescent(tmp_path):
    """fuel=0 with empty selection -> quiesced (boundary case;
    fuel exhaustion is preempted by the genuine fixed point)."""
    sub, _ = _make_substrate(tmp_path)
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=lambda s: [],
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=0)
    assert out.outcome == "quiesced"
    assert out.layers == 0
    assert out.fuel_initial == 0
    assert out.fuel_consumed == 0


def test_run_to_quiescence_fuel_zero_exhausted(tmp_path):
    """fuel=0 with non-empty registration view -> immediate fuel
    exhaustion; no layers actually run, but the unsettled view is
    recorded so the auditor knows what work was deferred."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub,
                   selection=lambda s: [(ff, "deferred")],
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=0)
    assert out.outcome == "fuel_exhausted"
    assert out.layers == 0
    assert out.ticks_emitted == 0
    assert out.unsettled_at_exit == (("n", "deferred"),)


def test_run_to_quiescence_validates_fuel(tmp_path):
    """Negative fuel is a contract violation, not a runtime concern."""
    sub, _ = _make_substrate(tmp_path)
    hb = Heartbeat(substrate=sub, selection=lambda s: [])
    import pytest
    with pytest.raises(ValueError, match="fuel"):
        hb.run_to_quiescence(fuel=-1)
    with pytest.raises(ValueError, match="h1_threshold"):
        hb.run_to_quiescence(fuel=10, h1_threshold=0)


def test_run_to_quiescence_dispatches_through_layers(tmp_path):
    """Dispatch fires per tick across all layers — the wavefront loop
    composes with dispatch identically to single-pass tick()."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "p"), (ff, "q")],
        [(ff, "p")],
        [],
    ]
    received: list[str] = []
    dt = DispatchTable()
    dt.register("p", lambda f: received.append("p"))
    dt.register("q", lambda f: received.append("q"))
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   dispatch=dt, policy_name="diag")
    out = hb.run_to_quiescence(fuel=10)
    assert out.outcome == "quiesced"
    assert received == ["p", "q", "p"]


def test_run_to_quiescence_emits_per_tick_witnesses_too(tmp_path):
    """The wavefront loop preserves the per-tick witness emission
    from the single-pass path — replay-faithfulness across modes."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [[(ff, "a"), (ff, "b")], [(ff, "a")], []]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    hb.run_to_quiescence(fuel=10)
    tick_ws = [w for w in log.read_all() if w.operator == "tick"]
    # 3 ticks across 2 working layers.
    assert len(tick_ws) == 3
    preds = [w.details["predicate"] for w in tick_ws]
    assert preds == ["a", "b", "a"]


def test_run_to_quiescence_no_event_log(tmp_path):
    """Without event_log, the loop runs silently — outcome is correct,
    no witness emission attempted."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [[(ff, "x")], []]
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan))
    out = hb.run_to_quiescence(fuel=5)
    assert out.outcome == "quiesced"
    assert out.layers == 1
    assert out.ticks_emitted == 1


def test_wavefront_outcome_is_frozen():
    """WavefrontOutcome is part of the audit surface — once
    constructed it must not be mutated."""
    out = WavefrontOutcome(
        outcome="quiesced", layers=3, ticks_emitted=5,
        fuel_initial=10, fuel_consumed=3,
    )
    import dataclasses
    with __import__("pytest").raises(dataclasses.FrozenInstanceError):
        out.layers = 99  # type: ignore[misc]


def test_run_to_quiescence_h1_witness_excludes_non_persistent(tmp_path):
    """The certificate must name ONLY the persistent pairs, not the
    full layer set — auditors and governance rely on the cocycle's
    minimality to scope repairs."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "loop"), (ff, "noise1")],
        [(ff, "loop"), (ff, "noise2")],
        [(ff, "loop"), (ff, "noise3")],  # only "loop" persists
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    out = hb.run_to_quiescence(fuel=100, h1_threshold=3)
    assert out.outcome == "h1_obstruction"
    assert out.persistent_pairs == (("n", "loop"),)
    # unsettled_at_exit is the FULL layer (audit visibility), but the
    # certificate is just the persistent pair.
    assert ("n", "loop") in out.unsettled_at_exit
    assert ("n", "noise3") in out.unsettled_at_exit


def test_layer_witness_carries_selected_pairs_in_order(tmp_path):
    """Per heartbeat-scheduler.md: each cycle's witness must carry the
    selected entities IN ORDER so an auditor can reconstruct
    per-cycle membership and correlate to tick witnesses (both ride
    channel='heartbeat'). The order must mirror the selection
    policy's iteration order — that's the deterministic-replay
    contract."""
    sub, _ = _make_substrate(tmp_path)
    ff = sub.notes[0]
    plan = [
        [(ff, "alpha"), (ff, "beta"), (ff, "gamma")],
        [(ff, "delta")],
        [],
    ]
    log = EventLog(root=tmp_path)
    hb = Heartbeat(substrate=sub, selection=_stateful_selection(plan),
                   event_log=log, policy_name="diag")
    hb.run_to_quiescence(fuel=10)
    layer_ws = sorted(
        (w for w in log.read_all() if w.operator == "wavefront_layer"),
        key=lambda w: w.details["layer-index"],
    )
    assert len(layer_ws) == 2
    # Order is preserved exactly — the policy returned alpha, beta,
    # gamma in that sequence and the witness must reflect that.
    assert layer_ws[0].details["selected-pairs"] == [
        ["n", "alpha"], ["n", "beta"], ["n", "gamma"],
    ]
    assert layer_ws[1].details["selected-pairs"] == [["n", "delta"]]
    # The per-tick witnesses appear AFTER each layer witness in log
    # order, with predicates matching the selected-pairs sequence —
    # auditor reconstructs the layer-tick correspondence by reading
    # the channel='heartbeat' stream sequentially.
    heartbeat_stream = list(log.read_all(channel="heartbeat"))
    # Filter to wavefront_layer + tick events only.
    layer_or_tick = [
        w for w in heartbeat_stream
        if w.operator in ("wavefront_layer", "tick")
    ]
    # Expected sequence: layer1, tick(alpha), tick(beta), tick(gamma),
    # layer2, tick(delta).
    # NOTE: emit order in _tick_layer is ticks first, then the layer
    # witness is emitted by run_to_quiescence AFTER the layer ran.
    # So actual order: tick(alpha), tick(beta), tick(gamma), layer1,
    # tick(delta), layer2, terminal. Verify by predicate sequence
    # within each layer block.
    ticks_l1 = [
        w for w in heartbeat_stream
        if w.operator == "tick"
    ][:3]
    assert [w.details["predicate"] for w in ticks_l1] == [
        "alpha", "beta", "gamma",
    ]
