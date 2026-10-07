---
title: "Webship Mobility and Berthing Protocol"
description: "Cross-layer specification for realizing a persistent Webship identity across Semiotic Computer Ports and MetroPlat/FeltOS deployment loci without equating organizational identity, deployment state, transport, or presentation."
date-created: 2026-10-02
status: proposed
prompted-by: emsenn
related:
  - RSC Quiescent
  - Semioverse
  - MetroPlat
  - FeltOS
  - SignStuff
  - Port
---

# Webship Mobility and Berthing Protocol

## Purpose

This specification gives an executable meaning to a **Webship** moving through
the Web while preserving the existing distinctions between:

- institutional identity and deployment identity;
- a Semiotic Computer **Port** and a network socket;
- semantic settlement and byte transport;
- a MetroPlat instance declaration and the FeltOS host process that interprets it;
- a Webship and the interfaces through which a captain, crew member, or agent
  perceives it.

The motivating first vessel is the **RSC Quiescent**. The protocol is generic:
nothing below is Quiescent-specific except example identifiers.

The protocol does not require a vessel to copy a process image, filesystem,
database, or virtual machine between hosts. A vessel persists because its
constituting state is content-addressed and its changes are causally witnessed,
not because one process remains alive forever.

## Existing primitives reused

This design is composition, not a parallel platform.

**SignCell** supplies content-addressed semantic cells. **SignChain** supplies
witnessed rules, evidence order, and contracts. **SignGraph** supplies sites,
graphs, valuations, and projections. **SignCraft** supplies settlement,
history, inference, and the current cellular closure engine.

The existing engineering term **Port** remains authoritative. A Port is the
finite typed input vocabulary `(Σ, I)` exposed at a semiotic-computer
boundary, including its independence relation. A Webship port is therefore
not a server or machine. A deployment becomes **berth-capable** by exposing
the Webship message kinds through an existing compatible Port and by being
able to witness their admission and settlement.

MetroPlat already has arrival admission, receiver-local principal binding,
capability authorization, witnessed dispatch, and idempotent CloudEvent
arrival receipts. Those mechanisms are the starting implementation seam.

Transport remains below federation and may change without changing semantic
identity. HTTP, ActivityPub++, a queue, or another transport may deliver the
same Webship protocol records.

## Terms

### Webship

A **Webship** is a persistent governed actor whose identity is independent of
any one deployment locus. Its constituting records include an identity root,
governance/authority roots, standing, obligations, holdings or references to
holdings, and a causal history sufficient to establish continuity.

A Webship is not:

- a VM, container, process, browser session, MetroPlat process, or repository;
- a MetroPlat instance declaration;
- a copy of a host's entire Semioverse view;
- a transport session.

### Berth-capable locus

A **berth-capable locus** is a deployment whose Port accepts the Webship
admission vocabulary and whose local authority can independently decide
whether to realize the vessel there.

Bare Cedar Fog and Cold Red Gate are candidate deployment loci. Their status
as 561 Group colonies does not itself make them berth-capable.

### Berth

A **berth** is a witnessed relation between one Webship continuity state and
one deployment locus:

```text
(webship, berthed-at, deployment-locus)
```

A berth does not transfer ownership of the vessel to the host. It grants only
the locally admitted realization described by the berth receipt.

### Voyage

A **voyage** is a causally connected sequence of Webship acts and encounters.
The vessel may voyage while remaining berthed at one locus. Calling a remote
API, visiting a website, exchanging ActivityPub++ messages, or contracting
with another actor does not by itself move the vessel's berth.

### Passage

A **passage** is a handoff of active command realization from one berth to
another. Passage is stronger than voyage and stronger than replicated read
availability.

### IQuiescent

**IQuiescent** is reserved for a presentation/helm over RSC Quiescent state:
current berth, command epoch, crew/standing, reachable berth offers, current
encounters, obligations, holdings, causal heads, and voyage history.

IQuiescent carries no independent authority. It is not a new runtime, network,
or source of truth.

## Continuity capsule

A host MUST NOT infer vessel continuity from hostname, process ancestry,
filesystem path, or user-supplied display name.

A Webship requests a berth with a **continuity capsule** containing at least:

```json
{
  "kind": "webship.continuity-capsule",
  "version": 1,
  "vessel": "ni:///sha-256;...",
  "state": "ni:///sha-256;...",
  "authorityRoots": ["ni:///sha-256;..."],
  "command": {
    "epoch": 17,
    "holder": "ni:///sha-256;...",
    "grant": "ni:///sha-256;..."
  },
  "causalHeads": ["ni:///sha-256;..."],
  "openObligations": ["ni:///sha-256;..."],
  "holdings": ["ni:///sha-256;..."],
  "previousBerthReceipt": "ni:///sha-256;..."
}
```

The capsule is an index over immutable/content-addressed records, not an
instruction to trust every referenced claim.

The `state` commitment identifies the vessel's current constituting state.
A new accepted act may create a new state commitment. Historical commitments
remain addressable.

## Port vocabulary

A berth-capable Port SHOULD expose the following semantic message kinds. Their
wire encoding is transport-specific.

- `webship.berth.offer` — host publishes the classes of vessels, resources,
  operations, limits, and local authority conditions it is willing to consider.
- `webship.berth.request` — vessel presents a continuity capsule and requested
  local realization.
- `webship.berth.admit` — receiver-local decision admitting a bounded
  realization and producing a berth receipt.
- `webship.berth.refuse` — receiver-local refusal preserving the request and
  reasons without granting authority.
- `webship.passage.prepare` — candidate destination admits enough state to
  prove readiness but does not yet hold active command.
- `webship.passage.grant` — current command holder grants the next command
  epoch to the destination.
- `webship.passage.accept` — destination accepts that exact epoch and becomes
  the active command realization.
- `webship.passage.retire` — previous berth records that it no longer possesses
  active command for epochs at or above the accepted successor.
- `webship.departure.receipt` — source records local effects retained at the
  old berth and the causal head at departure.

The exact independence relation `I` MUST be specified in implementation.
In particular, two command grants for the same vessel are not independent.

## Receiver-local admission

A remote vessel claim never becomes local authority by assertion.

The receiver MUST:

1. validate the received carrier and content identities;
2. preserve the received material as an arrival receipt;
3. bind the remote vessel identity to a receiver-local principal or vessel
   subject using local evidence;
4. settle the requested berth against local rules/capabilities;
5. either refuse it with explicit obstructions or issue a content-addressed
   berth receipt;
6. authorize all later operations under the locally bound subject.

This is the same security law already implemented by MetroPlat arrival
processing: peer source and peer-claimed subject are evidence inputs, not
receiver authority.

## Settlement and the cellular closure engine

Berthing is not "deserialize and run." It is a settlement problem.

Let `L` be the receiving locus's local settlement and `V` the vessel
continuity material. Admission forms a candidate relation `relate(L, V)`
under the receiving Port and rules. SignCraft's cellular closure machinery
determines the fixed-point consequences the receiver is prepared to hold.

A berth is admitted only when the receiver can preserve the vessel's protected
identity distinctions while satisfying local admissibility and authority
requirements.

This specification does not resurrect the abandoned 2025 CDF/RTL wire format.
The surviving descendant is current SignStuff/SignCraft settlement. Old CCE
documents are ancestry, not an instruction to rebuild the old serialization.

## Command epoch and split-brain prevention

Replication and command are different relations.

Many loci MAY retain verified vessel cells, history, public projections, and
even warm executable dependencies. At most one command lineage MAY be active
for one vessel epoch.

For vessel `V`, command authority is represented by a monotonically
increasing `epoch` and an exact witnessed grant. A destination may execute
acts *as the vessel* only after it has accepted the next epoch.

A valid handoff has this shape:

```text
source active at epoch n
      |
      | passage.prepare(destination)
      v
destination prepared, not commanding
      |
      | source signs/grants epoch n+1
      v
destination accepts exact grant n+1
      |
      | destination becomes active
      v
source retires command >= n+1
```

If source and destination become partitioned before acceptance, the old holder
remains authoritative for epoch `n`. If the destination accepts epoch
`n+1`, any later act asserted by the old holder under epoch `n` is stale
and MUST be refused by peers that have witnessed the successor grant.

Disaster recovery without the prior holder is a separate succession procedure.
It MUST NOT be implemented as "highest node wins" or wall-clock timeout alone.
Quiescent's charter/succession authority must determine who may issue a
recovery grant.

## What moves and what stays

During passage, the vessel carries/references:

- vessel identity and constituting state commitment;
- current command epoch and grant;
- authority/standing roots;
- causal heads and voyage history commitments;
- open obligations;
- portable holdings and references to non-portable holdings;
- capability requirements, not assumed host capabilities;
- enough provenance to verify the above.

The source berth retains:

- its own immutable receipts and local observations;
- effects legally/semantically owned by the source;
- cached content-addressed cells;
- departure and passage receipts;
- no active command authority after successor acceptance.

The destination contributes:

- its own local principal binding;
- locally available capabilities/resources;
- its own Port and admission law;
- a new berth receipt;
- execution witnesses produced while the vessel is realized there.

## MetroPlat and FeltOS allocation

**FeltOS** owns process lifecycle, networking, clocks, local storage bindings,
and the enterprise host.

**MetroPlat** owns enterprise-world installation, local business authority,
operation discovery, arrival processing, and recorded outcomes.

**SignStuff** owns semantic identity, settlement, witnessed histories, and
content-addressed state carriers used by the protocol.

**Semioverse** is the larger federated semantic field in which the resulting
records relate. It is not the process that moves the vessel.

No Webship-specific executable is required. A berth-capable FeltOS/MetroPlat
deployment installs the Webship mobility operations like any other governed
operation family.

## Metroplex and IQuiescent

Metroplex may project a berthed vessel into an inhabitable local world. A
captain can enter the bridge, inspect current voyage state, and issue locally
authorized operations.

IQuiescent may provide a vessel-centric view across loci:

- vessel continuity commitment;
- active berth and command epoch;
- known berth offers;
- prepared passages;
- crew and standing;
- open obligations;
- holdings;
- recent encounters and causal heads;
- stale/rejected command attempts;
- departure/arrival receipts.

Neither projection changes the vessel simply by displaying it.

## First realization: Bare Cedar Fog -> Cold Red Gate

The first acceptance path SHOULD be deliberately boring.

1. Define RSC Quiescent's current vessel identity root and a minimal continuity
   state assembled from extant charter/ship records.
2. Add the Webship message kinds to a shared Port contract.
3. Make Bare Cedar Fog issue a berth receipt for Quiescent without changing
   existing ship governance.
4. Make Cold Red Gate advertise a compatible berth offer.
5. Replicate/fetch the continuity capsule and all required cells at CRG.
6. Run `passage.prepare` at CRG. It must prove local principal binding,
   required package availability, capability settlement, and content identity.
7. BCF issues command epoch `n+1` only after a successful preparation receipt.
8. CRG accepts `n+1` and executes one harmless witnessed operation as
   Quiescent.
9. BCF rejects a deliberately attempted stale command under epoch `n`.
10. Move command back to BCF through the same protocol.

Passing this round trip is the first credible meaning of "RSC Quiescent has
sailed."

## Acceptance invariants

A conforming realization demonstrates:

- **identity continuity** — the vessel identity is byte/content-identical across
  berths;
- **host independence** — changing deployment does not rename/reconstitute the
  vessel;
- **receiver sovereignty** — no remote assertion grants local authority;
- **single active command lineage** — stale epochs are mechanically refused;
- **content integrity** — every constituting reference is hash verified;
- **transport independence** — changing transport does not change settlement;
- **receipt completeness** — prepare, grant, accept, berth, departure, and
  refusal decisions are independently inspectable;
- **projection non-authority** — IQuiescent and Metroplex cannot grant powers by
  rendering them;
- **replayability** — another compatible locus can reconstruct the same accepted
  continuity state from the capsule and referenced records.

## Explicit non-goals for v1

Version 1 does not require:

- arbitrary third-party hosts;
- autonomous disaster-recovery succession;
- live process migration;
- moving secrets between hosts;
- a global scheduler;
- consensus across all Semioverse nodes;
- copying an entire MetroPlat instance;
- resurrecting the old CDF/RTL runtime;
- a new transport protocol.

The first goal is one witnessed round trip between two 561 Group deployment
loci using the primitives already present.
