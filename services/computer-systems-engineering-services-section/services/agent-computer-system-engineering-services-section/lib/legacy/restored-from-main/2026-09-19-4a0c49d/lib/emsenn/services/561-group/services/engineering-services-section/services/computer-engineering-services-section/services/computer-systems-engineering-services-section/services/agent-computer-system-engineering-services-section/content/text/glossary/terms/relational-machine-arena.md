---
id: relational-machine-arena
description: "The RelationalMachineArena is the full interaction type of a RelationalMachine — the pair (Σ, I) of step types that enter and the global sections Γ(H*) that exit, specifying who can connect to the machine and what they will receive."
component-of: RelationalMachine
uses: RelationalMachinePort
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  input-port: relational-universe
  output-sections: relational-history-fiber-fixed-layer
output: relational-universe
ast:
  interaction-type:
    - input-port:
        - step-alphabet
        - independence-relation
    - output-sections:
        - newly-settled-global-sections
---

# Relational Machine Arena

## What this is

The **RelationalMachineArena** is the full interaction type of a [RelationalMachine](./relational-machine.md): what the machine accepts as input and what it returns as output, stated as a typed contract.

The arena name comes from compositional game theory (Ghani, Hedges et al.): an *arena* (X, S) specifies what a game receives from its context (X) and what it returns (S).
Applied to the RelationalMachine: the input type is the [RelationalMachinePort](./relational-machine-port.md) (the step set Σ with independence relation I) and the output type is the settled global sections emitted by the Observation Layer.

Knowing the arena of two RelationalMachines is sufficient to determine whether they can be connected: the output type of one must be receivable as an input type by the other.

## Mathematical grounding

The input side of the arena is the [RelationalMachinePort](./relational-machine-port.md): steps s ∈ Σ, with commutation relation I.
Each step s ∈ Σ indexes a sequential comonad G_s on R ([directed-comonad](../math/directed-comonad.md)).
The [CoKleisli category](../math/directed-comonad.md) coKl(G_s) formalizes interaction: a morphism G_s X → Y is a process that consumes one step of type s and produces Y.
The RelationalMachineArena is the type-level summary of all such morphisms: what step types enter (the port) and what settled sections exit (the observation layer output).

The output side is Γ(H*_{t'}) ∖ Γ(H*_t): the global sections newly settled after step t → t' = s★t.
This is the machine's output per step: the sections that became stable as a result of processing the step.

## In the FARS

In a [FlatfileAgentResourceSystem](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system.md) locale:

- Input type: the four [FlatfileAgentResourceSystemMessage](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md) types {FixNeeded, GapFound, Discovery, Coordination}
- Output type: messages deposited in other locales' `INBOX.md` files and newly settled entity files

Two locales can be connected when the output type of one locale is a subset of the input type of the other locale's [RelationalMachinePort](./relational-machine-port.md).

A RelationalMachineArena MUST name both the input type ([RelationalMachinePort](./relational-machine-port.md)) and the output type (settled sections).
It MUST be sufficient to determine connection compatibility between two RelationalMachines.

## Open questions


---

<!-- source: archive/terms/relational-machine-arena.md -->

## Imported source: archive/terms/relational-machine-arena.md

---
id: relational-machine-arena
description: "The RelationalMachineArena is the full interaction type of a RelationalMachine — the pair (Σ, I) of step types that enter and the global sections Γ(H*) that exit, specifying who can connect to the machine and what they will receive."
defines: RelationalMachineArena
component-of: RelationalMachine
uses: RelationalMachinePort
date-created: 2026-03-18
date-modified: 2026-03-18
params:
  input-port: relational-universe
  output-sections: relational-history-fiber-fixed-layer
output: relational-universe
ast:
  interaction-type:
    - input-port:
        - step-alphabet
        - independence-relation
    - output-sections:
        - newly-settled-global-sections
---

# Relational Machine Arena

## What this is

The **RelationalMachineArena** is the full interaction type of a [RelationalMachine](relational-machine.md): what the machine accepts as input and what it returns as output, stated as a typed contract.

The arena name comes from compositional game theory (Ghani, Hedges et al.): an *arena* (X, S) specifies what a game receives from its context (X) and what it returns (S).
Applied to the RelationalMachine: the input type is the [RelationalMachinePort](relational-machine-port.md) (the step set Σ with independence relation I) and the output type is the settled global sections emitted by the Observation Layer.

Knowing the arena of two RelationalMachines is sufficient to determine whether they can be connected: the output type of one must be receivable as an input type by the other.

## Mathematical grounding

The input side of the arena is the [RelationalMachinePort](relational-machine-port.md): steps s ∈ Σ, with commutation relation I.
Each step s ∈ Σ indexes a sequential comonad G_s on R ([directed-comonad](../math/directed-comonad.md)).
The [CoKleisli category](../math/directed-comonad.md) coKl(G_s) formalizes interaction: a morphism G_s X → Y is a process that consumes one step of type s and produces Y.
The RelationalMachineArena is the type-level summary of all such morphisms: what step types enter (the port) and what settled sections exit (the observation layer output).

The output side is Γ(H*_{t'}) ∖ Γ(H*_t): the global sections newly settled after step t → t' = s★t.
This is the machine's output per step: the sections that became stable as a result of processing the step.

## In the FARS

In a [FlatfileAgentResourceSystem](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system.md) locale:

- Input type: the four [FlatfileAgentResourceSystemMessage](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md) types {FixNeeded, GapFound, Discovery, Coordination}
- Output type: messages deposited in other locales' `INBOX.md` files and newly settled entity files

Two locales can be connected when the output type of one locale is a subset of the input type of the other locale's [RelationalMachinePort](relational-machine-port.md).

A RelationalMachineArena MUST name both the input type ([RelationalMachinePort](relational-machine-port.md)) and the output type (settled sections).
It MUST be sufficient to determine connection compatibility between two RelationalMachines.

## Open questions
