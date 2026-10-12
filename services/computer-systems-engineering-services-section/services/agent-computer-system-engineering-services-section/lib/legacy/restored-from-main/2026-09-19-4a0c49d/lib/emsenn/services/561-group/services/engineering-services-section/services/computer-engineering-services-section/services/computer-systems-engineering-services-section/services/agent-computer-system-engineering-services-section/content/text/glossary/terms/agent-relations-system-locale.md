---
id: agent-relations-system-locale
description: "A RelationsSystemLocale within an AgentRelationsSystem: a RelationsSystemLocale with an active skill library, named operations, and agents navigating it — satisfying the agent property within its scope."
implements: RelationsSystemLocale
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  charter: relational-universe
  skill-library: relational-universe
  agents: relational-universe
output: relational-universe
ast:
  agent-self-generation:
    - charter
    - skill-library:
        - skill-entity-representation
    - agents:
        - agent-entity-representation
---

# Agent Relations System Locale

## What this is

An **AgentRelationsSystemLocale** is a [RelationsSystemLocale](./relational-system-locale.md) within an [AgentRelationsSystem](./agent-relations-system.md).

It adds the agent property at the scope level: the locale has its own named operations (skills, runbooks), its own agents navigating it, and those operations and agents are themselves entities within the locale. The locale is not merely structurally complete — it is operationally alive.

## The agent property at the scope level

An AgentRelationsSystemLocale satisfies [self-generation](../math/self-generation.md) within its scope: the skills agents use to work within this locale are themselves entities in this locale. A locale whose agents cannot represent the skills they use cannot improve them.

This is the scope-level analog of $R = U_G(R)$: the locale's operational structure is itself locale-internal. Skills define operations; operations are entities; entities are in the locale. The loop closes.

## Nesting

An AgentRelationsSystemLocale can contain seed entities growing toward full locale instantiation within its scope. The locale hierarchy is self-similar: the same growth sequence that produces a locale from an entity operates within each locale to produce sub-locales from sub-entities.

Whether a sub-locale is a distinct AgentRelationsSystemLocale or simply a deeply-grown entity within the parent is determined by whether it has distinct teleology and distinct method — the [GenerativeUniverseClosureLocale](../../../../../../../math-services-section/content/text/glossary/terms/generative-universe-closure-locale.md) identifying conditions.

An AgentRelationsSystemLocale MUST satisfy all requirements of [RelationsSystemLocale](./relational-system-locale.md), MUST have a named skill library within the locale's scope, and the operations agents use within this locale MUST be representable as entities within this locale.

## Open questions
