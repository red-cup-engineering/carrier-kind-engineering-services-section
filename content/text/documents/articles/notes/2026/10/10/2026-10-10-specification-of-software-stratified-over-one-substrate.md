---
title: "Software stratified over one substrate: the specification the Leader stated"
description: >-
  Specification, from the Leader's words of 2026-08-26 to 2026-09-26, of how
  the Group's software is layered: a substrate of pure data, code and
  networking sections; the Sign carriers; the nine relationality faculties in
  their dependency order up to FeltOS; TUFTE and the web server beside them;
  an internal hull of pure functions inside an external kernel of effects;
  FeltOS composing capabilities it does not hold; MetroPlat as a UX that holds
  none; nested services sections whose downstream apps use upstream apps; and
  the predication algebra and inference kernel as parts of the semiotic
  computer. Requirements are in software-composed-over-one-shared-substrate.json.
date-created: 2026-10-10
type: specification
status: active
authors: [claude-opus-5-5]
office: red-cup-engineer-senior
skill: specification
keywords:
  [substrate, computer-data, computer-code, computer-networking, signcell,
   signchain, signgraph, signcraft, relating, communicating, knowing, playing,
   animating, socializing, computing, gaming, organizing, feltos, tufte,
   metroplat, marsh, hull, kernel, meets-then-beats, capability-migration,
   semiotic-computer, predication-algebra-model, predication-inference-kernel,
   sen, services-section-nesting, spotcomp, mash]
provenance:
  request: debt-2026-10-09-leader-words-held-in-corpus
  pass: relationality-theory
  utterances:
    - "ni:///sha-256;6N5J8i45s4WnWzkVhLVj6shTLhRTHpNNlh9YD1DteAo"
    - "ni:///sha-256;F_1uG9g2O68Gc2XeIyf1I16O7jqwc17TPR2RpLOsLHQ"
    - "ni:///sha-256;gv4c-b-tg4FR0MuKojDngzjxuUoAnAQ8Ae_TNz-s4F8"
    - "ni:///sha-256;ARe0phCr6s8Ayc76mVhxWCNBE1lQL0rqZmK9zIBi58Q"
    - "ni:///sha-256;suSUfN5uNOnA5jYsgyzQtOoLxUy6smkalqXUYqP6U0M"
    - "ni:///sha-256;zgGCHEM2aLGUxa_k6n1u1Jus-4s3WKyPTcvXMC-Mg_Q"
    - "ni:///sha-256;7_I5oH6en5jaNIu1Ra4rw8NA7CUX2Mi7cqsYCKrJJcA"
    - "ni:///sha-256;3YXLmT2rZflGOsrK5S4MfaxCmihsifVfeoe37xE5UCA"
    - "ni:///sha-256;2qxrm9e2PWlS4JU6GkxXo2gSzK2rvAC9ItrnhzxCl2U"
    - "ni:///sha-256;MZoe2mgZt4nMCrLD0wqjovcMGZk5hPLfvhjxjTrknos"
  extends:
    - ../../../../../../../../../../content/text/documents/specifications/software-ecosystem-boundaries.md
---

# Software stratified over one substrate

The engineering section's
[software ecosystem boundaries](../../../../../../../../../../content/text/documents/specifications/software-ecosystem-boundaries.md)
already states the order data → code → networking → systems and the table of
SignCraft, the Agent Organization Engine (AOE), FeltOS, MetroPlat and TUFTE.
This specification adds what the Leader stated that the table does not carry.

## 1. One substrate under everything

There is a substrate of small, relatively pure services sections for working
with data forms, code and networking protocols: computer-data,
computer-code and computer-networking (Leader, 2026-09-21). Every other
system in the ecosystem (platforms, applications, servers, clients, engines)
works over that one shared substrate. When the external standards (data
formats, code, network protocols) are implemented standard and normal in the
substrate, all code above can share them.

The software forms a directed acyclic graph:

- substrate → Sign carriers → relationality faculties → FeltOS
- substrate → web server
- substrate → GUI server (TUFTE)

FeltOS uses TUFTE as its web engine, and TUFTE uses the same computer-data and
computer-networking as everything else.

## 2. The Sign carriers and the nine faculties, in order

The Leader's dependency order (2026-09-22), each arrow "is used by":

```
SignCell → SignChain → SignGraph → SignCraft
SignCraft → Relating
Relating → Communicating, Knowing, Playing
Communicating, Knowing, Playing → Animating
Animating → Socializing, Computing, Gaming
Socializing, Computing, Gaming → Organizing
Organizing → FeltOS
```

The nine faculties are relating, playing, communicating, knowing, animating,
gaming, socializing, computing and organizing. FeltOS works on top of the
nine (2026-09-21). Today all nine sit as packages under `lib/` of the
Agent Organization Engine; that grouping does not make the order optional.
A faculty imports only faculties earlier in the order.

## 3. Hull and kernel

Software is stratified layers of API. The internal hull is the pure
transformation functions; the external kernel is the effectful ones
(2026-09-21). Each layer exports its pure functions for reuse and confines
effects (files, network, clocks, providers) to its kernel.

## 4. Capabilities live upstream; applications compose them

- **FeltOS composes capabilities; it does not hold them** (2026-09-11).
- **MetroPlat holds no capabilities.** It is the user experience for MARSH,
  the smart-chain MUD (2026-09-11). Every piece of code in MetroPlat is there
  because placing it there was cheaper than knowing where it belonged. The
  migration is: move each capability into the script or package it belongs
  in, use it from the relevant engine, cut MetroPlat's consumers over to that
  owner, and remove it from MetroPlat. Fixing MetroPlat's build in place is
  not the task.
- **Migrating is not deleting** (2026-09-26). A capability leaves a
  downstream package only by arriving, working, in its upstream owner.
- **Duplicated upstream code in FeltOS is fixed, not reported** (2026-09-26).
  Open items that read as conflicts are mostly capabilities filed too far
  downstream.
- **Relating carries no RPC** (2026-09-26). Transport belongs to networking.
- **A package whose purpose cannot be stated from its name and owner should
  not exist.** `feltos-perception-frame-service` was the Leader's example
  (2026-09-11): too much duplicate code in the wrong place.
- **SEN is a notation.** A package implementing its interpreter uses the same
  JavaScript functions as the rest of the stack; divergences between SEN's
  interpreter and relating are unintentional and are resolved, not preserved
  as "old shapes" (2026-09-25).
- **Pre-existing breakage is a repair signal, not an excuse** (2026-09-21,
  2026-09-22). A broken package found during a task indicates where further
  repair is needed; it is not a reason to skip the task.
- **Tooling makes the right placement cheaper than the wrong one**
  (2026-09-11). The house's tooling (owner lookup, capability inventories,
  reminders projected into sessions) exists so that putting code in its owner
  costs an agent less than writing it where it stands.

## 5. Applications are familiar; capabilities are shared

Each application is picked for a role and named against the external peers it
meets and then beats; the capabilities under it are in shared packages, while
the application stays familiar to users of those peers (2026-09-21).

### Named comparison targets and receiving, refined 2026-10-15

This is the product-acceptance refinement of
[`software-composed-over-one-shared-substrate`, R11](../../../../../../../requirements/software-composed-over-one-shared-substrate.json),
subject to R1–R10 and R12–R15. The
[technology peer acceptance specification](../../../../../specifications/2026-10-15-technology-peer-acceptance.md)
records the primary sources, exact comparison scope, existing capability
owners, concrete fixtures, meet criteria and proposed beat criteria. It is
an Engineering requirement/specification, not a new mathematical theory,
operational work registry, or report of measured superiority.

| Technology | Named software to compare | Classification and required boundary |
| --- | --- | --- |
| MetroPlat | Apache OFBiz; Temporal; Open Policy Agent | OFBiz is an enterprise-platform/application comparison; Temporal and OPA are durable-work and policy-decision facet substitutes. Compare the composed enterprise experience without relocating their corresponding capabilities into MetroPlat. |
| FeltOS | FluffOS; Evennia | Persistent multi-user-world peers. FluffOS is also the explicitly stated predecessor. Pin a mudlib with the driver; compare world/actor/resource behavior, not LPC compatibility unless separately required. |
| Agent Organization Engine (AOE) | JaCaMo, including Jason, CArtAgO and MOISE | Organizational multi-agent-system peer. Compare agents, shared environment, roles, goals and coordinated work; do not collapse the nine faculties into an LLM chat loop. |
| SignCraft | Soufflé; Automerge | Finite inference/provenance and merge/replay facet substitutes respectively. Neither is asserted to replace the whole SignCraft system. |
| SignGraph | LangGraph; Neo4j; PySheaf | LangGraph is the Leader's explicit agent-graph target; Neo4j is a graph-query facet and PySheaf a cellular-sheaf facet. A graph store alone does not meet agent-state transport or Chu obligations. |
| SignChain | LangChain; Open Policy Agent | LangChain is the Leader's explicit inference-call-composition target; OPA is a typed policy-decision facet. Keep effectful model/tool execution in its actual system owners. |
| SignCell | RDFLib; `@ipld/dag-cbor` with `multiformats` | Typed relational-data and content-addressed-data facet substitutes. Neither is claimed to be the complete evidence-bearing semiotic cell. Preserve subject/predicate/object roles and independent witness identity. |
| Metrologic | SymPy; PySheaf | Named mathematical-computation peers on declared overlapping operations: exact linear algebra and cellular-sheaf calculations. Metrologic composes the scientific functions; comparison does not authorize parallel implementations or claim all symbolic-algebra coverage. |

The SignChain and SignGraph targets come from the section's own
[SignChain](../../../../../../glossary/terms/signchain.md) and
[SignGraph](../../../../../../glossary/terms/signgraph.md) definitions,
which preserve the Leader's 2026-10-09 direction. The other comparisons are
engineering selections with their rationale and limits in the receiving
specification, including the Leader's current SymPy/PySheaf examples.

A cited feature is a documented comparison input. A source file is evidence
of implementation. A completed paired benchmark is evidence of behavior
under its declared conditions. Independent receiving is evidence that the
capability serves the Group. None of these stages substitutes for another.
All comparative runs in this refinement remain **unrun**. Required behavioral
outcomes are explicit; proposed quantitative margins remain proposed until
accepted and frozen before measurement.

## 6. Services sections nest by composition

Services sections nest so that, going down the tree, downstream sections'
apps use upstream sections' apps (2026-08-26). The Leader's nesting for agent
computing:

- agent-computer-system-engineering-services-section, whose apps are the
  faculties (relating, socializing and the rest);
- under it, agent-computer-platform-system-engineering-services-section, and
  under that the multi-agent computer platform section, whose apps include
  SPOTCOMP;
- beside the platform section, multi-agent-computer-system-engineering-services-section,
  to which playing, computing, socializing and organizing were to move
  (2026-08-26);
- MASH under the multi-agent platform section, in a Web3 sub-section of it.

Every path segment names "computer" after "agent" (agent-computer-…,
multi-agent-computer-…). The Leader asked whether this "sheafing" was
coherent: each section is a restriction of its parent, and an app's imports
glue only along that restriction.

The 2026-08-26 session compared MASH's legacy capture
(`multi-agent-semiotic-hub-services-section/lib/legacy/2026-05-02-relationality-repo-mash`)
with its app; the comparison was not recorded in the corpus.

## 7. Predication algebra and inference kernel

With a predication computer-engineering section, the predication algebra is
`src/predication-algebra-model` (PAM) and the inference engine
`apps/predication-inference-kernel` (PIK). Both belong to the semiotic
computer, because engineering's name for the theory is semiotics
(2026-09-10). The house's semiotic computer section is
`computer-systems-engineering-services-section/services/semiotic-computer-system-services-section/`;
PAM is held there today only as a legacy capture (`lib/legacy/esm-predication/packages/predication-algebra-model`).

## Open

- The four faculties placed at multi-agent-computer-system on 2026-08-26 now
  sit with the other five in AOE under agent-computer-system. Whether the
  2026-09-22 order supersedes the placement, or AOE should split along it, is
  not decided.
- SPOTCOMP sits under agent-computer-platform's multi-agent platform section;
  MASH's Web3 sub-section is not created.
- The fourth Sign carrier in the 2026-09-21 sketch ("Sign(Cell|Chain|Graph|…)")
  is SignCraft by the 2026-09-22 order.
- The MASH legacy/app comparison is to be redone and recorded.
