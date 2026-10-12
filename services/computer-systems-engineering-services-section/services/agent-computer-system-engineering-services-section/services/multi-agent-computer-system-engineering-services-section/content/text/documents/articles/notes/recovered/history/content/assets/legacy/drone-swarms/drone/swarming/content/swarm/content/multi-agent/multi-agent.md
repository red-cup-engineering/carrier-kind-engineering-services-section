---
title: "Multi-agent systems"
component-of: artificial-intelligence
type: theory
class: engineering-theory
status: active
discipline: >
  The formal study of systems composed of multiple
  interacting autonomous agents — how they coordinate,
  compete, communicate, negotiate, aggregate preferences,
  and reach (or fail to reach) collective decisions. The
  theory comprises classical multi-agent systems (Shoham &
  Leyton-Brown's distributed-AI framing), mechanism-design
  theory (Vickrey auctions, revelation principle), social
  choice theory (Arrow's impossibility, Gibbard-Satterthwaite),
  game theory's equilibrium concepts as applied to
  multi-agent learning, distributed-systems results
  (Byzantine fault tolerance, leader election, CAP), and
  the contemporary engineering practice of orchestrating
  multiple LLM agents into composite systems. Companion to
  [swarm-intelligence](../swarm-intelligence/_index.md)
  (which studies emergent collective behavior in many-agent
  systems without central coordination); this theory
  emphasizes structured coordination, explicit protocols, and
  decision-theoretic frameworks for small-to-medium agent
  populations.
position: >
  This theory is a sibling of [agents](../agents/_index.md),
  [alignment](../alignment/_index.md),
  [interpretability](../interpretability/_index.md), and the
  other AI theories. It depends on
  [agents](../agents/_index.md) (the unit of analysis is an
  agent in the technical sense) and on
  [agent-foundations](../agent-foundations/_index.md) (the
  decision-theoretic substrate for individual agents within
  a multi-agent system). It is the parent of
  [theory-of-mind](theories/theory-of-mind/_index.md), which
  studies the substructure that lets one agent model another.
  It connects to economics and political science (mechanism
  design, voting theory) and to distributed systems
  (consensus protocols, fault tolerance).
---

The multi-agent-systems theory gives formal structure to how multiple autonomous agents interact.
It answers four questions precisely:

**When do agents coordinate?** Coordination is structurally hard: agents have private information, divergent preferences, and limited communication.
Cooperative outcomes require specific conditions ([equilibrium-concepts](concepts/equilibrium-concept.md), mechanism-design constraints, communication topology) that classical theory characterizes.

**How do mechanisms aggregate preferences?** Mechanism design (Vickrey, Hurwicz, Myerson) studies how to design *games* whose equilibria implement designer-chosen outcomes.
The [revelation-principle](theorems/revelation-principle.md) reduces the design space to direct mechanisms; the [gibbard-satterthwaite](theorems/gibbard-satterthwaite.md) theorem bounds what can be implemented under truthful voting; [arrows-impossibility](theorems/arrows-impossibility.md) bounds what voting systems can satisfy.

**What can distributed agents agree on?** Byzantine fault tolerance (Lamport et al.) characterizes how many faulty agents a consensus protocol can tolerate; the [byzantine-bound](theorems/byzantine-bound.md) shows agreement requires $n > 3f$ for $f$ faulty agents.

**How do contemporary LLM agent systems compose?** The engineering practice of orchestrating multiple LLM agents into pipelines, swarms, supervisor-worker hierarchies, and debate-style protocols is a fast-evolving subarea where classical multi-agent theory provides design vocabulary but no settled architecture.
See [the-orchestration-pattern](narratives/the-orchestration-pattern.md).
