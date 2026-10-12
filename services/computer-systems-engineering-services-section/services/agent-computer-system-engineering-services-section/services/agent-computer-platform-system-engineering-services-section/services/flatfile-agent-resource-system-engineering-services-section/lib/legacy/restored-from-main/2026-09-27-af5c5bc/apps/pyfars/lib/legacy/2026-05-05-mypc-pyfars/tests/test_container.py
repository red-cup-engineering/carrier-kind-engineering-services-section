"""Tests for pyfars.runtime.container — generic containment + lifecycle."""
import pytest

from pyfars.runtime.container import Container, compose_extends, move


def test_container_receive_appends_and_fires_callback():
    """Receiving fires on_receive after the append, so a callback
    sees the slug already in contents (matches LPMud init() shape)."""
    seen = []
    c = Container(slug="plan-a",
                  on_receive=[lambda cont, s: seen.append(
                      (s, list(cont.contents)))])
    c.receive("task-1")
    assert c.contents == ["task-1"]
    assert seen == [("task-1", ["task-1"])]


def test_container_refuses_silent_duplicates_by_default():
    """The bare primitive refuses silent duplication; Mem0-style
    ADD/UPDATE/DELETE conflict resolution lives in callbacks, not
    in the container itself."""
    c = Container(slug="plan")
    c.receive("task")
    with pytest.raises(ValueError):
        c.receive("task")


def test_container_allow_duplicates_when_explicit():
    """Containers can opt in to duplicates for repeating-element
    cases (e.g. an audit log container)."""
    c = Container(slug="audit", allow_duplicates=True)
    c.receive("event")
    c.receive("event")
    assert c.contents == ["event", "event"]


def test_container_receive_is_atomic_on_callback_failure():
    """If any receive-callback raises, the slug is removed before the
    exception propagates so the container is observably unchanged
    (Mem0 'conflict resolution at creation time')."""
    def veto(_c, _s):
        raise ValueError("nope")
    c = Container(slug="plan", on_receive=[veto])
    with pytest.raises(ValueError, match="nope"):
        c.receive("task")
    assert c.contents == []


def test_container_remove_fires_callback_and_is_atomic():
    """Remove fires on_remove and rolls back atomically on failure,
    restoring the slug at its prior index."""
    seen = []
    c = Container(slug="plan",
                  on_remove=[lambda _c, s: seen.append(s)])
    c.receive("a"); c.receive("b"); c.receive("c")
    c.remove("b")
    assert c.contents == ["a", "c"]
    assert seen == ["b"]

    def veto(_c, _s):
        raise RuntimeError("blocked")
    c.on_remove.append(veto)
    with pytest.raises(RuntimeError):
        c.remove("a")
    assert c.contents == ["a", "c"]  # restored at original index


def test_container_remove_unknown_slug_raises():
    c = Container(slug="plan")
    with pytest.raises(KeyError):
        c.remove("ghost")


def test_container_membership_and_iteration_are_generic():
    """Per the analysis: ``slug in container`` is the same operation
    regardless of container type — one deep primitive, no per-type
    membership API."""
    c = Container(slug="dept", contents=["a", "b"])
    assert "a" in c
    assert "ghost" not in c
    assert len(c) == 2
    assert list(c) == ["a", "b"]


def test_move_is_atomic_across_two_containers():
    """The analysis' canonical example: moving a task between plans
    is one remove + one receive. If the destination vetoes, the
    source is restored so the move is observably atomic."""
    src = Container(slug="plan-a", contents=["task"])
    dst = Container(slug="plan-b")
    move("task", source=src, destination=dst)
    assert src.contents == [] and dst.contents == ["task"]

    src2 = Container(slug="plan-a", contents=["task"])
    def veto(_c, _s):
        raise RuntimeError("dst refused")
    dst2 = Container(slug="plan-b", on_receive=[veto])
    with pytest.raises(RuntimeError):
        move("task", source=src2, destination=dst2)
    # Source restored — the move was observably all-or-nothing
    assert src2.contents == ["task"]
    assert dst2.contents == []


def test_container_callback_can_mutate_callback_list_safely():
    """A callback that adds/removes other callbacks mid-iteration
    must not change which callbacks fire for the in-flight operation
    (snapshot-iteration invariant)."""
    fired = []
    c = Container(slug="plan")
    def adder(cont, _slug):
        fired.append("adder")
        cont.on_receive.append(lambda *_: fired.append("late"))
    c.on_receive.append(adder)
    c.receive("task")
    assert fired == ["adder"]  # the late-added callback did NOT fire here
    # But it IS registered for the next receive
    fired.clear()
    c.receive("task-2")
    assert "late" in fired


def test_container_rollback_survives_callback_that_mutates_contents():
    """A vetoing callback that ALSO mutated contents must not corrupt
    the rollback path — receive's rollback only undoes its own
    append, not arbitrary further mutations."""
    c = Container(slug="plan", contents=["original"])
    def naughty(cont, _slug):
        cont.contents.append("sneaky")  # mutate, then veto
        raise RuntimeError("vetoed")
    c.on_receive.append(naughty)
    with pytest.raises(RuntimeError):
        c.receive("new")
    # Our own append was rolled back; we don't pretend to undo the
    # callback's sneaky append, but we also don't crash.
    assert "new" not in c.contents
    assert c.contents[0] == "original"


def test_container_rollback_survives_callback_inserting_before_appended_index():
    """Architect-found regression: a callback that inserts BEFORE
    our appended index shifts our slug right. Rollback must still
    find and remove our slug — addressing it by *fixed* index would
    miss it. Contract: the slug we tried to receive is absent post-
    failure regardless of where callbacks shifted it."""
    c = Container(slug="plan", contents=["original"])
    def shifty(cont, _slug):
        cont.contents.insert(0, "prefix")  # shifts our slug right
        raise RuntimeError("vetoed-after-shift")
    c.on_receive.append(shifty)
    with pytest.raises(RuntimeError):
        c.receive("new")
    assert "new" not in c.contents
    # The callback's own mutation is left as-is; that's the callback's
    # responsibility, not the container's.
    assert "prefix" in c.contents
    assert "original" in c.contents


def test_container_rollback_when_callback_removes_received_slug_then_raises():
    """Edge case from architect review: a callback removes our slug
    entirely from contents and then raises. Rollback finds no match
    and exits cleanly; the post-failure invariant ('received slug
    absent') still holds and no exception is masked."""
    c = Container(slug="plan", contents=["original"])
    def cleanup_then_raise(cont, _slug):
        cont.contents.remove("new")  # remove our slug ourselves
        raise RuntimeError("late veto")
    c.on_receive.append(cleanup_then_raise)
    with pytest.raises(RuntimeError, match="late veto"):
        c.receive("new")
    assert "new" not in c.contents
    assert c.contents == ["original"]


def test_container_replacement_by_callback_is_not_undone_by_rollback():
    """Edge case: a callback replaces the received slug with a
    different value and then raises. Per the documented narrow
    contract, rollback removes any remaining occurrence of OUR slug
    but does not undo the replacement — the substitute value stays.
    This test pins that contract so future refactors don't silently
    promise stronger atomicity than is implemented."""
    c = Container(slug="plan", contents=["original"])
    def replace_then_raise(cont, _slug):
        # Replace the slug we just appended with a different value
        idx = cont.contents.index("new")
        cont.contents[idx] = "substitute"
        raise RuntimeError("vetoed-after-replace")
    c.on_receive.append(replace_then_raise)
    with pytest.raises(RuntimeError):
        c.receive("new")
    # Our slug is absent (it was replaced, so there's nothing to
    # remove), and the substitute remains — rollback is scoped to
    # our slug only.
    assert "new" not in c.contents
    assert "substitute" in c.contents


def test_compose_extends_is_additive_union():
    """TAB additive-attributes: child gets parent's PLUS its own,
    never less. The helper centralizes the union so callers can't
    accidentally implement override semantics."""
    result = compose_extends(["edit", "review"], ["compile"])
    assert result == frozenset({"edit", "review", "compile"})
    # Empty child still yields parent's full set
    assert compose_extends(["x", "y"], []) == frozenset({"x", "y"})
    # Empty parent still yields child's full set
    assert compose_extends([], ["x", "y"]) == frozenset({"x", "y"})
