---
title: Detailed work and platform contracts for muse-assist
date-created: 2026-09-27
type: specification
status: derived LLD; work/platform design; not implementation acceptance
derived-from: 2026-09-27-muse-assist-hld.md
derived-from-sha256: 5f824fb118e4cdfec8e23cc2f74e8aff667eff420d5e461ffb4c60b8ad57c6e9
---

## What this is

This LLD refines H-01, H-03–H-05, H-I1, H-I3–H-I5, and H-P1–H-P4 of the [HLD](2026-09-27-muse-assist-hld.md). It defines continuing work, receiving acceptance, and a shared-work relation without duplicating the operational journal. Its fields are logical contracts for subsequent fabrication specifications, not a new database schema or a claim that current implementations enforce them. Evidence algebra, runtime isolation, and source derivation remain separately required contracts.

## One work authority

**L-W01 — Record correspondence.** Intent, allocation, execution proposals, and receiving assessments MUST remain attributable causal events. A work view MUST be a query of those events, never a second mutable status authority. A request without applicable authority MUST remain a request; it MUST NOT create another person's duty. A personal intent may use the person's authority over their own work, but MUST NOT fabricate an office or institutional delegation.

The selected receiving carrier is the subject's causal work journal, whose current FeltOS consumers perform the following transformations:

| Logical fact | Current migration carrier | Required preservation |
|---|---|---|
| Intent and requested receiving conditions | Structured-intent obligation observations in the claim-session feed | Intent, origin, subject, scope, revision and exact obligation |
| Authorized allocation | Office-service-allocation duty observation | Allocation, current office/duty/service, admitted provider and capabilities, authority evidence |
| Proposed execution result | Persisted work-result-proposal observation | Execution, allocation, intent, producer revision, exact result identity, receiving predicate, journal receipt |
| Receiver assessment | Receiver-authorization and work-discharge observations causally linked to the proposal | Independent receiver authority, exact proposal receipt/result, assessment evidence |
| Visible progress and selection | Work read model and dispatch projection | Causes of readiness, waiting, refusal, cancellation and receiving acceptance |

These mappings preserve useful effects rather than existing API entitlement. An implementation MUST reject a legacy record whose required role, revision, result, authority, or cause cannot be recovered. It MAY retain it as historical evidence, but MUST NOT fill missing authority with a default or turn an old status into acceptance.

**L-W02 — Stable references.** A journal reference MUST identify the owning journal/service, subject, immutable event/statement ID, and payload digest; a local path alone is insufficient across platform members. Resolution MUST authenticate the reader, verify the payload bytes and expected event kind, and return `resolved`, `unavailable`, `forbidden`, or `invalid`. An unavailable result MUST NOT be treated as an absent obligation, revocation, or negative evidence. Payloads needed for recovery MUST remain retained under their declared retention rules while an attempt is unresolved.

## Proposals, decisions, and attempts

**L-W03 — Closed effect proposal.** Before any consequential attempt, the work path MUST retain: intent and allocation references; effect ID; proposal revision/digest; operation identity/version; exact typed input; principal/context owner; destination and recipient; disclosed data references; governing grants and required decision; validity interval; resource/spending limits; receiver predicate identity/version; retry/reconciliation contract; and dependencies/preconditions. Fields not applicable MUST be explicitly absent according to the operation contract, not empty strings that imply authority. Any semantic change creates a new proposal revision. A provider callback MUST NOT overwrite the proposal it reports on.

**L-W04 — Decisions are attributable events.** A decision MUST bind the proposal digest, authenticated deciding principal, authority evidence, disposition (`approve`, `deny`, or `withdraw`), and validity interval. Input text cannot assign the authenticated principal. The effect boundary MUST re-evaluate the current grant and decision at execution time; an approval is not a bearer token that survives changed input, expiry, withdrawal, or revocation. An authorized prior grant may cover a routine effect without a new approval event. The UI MUST expose which basis applies.

**L-W05 — Attempt identity and concurrency.** The effect ID MUST remain stable across retries intended to realize the same receiving effect. Each physical attempt has its own attempt ID, proposal digest and causal predecessor. The shared execution boundary MUST enforce a single active attempt for that effect, independently of worker prompts, before sending any external command. Reservation, authorization check, and durable pre-send record MUST precede dispatch. A crash between durable preparation and observation produces uncertainty, not a fresh effect ID. The operation adapter MUST declare whether the receiver supports an idempotency key, an authoritative reconciliation query, or neither. If neither is available, an uncertain attempt MUST wait for attributable receiving evidence instead of automatic repetition.

**L-W06 — Orthogonal progress.** Intent disposition (`active`, `cancelled`, `superseded`) and receiving assessment (`open`, `accepted`, `rejected`, `unknown`) MUST remain distinct from attempt progression:

| Current attempt condition | Admissible transition and actor |
|---|---|
| Proposed | Work regulator checks dependencies; emits ready, waiting for decision/evidence, or refused |
| Ready | Effect boundary reserves effect ID, rechecks authority and preconditions, durably records prepared attempt |
| Prepared | Effect boundary dispatches once, or records pre-send refusal; recovery reconciles if it cannot establish whether dispatch occurred |
| Dispatched | Provider observations produce acknowledged, observed failure, or uncertain outcome |
| Acknowledged/uncertain | Receiver adapter queries evidence; regulator compares the declared predicate; no blind repeat |
| Observed outcome | Independent receiver assessment may accept/reject this exact result; further work is a new proposal if the goal remains open |

Cancellation prevents later dispatch, retires outstanding reservations where safe, and retains committed/uncertain outcomes. It MUST NOT erase an already sent action, fabricate compensation, or declare the original intent fulfilled. Compensation is a separately authorized effect. Client disconnect and date changes alter neither journal identity nor authority.

**L-W07 — Receiving closure.** A result proposal MUST cite its exact persisted receipt and result digest. Receiver assessment MUST resolve that receipt, verify intent/allocation/scope/producer/revision/result correspondence, and evaluate the named receiving predicate from appropriate evidence. The producer MUST NOT act as its own independent receiver. A later allocation revocation prevents new execution but MUST NOT prevent an authorized receiver from assessing an already committed result. Changing a goal or a human choosing to stop is recorded distinctly from the original receiving predicate being satisfied.

## Shared platform work

**L-P01 — Selected relation.** Only work that needs coordination between platform participants MUST create a shared-work reference. Personal-only work remains in its owning work journal. The shared reference makes an authorized allocation and its current coordination disposition discoverable to authorized peers; it MUST NOT duplicate execution scheduling, private task descriptions, or receiver acceptance.

The content body is a closed versioned `SharedWorkReference@1` record with these fields:

| Field | Meaning and constraint |
|---|---|
| `kind` | Literal `SharedWorkReference@1` |
| `sharingId` | Unpredictable 32-byte identifier, stable for this sharing relation; not a hash of a guessable personal goal |
| `origin` | Authenticated owning service/principal reference, distinct from worker and EVM controller |
| `intent`, `obligation`, `allocation` | Exact authorized journal references under L-W02 |
| `participants` | Nonempty unique set of authenticated peer references permitted to resolve this record |
| `disclosureAuthority` | Reference to independently validated permission for both peer disclosure and public chain metadata |
| `coordination` | `offered`, `allocated`, `withdrawn`, or `closed`; a coordination disposition, never a work-success value |
| `prior` | Null for initial admission; otherwise exact prior content digest and expected sequence |
| `cause` | Exact journal event reference justifying this transition |
| `validity` | Explicit start and expiry, with no automatic renewal |
| `controllerBinding` | Independently validated origin-to-chain-controller binding and its revision |

Additional fields MUST be refused by this version. Evidence bodies retain the relevant authority/transition witnesses and their digests. Raw intent text, messages, account identifiers, credentials, documents, and journal contents MUST NOT be embedded in public chain data. Authorized peer resolution uses an authenticated off-chain resolver. Encryption/access control MUST NOT be represented as concealing controller addresses, transaction timing, or resource correlation from chain observers. If those disclosures are not authorized, this path MUST refuse sharing.

**L-P02 — Transition admission.** Initial admission requires a valid originating intent/obligation and disclosure grant. `allocated` requires a current lawful allocation; `withdrawn` requires the origin's authority to stop sharing or a governing revocation; `closed` requires a justified coordination closure. A closed or withdrawn record MUST NOT be reopened by reusing an expired grant; a newly authorized relation uses a new sharing ID. Every head advance MUST verify the prior body and cause and compare the expected content head. A peer that accepts delegated work records its own attributable event in its receiving journal. The origin's EVM controller MUST NOT forge that peer's acceptance by changing a field.

The permitted coordination transitions are closed as follows. Any unlisted edge MUST refuse; unchanged head resubmission is transaction reconciliation, not a new transition.

| Prior → next | Authorizing actor and required evidence |
|---|---|
| Absent → offered | Accountable origin, with current intent/obligation and peer/public-metadata disclosure grants; no allocation acceptance is implied |
| Offered → allocated | Origin's current allocation authority, exact lawful allocation event, and evidence that the designated provider accepted or is already bound under an applicable standing delegation |
| Allocated → allocated | Same origin authority with a new current allocation/revision; evidence of the previous delegation's disposition and the replacement provider's applicable authority; renewed disclosure checks for any changed participant |
| Offered or allocated → withdrawn | Origin or governing revocation authority; exact withdrawal/revocation event and notice outcome to affected peers. Withdrawal stops new effects under this relation but retains peers' existing obligations and uncertain attempts in their journals |
| Allocated → closed | Origin's coordination authority plus attributable peer acknowledgment that no further work is owed under this sharing relation. Evidence must either discharge each shared allocation, or identify its explicit cancellation or transfer to another authorized allocation with accountable receiver. No unresolved attempt may be orphaned by closure |
| Withdrawn or closed → any state | Refused. A new authorized sharing relation uses a new sharing ID and preserves the previous reference |

A closure event MUST name the disposition of every allocation and committed/uncertain attempt in its shared scope. A party unable to resolve a necessary journal or peer acknowledgment MUST retain the coordination condition as unresolved. This is a closure of the sharing relation; the underlying personal goal can remain open or be revised, and only L-W07 determines original receiving acceptance.

**L-P03 — Content and chain correspondence.** The off-chain resolver MUST retain and verify exact content/evidence bytes before any transaction is submitted. The fabrication specification MUST choose one canonical byte encoding and digest mapping used by all producers and readers; silent mixing of JSON serializations is forbidden. A MARSH head records only controller admission of those digests at a sequence. It does not prove payload availability, lawful allocation, truthful observation, execution, or receiving acceptance. Resolver failure preserves the last verified state with its block/revision and an explicit unavailable condition; it MUST NOT manufacture the latest work state.

## Controller-bound admission and EVM effects

**L-P04 — New admission semantics.** The new MARSH realization MUST derive a resource key at the contract boundary from its own domain, chain, contract address, caller/controller, resource kind and subject. The subject for this relation is `sharingId`; the kind is fixed by the downstream wire specification. Callers MUST NOT supply an arbitrary resource key for first admission. The new ABI entry is named `admitBoundResource` to distinguish its semantics from the legacy four-argument `admitResource`. Keeping an arbitrary-key admission path in the same new contract would permit reservation of derived keys and MUST NOT be allowed. Updates MUST remain controller-only compare-and-swap against the expected content head and advance sequence exactly once per successful transition.

This requires a new contract deployment/identity, not an assertion that existing chain code changed. Legacy contracts/resources MAY remain readable with explicit unbound identity semantics. They MUST NOT acquire authority by lookup of a derived-looking key. Migration requires the real controller's fresh, authorized admission into the new domain, a provenance link to the legacy record, and separately validated disclosure. No bulk automatic transfer or deletion is authorized by this design.

**L-P05 — Signer custody.** An operator-admitted binding maps the accountable origin and grant to an allowed chain, contract/code identity, controller, operation/kind and resource limits. The controller private key MUST remain solely in the signing boundary. Neither the model, a peer's content body, nor an arbitrary RPC response may establish this binding. Signing MUST reject a changed controller binding, wrong chain/contract, wrong derived key, stale head, revoked/expired authority, or insufficient authorized fee/resource budget.

**L-P06 — Submission and reconciliation.** The prepared transaction record MUST bind effect/attempt IDs, canonical payload digests, expected prior head/sequence, chain/contract/code identity, sender and nonce, signed transaction hash, and the configured finality policy. Signed transaction identity MUST be retained before broadcast. After a timeout/restart, the boundary queries that exact transaction/nonce/resource before any replacement. A replacement transaction MUST remain an attempt at the same effect with explicit fee authority; it MUST NOT create a new sharing relation. Success requires a matching successful receipt/event and resource state at an independently verified block satisfying the configured policy. A reorganization or contradictory provider response returns the attempt to reconciliation and invalidates an unsupported settlement projection.

The finality verifier is a deployment-supplied typed capability with chain-specific evidence, not a Boolean supplied by the model. Missing or unsupported finality policy MUST refuse live submission. Chain settlement closes only the platform transition attempt, never the user's external work under L-W07.

## Generation and migration obligations

**L-M01 — Scope of downstream work orders.** Separate fabrication orders MUST cover the generic bound MARSH admission/ABI/read compatibility, shared EVM effect and reconciliation boundary, shared-work relation/resolver, existing journal/authority gaps, and application composition. They MUST state current input byte digests and affected consumers. The application MUST reuse the journal result/receiver path when it conforms, rather than placing a copy under `muse-assist`. Existing arbitrary resource readers remain useful historical readers; their authority interpretation must be made explicit.

**L-M02 — Adverse evidence.** Independent assays MUST establish: stale-head refusal; arbitrary-key/front-running resistance in the new admission domain; replay and changed-proposal refusal; restart immediately before/after submission without duplicate receiving effect; unavailable private body; unauthorized peer resolution; revoked origin/controller binding; false model approval; independent receiver rejection; acceptance of an already committed result after later execution revocation; and distinction between settled chain head and unfinished external work. A local chain fixture proves only those controlled transitions, not live chain finality or real connected-service behavior.

## Implementations

Current migration evidence is in FeltOS `src/work/structured-intent.mjs`, `agency-work-allocation.mjs`, `work-result-proposal.mjs`, and `work-discharge.mjs`; the organizing work read models/dispatch consume those observations. The current MARSH Solidity contract preserves controller/CAS head retention but does not enforce derived first-admission keys. Current MetroPlat registration exposes MARSH reads without the specified complete write boundary. None is accepted as a complete realization of this LLD.

## Open questions

- **L-O1 — Wire closure:** The downstream fabrication specifications must fix canonical bytes/digests, exact schema/version identifiers, ABI/storage compatibility, error variants and operation signatures against the recovered generic data/EVM contracts. This blocks those fabrications, not the selected relation above.
- **L-O2 — Formal carrier:** H-O1 remains unresolved: current sources distinguish finite FOUR evidence values from transfinite closure stages, without specifying their richer correspondence. This LLD does not substitute one for the other.
- **L-O3 — Enforcement:** The specific untrusted execution isolation, authenticated resolver and signer deployment mechanisms must satisfy H-O3. Logical grant checks or the current Node worker alone do not establish these boundaries.
- **L-O4 — Live operation:** Actual identities, peer services, chain deployments, grants and finality capabilities are operator inputs before live execution. Fixtures must remain labeled; no live authority is inferred.
