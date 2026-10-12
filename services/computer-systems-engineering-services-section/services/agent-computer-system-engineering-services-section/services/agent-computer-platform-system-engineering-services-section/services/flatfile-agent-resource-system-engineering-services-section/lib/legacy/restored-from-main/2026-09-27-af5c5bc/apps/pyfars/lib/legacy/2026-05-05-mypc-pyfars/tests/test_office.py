"""Tests for pyfars.runtime.office — Hohfeldian deontic profiles."""
import pytest

from pyfars.runtime.agent import Agent
from pyfars.runtime.office import (
    WEBER_AUTHORITY_TYPES,
    Office,
    invest,
    offices_with_duty,
    offices_with_power,
)


def test_office_default_is_rational_legal_with_empty_profile():
    """The minimum viable office — slug + sensible defaults — must
    construct without raising and carry no positions."""
    o = Office(slug="bookkeeper")
    assert o.authority_type == "rational-legal"
    assert o.duties == frozenset()
    assert not o.has_duty("anything")
    assert not o.can_command("anything")
    assert not o.is_privileged("anything")
    assert not o.is_immune("anything")
    # No immunity → the office is liable to any incoming power.
    assert o.is_liable("audit")


def test_office_rejects_unknown_weber_authority_type():
    """Weber types are a closed vocabulary; misspellings must raise
    rather than silently routing through a typo bucket."""
    with pytest.raises(ValueError):
        Office(slug="x", authority_type="divine-right")
    # All canonical types accepted
    for t in WEBER_AUTHORITY_TYPES:
        Office(slug="x", authority_type=t)


def test_office_hohfeldian_queries_use_their_own_sets():
    """Each of the four positions is independent: a duty is not a
    privilege, a power is not a duty. The four queries route to four
    distinct sets per the Hohfeldian decomposition."""
    o = Office(
        slug="auditor",
        duties=frozenset({"file-quarterly-report"}),
        powers=frozenset({"open-investigation"}),
        privileges=frozenset({"read-private-channel"}),
        immunities=frozenset({"be-fired-without-cause"}),
    )
    assert o.has_duty("file-quarterly-report")
    assert not o.has_duty("open-investigation")  # power, not duty
    assert o.can_command("open-investigation")
    assert o.is_privileged("read-private-channel")
    assert o.is_immune("be-fired-without-cause")
    assert not o.is_liable("be-fired-without-cause")
    assert o.is_liable("anything-without-immunity")


def test_invest_composes_scope_additively_onto_agent():
    """Per the analysis: investiture ADDS the office's scope onto the
    agent (Bussard's child-adds-to-parent, TAB's additive behaviors).
    Returns a new frozen Agent; original unchanged."""
    agent = Agent(name="claude", reads=frozenset({"status"}),
                  writes=frozenset({"status"}))
    office = Office(slug="comms",
                    reads=frozenset({"channel"}),
                    writes=frozenset({"event"}))
    invested = invest(agent, office)
    assert invested.reads == frozenset({"status", "channel"})
    assert invested.writes == frozenset({"status", "event"})
    # original agent unchanged (frozen invariant)
    assert agent.reads == frozenset({"status"})
    # name preserved through investiture
    assert invested.name == "claude"


def test_invest_does_not_narrow_an_unrestricted_agent():
    """Monotonicity guard inherited from Agent.with_added_scope: an
    agent with empty (legacy-unrestricted) scope cannot be narrowed
    by being invested into a finite-scope office."""
    agent = Agent(name="root")  # both axes unrestricted
    office = Office(slug="guest",
                    reads=frozenset({"status"}),
                    writes=frozenset({"status"}))
    invested = invest(agent, office)
    assert invested.reads == frozenset()
    assert invested.writes == frozenset()
    assert invested.can_read("anything")
    assert invested.can_write("anything")


def test_office_is_compelled_by_requires_liability_AND_external_power():
    """Hohfeldian power/liability fully resolved: compellability needs
    both (1) no covering immunity on this office and (2) some *other*
    office in the system actually holding the matching power. The
    abstract is_liable check alone is insufficient."""
    target = Office(slug="t")  # no immunities, fully liable
    silent_world = [Office(slug="bystander")]  # no powers anywhere
    assert target.is_liable("audit")
    assert not target.is_compelled_by(silent_world, "audit")

    auditor = Office(slug="auditor",
                     powers=frozenset({"audit"}))
    assert target.is_compelled_by([auditor], "audit")

    # Self-power must not count: an office cannot compel itself.
    self_powered = Office(slug="t", powers=frozenset({"audit"}))
    assert not self_powered.is_compelled_by([self_powered], "audit")

    # Immunity blocks compellability even when the power exists.
    immune = Office(slug="t", immunities=frozenset({"audit"}))
    assert not immune.is_compelled_by([auditor], "audit")


def test_governance_queries_route_through_position_sets():
    """offices_with_duty / offices_with_power are the inverse routing
    queries the analysis needs to answer 'who must X?' and 'who may
    command X?' without each caller re-implementing the predicate."""
    offices = [
        Office(slug="a", duties=frozenset({"file-report"})),
        Office(slug="b", duties=frozenset({"file-report", "audit"}),
               powers=frozenset({"open-investigation"})),
        Office(slug="c", powers=frozenset({"open-investigation"})),
    ]
    duty_holders = {o.slug for o in offices_with_duty(offices, "file-report")}
    assert duty_holders == {"a", "b"}
    power_holders = {o.slug for o in
                     offices_with_power(offices, "open-investigation")}
    assert power_holders == {"b", "c"}
