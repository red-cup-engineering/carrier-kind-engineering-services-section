"""Tests for pyfars.runtime.agent."""
import pytest

from pyfars.runtime.agent import Agent, AgentRegistry


def test_agent_construction():
    a = Agent(name="claude-code", capabilities=frozenset({"writeprose", "edit"}))
    assert a.name == "claude-code"
    assert a.has_capability("edit")
    assert not a.has_capability("compile")


def test_agent_skill_check():
    a = Agent(name="x", skills=frozenset({"validate-frontmatter"}))
    assert a.has_skill("validate-frontmatter")
    assert not a.has_skill("solve-pde")


def test_registry_register_and_get():
    reg = AgentRegistry()
    a = Agent(name="ci", capabilities=frozenset({"run-tests"}))
    reg.register(a)
    assert reg.get("ci") is a
    assert reg.get("absent") is None


def test_registry_duplicate_raises():
    reg = AgentRegistry()
    reg.register(Agent(name="x"))
    with pytest.raises(ValueError):
        reg.register(Agent(name="x"))


def test_registry_by_capability():
    reg = AgentRegistry()
    reg.register(Agent(name="a1", capabilities=frozenset({"edit"})))
    reg.register(Agent(name="a2", capabilities=frozenset({"edit", "review"})))
    reg.register(Agent(name="a3", capabilities=frozenset({"review"})))
    editors = reg.by_capability("edit")
    assert {a.name for a in editors} == {"a1", "a2"}


def test_agent_scope_unscoped_is_permissive():
    """Empty reads/writes preserve legacy permissive behavior — no
    scope was carried before this change, so no caller is suddenly
    locked out by upgrading."""
    a = Agent(name="legacy")
    assert a.can_read("anything")
    assert a.can_write("anything-else")


def test_agent_scope_enumerated_restricts():
    """Bussard station sandbox: scope = explicit list of slugs,
    nothing outside the list is granted."""
    a = Agent(name="guest",
              reads=frozenset({"status", "depends-on"}),
              writes=frozenset({"status"}))
    assert a.can_read("status")
    assert a.can_read("depends-on")
    assert not a.can_read("secret")
    assert a.can_write("status")
    assert not a.can_write("depends-on")  # read-only on this slug


def test_agent_scope_wildcard_is_ship_permissive():
    """Bussard ship sandbox: '*' grants all on that axis. The two
    axes are independent — read-all + write-some is a valid shape."""
    a = Agent(name="captain",
              reads=frozenset({"*"}),
              writes=frozenset({"status", "event"}))
    assert a.can_read("anything")
    assert a.can_write("status")
    assert not a.can_write("hull-integrity")


def test_agent_with_added_scope_is_additive_and_immutable():
    """TAB additive composition + Bussard 'child adds to parent':
    investiture composes by union, never by replacement, and the
    parent agent is left unchanged."""
    parent = Agent(name="x",
                   reads=frozenset({"status"}),
                   writes=frozenset({"status"}))
    child = parent.with_added_scope(reads=["depends-on"],
                                    writes=["event"])
    assert child.reads == frozenset({"status", "depends-on"})
    assert child.writes == frozenset({"status", "event"})
    # parent unchanged (frozen dataclass invariant)
    assert parent.reads == frozenset({"status"})
    assert parent.writes == frozenset({"status"})
    # identity preserved
    assert child.name == "x"


def test_agent_with_added_scope_does_not_narrow_unrestricted_parent():
    """Monotonicity guard: an empty (legacy-permissive) parent is
    *unrestricted*; additive composition must never *narrow* it.
    Without this guard, ``Agent().with_added_scope(reads=["status"])``
    would silently flip from allow-all to allow-only-status."""
    parent = Agent(name="root")  # both axes unrestricted
    child = parent.with_added_scope(reads=["status"], writes=["status"])
    assert child.reads == frozenset()  # still unrestricted
    assert child.writes == frozenset()
    assert child.can_read("anything")
    assert child.can_write("anything")


def test_registry_by_can_write_and_by_can_read():
    """Inverse scope queries route policy decisions back through the
    Agent.can_* fiber so callers don't reimplement the rule."""
    reg = AgentRegistry()
    reg.register(Agent(name="legacy"))  # unrestricted
    reg.register(Agent(name="guest",
                       reads=frozenset({"status"}),
                       writes=frozenset({"status"})))
    reg.register(Agent(name="reader",
                       reads=frozenset({"*"}),
                       writes=frozenset({"event"})))
    writers = {a.name for a in reg.by_can_write("status")}
    assert writers == {"legacy", "guest"}
    readers = {a.name for a in reg.by_can_read("secret")}
    assert readers == {"legacy", "reader"}


def test_registry_iter_and_len():
    reg = AgentRegistry()
    reg.register(Agent(name="x"))
    reg.register(Agent(name="y"))
    assert len(reg) == 2
    names = {a.name for a in reg}
    assert names == {"x", "y"}
