"""Tests for pyfars.runtime.boundary — fiber composition of office +
personnel + location + mode."""
import pytest

from pyfars.runtime.boundary import Boundary, LocationFiber, Mode, respond
from pyfars.runtime.office import Office


def _office():
    """Auditor office reused across tests for terseness."""
    return Office(
        slug="auditor",
        duties=frozenset({"file-report"}),
        powers=frozenset({"open-investigation", "audit"}),
        privileges=frozenset({"read-private"}),
        immunities=frozenset({"be-fired-without-cause"}),
    )


def test_respond_constructs_boundary_with_office_defaults():
    """Initial respond() gives office defaults at the requested
    location with no personnel-level additions and no mode."""
    b = respond("alice", office=_office(), location="bridge")
    assert b.personnel == "alice"
    assert b.location == "bridge"
    assert b.mode is None
    # Office positions visible through the boundary
    assert b.has_duty("file-report")
    assert b.can_command("audit")
    assert b.is_privileged("read-private")
    assert b.is_immune("be-fired-without-cause")
    assert b.is_liable("anything-without-immunity")


def test_personnel_positions_compose_additively_with_office():
    """LPMud guild + character: personnel positions ADD to office
    positions, never replace or narrow them."""
    b = Boundary(
        office=_office(),
        personnel="alice",
        personnel_powers=frozenset({"sign-contract"}),
    )
    # Office power still available
    assert b.can_command("audit")
    # Personnel power also available
    assert b.can_command("sign-contract")
    assert b.effective_powers == frozenset(
        {"open-investigation", "audit", "sign-contract"})


def test_grant_widens_personnel_positions_returns_new_boundary():
    """The 'live boundary' principle: grants accumulate, returning a
    new frozen Boundary; the original is unchanged so prior states
    remain addressable for audit."""
    b0 = respond("alice", office=_office())
    b1 = b0.grant(privileges=frozenset({"choose-focus"}),
                  immunities=frozenset({"be-reassigned"}))
    assert b0.is_privileged("choose-focus") is False
    assert b1.is_privileged("choose-focus") is True
    assert b1.is_immune("be-reassigned") is True
    # Office positions still composed in the new boundary
    assert b1.can_command("audit")
    # Successive grants accumulate, never revoke
    b2 = b1.grant(privileges=frozenset({"draft-policy"}))
    assert b2.is_privileged("choose-focus")
    assert b2.is_privileged("draft-policy")


def test_mode_restricts_powers_to_allow_list():
    """Cline Plan Mode: 'removes write tools entirely'. Mode
    intersects effective powers with the mode's allow-list."""
    b = respond("alice", office=_office())
    plan = Mode(name="plan",
                allowed_powers=frozenset({"audit"}))  # no investigation
    bp = b.with_mode(plan)
    assert bp.can_command("audit")
    assert not bp.can_command("open-investigation")
    # Returning to no-mode restores full powers
    assert bp.with_mode(None).can_command("open-investigation")


def test_mode_with_none_allowed_means_unrestricted():
    """A Mode with allowed_powers=None (default) doesn't restrict
    powers — matches the legacy-permissive convention used elsewhere
    (Agent.reads/writes empty = open)."""
    b = respond("alice", office=_office())
    naming_only = Mode(name="diagnostic")  # no restrictions, just labeled
    bm = b.with_mode(naming_only)
    assert bm.can_command("audit")
    assert bm.can_command("open-investigation")
    assert bm.is_privileged("read-private")


def test_mode_does_not_restrict_duties_or_immunities():
    """Per the analysis: mode constrains what you DO, not what you
    MUST do or what others can force on you. Plan-mode doesn't
    strip your duties or your immunities."""
    b = respond("alice", office=_office())
    locked = Mode(name="readonly",
                  allowed_powers=frozenset(),
                  allowed_privileges=frozenset())
    bm = b.with_mode(locked)
    # Powers & privileges fully locked down
    assert bm.effective_powers == frozenset()
    assert bm.effective_privileges == frozenset()
    # But duties and immunities pass through unchanged
    assert bm.has_duty("file-report")
    assert bm.is_immune("be-fired-without-cause")


def test_with_location_returns_new_boundary_at_new_predicate():
    """``go`` primitive: changing location returns a new boundary;
    the prior boundary is still addressable (frozen invariant)."""
    b0 = respond("alice", office=_office(), location="bridge")
    b1 = b0.with_location("engineering")
    assert b0.location == "bridge"
    assert b1.location == "engineering"
    # All other fibers preserved through location change
    assert b1.can_command("audit")
    assert b1.personnel == "alice"


def test_personnel_immunity_blocks_office_liability():
    """Personnel immunities ADD to office immunities, so an
    individual override can protect against an action the office
    alone would be liable to."""
    b = respond("alice", office=_office())
    # Office is liable to "be-audited" (no immunity for it)
    assert b.is_liable("be-audited")
    # Personnel-level immunity protects this individual specifically
    b2 = b.grant(immunities=frozenset({"be-audited"}))
    assert b2.is_immune("be-audited")
    assert not b2.is_liable("be-audited")


def test_location_fiber_restricts_effective_powers_at_location():
    """Per analysis principle 4 (location is a predicate that
    participates in composition): a location's allowed_powers
    intersects with the office+personnel union, just as a Mode does.
    A power held in principle isn't necessarily exercisable here."""
    b = respond("alice", office=_office())
    assert b.can_command("open-investigation")
    bridge = LocationFiber(slug="bridge",
                           allowed_powers=frozenset({"audit"}))
    bb = b.with_location("bridge", bridge)
    # open-investigation is held by the office but not exercisable on the bridge
    assert not bb.can_command("open-investigation")
    assert bb.can_command("audit")


def test_location_fiber_and_mode_compose_via_intersection():
    """Mode and location restrictions stack — both must allow an
    action for it to be effective. Intersection is commutative so
    composition order doesn't matter."""
    b = respond("alice", office=_office())
    plan = Mode(name="plan",
                allowed_powers=frozenset({"audit", "open-investigation"}))
    bridge = LocationFiber(slug="bridge",
                           allowed_powers=frozenset({"open-investigation"}))
    composed = b.with_mode(plan).with_location("bridge", bridge)
    # Both must allow → only open-investigation survives
    assert composed.effective_powers == frozenset({"open-investigation"})
    assert not composed.can_command("audit")


def test_visible_here_reports_location_fiber_contents():
    """The ``look`` predicate: visible_here() returns the location
    fiber's visible set, or empty when no fiber is composed."""
    b = respond("alice", office=_office(), location="bridge")
    # No fiber composed → honestly empty (we can't report what we can't see)
    assert b.visible_here() == frozenset()
    assert not b.can_see("anything")
    bridge = LocationFiber(slug="bridge",
                           visible=frozenset({"console", "viewscreen"}))
    bf = b.with_location("bridge", bridge)
    assert bf.visible_here() == frozenset({"console", "viewscreen"})
    assert bf.can_see("console")
    assert not bf.can_see("warp-core")


def test_location_fiber_does_not_restrict_duties_or_immunities():
    """Location, like mode, doesn't relieve obligations or strip
    protections — being on the bridge doesn't excuse an unfiled
    report or make you fireable-without-cause."""
    b = respond("alice", office=_office())
    # A maximally-restrictive location with no allowed actions at all
    null_loc = LocationFiber(slug="airlock",
                             allowed_powers=frozenset(),
                             allowed_privileges=frozenset())
    bn = b.with_location("airlock", null_loc)
    # Powers and privileges fully clamped here
    assert bn.effective_powers == frozenset()
    assert bn.effective_privileges == frozenset()
    # But duties and immunities pass through
    assert bn.has_duty("file-report")
    assert bn.is_immune("be-fired-without-cause")


def test_with_office_is_reinvestiture_distinct_from_grant():
    """Architect-driven contract: institutional reassignment is a
    separate operation from personnel widening. with_office swaps
    the office while preserving personnel positions, location,
    mode, and location fiber — so audit can distinguish a
    re-investiture event from a grant event."""
    new_office = Office(
        slug="captain",
        powers=frozenset({"command-vessel"}),
        immunities=frozenset({"be-court-martialed-in-peacetime"}),
    )
    plan = Mode(name="plan", allowed_powers=frozenset({"command-vessel"}))
    b = (respond("alice", office=_office(), location="bridge")
         .grant(privileges=frozenset({"choose-focus"}))
         .with_mode(plan))
    b2 = b.with_office(new_office)
    # Office-level positions swapped
    assert b2.can_command("command-vessel")
    assert not b2.can_command("audit")  # auditor's power gone
    # Personnel-level position preserved through re-investiture
    # (privileges allow-list is None so no mode restriction applies)
    assert b2.is_privileged("choose-focus")
    # Location and mode preserved
    assert b2.location == "bridge"
    assert b2.mode is plan
    # Original boundary unchanged (frozen)
    assert b.office.slug == "auditor"


def test_with_office_preserves_attached_location_fiber():
    """Re-investiture preserves the composed location fiber object —
    institutional reassignment doesn't disturb the location-fiber
    composition state."""
    bridge = LocationFiber(slug="bridge",
                           visible=frozenset({"console"}),
                           allowed_powers=frozenset({"audit"}))
    b = (respond("alice", office=_office())
         .with_location("bridge", bridge))
    new_office = Office(slug="captain",
                        powers=frozenset({"command-vessel", "audit"}))
    b2 = b.with_office(new_office)
    assert b2.location_fiber is bridge
    assert b2.can_see("console")
    # Location restriction still applies post-reinvestiture
    assert b2.can_command("audit")
    assert not b2.can_command("command-vessel")  # bridge doesn't allow it


def test_mode_and_location_privileges_stack_via_intersection():
    """Mirror of the powers-commutativity test, on the privilege axis:
    Mode.allowed_privileges and LocationFiber.allowed_privileges
    both intersect with the office+personnel union, in either order."""
    office = Office(slug="o",
                    privileges=frozenset({"read-private", "draft-policy",
                                          "publish"}))
    b = respond("alice", office=office)
    plan = Mode(name="plan",
                allowed_privileges=frozenset({"read-private", "draft-policy"}))
    archive = LocationFiber(slug="archive",
                            allowed_privileges=frozenset(
                                {"read-private", "publish"}))
    composed = b.with_mode(plan).with_location("archive", archive)
    # Only the intersection across office, mode, and location survives
    assert composed.effective_privileges == frozenset({"read-private"})
    assert composed.is_privileged("read-private")
    assert not composed.is_privileged("draft-policy")  # location filters out
    assert not composed.is_privileged("publish")  # mode filters out


def test_boundary_rejects_location_fiber_with_mismatched_slug():
    """Hardening: a fiber whose slug doesn't match the boundary's
    location is almost certainly a wiring bug — fail loud at
    construction rather than silently composing the wrong fiber."""
    wrong = LocationFiber(slug="engineering")
    with pytest.raises(ValueError, match="does not match"):
        Boundary(office=_office(), personnel="alice",
                 location="bridge", location_fiber=wrong)
    # Matching slugs are accepted
    ok = LocationFiber(slug="bridge")
    Boundary(office=_office(), personnel="alice",
             location="bridge", location_fiber=ok)


def test_boundary_is_frozen_and_hashable():
    """Frozen-dataclass invariant: boundaries can be put in sets /
    used as dict keys for audit indexing."""
    b1 = respond("alice", office=_office())
    b2 = respond("alice", office=_office())
    # Same composition → equal and hashable
    assert b1 == b2
    s = {b1, b2}
    assert len(s) == 1
    # Mutation attempt raises (frozen)
    with pytest.raises(Exception):
        b1.location = "hacked"  # type: ignore[misc]
