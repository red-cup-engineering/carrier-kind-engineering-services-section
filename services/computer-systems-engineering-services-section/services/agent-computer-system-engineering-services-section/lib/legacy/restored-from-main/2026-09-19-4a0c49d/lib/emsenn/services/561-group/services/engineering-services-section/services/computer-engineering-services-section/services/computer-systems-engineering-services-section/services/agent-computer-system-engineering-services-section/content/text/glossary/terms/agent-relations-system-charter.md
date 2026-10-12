---
id: agent-relations-system-charter
description: "A RelationsSystemCharter within an AgentRelationsSystem: a Blueprint with a declared agent community constituting the covering structure, but not yet live — no soul, no inbox, no accumulated memory."
implements: RelationsSystemCharter
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  blueprint: relational-universe
  agent-community: relational-universe
  operational-policies: relational-universe
output: relational-universe
ast:
  grothendieck-topology-declaration:
    - blueprint
    - agent-community:
        - covering-family-declaration
    - operational-policies:
        - valid-skill-invocation-family
---

# Agent Relations System Charter

## What this is

An **AgentRelationsSystemCharter** is a [RelationsSystemCharter](./relational-system-charter.md) within an [AgentRelationsSystem](./agent-relations-system.md).

An AgentRelationsSystemCharter MUST satisfy all requirements of [AgentRelationsSystemBlueprint](./agent-relations-system-blueprint.md).

It is a [Blueprint](./agent-relations-system-blueprint.md) that has been constituted with a declared agent community. The agent community IS the Grothendieck topology for this scope: it specifies which agents can invoke which skills under which policies — the covering families for this locale's work. A scope becomes a charter when it has named its agents and stated their operational policies.

## Agents as the covering structure

A Grothendieck topology specifies which families of morphisms count as valid coverings of each object in a site. In an ARS, the covering families for a scope are the families of skill invocations that, together, constitute valid work within that scope. The agents — with their declared capabilities and operational constraints — determine which such families are valid.

An AgentRelationsSystemCharter MUST have a declared agent community with operational policies.

Declaring `AGENTS.md` (or its equivalent at the ARS level) is the act that imposes the Grothendieck topology. Before this declaration, the scope is a blueprint: internally complete, but without a covering structure. After it, the scope is a charter: a syntactic site, ready to form a sheaf.

## Why soul comes after agents

The governing soul of a scope — the statement of what it fundamentally exists for and what it must never compromise — constrains the operations of the agents within it. It cannot be written before the agent community is declared, because it governs that specific community's practice. The soul emerges from the constituted community. It is written as the first act of a live locale, not installed before agents arrive.

Agents MUST be declared before any governing soul is written.
A charter CANNOT have a governing soul document without a declared agent community.

A charter has agents. A locale has agents AND a soul. This is the order of constitution, not a matter of preference.

## What a charter is waiting for

A charter has the full site structure needed to form a classifying topos. What it is waiting for is condition 7: live sections arriving across covering families and being glued into global sections. That is the inbox, the accumulating memory, the active planning — the signs of a scope that is genuinely receiving and producing.

A charter CANNOT have a live inbox or accumulate cross-session memory — condition 7 has not been satisfied.

## Open questions
