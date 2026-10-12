---
title: "Research on MetroPlat Readout-Side Names"
description: "Proposes naming the caller/consumer side of an interaction with a running MetroPlat instance by the kind of readout side it occupies, deriving the name set from the Obsmetrologia (“Infomaterial”) readout/shroud/hole structure."
date-created: 2026-07-01
keywords:
  - readout
  - structure
  - infomaterial
  - action
  - witness
  - boundary
  - protocol
  - hole
  - shroud
  - capability
  - x402
  - Jupyter
status: research-note
packages:
  - sites/metroplat.emsenn.net
  - sites/infomaterial.emsenn.net
---

## Claim at full strength

The caller/consumer side of an interaction with a running Infography [renamed later to MetroPlat] [renamed later to MetroPlat] instance
should be named by the kind of **readout side** it occupies.

Proposed names:

- **local-section readout**: the caller/consumer is internal to the same running
  metroplat instance.
- **constituent-section readout**: the caller/consumer is another running
  metroplat instance, related through an inter-instance boundary.
- **readout exterior**: the caller/consumer is outside metroplat entirely and
  is available only through a boundary observation, caller/observer descriptor,
  or other exterior witness.

The genus **readout side** is a naming conjecture, not an existing package
declaration. The three specific names deliberately reuse checked local
vocabulary: `local-section`, `constituent-section`, and `ReadoutExterior`.

I do not propose `client` or `server` as mathematical names. In this corpus those
are, at most, transport-side roles. They do not distinguish same-instance
sectional observation, inter-instance constituent observation, and exterior
boundary observation.

## verified

### MetroPlat structure declarations

The public capability inventory is `@emsenn/metroplat/capabilities`. Its source
file says the manifest is derived from live relational protocol declarations
rather than a documentation-only list. A manifest entry carries protocol id,
name, authority, phase, output, structure ids, obligations, public imports,
example, and relations.

The manifest covers these protocol structures through
`relationalProtocols`:

- ActivityPub
- DID/VC
- UCAN delegation
- A2A task
- CapTP
- Macaroons
- WASI capability
- x402 value settlement
- accountable transaction
- OpenAI inference
- Jupyter witness
- Raft consensus log

Those structures are not all the same kind of boundary. Their declared covers sort
them into two checked scales:

- `diagonalAgentCover`, whose faces have role `local-section`;
- `offDiagonalCollectiveCover`, whose faces have role `constituent-section`.

ActivityPub, DID/VC, UCAN, A2A, CapTP, Macaroons, and WASI use the diagonal
agent cover. x402, accountable transaction, OpenAI inference, Jupyter witness,
and Raft use the off-diagonal collective cover.

The boundary witness policy used by these protocol declarations has
`caller: "optional"`. MetroPlat's contract exposure machinery records a
boundary observation and treats the tokens `caller` and `observer` as satisfied
when an exposure has a caller descriptor. `contractExposureReport` checks that a
caller is present when the witness policy requires one.

### MetroPlat running/action vocabulary

The running category records actions over structure objects. Its composition
report uses the word `consumer` for the second action in a composition
`consumer o producer`; the producer codomain and consumer domain must be the
same boundary. This is an action-composition word, not yet a name for the side
of every interaction with a running instance.

The bin and hole observation surfaces accept an optional `caller` descriptor and
pass it into `contractExposure`. The hole observation lens records readout,
interior, exterior, and shroud structure while hiding socket/process/physical
promotion details.

### Infomaterial formal anchors

The Infomaterial site object is a fixed `(q, tau, U)` object. `Covers` are
fixed-base, fixed-time clopen covers of the `U` leg. The theorem
`Infomaterial.Site.bitopological_site_grothendieck` proves the
Grothendieck basis axioms for this covering structure. `no_temporal_covers`
states that these covers do not vary the temporal coordinate; cross-ordinal
content belongs to morphisms, not the topology.

Lean LSP verification reported these axiom sets:

- `Infomaterial.Site.bitopological_site_grothendieck`: `propext`,
  `Quot.sound`.
- `Infomaterial.Site.covers_pullback`: `propext`, `Quot.sound`.
- `Infomaterial.Cohomology.h1_vanishes`: `propext`, `Quot.sound`.
- `Infomaterial.Relational.Spacetime.Boundary.Hole.shroud_not_exterior`: no
  axioms.
- `Infomaterial.Persistence.Aperiodic.zetaStarDisplacementObservedEq_step`:
  `propext`.
- `Infomaterial.Persistence.Aperiodic.zetaStarDisplacementObservedEq_orbit`:
  `propext`.

The cohomology file proves that every checked 1-cocycle is a coboundary and that
gluing is unique. This supports the word `section` for intra-infographic
readout only where the caller/consumer is actually a local section of the same
cover.

The hole boundary file defines `ReadoutExterior`, proves the hole and readout
exterior are disjoint, and proves `shroud_not_exterior`. This prevents the
outer caller from being named `shroud`: the shroud is the internal boundary
region adjacent to readout exterior, not the exterior side itself.

## Derivation

### Intra-infographic direction

Within one running instance, the caller/consumer side is not exterior to the
metroplat. If it is typed by the same running apex and its structure boundary is
read through a fixed cover, the best checked vocabulary is `local-section`.

The proposed name is therefore **local-section readout**.

This name says only what is justified:

- the side is a readout side because it is the side from which the interaction
  is observed or consumed;
- it is local-section because the checked diagonal cover role is
  `local-section`, and the formal site covers are fiber-local at fixed
  `(q, tau)`;
- it is not a client, because transport role is not the relevant invariant.

### Inter-infographic direction

Between separate running metroplat instances, the caller/consumer side is not
merely another local section inside the same cover. The checked protocol
material for off-diagonal collective structures uses faces with role
`constituent-section`, cross-arena gluing, possible irreducible consensus cost,
and name-passing mobility.

The proposed name is therefore **constituent-section readout**.

This covers x402, accountable transaction, OpenAI inference, Jupyter witness,
and Raft at the level declared by the structure manifest. It does not
yet prove that every future inter-instance protocol must use the
off-diagonal-collective cover. It only names the caller/consumer side when the
inter-instance boundary is actually carried by that checked scale.

### Outer-infographic direction

When the caller/consumer is outside metroplat entirely, the side is not a
section of the metroplat's own cover and not another metroplat constituent.
The checked vocabulary is `ReadoutExterior`, plus the runtime `caller` or
`observer` descriptor carried by boundary exposure.

The proposed name is therefore **readout exterior**.

This is the strongest of the three names, because `ReadoutExterior` is already
formalized and `shroud_not_exterior` rules out confusing the exterior side with
the internal boundary shroud. Runtime code can still store a `caller`
descriptor, but that descriptor is evidence about the exterior readout side, not
itself the mathematical name of the side.

## Precisely stated conjecture

**Readout-side naming conjecture.** For any witnessed interaction with a running
MetroPlat instance, the caller/consumer side admits exactly one of the
following names once its structure relation to the instance is known:

1. **local-section readout**, when the caller/consumer is a structure/action of
   the same running instance and its observation is fiber-local over that
   instance's cover;
2. **constituent-section readout**, when the caller/consumer is another running
   metroplat instance and the interaction is carried by an off-diagonal
   collective cover;
3. **readout exterior**, when the caller/consumer is not an metroplat instance
   and is present only through boundary observation, caller/observer descriptor,
   or exterior readout witness.

The conjecture is intentionally about naming, not about an already-proved
runtime classifier. It depends on future work that connects running instance
identity, structure/action identity, and boundary exposure records into one
checked discriminator.

## Open hypotheses

1. There is not yet a Lean theorem relating MetroPlat's `RelationalFacultyCover`
   roles directly to Infomaterial's `Covers` and `H1Vanishes` structures.
2. The inter-infographic name may need refinement once there is a concrete
   inter-instance witness surface. `constituent-section readout` is supported by
   current off-diagonal protocol declarations; `name-passing readout` remains a
   possible narrower name for protocols where mobility, rather than
   sectionhood, is the controlling invariant.
3. The corpus has nearby words `caller`, `observer`, and `consumer`, but no
   checked term for the side requested here. Those words should remain evidence
   fields or action-composition roles until a structure proves they can bear the
   stronger naming load.

## Current result

Use **readout side** as the provisional genus.

Use these three names when the corresponding evidence is present:

- **local-section readout** for intra-infographic interaction;
- **constituent-section readout** for inter-infographic interaction;
- **readout exterior** for outer-infographic interaction.

Do not collapse these into `client`, `user`, `consumer`, `caller`, or
`observer`. Those words are either transport roles, action-composition roles, or
witness fields. They are not the three directional names.

The manifest currently covers these protocol structures through
`relationalProtocols`:

Lean LSP verification in this session reported these axiom sets:

1. There is not yet a checked runtime structure that decides whether a
   `caller`/`observer` descriptor belongs to the same running instance, another
   running metroplat instance, or an outer non-metroplat system.
2. There is not yet a Lean theorem relating MetroPlat's `RelationalFacultyCover`
   roles directly to Infomaterial's `Covers` and `H1Vanishes` structures.
3. The inter-infographic name may need refinement once there is a concrete
   inter-instance witness surface. `constituent-section readout` is supported by
   current off-diagonal protocol declarations; `name-passing readout` remains a
   possible narrower name for protocols where mobility, rather than
   sectionhood, is the controlling invariant.
4. The corpus has nearby words `caller`, `observer`, and `consumer`, but no
   checked term for the side requested here. Those words should remain evidence
   fields or action-composition roles until a structure proves they can bear the
   stronger naming load.
