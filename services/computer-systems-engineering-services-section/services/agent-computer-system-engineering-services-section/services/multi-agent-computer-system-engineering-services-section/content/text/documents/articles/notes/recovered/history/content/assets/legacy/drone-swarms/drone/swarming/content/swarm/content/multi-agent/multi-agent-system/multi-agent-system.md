---
type: concept
class: classical
status: active
depends-on: []
see-also:
  - agent-orchestration.md
  - emergent-coordination.md
  - ../objects/agent-population.md
references:
  - references/shoham-leyton-brown2009.md
  - references/weiss-multiagent2013.md
---

# Multi-agent system

A **multi-agent system** (MAS) is a system composed of two or more autonomous agents interacting in a shared environment.
The agents may be cooperative, competitive, or mixed; they may share goals or have divergent preferences; they may communicate explicitly or only through their effects on the environment.

## Defining commitments

A multi-agent system is characterized by:

- **Multiple agents.** At least two; usually more.
- **Autonomy.** Each agent makes its own decisions; no single locus of control.
- **Shared environment.** Agents can observe and affect a common substrate.
- **Interaction.** Agents' actions matter to other agents, whether through direct communication or environmental effects.

The MAS abstraction is *agent-relative*: the same physical system may be modeled as one agent or many depending on analytical purpose.

## Why MAS is its own subject

Single-agent decision theory (rationality, utility maximization, planning) doesn't directly apply when other agents are present:

- The environment is *non-stationary* from any single agent's view (other agents adapt).
- *Strategic* considerations matter (one agent's optimal move depends on others' choices).
- *Coordination* is required for joint outcomes that no single agent can produce.
- *Communication* becomes a strategic act, not just information transfer.

These features make MAS the proper home for [mechanism-design](mechanism-design.md), game-theoretic [equilibrium-concepts](equilibrium-concept.md), social-choice theory, and distributed-coordination protocols.

## Coordination dimensions

A useful taxonomy:

- **Cooperative vs competitive.** Do agents share goals (cooperative team) or have conflicting goals (zero-sum competition)?
  Most real MAS are mixed-motive.
- **Centralized vs decentralized.** Is decision-making pooled (joint policy) or each-agent-local?
- **Communicative vs silent.** Can agents exchange messages, or do they only observe each other's actions?
- **Homogeneous vs heterogeneous.** Are agents interchangeable (swarm) or specialized (team with roles)?
- **Synchronous vs asynchronous.** Do agents act in lockstep or at independent times?

Each dimension affects which formal tools apply and which coordination problems arise.

## Contemporary instantiation

Modern MAS practice spans:

- **Distributed systems.** Consensus protocols, leader election, fault-tolerant agreement (where "agents" are processes).
- **Multi-agent reinforcement learning (MARL).** Multiple RL agents in shared environments; cooperative, competitive, or mixed.
- **LLM agent orchestration.** Pipelines and hierarchies of LLM-based agents collaborating on tasks.
  See [agent-orchestration](agent-orchestration.md) and [the-orchestration-pattern](teaching/explanations/the-orchestration-pattern.md).
- **Autonomous-vehicle swarms, market-based scheduling, robotic coordination.** Domain-specific MAS engineering.

## Where the theory lives

Multi-agent systems is the substrate for:

- **Mechanism design** — designing the rules of agent interaction so equilibria implement designer goals.
- **Social choice** — aggregating preferences across agents.
- **Distributed coordination** — protocols for agents to agree, allocate, schedule, lead.
- **Multi-agent learning** — how agents update strategies in the presence of other learners.

Each of these is a substantial theory in its own right; MAS is the unifying frame.
