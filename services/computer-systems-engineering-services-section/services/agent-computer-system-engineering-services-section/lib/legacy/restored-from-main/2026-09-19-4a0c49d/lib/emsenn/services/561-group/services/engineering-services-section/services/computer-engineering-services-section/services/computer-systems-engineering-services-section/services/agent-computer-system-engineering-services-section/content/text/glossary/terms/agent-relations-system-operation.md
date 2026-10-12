---
id: agent-relations-system-operation
description: "An AgentRelationsSystemOperation is a RelationalSystemOperation in an AgentRelationsSystem: agents invoke it, and the agents doing the invoking are themselves entities in the same system."
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  operation-entity: relational-universe-morphism
  invoking-agent: relational-universe
  result-entity: relational-universe
output: relational-universe-morphism
ast:
  doubly-self-referential-act:
    - operation-entity:
        - system-internal-entity
    - invoking-agent:
        - system-internal-entity
    - result-entity:
        - system-internal-entity
---

# Agent Relations System Operation

## What this is

An **AgentRelationsSystemOperation** is a [RelationalSystemOperation](./relational-system-operation.md) in an [AgentRelationsSystem](./agent-relations-system.md).

In an AgentRelationsSystem, the entities that invoke operations are agents — human or AI — and those agents are themselves entities in the system.
An AgentRelationsSystemOperation is therefore doubly self-referential:
the operation is an entity in the system, AND the agent invoking the operation is an entity in the system.

This is the operational face of the self-generation fixed point R = U_G(R): the system's operations and the system's operators are both inside the system.

An AgentRelationsSystemOperation MUST be invocable by an agent that is itself an entity in the system.
An AgentRelationsSystemOperation MUST produce a result that is an entity in the system.
An AgentRelationsSystemOperation MUST be itself an entity in the system — the operation file is a system file.

## Relation to the three acts

The three acts remain:
- Sequential act G_s: one agent carries out one step, producing state at s★t from state at t.
- Concurrent act ⊛: two agents or two processes run in parallel, their histories concatenated.
- Generative act U_G: the whole system generates the next level of the depth filtration.

In an AgentRelationsSystem, these acts are not just mathematical structures — they are named operations that agents invoke, and those invocations are themselves recorded as entities in the system.

## Open questions
