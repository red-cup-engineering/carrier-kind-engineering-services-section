"""Boundary — the transport-independent fiber composition of a session.

Implements the FARS interface-and-boundary analysis. The boundary is
*not* the TUI, the CLI, the web, or the MCP server — those are
*renderings* of the boundary. The boundary itself is the fiber
composition that determines what a connected party (human or agent)
can see, command, and be obligated to do.

Per the analysis, a boundary composes three layers:

  1. **Office** — guild-level defaults (LPMud guild powers). Carried
     by the ``Office`` record from ``runtime.office``: duties,
     powers, privileges, immunities.
  2. **Personnel** — individual overrides that *add* to the office's
     positions (LPMud character abilities; Bussard's child-adds-to-
     parent monotonicity). Personnel positions never narrow what the
     office grants; they only widen.
  3. **Mode** — a per-context restriction (Cline Plan/Act, Bussard
     flight/repl/ssh) that constrains the *active* powers and
     privileges to a named subset. Duties and immunities are
     orthogonal to mode: an obligation doesn't disappear because
     you switched to read-only, and a protection doesn't either.

A ``location`` predicate names the entity currently being looked at
(LPMud's room semantics generalized — works for "in plan-foo",
"in office-comms", or "in room-bridge"). The boundary is *live*: each
mutation returns a new ``Boundary`` (frozen dataclass), so a session
that gains a privilege mid-stream re-queries against the new value
and the old one is still addressable for audit.

Open question 5 from the analysis ("does the boundary model
generalize to both human and agent connections?") is answered
affirmatively here: the personnel slug is just a label; nothing in
this module distinguishes human from agent.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from pyfars.runtime.office import Office


@dataclass(frozen=True)
class LocationFiber:
    """The location-fiber composed into a boundary.

    Per the analysis (principle 4: "Location is a predicate on the
    boundary") the location is not just metadata — it participates
    in composition. A location can:

      - reveal a set of entities to ``look`` (the room's contents);
      - constrain which powers/privileges are *exercisable here*
        (you may have the power to ``open-investigation`` in
        principle, but the bridge isn't where you do it).

    Fields:
      slug: the location entity's slug (matches ``Boundary.location``).
      visible: entity slugs the boundary can ``look`` at from here.
      allowed_powers: ``None`` = location does not restrict powers
        (legacy-permissive default); concrete frozenset =
        intersect effective powers with this set when at this
        location. Same convention as ``Mode.allowed_powers``.
      allowed_privileges: same idea for privileges.

    Duties and immunities are not location-restricted (an obligation
    or a protection doesn't depend on which room you're in).
    """
    slug: str
    visible: frozenset[str] = field(default_factory=frozenset)
    allowed_powers: Optional[frozenset[str]] = None
    allowed_privileges: Optional[frozenset[str]] = None


@dataclass(frozen=True)
class Mode:
    """A mode is a named restriction over the boundary's *active*
    capabilities.

    Fields:
      name: human-readable identifier ("plan", "act", "flight",
        "repl", "ssh"). Used in error messages and witnesses.
      allowed_powers: subset of action slugs that remain active for
        the *power* position in this mode. Per the analysis, Cline
        Plan Mode "removes write tools entirely" — this is encoded
        as an explicit allow-list. ``None`` means "no restriction
        on powers" (the legacy-permissive default; matches the same
        convention ``Agent.reads``/``writes`` use for empty=open).
      allowed_privileges: same idea for the *privilege* position.

    Duties and immunities are intentionally *not* mode-restricted:
    an obligation doesn't lapse because you switched to plan-mode,
    and a protection doesn't either. Modes constrain what you *do*,
    not what you *must* do or what others can force on you.
    """
    name: str
    allowed_powers: Optional[frozenset[str]] = None
    allowed_privileges: Optional[frozenset[str]] = None


@dataclass(frozen=True)
class Boundary:
    """A connected party's view of the system — the composed fiber.

    Fields:
      office: the office record carrying guild-level defaults.
      personnel: the slug identifying who is connected (human or
        agent — the boundary doesn't distinguish).
      location: the predicate ``location`` — the entity currently
        being looked at. Empty string means "nowhere in particular".
      personnel_duties: individual additive duties on top of office.
      personnel_powers: individual additive powers on top of office.
      personnel_privileges: individual additive privileges.
      personnel_immunities: individual additive immunities.
      mode: optional ``Mode`` further restricting active powers and
        privileges. ``None`` means "no mode restriction".
      location_fiber: optional ``LocationFiber`` composed into the
        boundary. When present, its ``allowed_powers`` /
        ``allowed_privileges`` intersect with the office+personnel
        union (same shape as ``Mode``), and ``visible_here()`` reads
        its ``visible`` set. ``location`` is the slug; this is the
        composed fiber. ``None`` means location is metadata only.

    All four personnel position frozensets default to empty —
    nothing added beyond the office. The compose-via-union rule
    matches LPMud's "guild powers + character abilities" semantics
    and the offices-and-governance analysis' investiture model.
    """
    office: Office
    personnel: str
    location: str = ""

    def __post_init__(self) -> None:
        # Guard rail: a composed location fiber must describe the
        # boundary's actual location. Mismatched fibers would silently
        # apply the wrong visibility/restriction set, which is the
        # kind of bug that's invisible until production. Fail loud.
        if (self.location_fiber is not None
                and self.location_fiber.slug != self.location):
            raise ValueError(
                f"location_fiber.slug={self.location_fiber.slug!r} "
                f"does not match boundary.location={self.location!r}"
            )
    personnel_duties: frozenset[str] = field(default_factory=frozenset)
    personnel_powers: frozenset[str] = field(default_factory=frozenset)
    personnel_privileges: frozenset[str] = field(default_factory=frozenset)
    personnel_immunities: frozenset[str] = field(default_factory=frozenset)
    mode: Optional[Mode] = None
    location_fiber: Optional[LocationFiber] = None

    # -- effective Hohfeldian positions ----------------------------

    @property
    def effective_duties(self) -> frozenset[str]:
        """Union of office duties and personnel duties. Modes do not
        restrict duties — an obligation is not contingent on context."""
        return self.office.duties | self.personnel_duties

    @property
    def effective_powers(self) -> frozenset[str]:
        """Union of office and personnel powers, then intersected
        with the active mode's and the location-fiber's allow-lists
        (if either restricts). Composition order doesn't matter
        because intersection is commutative; both restrictions stack.
        """
        composed = self.office.powers | self.personnel_powers
        if self.mode is not None and self.mode.allowed_powers is not None:
            composed = composed & self.mode.allowed_powers
        if (self.location_fiber is not None
                and self.location_fiber.allowed_powers is not None):
            composed = composed & self.location_fiber.allowed_powers
        return composed

    @property
    def effective_privileges(self) -> frozenset[str]:
        """Union of office and personnel privileges, then mode- and
        location-restricted (privileges are 'may do', so both apply)."""
        composed = self.office.privileges | self.personnel_privileges
        if (self.mode is not None
                and self.mode.allowed_privileges is not None):
            composed = composed & self.mode.allowed_privileges
        if (self.location_fiber is not None
                and self.location_fiber.allowed_privileges is not None):
            composed = composed & self.location_fiber.allowed_privileges
        return composed

    # -- location queries ------------------------------------------

    def visible_here(self) -> frozenset[str]:
        """Entity slugs visible to ``look`` from the current location.

        If no ``location_fiber`` is composed, returns the empty set —
        location is then metadata only and the caller is responsible
        for resolving visibility some other way (e.g. by walking the
        substrate). The empty set is the honest answer: we cannot
        report what we cannot see.
        """
        if self.location_fiber is None:
            return frozenset()
        return self.location_fiber.visible

    def can_see(self, entity: str) -> bool:
        """``True`` iff ``entity`` is in ``visible_here()``. The
        ``look`` predicate at the boundary fiber."""
        return entity in self.visible_here()

    @property
    def effective_immunities(self) -> frozenset[str]:
        """Union of office and personnel immunities. Modes do not
        strip immunities — switching to plan-mode shouldn't make
        you *more* compellable than you'd be in act-mode."""
        return self.office.immunities | self.personnel_immunities

    # -- queries ---------------------------------------------------

    def has_duty(self, action: str) -> bool:
        return action in self.effective_duties

    def can_command(self, action: str) -> bool:
        return action in self.effective_powers

    def is_privileged(self, action: str) -> bool:
        return action in self.effective_privileges

    def is_immune(self, action: str) -> bool:
        return action in self.effective_immunities

    def is_liable(self, action: str) -> bool:
        """Hohfeldian liability — no covering immunity. Mirrors
        ``Office.is_liable`` at the boundary fiber."""
        return not self.is_immune(action)

    # -- live mutation (returns new boundary) ----------------------

    def with_location(self, location: str,
                      fiber: Optional[LocationFiber] = None) -> "Boundary":
        """Return a new boundary at ``location``. The analysis: ``go``
        changes location; ``look`` reads the fiber at the current
        location. This is the ``go`` primitive.

        The optional ``fiber`` argument supplies the composed
        location fiber for the new location. Pass ``None`` (default)
        to clear the fiber when location semantics aren't needed.
        Resolving ``location`` -> ``LocationFiber`` from the
        substrate is intentionally out of scope here — callers
        (sessions, orchestrators) own that lookup so the boundary
        primitive stays substrate-independent.
        """
        return self._replace(location=location, location_fiber=fiber)

    def with_office(self, office: Office) -> "Boundary":
        """Re-investiture: return a new boundary with a different
        office. The institutional reassignment pathway, distinct
        from ``grant`` (which only widens *personnel* positions).
        Per architect: keeping these two operations separate keeps
        audit trails clear — re-investiture is a governance event,
        widening is a personnel event.

        Personnel-level positions, location, mode, and location
        fiber are preserved; only the office swaps out.
        """
        return self._replace(office=office)

    def with_mode(self, mode: Optional[Mode]) -> "Boundary":
        """Return a new boundary with ``mode`` active (or ``None`` to
        clear mode restriction). Per analysis: modes are a *further*
        restriction on the boundary, not an alternate boundary."""
        return self._replace(mode=mode)

    def grant(self, *,
              duties: frozenset[str] = frozenset(),
              powers: frozenset[str] = frozenset(),
              privileges: frozenset[str] = frozenset(),
              immunities: frozenset[str] = frozenset()) -> "Boundary":
        """Return a new boundary with personnel positions widened.

        Per the analysis' principle 3 ("the boundary is live, not
        static"): if cassia gains a privilege mid-session, her
        boundary updates. This is the additive widening operator —
        positions only ever accumulate at the personnel layer, so a
        grant cannot silently revoke prior personnel positions.
        """
        return self._replace(
            personnel_duties=self.personnel_duties | duties,
            personnel_powers=self.personnel_powers | powers,
            personnel_privileges=self.personnel_privileges | privileges,
            personnel_immunities=self.personnel_immunities | immunities,
        )

    def _replace(self, **changes) -> "Boundary":
        """Internal frozen-dataclass replace helper. Avoids importing
        ``dataclasses.replace`` at every call site and keeps the
        mutation surface auditable."""
        from dataclasses import replace
        return replace(self, **changes)


def respond(personnel: str, *, office: Office,
            location: str = "",
            mode: Optional[Mode] = None) -> Boundary:
    """The boundary-composition entry point.

    Per the analysis: ``respond(cassia-lorne, {action: connect})``
    returns the composed boundary — the system settles what cassia
    can see by composing her office fiber, her personnel fiber, and
    the current room fiber. This module's runtime answer to the
    open question "is boundary composition a FARS message?" is yes,
    and ``respond`` is the constructor.

    Personnel-level positions are not provided here; they're added
    later via ``Boundary.grant`` as the session learns about the
    individual. Initial connection gives you the office defaults at
    the requested location, optionally already in a mode.
    """
    return Boundary(office=office, personnel=personnel,
                    location=location, mode=mode)
