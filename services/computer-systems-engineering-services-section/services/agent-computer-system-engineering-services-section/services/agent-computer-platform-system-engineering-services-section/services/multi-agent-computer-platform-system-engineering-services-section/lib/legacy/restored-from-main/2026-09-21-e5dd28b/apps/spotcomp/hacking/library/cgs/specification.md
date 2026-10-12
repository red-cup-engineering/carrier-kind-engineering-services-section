# CGS Specification

Status: first normative skeleton for the concurrent game systems sub-specification.

This sub-specification owns the game-semantic theory required by SPOTCOMP modeled players.
It fixes the event-structure and strategy-law boundary that must exist before a player loop, policy table, trace handler, or peer identity can be treated as a concurrent-game strategy.

## 1. Position In SPOTCOMP

SPOTCOMP is a trace computer operating modeled players.
The theory of computing used for modeled-player behavior is concurrent games with symmetry.
CGS therefore sits between settled informational objects and modeled-player action:

`settled information -> observation map -> CGS arena -> strategy -> player move`

CGS is not the transport protocol, the peer registry, or the trace carrier.
Those can provide events and observations, but the CGS layer owns the arena, polarity, causality, conflict, symmetry, strategy morphism, and composition laws.

The derivation direction is:

`aperiodic articulating -> transfinite predicating -> Scott-continuous positing -> finite settling`

CGS declarations at finite record boundaries are therefore witnesses of a downstream restriction, not the source of the game-semantic object.
A finite event table can present an arena only when the upstream stage and regime obligations remain available.

## 2. Object Boundary

A CGS object MUST be declared as a prime event structure with game structure:

- event identifiers;
- causality relation;
- minimal conflict relation with inherited conflict through causality;
- Player/Opponent polarity;
- symmetry groupoid preserving causality, conflict, and polarity.

Polarity is not identity.
An event about one modeled player may be an Opponent event for another modeled player's strategy.
Conflict is not the same as bilattice inconsistency.
A pair of claims can be inconsistent in a settled fiber without being event-structure conflict unless the game says that one play cannot contain both events.

## 3. SPOTCOMP Event Sources

A SPOTCOMP CGS profile SHOULD account for at least these event sources:

- trace append;
- observation frontier;
- settlement frontier;
- federated delivery or admission;
- governance or capability check;
- tool or actuator use;
- learning or rule-system transition when it changes play;
- rejected admission when the rejection is used as conflict or audit evidence.

These are candidate sources, not a closed list.
Unknown event kinds remain open obligations until the profile derives their causality, conflict, polarity, and symmetry behavior.

## 4. Morphism Boundary

A CGS morphism `A -> B` is a concurrent strategy on `A^perp || B`, modulo the declared symmetry.
A conforming strategy declaration MUST state:

- the domain and codomain arenas;
- the dualization of `A` in the morphism arena;
- the strategy event structure and its map into `A^perp || B`;
- causality and conflict preservation;
- receptivity to admitted Opponent extensions;
- quotient reading under the arena symmetry groupoid;
- whether any deterministic, sequential, or innocent restriction is claimed.

Player moves may be partial-order concurrent.
Sequential and innocent strategies are restrictions of this surface, not replacements for it.

## 5. Composition Boundary

CGS composition is interaction plus hiding:

- `sigma : A -> B` and `tau : B -> C` interact over the shared `B` interface;
- intermediate `B` moves are hidden from the composite `A -> C`;
- associativity is up to canonical isomorphism;
- well-definedness depends on receptivity, causality preservation, conflict preservation, and symmetry quotient compatibility.

Trace concatenation, replaying two loops, or calling two handlers in sequence does not by itself witness CGS composition.

## 6. Boundary To Other SPOTCOMP Sub-Specifications

PAM supplies the predication algebra and settlement kernel.
TRC/TDP stores typed resources, trace evidence, and morphism witnesses.
Operations records work, governance, budgets, and process evidence.
Modeled-player profiles bind external players and local settlings to strategies.

CGS uses evidence from those layers, but does not collapse into them.
A CGS arena is not a catalog path.
A strategy is not a PAM instruction.
A governance rule can constrain play, but it is not the event-structure conflict relation unless the CGS profile declares that mapping.

## 7. Declaration Probes

The current declaration probes are:

- [../../CGS-EMBEDDING.md](../../CGS-EMBEDDING.md);
- [../../schema/cgs-profile.schema.json](../../schema/cgs-profile.schema.json);
- [../../examples/cgs-profile.json](../../examples/cgs-profile.json);
- [../../src/cgs-profile.mjs](../../src/cgs-profile.mjs);
- [../../CGS-STRATEGY-LAWS.md](../../CGS-STRATEGY-LAWS.md);
- [../../schema/cgs-strategy-laws-profile.schema.json](../../schema/cgs-strategy-laws-profile.schema.json);
- [../../examples/cgs-strategy-laws-profile.json](../../examples/cgs-strategy-laws-profile.json);
- [../../src/cgs-strategy-laws-profile.mjs](../../src/cgs-strategy-laws-profile.mjs).

The probes check declaration shape for event structures, causality, conflict, polarity, symmetry classes, strategy references, `A^perp || B`, receptivity declarations, symmetry quotient declarations, interaction and hiding, and sequential/innocent restrictions.

They do not prove the final SPOTCOMP-to-CGS embedding, compute symmetry groupoids, prove receptivity, execute interaction-and-hiding composition, or derive event completeness from raw traces.

## 8. Non-Conformance Cases

A CGS profile is not conformant when:

- it treats public keys, inboxes, outboxes, or capability rows as strategies;
- it omits event-structure causality, conflict, polarity, or symmetry;
- it treats bilattice inconsistency as event conflict without a game rule;
- it forces all Player moves into a linear order without a restriction proof;
- it treats trace merge or handler sequencing as strategy composition;
- it ignores receptivity to admitted Opponent moves;
- it uses an LLM completion or outside-system response as a strategy witness without routing the interaction through articulation, admission, local settling, and event-structure evidence.

## 9. Immediate Derivation Work

The next CGS specification pass needs:

- exact event-kind derivation from trace append, observation, settlement, federation, governance, learning, and rejected admission;
- a complete symmetry-groupoid construction for SPOTCOMP arenas;
- proof that trace merge respects the relevant symmetry quotient;
- executable receptivity and composition law checks;
- derivation of information-to-game observation maps;
- handoff theorem from modeled-player local settling to strategy domain;
- relationship between ludic categories and CGS as sibling game-semantic categories over the predication-fiber substrate.
