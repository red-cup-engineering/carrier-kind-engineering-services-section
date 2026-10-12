---
id: relational-machine-port
description: "The RelationalMachinePort is the step set Σ of a RelationalMachine — the finite typed vocabulary of inputs the machine can receive, from which the history monoid M(Σ, I) is generated."
component-of: RelationalMachine
uses: RelationalHistoryStep
date-created: 2026-03-18
date-modified: 2026-03-18
---

# Relational Machine Port

## What this is

The **RelationalMachinePort** is the step set Σ of a [RelationalMachine](./relational-machine.md).

Σ is a finite set.
Each element s ∈ Σ is a [RelationalHistoryStep](../math/relational-history-step.md) — one irreducible input the machine can receive.
The RelationalMachinePort is what a machine can accept; nothing outside Σ enters.

The RelationalMachinePort is not the history monoid.
M(Σ, I) is the mathematical object generated from Σ under the independence relation I.
The RelationalMachinePort is the presentation data — Σ and I — not the quotient structure those presentations generate.
Knowing the RelationalMachinePort tells you what steps can enter.
Knowing the history monoid tells you what histories those steps produce and which orderings are equivalent.

Two RelationalMachines can be connected only when their RelationalMachinePorts are compatible — when the steps one produces are steps the other can receive.

## Mathematical grounding

Each s ∈ Σ generates a one-step history gen(s) ∈ T via the injective map gen : Σ → T defined in [relational-history-step](../math/relational-history-step.md).
Each step s also indexes a sequential comonad G_s on R ([directed-comonad](../math/directed-comonad.md)), the act of advancing the relational universe one step in direction s.
The RelationalMachinePort is therefore what indexes the family of sequential acts {G_s}_{s ∈ Σ}.

## In the FARS

In a [FlatfileAgentResourceSystem](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system.md) locale, the RelationalMachinePort is the set of [FlatfileAgentResourceSystemMessage](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md) types the locale's [INBOX.md](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-locale.md) can receive.
The step alphabet Σ corresponds to {FixNeeded, GapFound, Discovery, Coordination} — the four message types defined in [flatfile-agent-resource-system-message](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md).

A RelationalMachinePort MUST be finite — the step set Σ must be a finite set, per the Axiom of Histories in [relational-history-step](../math/relational-history-step.md).
It MUST carry the independence relation I alongside Σ — the port is the pair (Σ, I), not Σ alone.
It MUST be distinct from M(Σ, I) — the port presents the monoid, it is not the monoid.

## Open questions


---

<!-- source: archive/terms/relational-machine-port.md -->

## Imported source: archive/terms/relational-machine-port.md

---
id: relational-machine-port
description: "The RelationalMachinePort is the step set Σ of a RelationalMachine — the finite typed vocabulary of inputs the machine can receive, from which the history monoid M(Σ, I) is generated."
defines: RelationalMachinePort
component-of: RelationalMachine
uses: RelationalHistoryStep
date-created: 2026-03-18
date-modified: 2026-03-18
---

# Relational Machine Port

## What this is

The **RelationalMachinePort** is the step set Σ of a [RelationalMachine](relational-machine.md).

Σ is a finite set.
Each element s ∈ Σ is a [RelationalHistoryStep](../math/relational-history-step.md) — one irreducible input the machine can receive.
The RelationalMachinePort is what a machine can accept; nothing outside Σ enters.

The RelationalMachinePort is not the history monoid.
M(Σ, I) is the mathematical object generated from Σ under the independence relation I.
The RelationalMachinePort is the presentation data — Σ and I — not the quotient structure those presentations generate.
Knowing the RelationalMachinePort tells you what steps can enter.
Knowing the history monoid tells you what histories those steps produce and which orderings are equivalent.

Two RelationalMachines can be connected only when their RelationalMachinePorts are compatible — when the steps one produces are steps the other can receive.

## Mathematical grounding

Each s ∈ Σ generates a one-step history gen(s) ∈ T via the injective map gen : Σ → T defined in [relational-history-step](../math/relational-history-step.md).
Each step s also indexes a sequential comonad G_s on R ([directed-comonad](../math/directed-comonad.md)), the act of advancing the relational universe one step in direction s.
The RelationalMachinePort is therefore what indexes the family of sequential acts {G_s}_{s ∈ Σ}.

## In the FARS

In a [FlatfileAgentResourceSystem](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system.md) locale, the RelationalMachinePort is the set of [FlatfileAgentResourceSystemMessage](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md) types the locale's [INBOX.md](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-locale.md) can receive.
The step alphabet Σ corresponds to {FixNeeded, GapFound, Discovery, Coordination} — the four message types defined in [flatfile-agent-resource-system-message](../../../../apps/flatfile-agent-resource-system/content/text/glossary/terms/flatfile-agent-resource-system-message.md).

A RelationalMachinePort MUST be finite — the step set Σ must be a finite set, per the Axiom of Histories in [relational-history-step](../math/relational-history-step.md).
It MUST carry the independence relation I alongside Σ — the port is the pair (Σ, I), not Σ alone.
It MUST be distinct from M(Σ, I) — the port presents the monoid, it is not the monoid.

## Open questions
