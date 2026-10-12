"""Office records with Hohfeldian deontic profiles.

Implements the FARS offices-and-governance analysis: every office has a
universal template — core identity, authority, normative system,
**deontic profile** (all four Hohfeldian positions), accountability,
action domain, capabilities, installation. This module is the runtime
data carrier for the deontic-profile + action-domain slice. The fuzzy
authority-prose pieces stay in the markdown office records.

The four Hohfeldian positions encoded here:

  duties      — actions the office MUST perform (deontic obligation)
  powers      — actions the office CAN command others to perform
                (legal-power; ability to alter another's position)
  privileges  — actions the office MAY perform without asking (no
                duty to refrain; the "permitted" position)
  immunities  — actions to which the office CANNOT be forced (no
                liability to others' powers)

Plus the action-domain pair from the scope-and-sandboxing analysis:

  reads / writes — predicate slugs the office is scoped to read/write

An office is *filled* by an agent at investiture. The investiture
function on this module composes the office's scope additively into
the agent (per Bussard's child-adds-to-parent and TAB's additive
behaviors), so the resulting agent carries both its prior scope and
the office's. The office's deontic profile remains addressable on the
office itself for governance queries (``can_command``, ``has_duty``,
etc.).
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field

from pyfars.runtime.agent import Agent

# Weber's three ideal-type sources of authority. Encoded as a small
# closed vocabulary so misspellings raise loudly rather than silently
# routing into a typo bucket.
WEBER_AUTHORITY_TYPES: frozenset[str] = frozenset({
    "traditional", "charismatic", "rational-legal",
})


@dataclass(frozen=True)
class Office:
    """A FARS office record — the deontic-profile + action-domain slice
    of the universal office template.

    Fields:
      slug: stable identifier (matches the office record filename).
      title: human-readable display name.
      department: organizational grouping (e.g. "engineering").
      authority_type: Weber type — one of WEBER_AUTHORITY_TYPES.
      duties: action slugs the office MUST perform.
      powers: action slugs the office CAN command others to perform.
      privileges: action slugs the office MAY perform without asking.
      immunities: action slugs the office CANNOT be forced into.
      reads: predicate slugs the office is scoped to read.
      writes: predicate slugs the office is scoped to write.

    All four Hohfeldian sets and both scope sets default to empty
    frozensets. Empty deontic sets mean *the office bears no position
    of that kind* (a privilege-only office, for instance). Empty
    scope sets follow the Agent convention: legacy-permissive — see
    ``investiture`` for the additive composition rule that preserves
    monotonicity.
    """
    slug: str
    title: str = ""
    department: str = ""
    authority_type: str = "rational-legal"
    duties: frozenset[str] = field(default_factory=frozenset)
    powers: frozenset[str] = field(default_factory=frozenset)
    privileges: frozenset[str] = field(default_factory=frozenset)
    immunities: frozenset[str] = field(default_factory=frozenset)
    reads: frozenset[str] = field(default_factory=frozenset)
    writes: frozenset[str] = field(default_factory=frozenset)

    def __post_init__(self) -> None:
        if self.authority_type not in WEBER_AUTHORITY_TYPES:
            raise ValueError(
                f"unknown authority_type {self.authority_type!r}; "
                f"valid: {sorted(WEBER_AUTHORITY_TYPES)}"
            )

    # -- Hohfeldian queries ----------------------------------------

    def has_duty(self, action: str) -> bool:
        """``True`` if the office is obligated to perform ``action``."""
        return action in self.duties

    def can_command(self, action: str) -> bool:
        """``True`` if the office holds the legal-power to command
        ``action`` of others."""
        return action in self.powers

    def is_privileged(self, action: str) -> bool:
        """``True`` if the office may perform ``action`` without
        asking — no duty to refrain."""
        return action in self.privileges

    def is_immune(self, action: str) -> bool:
        """``True`` if the office cannot be compelled into
        ``action`` by any other office's power."""
        return action in self.immunities

    def is_liable(self, action: str) -> bool:
        """Hohfeldian liability — the jural correlative of *power*.

        ``True`` iff this office holds no immunity covering ``action``.
        Liability is *abstract*: it says the office is *susceptible*
        to a matching power, not that any specific office actually
        holds one. Use ``is_compelled_by`` for the contextual,
        existential check ("is there in fact some office with the
        power to compel this action of me?").
        """
        return not self.is_immune(action)

    def is_compelled_by(self, offices: Iterable["Office"],
                        action: str) -> bool:
        """Contextual compellability: ``True`` iff this office is
        liable to ``action`` AND at least one office in ``offices``
        (other than self) holds the matching power.

        This is the Hohfeldian power/liability pair fully resolved:
        a power exists in the wider system, and this office has no
        immunity that blocks it. Self is excluded so an office's own
        power over itself never counts as compelling.
        """
        if not self.is_liable(action):
            return False
        return any(o.can_command(action) and o.slug != self.slug
                   for o in offices)


def invest(agent: Agent, office: Office) -> Agent:
    """Investiture: bind ``agent`` to ``office`` by composing scope.

    Per the FARS offices-and-governance analysis (LPMud guilds,
    Bussard's "child adds to parent", TAB's additive behaviors) the
    investiture step *does not replace* the agent's prior scope; it
    *adds* the office's reads/writes onto the agent monotonically. An
    unrestricted (legacy-permissive) agent stays unrestricted on an
    axis even if the office enumerates a finite set on that axis —
    the same monotonicity guard ``Agent.with_added_scope`` enforces,
    so investiture cannot silently *narrow* what an agent can do.

    Returns a new ``Agent`` (frozen dataclass); the input is unchanged.
    The office itself is not mutated. Wiring office identity onto the
    agent (e.g. as a metadata field) is intentionally out of scope —
    governance code consults the office record directly via slug.
    """
    return agent.with_added_scope(
        reads=office.reads,
        writes=office.writes,
    )


def offices_with_duty(offices: Iterable[Office],
                      action: str) -> list[Office]:
    """Governance query: which offices bear a duty to do ``action``?"""
    return [o for o in offices if o.has_duty(action)]


def offices_with_power(offices: Iterable[Office],
                       action: str) -> list[Office]:
    """Governance query: which offices may command ``action`` of
    others? Routing point for command-channel dispatch."""
    return [o for o in offices if o.can_command(action)]
