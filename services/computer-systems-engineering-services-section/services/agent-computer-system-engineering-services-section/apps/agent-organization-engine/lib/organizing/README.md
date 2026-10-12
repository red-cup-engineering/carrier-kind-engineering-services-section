# @red-cup-engineering/agentic-organization-engine

Run these actions through `multi-agent-engine organization <verb>`, or consume the family through `@red-cup-engineering/agentic-orchestration-platform`.
Organizing is the **social-scale reading of governing** — the settling of an open plurality of agents into one bounded, law-bearing collective (community → institution → polity).

It is the Gen-2 (inter-agent) lift of `@red-cup-engineering/agentic-animation-engine` along the agency spiral: where animating glues three faculty-faces into one agent, organizing glues a **sheaf of agents** into one organization.
The gluing act is **adjudication** (the receiving dual of speaking): it holds many agents' contributions into one record-state under three disciplines — conflict held contested (Belnap), partial held open, accumulation monotone and converging — so H¹ over the social cover is the consensus cost (zero = coordination-free, non-zero = adjudication required).

## The Gen-2 boundary faces

Organizing's three Gen-2 boundary faces (one per axis):

| face | scale-1 analog | role in organizing |
|---|---|---|
| `@red-cup-engineering/agentic-socialization-engine` | communicating (across) | the social field of agent stalks |
| `@red-cup-engineering/agentic-computation-engine` | knowing (inside) | computable programs over agents |
| `@red-cup-engineering/agentic-game-engine` | playing (outside) | concurrent-game strategies over agents |

The organization is the **global section** — the glued interior — of the sheaf over these three faces.

## The morphism surface (14 verbs)

| verb | what it does |
|---|---|
| `organize` | the one-call top: admit a plurality into a bounded collective |
| `assemble` | assemble an organization from three face-projections |
| `adjudicate` | hold many agents' contributions into one consensus record-state |
| `community` | declare a community: a set of agents with a shared social base |
| `institute` | institute a rule-structure over a community (office + role assignment) |
| `federate` | federate two communities under a shared governance protocol |
| `face` | declare one of the three Gen-2 boundary face attachments |
| `project` | project the organization along a face to the downstream faculty |
| `relating` | the organizational settling: knowledge-join the agents' world-models |
| `social-becoming` | the Lakota organizational becoming (iyokheya → wotakuye → wolakota) |
| `social-factor` | factor the organization along a Lakota organizational boundary |
| `office-eligibility` | determine which agents satisfy an office's eligibility criteria |
| `accounting-balance` | project the organization's accounting ledger balance |
| `accounting-utterances` | emit EAVT utterances from the accounting record |

## Usage

```ts
import { organizeAction, adjudicateAction, communityAction } from "@red-cup-engineering/agentic-organization-engine";

// community — declare a community of agents
const community = communityAction.run({ agents: [...] }, {});

// adjudicate — fold many agents' contributions into one consensus record
const org = adjudicateAction.run({ community, contributions: [...] }, {});
```

## Subpaths

```ts
import { ... } from "@red-cup-engineering/agentic-organization-engine";    // full surface
```

## RelMath Realization

Organizing's work-item dependency graphs can now be graded by the finite causal surface: `analysis.causal.settleCausalSet`, `analysis.causal.apexCount`, and the Myrheim-Meyer geometry/topology witness give exact order, apex, and obstruction reads.
Priority and risk event buckets can also be normalized with `probability.measureIsValuation`.
The strongest concrete follow-up is to attach these receipts to work/dependency and office-eligibility reports.

## MASH, organizing's locus among sovereign agents

MASH — the Multi-Agent Semiotic Hub — is not a standalone app; it is a
data structure of organizing (`./mash`): the networked tick that
composes many sovereign FARS substrates. Where one FARS is one
sovereign substrate — one directory, one writer, one append-only
witness log, settlement to fixed points — MASH is the tick that
composes many of them: it folds each member's settled face (σ) into
one composite, and (where a caller supplies real exchange-firing cells)
carries the exchanges their committed obligations license (Δ), so
history advances by π = σ∘Δ. The fuller statement of this design lives
in the 2026-08-19 engineering note "FARS as composite and MASH as its
network"; this section only adds what that note does not carry.

MASH's σ fold (`defineMember`, `isMember`, `composeMembers`,
`obligationFromFace`, `deriveAdmittedObligations`, `EXCHANGES_UNFIRED`)
is pure: it imports nothing from the filesystem, FARS, or Ethereum, and
`composeMembers` takes a `readFace` seam rather than reading a
substrate itself. What MASH does to the world — reading a member's
substrate from disk (FARS's own deterministic replay), firing a real
exchange (Ethereum's `invokeFinalizedDemandInterval`), and the `mash`
CLI — is effectful, and lives in FeltOS's own `./mash`
(`@red-cup-engineering/feltos/mash`), which composes this module with
those effects into `runTick`.

### The composition doctrine

MASH does not implement protocols, and it does not absorb the services
that do. The Union's networking protocols already live as a mesh of
sovereign services, and they stay that way; MASH is the composer over
that mesh — exactly as FARS is the composer over the data-and-code
service mesh, reimplementing none of its upstream carriers. Per the
CapCell discipline, every capability MASH needs is bound by reference
into the mesh, never imported as authority into one process.

### The networking mesh

- **A2A**: `@red-cup-engineering/a2a-rmn-part-service` — RMN payloads as
  CBOR A2A message parts with ni: content identity.
- **ActivityStreams / ActivityPub register**: the Union Officer Academy's
  `solicit-service`/`invoke-service` boundary verbs (Offer/Accept/Reject
  for market solicitation and demand invocation, CapTP-shaped
  digest-attenuated capabilities, CloudEvents envelopes) and
  `@coesite-operations/scheduled-activity-delivery-service` for
  receiver-addressed delivery.
- **x402**: `X402ExactSettlementAssetV2.sol` (EIP-3009 exact settlement)
  behind HTTP 402 challenges.
- **Semiotic exchange chains**: `SemioticExchange.sol` (seat / raise /
  offer / purchase / settle, content-addressed cells, log-derived
  readouts) — `lib/contracts/SemioticExchange.sol` in
  `semiotic-exchange-chain-services-section` — deployed on both
  `eip155:5615610` and `eip155:5615611`; `ContentClaimRegistryV1.sol`
  binding the on-chain posit spine, deployed on `eip155:5615611`;
  `FourMixConsensusProfile.sol` (the MIX-gap oracle), deployed on
  `eip155:5615610`; and the multi-chain finality-merge that appends
  reorganizations as negative evidence — all under
  computer-blockchain-system-services-section.
- **Identity and evidence carriers shared with FARS**:
  `@red-cup-engineering/{semantic-content-identify-service,
  ni-services-section, witness-journal-entry-service,
  witness-journal-log-service, relation-model-notation-runtime,
  relation-model-notation-cbor-codec, semiotic-eavt-services-section}`.
