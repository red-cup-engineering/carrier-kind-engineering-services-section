"""Agent abstraction and registry.

A FARS agent is an entity — human or program — that acts on the
substrate by invoking operators. Each agent carries a name, a set of
capabilities (what kinds of work it can perform), and a set of skills /
runbooks (named procedures it knows how to execute).

The agent abstraction is intentionally light here. The full AOP-side
content — capability fiber bundles, skill-as-predication-fiber, runbook
composition — lives in the upper-layer ``predicated-computing`` and
``agential-orchestration-platform`` theories. This module gives the
runtime a structural placeholder so witnesses can carry an ``agent``
attribution and the dispatch table can route to registered agents.

Initial expected registrations:
- ``claude-code`` — the agent running this Python session.
- ``ci`` — automated CI runners.
- Future scheduled agents.
"""
from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field, replace


@dataclass(frozen=True)
class Agent:
    """A registered FARS agent.

    Fields:
      name: stable identifier (used in witness ``agent`` field).
      capabilities: set of capability slugs the agent advertises.
      skills: set of skill slugs the agent has registered runbooks for.
      reads: predicate slugs the agent is permitted to read.
      writes: predicate slugs the agent is permitted to write.
      metadata: open dict for agent-specific data (e.g. version, host).

    Per the FARS scope-and-sandboxing analysis (Bussard's "scope is a
    list of entity references, loaded at investiture, not checked per
    action"; SWE-agent's ACI; Cline's hard modal split): ``reads`` and
    ``writes`` are the bounded, declarative scope of the agent. Empty
    means *unscoped* on that axis (legacy behavior — no permission
    information was carried, so callers had to assume permissive). A
    non-empty set means the agent is scoped to exactly those slugs.

    Wildcard semantics: the special token ``"*"`` in a scope set means
    "all predicates," used by the ship-permissive sandbox (you own
    your ship; you can do anything aboard) versus a station-restrictive
    sandbox that enumerates explicit slugs.
    """
    name: str
    capabilities: frozenset[str] = field(default_factory=frozenset)
    skills: frozenset[str] = field(default_factory=frozenset)
    reads: frozenset[str] = field(default_factory=frozenset)
    writes: frozenset[str] = field(default_factory=frozenset)
    metadata: tuple[tuple[str, str], ...] = ()

    def has_capability(self, cap: str) -> bool:
        return cap in self.capabilities

    def has_skill(self, skill: str) -> bool:
        return skill in self.skills

    # -- scope predicates (Bussard sandbox + SWE-agent ACI) ---------

    def can_read(self, predicate: str) -> bool:
        """``True`` if this agent may read the given predicate slug.

        Empty ``reads`` means unscoped (legacy permissive). A
        non-empty set restricts to exactly those slugs, with ``"*"``
        as the ship-style "all access" wildcard.
        """
        if not self.reads:
            return True
        return "*" in self.reads or predicate in self.reads

    def can_write(self, predicate: str) -> bool:
        """``True`` if this agent may write the given predicate slug.

        Same scoping rules as ``can_read``; the two axes are
        independent so a guest agent can hold ``reads={"*"}`` while
        ``writes`` enumerates a small allowed set (the canonical
        Bussard station shape).
        """
        if not self.writes:
            return True
        return "*" in self.writes or predicate in self.writes

    def with_added_scope(self, *, reads: Iterable[str] = (),
                         writes: Iterable[str] = ()) -> "Agent":
        """Return a new agent with additional scope, additively.

        TAB's "behaviors compose additively through the base chain"
        and Bussard's "child adds to parent" pattern: investiture
        composes scopes by union, never by replacement. The result is
        a *new* frozen Agent — the original is untouched.

        Monotonicity guard: an empty parent scope is *unrestricted*
        in the current legacy-permissive default (see class docstring).
        Naively unioning the empty parent with a finite added set would
        *narrow* permissions, which contradicts the additive-composition
        invariant. So an unrestricted parent stays unrestricted on that
        axis no matter what is "added." (The deny-by-default migration
        will eventually let us drop this guard.)
        """
        if self.reads:
            new_reads = self.reads | frozenset(reads)
        else:
            new_reads = self.reads  # already unrestricted
        if self.writes:
            new_writes = self.writes | frozenset(writes)
        else:
            new_writes = self.writes
        return replace(self, reads=new_reads, writes=new_writes)


@dataclass
class AgentRegistry:
    """Mutable registry of agents, keyed by name."""
    agents: dict[str, Agent] = field(default_factory=dict)

    def register(self, agent: Agent) -> None:
        if agent.name in self.agents:
            raise ValueError(f"agent {agent.name!r} already registered")
        self.agents[agent.name] = agent

    def get(self, name: str) -> Agent | None:
        return self.agents.get(name)

    def by_capability(self, cap: str) -> list[Agent]:
        return [a for a in self.agents.values() if a.has_capability(cap)]

    def by_can_read(self, predicate: str) -> list[Agent]:
        """Agents whose scope permits reading ``predicate``.

        Centralizes the scope semantics (including wildcard and the
        legacy-permissive empty default) so dispatch / planning paths
        can ask "who is allowed to read this?" without duplicating
        the rule.
        """
        return [a for a in self.agents.values() if a.can_read(predicate)]

    def by_can_write(self, predicate: str) -> list[Agent]:
        """Agents whose scope permits writing ``predicate``."""
        return [a for a in self.agents.values() if a.can_write(predicate)]

    def by_skill(self, skill: str) -> list[Agent]:
        return [a for a in self.agents.values() if a.has_skill(skill)]

    def __len__(self) -> int:
        return len(self.agents)

    def __iter__(self):
        return iter(self.agents.values())
