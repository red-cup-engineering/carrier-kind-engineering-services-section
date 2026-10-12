"""fusion.BeliefBoard: attribution correctness, retraction, posit-order independence."""

from __future__ import annotations

import pytest

from pymetrologic.fusion import BeliefBoard, Conflict
from pymetrologic.quartet import Corner
from pymetrologic.readouts import told_both, told_false, told_none, told_true

# --------------------------------------------------------------------------- #
# Attribution correctness — conflicts name exactly the right agents
# --------------------------------------------------------------------------- #


def test_two_agents_disagreeing_on_one_claim_are_both_named() -> None:
    board = BeliefBoard()
    board.posit("alice", "sky_is_blue", told_true())
    board.posit("bob", "sky_is_blue", told_false())
    board.posit("carol", "grass_is_green", told_true())

    board.settle()
    found = board.conflicts()

    assert len(found) == 1
    conflict = found[0]
    assert conflict.claim == "sky_is_blue"
    assert set(conflict.parties) == {"alice", "bob"}
    assert conflict.positions["alice"] is Corner.POTENTIAL
    assert conflict.positions["bob"] is Corner.ACTIVE
    # carol's uncontested claim never appears.
    assert all(c.claim != "grass_is_green" for c in found)


def test_agreeing_agents_produce_no_conflict() -> None:
    board = BeliefBoard()
    board.posit("alice", "x", told_true())
    board.posit("bob", "x", told_true())
    board.posit("carol", "x", told_true())

    assert board.conflicts() == ()
    assert board.state()["x"] is Corner.POTENTIAL


def test_bystander_agent_is_never_named_in_an_unrelated_conflict() -> None:
    board = BeliefBoard()
    board.posit("alice", "disputed", told_true())
    board.posit("bob", "disputed", told_false())
    board.posit("dave", "unrelated", told_true())  # dave never touches "disputed"

    conflicts = board.conflicts()
    assert len(conflicts) == 1
    assert "dave" not in conflicts[0].parties


def test_three_way_disagreement_names_all_three() -> None:
    board = BeliefBoard()
    board.posit("alice", "k", told_true())
    board.posit("bob", "k", told_false())
    board.posit("carol", "k", told_both())  # carol herself is internally split

    conflicts = board.conflicts()
    assert len(conflicts) == 1
    assert set(conflicts[0].parties) == {"alice", "bob", "carol"}


def test_a_single_agent_can_be_the_sole_party_to_a_self_conflict() -> None:
    # One agent posits both sides of the same claim over time — a real
    # disagreement (with themselves, across posits), attributed correctly.
    board = BeliefBoard()
    board.posit("alice", "flip_flop", told_true())
    board.posit("alice", "flip_flop", told_false())

    conflicts = board.conflicts()
    assert len(conflicts) == 1
    assert conflicts[0].parties == ("alice",)
    assert conflicts[0].positions["alice"] is Corner.STABLE


def test_conflict_is_a_named_dataclass_with_the_documented_fields() -> None:
    board = BeliefBoard()
    board.posit("a", "k", told_true())
    board.posit("b", "k", told_false())
    conflict = board.conflicts()[0]
    assert isinstance(conflict, Conflict)
    assert conflict.claim == "k"
    assert conflict.degree != 0


# --------------------------------------------------------------------------- #
# Retraction reduces the conflict set (the repair move)
# --------------------------------------------------------------------------- #


def test_retraction_removes_a_resolved_conflict() -> None:
    board = BeliefBoard()
    board.posit("alice", "k1", told_true())
    board.posit("bob", "k1", told_false())
    board.posit("alice", "k2", told_true())
    board.posit("bob", "k2", told_true())

    assert len(board.conflicts()) == 1

    board.retract("bob", "k1")
    assert board.conflicts() == ()
    assert board.state()["k1"] is Corner.POTENTIAL  # alice's claim survives alone


def test_retract_of_a_never_posited_claim_is_a_harmless_no_op() -> None:
    board = BeliefBoard()
    board.posit("alice", "k", told_true())
    board.retract("someone_else", "k")  # never posited anything
    board.retract("alice", "never_posited")
    assert board.state()["k"] is Corner.POTENTIAL


def test_retraction_then_repositing_a_weaker_claim_can_clear_the_conflict() -> None:
    board = BeliefBoard()
    board.posit("alice", "k", told_true())
    board.posit("bob", "k", told_false())
    assert len(board.conflicts()) == 1

    board.retract("bob", "k")
    board.posit("bob", "k", told_none())  # a genuine no-op re-assert
    assert board.conflicts() == ()


# --------------------------------------------------------------------------- #
# Order-independence of posits (the proven knowledge-join fact surfacing)
# --------------------------------------------------------------------------- #


def test_state_is_independent_of_the_order_posits_arrive_in() -> None:
    def build(order: list[tuple[str, str, Corner]]) -> BeliefBoard:
        board = BeliefBoard()
        for agent, claim, value in order:
            board.posit(agent, claim, value)
        return board

    posits = [
        ("alice", "k1", told_true()),
        ("bob", "k1", told_false()),
        ("carol", "k2", told_true()),
        ("dave", "k2", told_true()),
        ("alice", "k2", told_false()),
    ]

    forward = build(posits)
    backward = build(list(reversed(posits)))
    shuffled = build([posits[2], posits[0], posits[4], posits[1], posits[3]])

    assert forward.state() == backward.state() == shuffled.state()
    assert (
        {c.claim for c in forward.conflicts()}
        == {c.claim for c in backward.conflicts()}
        == {c.claim for c in shuffled.conflicts()}
    )


def test_repeated_posits_from_the_same_agent_join_rather_than_overwrite() -> None:
    # Positing told_true then told_false for the same (agent, claim) does not
    # let the second posit silently erase the first -- it joins to told_both,
    # exactly the knowledge join's semantics (evidence never regresses).
    board = BeliefBoard()
    board.posit("alice", "k", told_true())
    board.posit("alice", "k", told_false())
    assert board.state()["k"] is Corner.STABLE


def test_posit_order_within_one_agent_is_also_order_independent() -> None:
    forward = BeliefBoard()
    forward.posit("alice", "k", told_true())
    forward.posit("alice", "k", told_false())

    backward = BeliefBoard()
    backward.posit("alice", "k", told_false())
    backward.posit("alice", "k", told_true())

    assert forward.state() == backward.state()


# --------------------------------------------------------------------------- #
# Regimes
# --------------------------------------------------------------------------- #


def test_four_regime_rejects_a_graded_pair_posit() -> None:
    board = BeliefBoard(regime="four")
    with pytest.raises(TypeError):
        board.posit("alice", "k", (0.5, 0.5))  # type: ignore[arg-type]


def test_graded_regime_rejects_a_four_valued_posit() -> None:
    board = BeliefBoard(regime="graded")
    with pytest.raises(TypeError):
        board.posit("alice", "k", told_true())


def test_graded_regime_settles_and_attributes_like_sensor_fusion() -> None:
    board = BeliefBoard(regime="graded")
    board.posit("sensor_a", "level", (0.9, 0.0))
    board.posit("sensor_b", "level", (0.0, 0.8))

    conflicts = board.conflicts()
    assert len(conflicts) == 1
    assert set(conflicts[0].parties) == {"sensor_a", "sensor_b"}
    assert conflicts[0].degree > 0.5


def test_settle_is_chainable_and_lazy() -> None:
    board = BeliefBoard()
    board.posit("alice", "k", told_true())
    # conflicts()/state() settle lazily without an explicit .settle() call.
    assert board.state()["k"] is Corner.POTENTIAL
    # .settle() itself returns the board for chaining.
    assert board.settle() is board
