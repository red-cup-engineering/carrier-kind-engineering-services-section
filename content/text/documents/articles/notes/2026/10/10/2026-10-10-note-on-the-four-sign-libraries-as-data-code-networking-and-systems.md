---
title: "The four Sign libraries as data, code, networking and systems"
description: "Specification note: SignCell, SignChain, SignGraph and SignCraft are the Group's applications of computer data, code, networking and systems; what each owns, what moves out of them, what every other package builds on them, and what the Leader left open."
date-created: 2026-10-10
kind: specification-note
keywords:
  - signcell
  - signchain
  - signgraph
  - signcraft
  - substrate
provenance:
  authors:
    - emsenn
  written-by: "Red Cup Engineer Senior, development pass signstuff-substrate of debt-2026-10-09-leader-words-held-in-corpus"
  sources:
    - "561-group-board-of-directors-leader-movement-team/content/text/documents/articles/notes/2026/09/23/2026-09-23-note-on-the-software-ecosystem.md"
    - "engineering-services-section/content/text/documents/articles/notes/2026/09/04/2026-09-04-sign-chain-sign-graph-sign-craft.md"
    - "561-group-services-section/content/text/documents/articles/notes/2026/10/02/2026-10-02-note-on-signstuff-against-its-theory.md"
  utterances:
    - "ni:///sha-256;jC_6mrO6J59SwmuBVZqR_z1DnP2IXumKbEmO3wTcCcs"
    - "ni:///sha-256;_OOyRCIVFsiPjgEnwYGFYnfZThyY33gwnfuMoy3RIwc"
    - "ni:///sha-256;1FvOuEWCDgqx2Il0iS3X_sjESvtlheCt3hOd7F-JZrc"
    - "ni:///sha-256;4G3WDaNjgCRknKevsMmeD52GU4giXCqlx4NiEw8sSPU"
    - "ni:///sha-256;mXDu31AGzZeZUDRidP17qJwDYtqoOR01DaND9jiyIF0"
    - "ni:///sha-256;jA2QKSDY3j8avNlNP72Tl7TlA95WOzQpo2llynKZZYU"
    - "ni:///sha-256;XaJa1fAbF7s5sBZLscoXNyWW6FoEoJ-wlABnT-DKxVI"
    - "ni:///sha-256;IDxEIK-O7NnlLFZBV0phcEc0E3C5JMoUzO-x5AZip2o"
    - "ni:///sha-256;n18v1l5O6FpOMjEAsRsGkvstD5A0R5foLFZ066C3azk"
    - "ni:///sha-256;dyH1ujogJzBdlLYQOwgoUZUcbyY27GAqXqDtFr-6KyM"
    - "ni:///sha-256;bZitQ6Rieibz0DelaI9BqzL97SJKblP5rPlIZAqg0bY"
    - "ni:///sha-256;02yxN4zTremlhhGXUoBTCafFRACskNiyZZOAT3SUzhI"
    - "ni:///sha-256;w6zAjlKCXJjUZ_GhhYSwv8PwX6sP5ZdwK8lcVQuPOx4"
    - "ni:///sha-256;zARz3_au3_uLCj-9ZxkVbHrudYkQDq_jVuITWf5ajT4"
    - "ni:///sha-256;UYet9r-CWYfRh69F6feuekXMCWPfKO4WPfE0uvloRDw"
requirements: "../../../../../../../requirements/sign-libraries-are-the-substrate.json"
---

# The four Sign libraries as data, code, networking and systems

## The proportion

The Group's software follows one dependency order, from primitive to composed:
data, code, networking, systems. Code uses data; networking uses code and data;
systems compose all three. The four Sign libraries are that order's
applications:

> SignCell : SignChain : SignGraph : SignCraft :: Data : Code : Networking : Systems

The Leader has stated this repeatedly (2026-09-23: "signcell is meant to be the
app of computer-data, signchain the app of computer-code, signgraph the app of
comptuer-networking, and signcraft the app of computer-systems"). Each library
is the shared core that every package of its layer specializes:

| Library | Layer | Owns | Requires |
|---|---|---|---|
| [SignCell](../../../../../../glossary/terms/signcell.md) | data | the semiotic cell: the one data structure and its methods that all computational data shares | `metrologic` |
| [SignChain](../../../../../../glossary/terms/signchain.md) | code | the logic structures all code shares; the bilattice of knowledge order and truth order that forms evidence | SignCell, `metrologic` |
| [SignGraph](../../../../../../glossary/terms/signgraph.md) | networking | the graph structures SignCells and SignChains form; the categorical layer above SignChain | SignCell, SignChain, `metrologic` |
| [SignCraft](../../../../../../glossary/terms/signcraft.md) | systems | the engine composed from the three, which every engine, server, client, platform and application builds on | the three, `metrologic` |

Underneath the four sit plain, standard formats (JSON, JSONL, EAVT as JSONL,
CBOR) and the house specializations of them: the semiotic content address, the
semiotic expression notation, and semiotic EAVT. `metrologic` is the JSNode
carrier of Obsmetrologia's mathematics.

## What each library must and must not hold

1. **A library holds what its layer shares, and nothing else.** SignCell must
   provide the semiotic cell's data structure; on 2026-09-25 the Leader judged
   that most of what SignCell then did should be owned by other packages, while
   no package provided the cell itself. Capabilities a library does not need
   move out into the package that does what they do.
2. **The cores are coherent before anything is built over them.** The rest of
   the Group's code is meant to use them, so the Leader's 2026-09-22 question,
   whether the Sign libraries' core is "actually coherent", is the first one.
   Packages named by neither the Leader nor the standard software they mimic
   ("sign-communication" was the Leader's example of a package "i've never
   heard of") are not where Sign capabilities go; a capability goes into
   SignCell, SignChain, SignGraph or SignCraft.
3. **Everything is built on them.** The Group's software is to run on SignCell
   and its siblings: legacy code is brought live by realizing it on them and
   aligning it with the house's best theory (Leader, 2026-10-09). Group code
   deployed to the Group's servers is MetroPlat enterprises, FeltOS modules,
   AOE components and SignCells (Leader, 2026-10-08). Systems the agents set up
   without them, such as the Google Cloud deployment the Leader reviewed on
   2026-09-26, have drifted from the architecture.
4. **Data drift blocks them.** Handwritten JSON under `data/records/` without a
   reader, and the same data stored in redundant forms, bloat the code and make
   it very hard for anything to actually be a SignCell, SignChain, SignGraph or
   SignCraft (Leader, 2026-10-08). Records are written by the software that
   reads them, from the Sign data structure, so that agents stop hand-writing
   JSON in a cycle.
5. **The shorthand is not a name.** "SignStuff" is the Leader's spoken
   shorthand for the four. It must not enter the repository as a word in a
   record, a file, a directory or a package (Leader, 2026-10-04: "yet another
   'holy fuck you obfuscated real shit behind abuse of jargon'"). Today the
   libraries sit under `computer-engineering-services-section/lib/signstuff/`,
   with a fifth package `signstuff-evm` and a README titled "SignStuff"; those
   names are drift owed a rename to their real subjects.
6. **No TypeScript.** The Group's packages are JavaScript; the Leader prefers
   not using TypeScript over installing it (2026-09-24). A missing dependency of
   a substrate package (the Leader's example: what SEAVT depends on that does
   not exist) is substrate work, not a blocker to report.

## The primitive operation

The Group's processor has a central operation in the role AND plays for
boolean computers. It is implemented from the house's logic and metaphysics,
upstream in the Sign libraries and semiotics, not as a specialized local
grammar (Leader, 2026-09-28, on code that "reimplements what is meant to be a
central part of our CPU the way AND is for boolean computers, as some
specialized little LARP of grammar that has nothing to do with upstream
stuff"). The 2026-10-02 note records the house's current reading: admission is
the truth meet of FOUR, and SignCraft settlement is the operation every cell
passes through.

## The libraries against their peers

SignChain is meant to beat LangChain, and SignGraph is the Group's LangGraph
(Leader, 2026-10-09). An agent's chained calls and its graph of steps and state
are SignChain and SignGraph structures. The knowledge an agent reads before it
writes code is reached through them and the corpus they index, not by
`grep` over the tree; see the knowledge-science note
`2026-10-10-note-on-how-agents-reach-a-knowledge-corpus.md`.

The four libraries are also the ground of the Group's next-generation,
non-LLM logical inference model (requirement
`non-llm-logical-inference-model-on-signstuff`), built from the house theory of
formal concept analysis, Curry-Howard-Lambek, tile colouring, light cones and
bead weaving, imagined as complex multicellular foam physics and abiotic
digital organic simulation (Leader, 2026-10-08).

## Downstream

- [Horsetail](../../../../../../../../../../content/text/glossary/terms/horsetail.md),
  the LISP-style language users write programs in, is downstream of SignCraft.
- FeltOS takes the agent organization engine, a library, and adds the web
  platform and persistence to disk; an envelope module found under the
  multi-agent platform section may belong to SignCell, with FeltOS using it
  from there.

## Open questions

- Is SEAVT part of SignChain (the Leader's reading, offered with doubt) or a
  data specialization of EAVT journaled beneath it (the SEAVT term's reading)?
- Is SignGraph what other records call Semiotic Foam?
- Does the envelope module belong to SignCell?
- What exactly is the processor's primitive, stated as one Obsmetrologia
  result, and which SignCraft function carries it?
