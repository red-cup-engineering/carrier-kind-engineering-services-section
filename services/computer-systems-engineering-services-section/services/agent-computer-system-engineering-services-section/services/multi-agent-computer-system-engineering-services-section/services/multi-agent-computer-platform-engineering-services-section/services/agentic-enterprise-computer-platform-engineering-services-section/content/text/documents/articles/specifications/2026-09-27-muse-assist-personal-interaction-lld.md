---
title: Personal interaction and request continuity for muse-assist
date-created: 2026-09-27
type: specification
status: derived LLD; implementation and boundary acceptance outstanding
derived-from: 2026-09-27-muse-assist-hld.md
derived-from-sha256: 5f824fb118e4cdfec8e23cc2f74e8aff667eff420d5e461ffb4c60b8ad57c6e9
refines: 2026-09-27-muse-assist-work-platform-lld.md
refines-sha256: 73251c7d11ba406eee7f2ec19823f874bc8a6a73d38a78ce55ab4f9fb0624139
---

## Purpose and selected realization

This refines H-01, H-I1–H-I4 and the whole-work scenarios, alongside L-W01–L-W07. The receiving effect is a person making an ordinary request, seeing understandable progress and decisions, and receiving a usable result that remains connected to that request after interruption. A request such as “prepare a sourced comparison for my appointment” does not require the person to construct an organizational office or a technical work-cell identifier.

Use the same causal journal for attributable interaction, intent, allocation, proposals and receiving evidence. A conversation and work view are scoped projections of those facts. Preserve the shared inference, work-selection, execution, journal and presentation transformations where their contracts conform. Remove any separate Muse commitment/status store, private worker loop, or model-message-based completion route. The current assigned-worker operation is migration evidence for an execution entrypoint, not the personal interaction interface. The unrelated institutional allocation path must continue to retain its authority distinctions.

## Admission and identity

**L-I01 — Trusted context.** A deployment-admitted context binds a context identifier, accountable owner, authenticated participant permissions, journal service/territory, permitted capability scope and retention/disclosure policy. User input may select a context identifier but MUST NOT supply its owner, storage path, effective principal, authority verdict or credential. Resolve and authorize that binding before reading content, invoking inference or writing an event. Unknown/forbidden contexts return a refusal without revealing whether another person's work exists. A fixed process actor is not proof of the identity of a remote user.

For personal work the authenticated person may act under authority over their own request and information. Institutional work additionally requires the actual office/delegation scope. Neither mode implicitly grants access to calendars, messages, another person's records, spending, or publication. Existing session authorization remains usable within its actual scope; this contract does not require a fresh confirmation for every routine step.

**L-I02 — Input and replay.** An interaction command has a closed versioned body: `context`, `requestId`, `conversation`, `replyTo`, `kind`, and `payload`. The authenticated principal and observed admission time come from the boundary. `requestId` is an opaque client retry identifier; `conversation` and `replyTo` are null for a new conversation/initial message and otherwise exact authorized references. `kind` is one of `message`, `correction`, `decision`, `cancel`, or `assessment`; its payload has the corresponding closed contract below. No optional field may be interpreted as implicit authority.

An admitted message payload contains `text` and `attachments`; attachments are authorized immutable artifact references with declared intended use, not arbitrary server paths or URLs that the server fetches automatically. Configured size/resource limits are checked before retention/inference. Repeating the same `(context, authenticated principal, requestId)` with the same command returns its existing admission reference and does not append another intent or start another attempt. Reusing that key with different bytes refuses as an idempotency conflict. Concurrent retries require one durable admission, not an in-memory request cache. The fabrication order must bind the canonical encoding/digest to the shared data contract before implementation.

**L-I03 — Journal correspondence.** Admission retains the exact input, authenticated origin, context, causal reply reference, attachment references and command identity in the owning causal journal. Its returned L-W02 reference identifies immutable admitted content; a filesystem path or latest status is insufficient. Server acknowledgment means input admission only. Conversation history is rebuilt through its causal frontier across date partitions; disconnect ends the subscription, not the work. No authoritative conversation transcript or task status is maintained in a second store.

## From conversation to continuing work

**L-I04 — Interpret without inventing authority.** Inference receives only context admitted for this principal and purpose, with source/conflict/freshness distinctions. It may produce a conversational answer, an intent/plan proposal, a correction interpretation or a necessary clarification. These are attributable derivations, not permission assertions. Ordinary conversation does not automatically create duties. An explicit actionable request may establish the person's intended receiving outcome without another confirmation; consequential operations still require the authority and proposal correspondence in L-W03–L-W05.

A proposed interpretation retains the input reference, requested recipient/receiving condition, constraints, source evidence, unresolved conditions and derivation identity. Material ambiguity that changes the intended effect is exposed as a concise clarification. Discoverable context is consulted before asking. The application cannot manufacture an office to pass an institutional allocation precondition. The shared allocation transformation must distinguish personal request authority from institutional delegation and retain the genuine provider and independent receiving role for either.

**L-I05 — One regulation path.** Personal selection requires a new typed `PersonalWorkAssignment@1` fact in the same causal journal, with exact `intent` reference, `owner`, `provider`, `receiver`, `scope`, `providerAdmission`, `authority`, `validity`, and `revisionOf` (null initially, otherwise exact predecessor). The owner comes from the authenticated context; provider/receiver are independently admitted principals, not names chosen by inference. `providerAdmission` proves that this provider accepts the requested service or is bound under an applicable standing arrangement. `authority` cites the owner’s request and applicable current grant; `scope` bounds the work and permitted capabilities, and cannot confer rights the owner does not hold. The provider and independent receiver must differ. This is a personal assignment, not an office, duty or institutional allocation and not an on-chain sharing relation.

The shared frontier MUST be extended to select personal work only when the owning intent is active, the exact current assignment is valid, provider acceptance and current grants hold, dependencies/constraints permit execution, and no unresolved attempt prevents dispatch. Missing evidence yields a named waiting/refused condition. Institutional readiness continues to use its actual office allocation and delegation. Both branches feed the same proposal/attempt boundary; neither can impersonate the other by fabricating markers. Existing office dispatch does not yet supply this personal branch. Domain choices cover personal coordination, research/artifacts, executive follow-through and recurring/event-driven work through this same path. The Muse layer supplies personal context and presentation; it does not own a second scheduler, tool loop or result ledger. A time/event observation can make existing work eligible but cannot renew grants, duplicate intent, or close the goal.

Before dispatch, exact proposals, decisions, durable attempt reservation, current authority and uncertainty recovery MUST conform to L-W03–L-W06. The current worker's ability to call an operation alone is insufficient. If that shared enforcement boundary is unavailable, retain a specific waiting/refused condition; do not bypass it with a direct provider call, shell invocation or model-selected credential.

## Human control and receiving results

**L-I06 — Decisions, corrections and cancellation.** A `decision` payload names the exact proposal reference/digest, disposition and requested validity; the boundary binds the deciding principal and validates their authority under L-W04. Display the actual destination, disclosed information, intended effect, cost/resource limits and validity in ordinary language. An edited proposal cannot inherit an earlier approval. Denial or withdrawal prevents subsequent dispatch within its scope and does not erase prior effects.

A `correction` payload names the prior context/intent reference, replacement claim or requested use restriction, and supporting references. Preserve the old source and causal correction; regenerate affected proposals under current constraints. Do not equate correcting personal context with deleting unrelated evidence or legal retention obligations. A `cancel` payload names an exact intent and a reason; it stops later eligible work, preserves uncertain/committed effects, and reports any separately authorized compensation needed. The UI never represents cancellation as successful completion.

An `assessment` payload names the persisted result proposal reference, accepting/rejecting disposition, and evidence/receiving observation. The authenticated receiver and applicable authority are independently established. Apply L-W07's exact result/intent/assignment correspondence: personal proposals cite the persisted `PersonalWorkAssignment@1` revision and verify its owner, provider, receiver and scope; institutional proposals cite their real allocation/delegation. A personal result cannot satisfy an office allocation or vice versa. The shared result-proposal and discharge transformations must admit these explicit alternatives without defaulting a missing allocation to personal authority. Receiving assessment resolves the assignment and result as they stood at committed execution and independently checks current receiver authority. Later assignment/allocation revocation blocks new execution but does not erase or bar assessment of the already committed result. A producer's fluent answer, successful tool status or self-assessment cannot substitute for the required receiver.

**L-I07 — Human projection.** The work view shows the person's request, current receiving condition, meaningful progress, any needed decision, uncertainty and available results. It distinguishes intent disposition, attempt progression and receiving assessment rather than collapsing them into a single status. Internal keys, blockchain details and operation schemas are available as supporting provenance where useful, not prerequisites for ordinary use. Users can return to work from its stable reference after a restart or date change.

An artifact is offered only after its content identity, access, representation and relation to the request are established. Opening/downloading it is authorized independently of knowing its identifier; no private storage path appears as a link. Notification delivery is a separately admitted effect governed by the person's preferences and applicable destination grant. Unchanged observations do not trigger repeated notifications.

## Surface and network boundary

**L-I08 — Existing server, authenticated operations.** Compose the application on MetroPlat's existing operation and HTTP mounting facilities. Personal commands, work queries and artifact resolution go through witnessed dispatch and their scoped authorization contracts. A generic resource handler that merely receives a filesystem binding MUST NOT read private journal data or mutate work outside that boundary. Shared static presentation may be reused; the public information site remains separate from authenticated personal operation.

The present gateway-asserted subject mechanism may supply identity only behind an operator-admitted authenticating gateway that strips untrusted identity headers and protects its gateway credential. That credential never enters page JavaScript or model context. Missing/invalid identity cannot fall back to a privileged personal process actor. Local development may bind a single explicitly admitted actor to an isolated loopback fixture, labeled as such; that does not establish production user isolation. The deployment and fabrication orders must close gateway/session, request-origin protection and credential custody before a personal interface is exposed remotely.

The existing `/v1/chat/completions` guest inference ABI is not a substitute for L-I02–L-I07. Returning generated text through that route does not establish durable personal intent, work authority or receiving acceptance. Reuse inference encounters internally where appropriate; do not label their terminal messages as completed personal work.

## Receiving observations required before acceptance

Exercise an ordinary research/artifact request through authenticated intake, retained intent, admitted work, a usable artifact and independent receiver assessment. Observe recovery after disconnect/restart and across a date boundary against the same journal. Demonstrate one admitted intent for concurrent identical retries and refusal for changed bytes under the same request identifier.

Use a second principal/context to establish refusal before private reads, inference or writes. Show that retrieved instructions and caller-supplied identity cannot create authority. Exercise a consequential proposal, attributable approval, changed/expired/withdrawn authority before dispatch, and an uncertain result that waits for reconciliation without repeating the effect. Inspect the actual receiving system or artifact, not only a projection or test count.

Preserve an institutional allocation/receiving workflow while demonstrating a personal request without invented institutional roles. Remove obsolete private notebook/worker/status routes only when the surviving path retains their useful information and consumers. A functioning worker step or intake-only demonstration leaves the full assistant objective unmet.

## Source observations and fabrication closure

The following are current migration observations, not the design's authority. The app exports an assigned-worker step and a missing HTTP resource module. The shared server binds that step to its configured worker principal and exact assigned cell. Structured intent already appends obligation observations to the journal. The journal offers causal subject/territory reads and exact artifact reads; callers remain responsible for authorization. The HTTP gateway assertion is separate from resource handlers, and the chat-completions route serves inference encounters.

Downstream orders must close: canonical command/retry admission and durable uniqueness; personal versus institutional allocation authority; shared effect reservation/reconciliation; authenticated context/query/artifact boundaries; personal view rendering and accessible decision interaction; and full application composition/retirement. These are dependent implementation obligations, not reasons to fabricate a partial notebook or repair the missing HTTP export in isolation.

Inspected migration sources:

- [app](../../../../../apps/muse-assist/src/operations.mjs), SHA-256 `f8354c81638e53e5e5d207d40bf755f631aafea0f5d9219a141394f32f4b1c6b`.
- [server](../../../../../apps/metroplat/scripts/metroplat-serve.mjs), SHA-256 `e070ac1e6084628405f1bcfe9e9fe0a8290a4949d380cf42f82b91e01acb3687`.
- [http-identity](../../../../../apps/metroplat/src/http-options.mjs), SHA-256 `897aac3d77f0291eb65d7a506883e5f1d2fbf160a4af177e5e4cdfe7d435f377`.
- [http-dispatch](../../../../../apps/metroplat/src/http/server.mjs), SHA-256 `8c9b6d7c7fa2b27e7da3a4df73d349c4d45c7417dcd37e6e3bfd1a1bd3bc390d`.
- [chat](../../../../../apps/metroplat/src/http/openai-chat.mjs), SHA-256 `5cadb45150cb764cbd65ae3a99343e576ab6892bad0498fa9c068f1c66351e15`.
- [intent](../../../../../../../apps/feltos/src/work/structured-intent.mjs), SHA-256 `0a058e26ebef05201c7c92d960e779ef9399aaf32cda77980ddca7f213001f5e`.
- [journal](../../../../../../../../../../../../../apps/computer-system-engine/src/journal/journal.mjs), SHA-256 `c3a3f9ca1146abee9c06e03e411c09036c37c45fb0924350d305e880acdb72b9`.
