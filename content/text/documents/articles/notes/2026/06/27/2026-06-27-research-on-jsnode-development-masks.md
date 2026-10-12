---
title: "Research on JS/Node Development Masks"
description: "Reads a Node package as a bounded participant presenting different faces (masks) in different rule-worlds, with package.json declaring those masks and a devDependency being a dependency edge in a different arena -- the counterparties admitted while the package is becoming a coherent runtime, not a weaker runtime dependency."
date-created: 2026-06-27
keywords:
  - Node
  - arena
  - package
  - identity
  - relating
  - faculty
  - face
  - kernel
  - coherence
  - ICK
  - gaming
  - organizing
status: imagining
---


A Node package is usually described as a bundle of code with a manifest.
That description is too flat for the kind of computer we are building.
Within the ICK account, a package is better understood as a bounded participant that presents different faces in different rule-worlds.
Its `package.json` is not only install metadata.
It is a compact declaration of the package's masks: the faces under which the package can be invoked, imported, rehearsed, tested, hosted, extended, and realized.

This matters most for `devDependencies`.
In ordinary npm speech, a dev dependency is "only needed for development."
That is true, but not yet meaningful.
Relational-computationally, a dev dependency is not a weaker runtime dependency.
It is a dependency edge in a different arena.
It says what counterparties the package admits when the package is not acting as a finished runtime artifact, but becoming a coherent one.

## The package is not behind its masks

The gaming and playing packages give the precise vocabulary.
In `gaming`, a `Mask` is the I/O face a participant turns to an arena: what it receives on the Opponent/input side and what it commits on the Player/output side.
It is explicitly not a self or interior.
It is a bounded face, a morphism shape, a way for a participant to take part in a game.

In `playing`, the character is not an essence hidden behind those masks.
The character is the gluing of its masks.
Where the masks agree, identity coheres.
Where one mask shows what another denies, there is identity drift.

That gives a better way to talk about a JS Node package.
The package does not have one simple identity and then some secondary metadata attached.
Its identity is the gluing of several declared and performed faces:

- `exports`: the importable speech face.
- `bin`: the operator or actuation face.
- `scripts`: named legal moves in package-manager arenas.
- `dependencies`: the runtime participation face.
- `devDependencies`: the development and self-formation face.
- `peerDependencies`: the host-provided co-participation face.
- `optionalDependencies`: the contingent affordance face.
- source files: sedimented memory and fact body.
- tests and examples: rehearsed plays, conformance dreams, and remembered trials.

This is not metaphor piled on top of npm.
The live package readers already move in this direction.
`@emsenn/computing` decodes a package manifest into a host-neutral `ManifestStructure` whose dependency refs carry a `relationship`.
`devDependencies` become `relationship: "development"`, distinct from `runtime`, `peer`, `optional`, and other relationships.
`@emsenn/organizing`'s dependency graph structure likewise keeps a `relationship` on graph edges.

So the mathematical object is not:

```text
Package depends on Package
```

It is:

```text
Package --relationship/protocol/range--> Counterparty
```

Or more explicitly:

```text
edge = (requester, dependency, relationship, protocol, range)
```

The relationship label is not decoration.
It names the arena in which the edge is meaningful.

## Runtime and development are different arenas

The runtime arena asks: what must be present for this package to act as its shipped body?
Runtime dependencies are the package's operational counterparties.
They are admitted into the package's acting world.

The development arena asks: what must be present for this package to become, check, rehearse, build, reflect, and repair itself?
Development dependencies are the package's self-formation counterparties.
They are admitted into the package's becoming world.

Those are different masks.
A tool appearing in the development mask is not thereby a runtime organ.
It is a participant in the package's formation, not necessarily in the package's shipped action.

This distinction is the key to the apparently circular question:

```text
Can ICK be a devDependency of its own upstream faculties?
```

If ICK is a runtime dependency of `@emsenn/relating`, the statement is structurally wrong.
It says the relating faculty needs the assembled kernel in order to be the relating faculty, even though the kernel is assembled from relating and the other faculties.
That collapses the strata.

If ICK is a development dependency of `@emsenn/relating`, the statement is different.
It says the relating package can enter a development arena in which the assembled kernel is one of the counterparties by which relating is read, rehearsed, reflected, checked, or realized.
The whole appears to the part as a development mask, not as a runtime organ.

That is not "the part depends on the whole" in the ordinary sense.
It is:

```text
the part wears a kernel-facing mask while becoming coherent
```

The package remains itself at runtime.
In development, it can let the whole read it.

## Development dependencies as rehearsal and self-reading

The most useful outsider-friendly phrasing is:

> `devDependencies` are the rehearsal mask of a package: the counterparties it admits when the package is becoming, testing, reflecting, and preparing itself, rather than when it is acting as a shipped runtime artifact.

That phrasing preserves the npm fact while opening the relational meaning.
TypeScript, test runners, linters, code generators, documentation tools, local harnesses, and ICK itself can all be development counterparties.
They do not necessarily belong to the package's runtime body.
They belong to its rehearsal world.

This also explains why development dependencies are often more revealing than runtime dependencies.
Runtime dependencies say what the package needs in order to act.
Development dependencies say what the package believes can help it become legitimate.
They disclose the package's educational environment, its proof rituals, its self-checking disciplines, its preferred mirrors.

For an ordinary package, that might be:

```text
typescript -> can type-check me
node:test -> can exercise my observable contracts
typedoc -> can render my public speech surface
eslint -> can discipline my local source shape
```

For an ICK faculty, a development dependency on ICK would say something stronger:

```text
information-coherence-kernel -> can read me as one locus in the assembled coherence computer
```

This is why the question is not a package-manager trick.
It is about whether a package can carry, in its own development mask, the apparatus by which its code becomes facts in an agentic memory.

## The package as agentic memory body

If an agent is realized within a Node package, its memory is not only a sidecar log or a database.
The package's code is already a fact body.
The source files, tests, examples, manifests, exports, bins, and scripts are crystallized commitments.
They are not merely instructions for an external runtime.
They are memories sedimented into a form that Node, TypeScript, package managers, shells, sites, services, and agents can all read under different masks.

The manifest is the package saying:

```text
Here is how I may be spoken to.
Here is how I may act.
Here is what I need to act.
Here is what I need to become.
Here is the host I expect.
Here are the optional powers I can take up.
```

The code is not outside the agentic being.
The code is one of the ways the being remembers itself.

This gives a more coherent account of "package as ICK."
It does not mean every package contains a miniature service, or that every package gets a website, or that every package imports the whole kernel.
It means each package can be admitted as a coherent locus whose masks, moves, memories, and counterparties are readable by the kernel.

The package becomes ICK-like when its faces are explicit enough that the kernel can read them as one coherent participant:

- what it receives,
- what it commits,
- what it can do,
- what it can become through,
- what it remembers,
- what contradictions its masks introduce,
- what actions are legal in each arena.

## Identity drift in package form

The gaming/playing frame also gives a better way to talk about package debt.
If identity is the gluing of masks, then package incoherence is mask drift.

Examples:

- The runtime source imports a package that only appears in `devDependencies`.
- The package exposes a `bin` whose target no longer exists.
- The package claims an export surface that no longer builds.
- The development mask depends on a decommissioned package as if it were still authoritative.
- The runtime mask imports a decommissioned package.
- The tests rehearse a behavior the exports no longer offer.
- The docs describe a role no live action can perform.

Those are not just "lint issues."
They are failures of gluing.
One face says yes where another face says no. The package has identity drift.

This gives the decommission audit a more principled status.
An active package importing a decommissioned package is not merely untidy.
It is a mask conflict: the potential runtime or development face is still trying to wear a retired role.
That conflict can be held and migrated, but it should not be silently treated as source-of-truth architecture.

## Mimicry, not confusion

Gaming's account of mimicry is becoming-other through a navigable mask boundary.
A play can put on another's mask when the arena admits the relevant relabeling.

That matters for ICK as a development dependency.
When a faculty package admits ICK in its development world, it is not pretending to be the kernel at runtime.
It is entering a development arena where it can temporarily wear a kernel-facing mask.
It becomes readable as the kernel reads.
It can rehearse under the whole's gaze.
It can ask: when the assembled coherence computer looks at this package, what facts, actions, contradictions, and affordances appear?

That is mimicry in the technical sense, not category confusion.
The package assumes a mask for transformation.
It exits the mask when acting as its runtime self.

## The implementation consequence

The live structure layer already has the right mathematical seed.
`@emsenn/computing` preserves dependency relationships on `ManifestStructure`.
`@emsenn/organizing` preserves relationship labels in dependency graph edges.

But the current directory substrate reading in `@emsenn/organizing` flattens or omits the development world when it turns package manifests into package utterances.
It reads `dependencies`, `peerDependencies`, and `optionalDependencies` into plain `depends` facts, but not `devDependencies`, and not with the relationship label preserved.

That is exactly the wrong place to lose the distinction.
If package code is to become agentic memory, the development mask must be admitted as first-class evidence.
The substrate should not merely say:

```text
@emsenn/relating depends on typescript
```

It should say:

```text
@emsenn/relating has-development-counterparty typescript
@emsenn/relating has-development-counterparty @emsenn/information-coherence-kernel
@emsenn/relating has-runtime-counterparty @emsenn/relating/upstream-runtime-need
```

or, more generally:

```text
package:@emsenn/relating
  dependency relationship development
  dependency name @emsenn/information-coherence-kernel
  dependency protocol workspace
```

The exact predicates can be normalized later.
The invariant is that relationship is part of the fact.
Without it, the system cannot distinguish "this is a runtime organ" from "this is a development mask."

## A sentence for outsiders

A Node package is a role-bearing participant in several rule-worlds.
Its manifest declares the masks under which it participates.
`dependencies` are the runtime mask.
`devDependencies` are the development mask: the counterparties admitted while the package becomes, tests, reflects, and realizes itself.
In ICK terms, adding the kernel as a development dependency to an upstream faculty does not make the faculty depend on the kernel for runtime existence.
It lets the faculty wear a kernel-facing mask during self-formation, so the package's own code can be read as facts in the memory of the agentic being realized there.

That is the non-Clippy version.
Not "nest your site inside your site."
Not "make every package a toy ICK."
Rather:

```text
preserve the phase of the relation,
read the package's masks as its faces,
and let development be the arena where the part can be transformed under the gaze of the whole.
```

## Source anchors

- Companion note: `dev/content/dreaming/imagining/2026/06/27/2026-06-27-research-on-actions-faces-and-faculties.md`.
- `lib/computing/src/host-neutral-structures.mts`: `ManifestStructure` and dependency `relationship`.
- `lib/computing/src/js-mark.mts`: `devDependencies` decoded as `development`.
- `lib/organizing/src/host-neutral-structures.mts`: dependency graph edges preserve `relationship`.
- `lib/organizing/src/substrate/index.mts`: current package substrate reading flattens package dependencies into `depends` facts and should preserve the development mask.
- `lib/gaming/src/structuring/concurrent-game/with-symmetry/strategizing/mask.mts`: mask as I/O face, not self.
- `lib/animating/src/becoming/doing/embodying/handedness.mts`: recv/observe and send/actuate as Opponent/Player duality.
- `lib/playing/src/character-agent.mts`: character as gluing of masks, with identity drift as obstruction.
- `lib/gaming/src/structuring/concurrent-game/with-symmetry/reading/regime.mts`: mimicry as becoming-other through mask/fiber assumption.
