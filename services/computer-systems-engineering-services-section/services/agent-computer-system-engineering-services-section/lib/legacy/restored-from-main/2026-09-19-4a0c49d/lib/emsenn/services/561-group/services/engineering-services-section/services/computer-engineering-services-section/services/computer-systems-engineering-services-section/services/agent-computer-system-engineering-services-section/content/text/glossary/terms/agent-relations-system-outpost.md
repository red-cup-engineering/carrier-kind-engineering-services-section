---
id: agent-relations-system-outpost
description: "A RelationsSystemOutpost within an AgentRelationsSystem: a node with a named skill surface that agents can invoke, carrying no governing SOUL and no declared agent community."
implements: RelationsSystemOutpost
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  node: relational-universe
  skill-surface: relational-universe
output: relational-universe
ast:
  capability-bearer:
    - node
    - skill-surface:
        - named-skill-node
        - condition-4-exponential
---

# Agent Relations System Outpost

## What this is

An **AgentRelationsSystemOutpost** is a [RelationsSystemOutpost](./relational-system-outpost.md) within an [AgentRelationsSystem](./agent-relations-system.md).

An AgentRelationsSystemOutpost MUST satisfy all requirements of [RelationsSystemOutpost](./relational-system-outpost.md).
It CANNOT declare an agent community (that belongs to [AgentRelationsSystemCharter](./agent-relations-system-charter.md)) or have a governing soul (that belongs to the full [AgentRelationsSystemLocale](./agent-relations-system-locale.md) stage).

It is a node in the system that has a named skill surface: agents can enter, find named skills, and invoke them. The skills are first-class objects in the graph (condition 4: exponential closure). But there is no declared agent community governing this scope, no governing principles document, and no generative operational structure.

An agent entering an ARS outpost finds: skills to use. An agent entering an ARS outpost does not find: any statement of what this scope is for, who is responsible for it, or what principles must never be violated.

## The capability-bearer stage

In the terminology of BDI agent architectures, an ARS outpost is a capability bearer: it holds capabilities (named skills) without a governing goal or intention structure. The capabilities can be invoked. There is no principle that would refuse an invocation, no policy that would redirect it, no community that would hold anyone accountable for the outcome.

An AgentRelationsSystemOutpost MUST have at least one named skill that is itself a node in the agent relations system.

This is not a defective state.
An outpost is valid at its depth.
It may grow toward an [AgentRelationsSystemBlueprint](./agent-relations-system-blueprint.md) by acquiring governing axioms, or it may remain an outpost if a lightly governed operational surface is what is needed at this scope.

## Relation to self-generation

The [agent self-generation](../math/self-generation.md) condition R = U_G(R) requires that the skills agents use to work within a scope are themselves units within that scope. An ARS outpost satisfies this at the skill level: the skills are nodes in the graph. But self-generation at the full locale level requires that the governing principles and agent community are also representable as units within the scope — which the outpost does not yet provide.

## Open questions
