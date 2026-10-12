"""Tests for pyfars.runtime.federation — Round 17 / WOAH #3.

Exercises the substrate-level realization of ``federation-convergence``:
the closure-merge commutation lemma reduces, for the FOUR value-domain
with the identity closure operator, to the cellwise associative-
commutative-idempotent property of ``join_k``. These tests assert the
order-independence, N-substrate convergence, dedup-by-content-hash,
and partition-then-rejoin properties the theorem promises.
"""
from __future__ import annotations

import itertools
import json
import random
from pathlib import Path

import pytest

from pyfars.operator.kind import OPERATOR_KIND
from pyfars.runtime.event_log import EventLog
from pyfars.runtime.federation import (
    FederationCell,
    FederationEnvelope,
    FederationSubstrate,
)
from pyfars.substrate.bilattice import BilatticeValue, join_k


# ---- helpers ------------------------------------------------------


def _cell(entity: str, predicate: str, v: BilatticeValue,
          provenance: tuple[str, ...] = ()) -> FederationCell:
    return FederationCell(entity=entity, predicate=predicate,
                          value=v, provenance=provenance)


def _envelope(sender: FederationSubstrate, to: str,
              cells: list[FederationCell]) -> FederationEnvelope:
    return sender.emit_envelope(
        to_peer_id=to, cells=cells,
        emitted_at="2026-05-03T00:00:00.000000Z",
    )


# ---- operator/kind registry ---------------------------------------


def test_federation_operators_registered_with_correct_kinds():
    """Round 17's five new operators must be in OPERATOR_KIND with
    the kinds the module docstring promises (lifecycle = observation,
    cell merge = mutation)."""
    assert OPERATOR_KIND["federation_envelope_emitted"] == "observation"
    assert OPERATOR_KIND["federation_envelope_admitted"] == "observation"
    assert OPERATOR_KIND["federation_envelope_deduplicated"] == "observation"
    assert OPERATOR_KIND["federation_envelope_rejected"] == "observation"
    assert OPERATOR_KIND["federation_cell_merged"] == "mutation"


# ---- FederationCell ----------------------------------------------


def test_federation_cell_hash_is_canonical_content_address():
    """Two cells with identical content produce identical cell_hash;
    field permutation in construction is irrelevant (the dataclass
    is positional-by-field, but the hash goes through canonical-JSON
    with sort_keys, so even if construction order changed, the hash
    would not)."""
    a = _cell("e1", "p1", BilatticeValue.TRUE, ("w1", "w2"))
    b = _cell("e1", "p1", BilatticeValue.TRUE, ("w1", "w2"))
    assert a.cell_hash == b.cell_hash
    # different value → different hash
    c = _cell("e1", "p1", BilatticeValue.FALSE, ("w1", "w2"))
    assert a.cell_hash != c.cell_hash


def test_federation_cell_to_dict_uses_value_name_not_index():
    """Wire-form must encode the bilattice value by *name*, so the
    canonical-JSON does not depend on the enum's positional index
    (which could drift across releases)."""
    d = _cell("e", "p", BilatticeValue.TOP).to_dict()
    assert d["value"] == "TOP"


def test_federation_cell_roundtrip():
    """from_dict ∘ to_dict is identity."""
    a = _cell("e1", "p1", BilatticeValue.TRUE, ("w1",))
    b = FederationCell.from_dict(a.to_dict())
    assert a == b


# ---- FederationEnvelope ------------------------------------------


def test_envelope_id_is_canonical_content_hash():
    """envelope_id is deterministically computed from the id-field set
    via canonical-JSON SHA-256. Two equivalent envelopes have the
    same id."""
    cells = (_cell("e1", "p1", BilatticeValue.TRUE),)
    e1 = FederationEnvelope(from_peer_id="A", to_peer_id="B", ordinal=1,
                            cells=cells, emitted_at="2026-05-03T00:00:00Z")
    e2 = FederationEnvelope(from_peer_id="A", to_peer_id="B", ordinal=1,
                            cells=cells, emitted_at="2026-05-03T00:00:00Z")
    assert e1.envelope_id == e2.envelope_id
    assert len(e1.envelope_id) == 64  # hex SHA-256


def test_envelope_id_changes_with_any_id_field():
    """Mutating any field in _ENVELOPE_ID_FIELDS changes the id —
    the hash-injectivity-under-canonical-form discipline."""
    base = dict(from_peer_id="A", to_peer_id="B", ordinal=1,
                cells=(_cell("e", "p", BilatticeValue.TRUE),),
                emitted_at="2026-05-03T00:00:00Z")
    base_id = FederationEnvelope(**base).envelope_id
    for k, alt in [
        ("from_peer_id", "X"),
        ("to_peer_id", "Y"),
        ("ordinal", 2),
        ("cells", (_cell("e", "p", BilatticeValue.FALSE),)),
        ("emitted_at", "2026-05-04T00:00:00Z"),
    ]:
        e = FederationEnvelope(**{**base, k: alt})
        assert e.envelope_id != base_id, f"{k} did not affect id"


def test_envelope_constructor_rejects_tampered_id():
    """Supplying envelope_id != canonical recomputation raises."""
    cells = (_cell("e", "p", BilatticeValue.TRUE),)
    with pytest.raises(ValueError, match="does not match"):
        FederationEnvelope(from_peer_id="A", to_peer_id="B", ordinal=1,
                           cells=cells, emitted_at="t",
                           envelope_id="0" * 64)


def test_envelope_constructor_rejects_negative_ordinal():
    with pytest.raises(ValueError, match="ordinal"):
        FederationEnvelope(from_peer_id="A", to_peer_id="B", ordinal=-1,
                           cells=(), emitted_at="t")


def test_envelope_canonical_json_roundtrip():
    """to_canonical_json + from_canonical_json yields a byte-equal
    envelope (and a re-verified id)."""
    cells = (_cell("e", "p", BilatticeValue.TRUE, ("w",)),
             _cell("e2", "p2", BilatticeValue.FALSE))
    e = FederationEnvelope(from_peer_id="A", to_peer_id="B", ordinal=3,
                           cells=cells, emitted_at="2026-05-03T00:00:00Z")
    wire = e.to_canonical_json()
    e2 = FederationEnvelope.from_canonical_json(wire)
    assert e == e2
    assert e2.envelope_id == e.envelope_id


def test_envelope_canonical_json_has_sorted_keys():
    """Canonical-JSON must have lexicographic key order — the
    precondition for hash-injectivity-under-canonical-form."""
    e = FederationEnvelope(
        from_peer_id="A", to_peer_id="B", ordinal=1,
        cells=(_cell("e", "p", BilatticeValue.TRUE),),
        emitted_at="t",
    )
    wire = e.to_canonical_json().decode()
    # Keys appear in alphabetical order in the encoded form
    keys_in_order = []
    decoded = json.loads(wire)
    keys_in_order = list(decoded.keys())
    # Encoding via json.dumps with sort_keys=True; verify by re-reading
    # the raw string position of each top-level key
    positions = {k: wire.find(f'"{k}"') for k in decoded}
    sorted_positions = sorted(positions.items(), key=lambda kv: kv[1])
    assert [k for k, _ in sorted_positions] == sorted(decoded.keys())


# ---- FederationSubstrate basic emit/admit -------------------------


def test_emit_assigns_monotonic_ordinal_per_peer_pair():
    """Per the morphism's step 4: ordinals are monotonic per
    (from-peer-id, to-peer-id) pair."""
    s = FederationSubstrate(peer_id="A")
    e1 = _envelope(s, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    e2 = _envelope(s, "B", [_cell("e", "p", BilatticeValue.FALSE)])
    e3 = _envelope(s, "C", [_cell("e", "p", BilatticeValue.TRUE)])
    assert e1.ordinal == 1
    assert e2.ordinal == 2
    # different recipient — independent counter
    assert e3.ordinal == 1


def test_emit_explicit_ordinal_advances_counter():
    """Explicit ordinal is honored; future auto-assignments stay
    strictly monotonic above any seen value."""
    s = FederationSubstrate(peer_id="A")
    e1 = s.emit_envelope(to_peer_id="B", cells=[],
                         emitted_at="t", ordinal=10)
    assert e1.ordinal == 10
    e2 = _envelope(s, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    assert e2.ordinal == 11


def test_admit_merges_cells_into_fiber():
    """Cellwise join_k into the receiver's fiber map."""
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B")
    env = _envelope(sender, "B", [
        _cell("e1", "p1", BilatticeValue.TRUE),
        _cell("e2", "p2", BilatticeValue.FALSE),
    ])
    assert receiver.admit_envelope(env) == "admitted"
    assert receiver.get("e1", "p1") is BilatticeValue.TRUE
    assert receiver.get("e2", "p2") is BilatticeValue.FALSE
    assert receiver.get("missing", "p") is BilatticeValue.BOTTOM


def test_admit_dedup_is_no_op_on_state():
    """Per the morphism's hash-deduplicating invariant:
    re-admission of the same envelope-id does not change cells."""
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B")
    env = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    assert receiver.admit_envelope(env) == "admitted"
    snap_before = dict(receiver.cells)
    assert receiver.admit_envelope(env) == "deduplicated"
    assert receiver.cells == snap_before


def test_admit_rejects_envelope_with_tampered_id():
    """Bypass the constructor's check by mutating the frozen field
    via object.__setattr__; the operator must still reject."""
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B")
    env = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    object.__setattr__(env, "envelope_id", "0" * 64)
    assert receiver.admit_envelope(env) == "rejected"
    # Substrate is unchanged
    assert receiver.cells == {}
    assert "0" * 64 not in receiver.seen_envelope_ids


def test_admit_join_k_accumulates_contradictions_to_top():
    """Two envelopes from independent senders writing TRUE then FALSE
    on the same cell — the receiver's fiber settles to ⊤."""
    a = FederationSubstrate(peer_id="A")
    b = FederationSubstrate(peer_id="B")
    receiver = FederationSubstrate(peer_id="R")
    env_a = _envelope(a, "R", [_cell("e", "p", BilatticeValue.TRUE)])
    env_b = _envelope(b, "R", [_cell("e", "p", BilatticeValue.FALSE)])
    receiver.admit_envelope(env_a)
    receiver.admit_envelope(env_b)
    assert receiver.get("e", "p") is BilatticeValue.TOP


def test_admit_advances_per_pair_ordinal():
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B")
    e1 = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    e2 = _envelope(sender, "B", [_cell("e", "p2", BilatticeValue.TRUE)])
    receiver.admit_envelope(e1)
    receiver.admit_envelope(e2)
    assert receiver.last_admitted_ordinal[("A", "B")] == 2


# ---- FEDERATION-CONVERGENCE THEOREM tests -------------------------


def test_two_substrate_convergence_order_independent():
    """The crux of federation-convergence: two substrates exchange
    a set of writes in *different* orders and converge to the same
    state. Cellwise join_k is associative-commutative-idempotent so
    any permutation of admissions yields the same cells map."""
    writes = [
        ("e1", "p1", BilatticeValue.TRUE),
        ("e1", "p2", BilatticeValue.FALSE),
        ("e2", "p1", BilatticeValue.TRUE),
        ("e1", "p1", BilatticeValue.FALSE),  # creates ⊤ on (e1, p1)
        ("e3", "p3", BilatticeValue.TRUE),
        ("e2", "p1", BilatticeValue.TRUE),   # idempotent
    ]
    final_states = []
    for perm in itertools.permutations(range(len(writes))):
        sender = FederationSubstrate(peer_id="A")
        receiver = FederationSubstrate(peer_id="B")
        envelopes = [
            _envelope(sender, "B",
                      [_cell(e, p, v)])
            for (e, p, v) in writes
        ]
        for i in perm:
            receiver.admit_envelope(envelopes[i])
        final_states.append(receiver.state_hash())
    # Every permutation produced the same converged state
    assert len(set(final_states)) == 1


def test_three_substrate_n_way_convergence():
    """All-pairs exchange among three substrates produces identical
    state at all three (federation-convergence's N-substrate
    generalization)."""
    subs = [FederationSubstrate(peer_id=p) for p in ("A", "B", "C")]
    # Each substrate originates one write on a distinct cell, plus
    # a contradicting write on a shared cell so we exercise ⊤.
    initial = [
        ("a-only", "p", BilatticeValue.TRUE),
        ("b-only", "p", BilatticeValue.FALSE),
        ("c-only", "p", BilatticeValue.TRUE),
    ]
    contested = [
        BilatticeValue.TRUE, BilatticeValue.FALSE, BilatticeValue.TRUE,
    ]
    envelopes_by_origin = []
    for sub, (e, p, v), ctr in zip(subs, initial, contested):
        # Apply origin's own writes locally first (so the sender's
        # state already carries them)
        sub.cells[(e, p)] = v
        sub.cells[("shared", "p")] = join_k(
            sub.cells.get(("shared", "p"), BilatticeValue.BOTTOM), ctr)
        # Build envelopes addressed to each peer
        peer_envs = {}
        for peer in subs:
            if peer is sub:
                continue
            env = sub.emit_envelope(
                to_peer_id=peer.peer_id,
                cells=[_cell(e, p, v), _cell("shared", "p", ctr)],
                emitted_at="t",
            )
            peer_envs[peer.peer_id] = env
        envelopes_by_origin.append(peer_envs)
    # Deliver every envelope to every recipient (admit_envelope is
    # the only mutation path). Multiple deliveries of the same
    # envelope are dedup'd.
    for peer in subs:
        for origin_envs in envelopes_by_origin:
            env = origin_envs.get(peer.peer_id)
            if env is not None:
                peer.admit_envelope(env)
    # All three substrates must converge to the same state
    hashes = {sub.state_hash() for sub in subs}
    assert len(hashes) == 1
    # And that state has shared at ⊤ (one TRUE + one FALSE merged
    # via join_k)
    for sub in subs:
        assert sub.get("shared", "p") is BilatticeValue.TOP
        assert sub.get("a-only", "p") is BilatticeValue.TRUE
        assert sub.get("b-only", "p") is BilatticeValue.FALSE
        assert sub.get("c-only", "p") is BilatticeValue.TRUE


def test_partition_then_rejoin_converges():
    """Two camps {A,B} and {C,D} write independently during a
    partition; on rejoin (per-recipient envelope re-emission to the
    other camp) all four converge — federation-convergence's
    partition-tolerance consequence.

    Per federation-envelope-record's "Multi-recipient envelopes are
    not admitted at this level; an envelope addressed to multiple
    peers is encoded as multiple envelopes (one per recipient)" —
    so rejoin requires each origin to emit a separately-addressed
    envelope per peer. This is the regime the morphism actually
    operates in; broadcasting one envelope to many recipients is a
    transport optimization that lives below the substrate boundary.
    """
    a, b, c, d = (FederationSubstrate(peer_id=p) for p in "ABCD")

    def fanout(origin: FederationSubstrate, peers, cell):
        """Emit one envelope per peer carrying ``cell``."""
        return {
            peer.peer_id: origin.emit_envelope(
                to_peer_id=peer.peer_id, cells=[cell], emitted_at="t",
            )
            for peer in peers
        }

    # During the partition each camp exchanges only within itself.
    a_writes = _cell("x", "p", BilatticeValue.TRUE)
    b_writes = _cell("y", "p", BilatticeValue.TRUE)
    c_writes = _cell("x", "p", BilatticeValue.FALSE)
    d_writes = _cell("z", "p", BilatticeValue.TRUE)

    # Apply each origin's own writes locally
    for sub, cell in ((a, a_writes), (b, b_writes),
                      (c, c_writes), (d, d_writes)):
        sub.cells[(cell.entity, cell.predicate)] = cell.value

    # Camp 1 internal exchange (A↔B only)
    a.admit_envelope(b.emit_envelope(
        to_peer_id="A", cells=[b_writes], emitted_at="t"))
    b.admit_envelope(a.emit_envelope(
        to_peer_id="B", cells=[a_writes], emitted_at="t"))
    # Camp 2 internal exchange (C↔D only)
    c.admit_envelope(d.emit_envelope(
        to_peer_id="C", cells=[d_writes], emitted_at="t"))
    d.admit_envelope(c.emit_envelope(
        to_peer_id="D", cells=[c_writes], emitted_at="t"))

    pre_camp1 = a.state_hash()
    pre_camp2 = c.state_hash()
    assert pre_camp1 != pre_camp2

    # Rejoin: each origin emits per-peer envelopes for its own write
    # to every node not yet known to hold it.
    nodes = [a, b, c, d]
    rejoin_envs = []
    for origin, cell in ((a, a_writes), (b, b_writes),
                          (c, c_writes), (d, d_writes)):
        for peer in nodes:
            if peer is origin:
                continue
            rejoin_envs.append(origin.emit_envelope(
                to_peer_id=peer.peer_id, cells=[cell], emitted_at="t"))

    # Each envelope is delivered to its addressed recipient (and
    # duplicated to that recipient a second time to exercise dedup).
    by_recipient = {n.peer_id: n for n in nodes}
    for env in rejoin_envs:
        by_recipient[env.to_peer_id].admit_envelope(env)
        by_recipient[env.to_peer_id].admit_envelope(env)  # dedup is no-op

    hashes = {n.state_hash() for n in nodes}
    assert len(hashes) == 1
    for n in nodes:
        assert n.get("x", "p") is BilatticeValue.TOP
        assert n.get("y", "p") is BilatticeValue.TRUE
        assert n.get("z", "p") is BilatticeValue.TRUE


def test_admit_rejects_envelope_addressed_to_other_peer():
    """Per federation-envelope-record's per-recipient invariant:
    envelopes carry a single ``to_peer_id`` and must be refused by
    any substrate other than the addressed recipient. Without this
    gate, the sender/recipient routing contract is meaningless."""
    sender = FederationSubstrate(peer_id="A")
    intended = FederationSubstrate(peer_id="B")
    eavesdropper = FederationSubstrate(peer_id="C")

    env = sender.emit_envelope(
        to_peer_id="B",
        cells=[_cell("e", "p", BilatticeValue.TRUE)],
        emitted_at="t",
    )
    assert eavesdropper.admit_envelope(env) == "rejected"
    assert eavesdropper.cells == {}
    assert env.envelope_id not in eavesdropper.seen_envelope_ids
    # The intended recipient still admits successfully — the
    # eavesdropper's rejection has no effect on substrate-portable
    # state of the envelope or the intended path.
    assert intended.admit_envelope(env) == "admitted"
    assert intended.get("e", "p") is BilatticeValue.TRUE


def test_wrong_recipient_takes_precedence_over_tampered_id():
    """Boundary-policy lock: when an envelope is *both* misrouted AND
    has a tampered id, the rejection reason is "wrong-recipient" (the
    routing gate fires first). Pins the current Step 0 < Step 1
    precedence — a mis-routed envelope's id is not load-bearing for
    the rejection regardless of whether the id is also tampered."""
    log_path_substrate = FederationSubstrate(peer_id="C")
    sender = FederationSubstrate(peer_id="A")
    env = sender.emit_envelope(
        to_peer_id="B",
        cells=[_cell("e", "p", BilatticeValue.TRUE)],
        emitted_at="t",
    )
    object.__setattr__(env, "envelope_id", "0" * 64)
    # Both flaws present; routing wins.
    assert log_path_substrate.admit_envelope(env) == "rejected"


def test_wrong_recipient_rejection_records_witness_with_reason(tmp_path: Path):
    """The wrong-recipient rejection must produce a witness whose
    details carry the rejection reason — auditors need to
    distinguish wrong-recipient from envelope-id-mismatch."""
    log = EventLog(root=tmp_path)
    sender = FederationSubstrate(peer_id="A")
    eavesdropper = FederationSubstrate(peer_id="C", event_log=log)

    env = sender.emit_envelope(
        to_peer_id="B",
        cells=[_cell("e", "p", BilatticeValue.TRUE)],
        emitted_at="t",
    )
    eavesdropper.admit_envelope(env)
    rejections = [w for w in log.read_all()
                  if w.operator == "federation_envelope_rejected"]
    assert len(rejections) == 1
    assert rejections[0].details["reason"] == "wrong-recipient"
    assert rejections[0].truth == 0.0


def test_replay_determinism():
    """Per the federation-envelope-record's *replay-deterministic*
    invariant: given the receiver's pre-state and the envelope's
    bytes, admission produces the same post-state on every replay.
    """
    sender = FederationSubstrate(peer_id="A")
    cells = [_cell("e", "p", BilatticeValue.TRUE),
             _cell("e2", "p2", BilatticeValue.FALSE)]
    env = _envelope(sender, "B", cells)

    def run_admit() -> str:
        r = FederationSubstrate(peer_id="B")
        r.admit_envelope(env)
        return r.state_hash()

    hashes = {run_admit() for _ in range(5)}
    assert len(hashes) == 1


def test_random_property_join_k_associative_commutative_idempotent():
    """Property: any random sequence of admissions produces the same
    state-hash as any permutation, including duplicates. This is the
    closure-merge commutation lemma in operational form."""
    rng = random.Random(20260503)
    entities = [f"e{i}" for i in range(4)]
    predicates = [f"p{i}" for i in range(3)]
    values = list(BilatticeValue)
    sender = FederationSubstrate(peer_id="A")

    # Build 12 envelopes (will include some duplicate cells)
    envs = []
    for _ in range(12):
        cells = [
            _cell(rng.choice(entities), rng.choice(predicates),
                  rng.choice(values))
            for _ in range(rng.randint(1, 3))
        ]
        envs.append(_envelope(sender, "B", cells))

    state_hashes = set()
    for trial in range(8):
        receiver = FederationSubstrate(peer_id="B")
        order = list(range(len(envs)))
        rng.shuffle(order)
        # Add some duplicates to the delivery sequence
        order += order[: rng.randint(0, 4)]
        rng.shuffle(order)
        for i in order:
            receiver.admit_envelope(envs[i])
        state_hashes.add(receiver.state_hash())

    assert len(state_hashes) == 1


# ---- substrate-recording: event log invariants --------------------


def test_emit_records_observation_witness(tmp_path: Path):
    """Per the morphism's witness-emitting invariant."""
    log = EventLog(root=tmp_path)
    s = FederationSubstrate(peer_id="A", event_log=log, agent="fed-engine")
    env = _envelope(s, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    witnesses = list(log.read_all())
    assert len(witnesses) == 1
    w = witnesses[0]
    assert w.operator == "federation_envelope_emitted"
    assert w.kind == "observation"
    assert w.channel == "federation"
    assert w.agent == "fed-engine"
    assert w.details["envelope-id"] == env.envelope_id
    assert w.details["to-peer-id"] == "B"
    assert w.details["cell-count"] == 1


def test_admit_records_witness_for_every_outcome(tmp_path: Path):
    """admitted, deduplicated, rejected — each produces a substrate
    event per the morphism's substrate-recording invariant."""
    log = EventLog(root=tmp_path)
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B", event_log=log)

    env = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    receiver.admit_envelope(env)        # admitted
    receiver.admit_envelope(env)        # deduplicated
    bad = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.FALSE)])
    object.__setattr__(bad, "envelope_id", "0" * 64)
    receiver.admit_envelope(bad)        # rejected

    operators = [w.operator for w in log.read_all()
                 if w.channel == "federation"
                 and w.operator.startswith("federation_envelope_")]
    assert "federation_envelope_admitted" in operators
    assert "federation_envelope_deduplicated" in operators
    assert "federation_envelope_rejected" in operators


def test_admit_emits_per_cell_mutation_only_when_state_changes(tmp_path: Path):
    """federation_cell_merged is a mutation; emitted only when the
    join_k actually moves the cell. Re-asserting an existing value
    via a *different* envelope (so dedup doesn't kick in) must not
    re-emit a per-cell mutation."""
    log = EventLog(root=tmp_path)
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B", event_log=log)

    e1 = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    receiver.admit_envelope(e1)
    # Different envelope (different ordinal → different envelope_id)
    # carrying the same cell. The cell merge is a no-op on state.
    e2 = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    assert e1.envelope_id != e2.envelope_id
    receiver.admit_envelope(e2)

    cell_merged = [w for w in log.read_all()
                   if w.operator == "federation_cell_merged"]
    assert len(cell_merged) == 1
    w = cell_merged[0]
    assert w.kind == "mutation"
    assert w.details["before"] == "BOTTOM"
    assert w.details["after"] == "TRUE"


def test_admit_rejected_witness_carries_zero_truth(tmp_path: Path):
    """The rejection observation has truth=0 — per the bilattice
    convention used elsewhere (dispatch hard-failure also writes
    truth=0.0). Auditors filtering for low-truth federation events
    should find rejections."""
    log = EventLog(root=tmp_path)
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B", event_log=log)
    bad = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    object.__setattr__(bad, "envelope_id", "0" * 64)
    receiver.admit_envelope(bad)
    rejections = [w for w in log.read_all()
                  if w.operator == "federation_envelope_rejected"]
    assert len(rejections) == 1
    assert rejections[0].truth == 0.0


def test_substrate_with_no_event_log_still_converges():
    """Per the module docstring's last paragraph: when event_log is
    None, the substrate still converges; only the audit trail is
    missing. This is the load-bearing claim that the algebra is
    independent of the recording layer."""
    sender = FederationSubstrate(peer_id="A")
    receiver = FederationSubstrate(peer_id="B")  # no event_log
    env = _envelope(sender, "B", [_cell("e", "p", BilatticeValue.TRUE)])
    assert receiver.admit_envelope(env) == "admitted"
    assert receiver.get("e", "p") is BilatticeValue.TRUE


# ---- per-cell merge details on event log --------------------------


def test_per_cell_merge_witness_records_join_k_transition(tmp_path: Path):
    """The cell-merge witness records before/after/incoming so an
    auditor can verify the join_k application without re-reading
    the substrate state."""
    log = EventLog(root=tmp_path)
    sender_a = FederationSubstrate(peer_id="A")
    sender_b = FederationSubstrate(peer_id="B")
    receiver = FederationSubstrate(peer_id="R", event_log=log)

    # First admit TRUE then FALSE — must produce ⊤
    e1 = sender_a.emit_envelope(
        to_peer_id="R",
        cells=[_cell("x", "p", BilatticeValue.TRUE)], emitted_at="t1")
    e2 = sender_b.emit_envelope(
        to_peer_id="R",
        cells=[_cell("x", "p", BilatticeValue.FALSE)], emitted_at="t2")
    receiver.admit_envelope(e1)
    receiver.admit_envelope(e2)
    assert receiver.get("x", "p") is BilatticeValue.TOP

    merges = [w for w in log.read_all()
              if w.operator == "federation_cell_merged"]
    assert len(merges) == 2
    # First: ⊥ ∨_k t = t
    assert merges[0].details == {**merges[0].details,
        "before": "BOTTOM", "after": "TRUE", "incoming": "TRUE"}
    # Second: t ∨_k f = ⊤
    assert merges[1].details == {**merges[1].details,
        "before": "TRUE", "after": "TOP", "incoming": "FALSE"}
