---
title: "Survey of the Relating-through-Organizing JS/Node Packages"
description: "Records a read of the nine core JS/Node packages as they stand in lib/ (relating as kernel; communicating/knowing/playing bound by animating; socializing/computing/gaming bound by organizing), giving each stratum's current reading and implementation surface and noting which still use schema codegen."
date-created: 2026-06-22
keywords:
  - relating
  - organizing
  - package
  - Node
  - communicating
  - knowing
  - playing
  - animating
  - gaming
  - socializing
  - computing
  - conformance
status: survey
grounds: [relating, communicating, knowing, playing, animating, socializing, computing, gaming, organizing]
---


This note records a read of the nine core JS/Node packages as they stand in `lib/`:

1. the kernel, `@emsenn/relating`;
2. its scale-1 faculties, `@emsenn/communicating`, `@emsenn/knowing`, `@emsenn/playing`;
3. their face/binder, `@emsenn/animating`;
4. animating's scale-2 faculties, `@emsenn/socializing`, `@emsenn/computing`, `@emsenn/gaming`;
5. their face/binder, `@emsenn/organizing`.

The architectural reading is the one captured by the agency-spiral notes: a relation settles into an agent; the agent re-enters the substrate as a node; the same quartet recurs over a sheaf of agents.
So `communicating/knowing/playing/animating` are not replaced by `socializing/computing/gaming/organizing`; they are lifted.

## Package Spine

| stratum | package | current reading | implementation surface |
|---|---|---|---|
| substrate | `@emsenn/relating` | The category kernel and boundary system: structures, morphisms, dispatch, codecs, holography, term IR, settling. | TypeBox `structure()`/`schemaStructure()`, `action()`, `composes()`, `induceBins`, CLI/HTTP/OpenAPI/MCP/web from one dispatcher. No schema codegen remains. |
| across, scale 1 | `@emsenn/communicating` | Meme endomorphisms: semiosis, speech/listening, grounding, linguistic readings. | `actions(bundle)` returns the bundle-independent meme endomorphism surface; language-specific raw-text admission belongs in `communicating-in-*`. |
| inside, scale 1 | `@emsenn/knowing` | The comonadic/cognitive reading over memes and the corpus: proof search, concept formation, memory, research. | Large action registry over corpus, memory, proof, FCA/conceptualization, mutation. Still uses schema codegen and generated schema type files. |
| outside, scale 1 | `@emsenn/playing` | Ludics and star-autonomous interaction: design, duality, cut, orthogonality, behaviours, proofs. | Actions are concentrated around `Design`, `Interaction`, star-autonomous/proof/topology/composition modules. Uses `runTerm` on core design/dualize/interact actions. |
| binder, scale 1 | `@emsenn/animating` | The agency descent binding communicating/knowing/playing into an agent: becoming, doing, working, governing. | Action surface for glue/face/project, animate, perceive/act/reseed, four regime readings, and factor. Still uses schema codegen. |
| across, scale 2 | `@emsenn/socializing` | Communicating lifted over observers: a Social Field and its common-ground/consensus dynamics. | Endomorphic `social-field -> social-field` surface: admit, merge, settle, glue, translate, broadcast, attend, converge, plus stalkwise communicating lifts. Still uses schema codegen. |
| inside, scale 2 | `@emsenn/computing` | Knowing lifted over agents: Eff/Kleisli reading, computation as settling, FOUR standing. | Four action surface over full animating agents: compute, compose, relay, bang. Small package, still schema-codegen based. |
| outside, scale 2 | `@emsenn/gaming` | Playing lifted into concurrent game systems: multi-agent CGS, running games, play anthropology, strategy/regime/flow/deep-play readings. | Canonical `@emsenn/gaming` now holds the former experimental implementation: running game actions, analysis readers, and multi-agent actions. Still schema-codegen based. |
| binder, scale 2 | `@emsenn/organizing` | Animating lifted over a society: social gluing into an organization and federation. | Action surface for organize, assemble, adjudicate, project, social-descent readings, social-factor, face, federate. Telos is now a live structure and field. Still schema-codegen based. |

## Through-Line

`relating` is the normative implementation target.
It is the package where the current kernel has already landed: one TypeBox structure value gives the TypeScript type source, JSON Schema, and Ajv validator; actions carry domain/codomain structure identities; the dispatcher projects one morphism registry to multiple transports; and the term layer begins making morphism bodies language-neutral data.

The scale-1 faculty packages split the boundary of an agent:

- `communicating` works across the boundary.
  It is intentionally endomorphic on the meme structure: meme in, meme out.
  Text admission is treated as a codec/language package concern, not the core operation surface.
- `knowing` works inside the boundary.
  It reads proof, concept, memory, and corpus work through the knowledge axis.
  It inherits relating's term/proof and content-reading substrate but still has a broad older surface that will need conformance work.
- `playing` works outside the boundary.
  Its characteristic operation is the cut: designs meet their duals and settle into interaction/orthogonality.
- `animating` binds those three faces into the interior agent, the `perceive -> act` loop that is settled below and open above.

The scale-2 faculty packages are the same roles after agents re-enter the substrate:

- `socializing` is communicating lifted from one meme/agent to an observer category.
  The important structure is the Social Field, whose section is common ground and whose off-diagonal morphisms handle translation, gossip/merge, gluing, and consensus.
- `computing` is knowing lifted over agents.
  It does not depend on socializing/gaming; it depends on animating because a computation here is a full agent's settling read as FOUR, with composition/relay as the multi-agent knowledge reading.
- `gaming` is playing lifted into many-agent/concurrent play.
  This is now the canonical `@emsenn/gaming` package, not an experimental sibling.
- `organizing` is animating lifted over a social cover.
  It imports the three scale-2 faces (`socializingFace`, `computingFace`, `gamingFace`) and builds the interior bulk: organization, institution, adjudication, projection, and federation.

The most important recent drift from older notes: the June 21 telos note described organizing's telos as missing and proposed a schema.
On disk, `lib/organizing/src/telos.schema.json` now exists, `buildTelos()` exists, and `buildOrganization()` includes `telos`.
The remaining organizing issue is not "no telos"; it is integrating that aperiodic telos with downstream operations-loop advancement and with any eventual managing-operations fold.

## Conformance State

The nine packages are conceptually aligned, but not implementation-aligned.

`relating` is the reference line: single-source TypeBox structures, no schema codegen, registered structure/action kernel, term layer, Lean-backed conformance vectors, and transport projection from the same apex.

`communicating` and `playing` are closer to the target than the rest.
`communicating` has a clean meme-endomorphism action surface.
`playing` has TypeBox request/structure work and core `runTerm` actions for design/dualize/interact, though the whole package still needs a full invariant audit.

`knowing`, `animating`, `socializing`, `computing`, `gaming`, and `organizing` still carry the older schema realization pipeline (`tsconfig.codegen.json`, generated `*.schema.types.mts`, and package scripts that run `codegen`).
Their action surfaces are present and increasingly well-described, but they are not yet normalized to the relating kernel's single-source structure discipline.

No package except `relating` should be treated as conformant merely because it has an `actions` array.
The real conformance bar is stricter:

- structures are declared once, not hand-authored schema plus generated type files;
- actions are true morphisms with admitted structure identities where possible;
- action bodies use `runTerm` when they are true morphisms rather than boundary admission;
- CLI/OpenAPI/MCP/web remain projections of one apex;
- composition is structure `$id` equality, not naming convention;
- package nodes mount by structure domain, not by ad hoc route trees.

## Package-Specific Notes

### relating

The kernel is current ground truth.
`typing/kernel.mts` declares `Structure`, `Action`, `structure()`, `schemaStructure()`, `action()`, `registeredCategory`, and `composes()`.
Composition is explicitly the equation between produced codomain id and consumed domain id.
This package is also where the term layer, codecs, content reader, holography, and settling machinery live.

### communicating

The core is intentionally narrow: the operation surface is the meme endomorphism set in `communicate/meme.mts`, exported through `communicate/actions.mts`.
The package should not grow raw-text operations in the core.
Raw language admission belongs in the language packages, which factor text into the meme structure through codec surfaces.

### knowing

Knowing is powerful but mixed-era.
It has proof search (`find`), FCA/concept formation (`conceptualize`), corpus navigation, memory settling, topic inspection, gap measurement, document mutation, and cognizing actions.
Its README correctly says it should inherit content I/O from relating rather than bind its own filesystem ontology.
The refactor risk is breadth: conformance work must preserve the corpus and memory capabilities, not replace them with a thinner proof-only surface.

### playing

Playing owns the single-agent outside/cut layer.
It should remain distinct from gaming: `Design`, duality, and interaction are scale-1; multiplayer running games and anthropological game readings belong to the scale-2 lift.
The action file still has a stale comment referring to `@emsenn/gaming-experimental`; the package graph now says `@emsenn/gaming`.

### animating

Animating is the scale-1 binder.
Its live surface exposes both the holographic gluing node (`glue`, `face`, `project`) and the descent spine (`animate`, `becoming`, `doing`, `working`, `governing`, `perceive`, `act`, `reseed`, `factor`).
It still uses the older schema codegen path, so it is conceptually current but mechanically pre-kernel.

### socializing

Socializing is the cleanest scale-2 faculty conceptually: a single Social Field structure, eighteen endomorphisms, off-diagonal social operations, and diagonal lifted communicating operations.
It is a good source of current social-base semantics, especially regime, consensus, CALM, and trajectory-vs-endpoint discipline.
It still has one README drift: it mentions `@emsenn/animating-experimental`; the package manifest now depends on `@emsenn/animating`.

### computing

Computing is small and focused.
It reads animating agents as computable evidence-bearing objects, not as bare functions over data.
Its action surface is minimal: compute, compose, relay, bang.
This makes it a good candidate for an early conformance pass after animating is normalized, because its structure/action footprint is small.

### gaming

Gaming is now canonical and holds the former experimental CGS implementation.
The package is broad: running games, strategy readings, regime classification, flow/deep-play/rhetoric judgments, cultural embedding, plus multi-agent actions.
It should be audited with the playing/gaming split in mind: keep scale-1 design/cut in playing, keep scale-2 concurrent game systems in gaming.

### organizing

Organizing is ahead of some docs.
Its telos has landed as a first-class structure, and `buildOrganization()` includes it.
The package imports the three scale-2 faces, threads them into an organization, and models cross-arena Mayer-Vietoris adjudication and federation.
The next conceptual danger is letting downstream operations content collapse back into organizing's essence.
The package should remain the binder; operations, offices, duties, and work loops are readings built on it.

## Work Implied

The next engineering campaign is not discovering the nine; it is normalizing them.

1. Treat `relating` as the implementation law.
2. Port non-relating structures off schema codegen into single-source TypeBox declarations.
3. Preserve each package's current capability while normalizing the structure/action shape.
4. Resolve stale references to experimental siblings.
5. Push true morphism bodies toward `runTerm`, with boundary/admission actions explicitly exempt by rule rather than by exception list.
6. After organizing stays the binder, fold downstream operational packages as readings rather than making organizing a task manager.

The summary version: the conceptual spiral is coherent on disk; the implementation style is only fully current in `relating`.
The rest of the work is a careful, capability- preserving mechanical convergence toward that kernel.
