---
title: Closed personal interaction bodies and their domain obligations
date-created: 2026-09-27
type: specification
status: derived LLD and structural schema; runtime validation and domain enforcement unaccepted
derived-from: 2026-09-27-muse-assist-personal-interaction-lld.md
derived-from-sha256: cc8bab68371f5b7e3e69a89c7ad3c9fcc0ffe631e600222f23f9b40f8e61f048
refines: 2026-09-27-muse-assist-interaction-materialization-lld.md
refines-sha256: ae611bb8b9308b7c2b1ab1202e25dd8ddc67357a42dea220c138ba0f11a15b90
---

## Scope and ancestry

This closes L-I02/L-I06's five client payloads under L-IM01–L-IM05. Messages become attributable input; corrections control use without erasure; decisions refer to exact effects; cancellation stops subsequent eligible work; an independent receiver assesses the exact persisted result. All are facts in the existing causal journal, not entries in an application-owned transcript, status ledger or approval database. Reuse the prepared boundary, canonical JSON, immutable references, existing unique admission and shared work/effect regulation. No new scheduling or authority service is selected.

The structural contract is [interaction-body.schema.json](2026-09-27-muse-assist-interaction-body.schema.json), SHA-256 7c2ba3acd59a1a559aaad70f68359f20042d92e5549fe0c841c9303321b7b22e. That schema and the semantic laws below form one admission contract. Schema success alone is insufficient. This refinement follows R-03/R-04/R-06 through H-I1–H-I4 and the following exact LLD inputs:

| Predecessor | SHA-256 |
|---|---|
| [2026-09-27-muse-assist-personal-interaction-lld.md](2026-09-27-muse-assist-personal-interaction-lld.md) | `cc8bab68371f5b7e3e69a89c7ad3c9fcc0ffe631e600222f23f9b40f8e61f048` |
| [2026-09-27-muse-assist-interaction-materialization-lld.md](2026-09-27-muse-assist-interaction-materialization-lld.md) | `ae611bb8b9308b7c2b1ab1202e25dd8ddc67357a42dea220c138ba0f11a15b90` |
| [2026-09-27-muse-assist-context-admission-lld.md](2026-09-27-muse-assist-context-admission-lld.md) | `7a49df1b99749428a5974b08b46e1062df03241bc86fe196903161329259f3e9` |
| [2026-09-27-muse-assist-work-platform-lld.md](2026-09-27-muse-assist-work-platform-lld.md) | `73251c7d11ba406eee7f2ec19823f874bc8a6a73d38a78ce55ab4f9fb0624139` |
| [2026-09-27-muse-assist-effect-transition-lld.md](2026-09-27-muse-assist-effect-transition-lld.md) | `96481ccf6793850638af31053fc86b6b722c102fbadcda796f15261a58fc2606` |

## L-IB01 — Body, references and canonical projection

The body contains exactly context, requestId, conversation, replyTo, kind and payload. Its version belongs to the installed operation domain contract and version-1 mapping, not a seventh body field. Context/requestId and Ref.journal/subject obey the exact shared 1–512 Unicode-scalar identifier law. Use the existing bounded canonical JSON admission for the entire body, full wire command and retained envelope; schema character/array limits do not replace byte, depth, node or aggregate bounds. Reject non-JSON values, nonfinite numbers, accessor/prototype material and unpaired surrogates according to that shared contract. Preserve text, case, whitespace, Unicode and array order as submitted; no default insertion or interpretation rewrites retry identity.

Ref is exactly {journal,subject,event,payload}. event and payload must pass the existing artifact-reference validator. Reference syntax does not prove kind, correspondence, access, current authority or retained bytes. The protected interpreter verifies all four fields against the actual referenced record and expected role. References used by this initial profile resolve within the context's admitted owning journal. Cross-context or external evidence first requires an authorized import/disclosure preserving provenance; it cannot silently become a traversal through a client reference. Ref.subject must match the actual record and need not equal the context id for non-interaction work records.

conversation and replyTo are either both null or both exact Refs. Both null starts a conversation whose anchor is this command's eventual admission reference; it does not create an extra conversation record. Either a message or a targeted control command can start a conversation, but its targeted payload references still resolve independently. Otherwise conversation refers to an admitted root interaction with both fields null, and replyTo refers to an admitted interaction in that same conversation. A copied identifier or a reference into a different conversation is invalid. The relation is verified from retained causal facts; no mutable conversation registry is introduced.

supporting/evidence Ref arrays are distinct and sorted by ordinal comparison of their shared canonical UTF-8 representations. Reject a duplicate or noncanonical array; do not silently reorder a compared body. Attachment order is preserved, and identical artifact/use pairs are forbidden while the same artifact with distinct declared purposes is allowed. The inference-purpose list is a distinct subset in the fixed order interpret-request, plan-work, produce-result. These ordering laws require pure semantic validation beyond JSON Schema uniqueItems.

The exact direct event dependency projection is conversation.event and replyTo.event when present, plus correction.target.event and supporting[].event; decision.proposal.event and, for withdraw, approval.event; cancel.intent.event; or assessment.result.event and evidence[].event. The only client-declared direct external artifacts are message attachments[].artifact. Deduplicate and ordinal-sort these projections for the wire without altering the body. Creation authority may add verified proof causes/artifacts under L-IM02. Ordinary strings or JSON-shaped objects inside text, claim or observation are not additional reference positions.

## L-IB02 — Message

payload is exactly {text,attachments}; each attachment is {artifact,use}, where use is one of interpret-request, plan-work or produce-result. At least one text character or one attachment is required. Whitespace is preserved and is not silently replaced by a guessed request. An empty attachment-only text is allowed. A syntactically valid message may still require clarification before it becomes actionable intent.

The context interpreter verifies retention permission, each attachment's immutable representation, applicable current read/use scope and configured aggregate byte bounds before new admission. Count each distinct verified representation once while preserving its declared purposes in the input. An artifact can only be used for its declared purpose intersected with current context/provider authority and inherited restrictions. Merely uploading or referencing an artifact is not an all-provider disclosure grant. No server path or arbitrary URL is fetched as an attachment. Request admission returns a reference; subsequent interpretation, work assignment, artifact access and response disclosure each retain their own authority boundary.

## L-IB03 — Correction and future-use control

payload is exactly {target,change,supporting}. target is an exact prior context-claim or intent reference the authenticated participant is currently authorized to correct; a broad read permission, provider identity or ownership label is not enough. supporting is the bounded Ref array above and may be empty. It adds evidence, not grants. Preserve the old source, contradiction and correction relation.

change is exactly one of:

- {kind:"replace-claim",claim:JSONValue}. The structured replacement is a new attributable claim. It does not overwrite old bytes, settle independent contrary evidence, expand authority or lift an existing use restriction. Projections and proposals that depended on the old claim must retain the correction and regenerate or report unresolved conflict before further use.
- {kind:"restrict-use",restriction:{kind:"withhold-from-work"}}. Withhold the target and material derived from it from subsequent operational context selection, inference, planning, execution and delivery/disclosure, including artifacts and notifications. This does not erase already sent information or discharge uncertain effects. Minimal retained accountability evidence, authorized inspection of the history/restriction, and separately authorized reconciliation of already committed or uncertain effects remain governed by their own purpose and least necessary disclosure; those are not a bypass for new work.
- {kind:"restrict-use",restriction:{kind:"deny-inference",purposes:[...]}}. Block inference use of the target and derived material for the selected nonempty subset of the three L-C13 purposes. This expressly does not promise a ban on other channels. All other uses still require their normal authority and restrictions. Unknown inference purposes remain unsupported under L-C13.

Restrictions combine conjunctively and follow dependencies into mixed-source derivations. Adding unrestricted material, summarizing, caching or changing a source-class label cannot launder a restricted source. Missing dependency/restriction evidence is an obstruction to use. A replacement claim does not implicitly remove a restriction on the original source or dependent work. Lifting one requires a separately specified, attributable current-authority revision naming that restriction; this version has no lift field, implicit expiry or deletion shortcut. Unsupported restriction interpretation must refuse the relevant operation rather than acknowledge an enforcement claim it cannot satisfy.

The shared current-use interpreter checks restrictions at the relevant admission/reservation boundary and before each new use after an await. A correction is not claimed to be atomic with an external effect or ordinary fact concurrently admitted elsewhere. Already committed/uncertain effects retain their actual outcome and reconciliation duties. The work view must show when a restriction blocks subsequent work and distinguish retained history from permitted future use. Exact correction authority, dependency folding and every affected consumer must be bound and accepted before mounting this control.

## L-IB04 — Exact decisions and requested validity

There are three closed payload variants:

| Disposition | Exact payload |
|---|---|
| approve | {proposal,disposition:"approve",validity:{notBefore,notAfter}} |
| deny | {proposal,disposition:"deny",validity:{kind:"from-admission"}} |
| withdraw | {proposal,disposition:"withdraw",approval,validity:{kind:"from-admission"}} |

proposal is the exact persisted closed effect proposal Ref. Its payload field is the governing proposal digest; do not add a second independently writable digest. For withdraw, approval is an exact prior admitted approve decision for this same proposal. Verify proposal identity, revision, intent/assignment, intended operation/input, destination/disclosure, limits and receiving scope under L-W03/L-W04. The deciding principal and authority come from the boundary, never a payload field. Withdrawal requires authority to withdraw the named approval; denial requires actual authority to refuse that proposal. These rights cannot be inferred from the ability to submit text.

Approval's notBefore/notAfter are real UTC instants in the shared exact YYYY-MM-DDTHH:mm:ss.sssZ form, with notBefore strictly earlier than notAfter. The interval is half-open. A future start is allowed; an end at or before observed new admission is invalid. The requested interval must be within the applicable proposal/grant scope; do not silently widen or clip it. A valid body alone is no promise to dispatch later. Execution checks current grant, decision, time, exact proposal and all shared reservation/precondition laws again. Do not require the client to guess the server's future admission timestamp.

For deny/withdraw, from-admission requests immediate durable retirement rather than an expiring prohibition. The actual effective lower bound is the original L-J04 observed admission time, with no upper expiry for the retirement fact. Retries preserve that time. These events do not grant indefinite rights: denial invalidates earlier affirmative authority covered by this authorized refusal for this exact proposal; withdrawal retires the named approval. Passing time, expiry of another decision, reopening a process or sorting by timestamp cannot revive a retired approval. A later legitimate approval is a fresh attributable decision under current authority and must causally resolve the applicable refusal/withdrawal; it is not a search backward for an older unexpired approval. Incomparable/contradictory applicable decisions require resolution rather than an arbitrary latest-clock winner.

The concrete authority interpreter binds the applicable causal decision frontier and retirement relations; the creation evidence records that basis. Referring to the same proposal is not sufficient proof of succession. L-E's effect boundary rechecks the then-visible decisions/grants before reservation/send, preserving its stated concurrency limits for ordinary facts. This contract does not claim an atomic snapshot of external grants or all concurrent journal facts. Neither denial nor withdrawal asserts that a committed or possibly sent effect did not happen; retain its outcome/uncertainty and separately authorized reconciliation.

## L-IB05 — Cancellation

payload is exactly {intent,reason}. intent is the exact persisted intent Ref and reason is a nonempty bounded string, preserved verbatim. Verify current authority to stop this intent and its relationship to the context and assignments. The client supplies no successful-completion state, worker identity, cancellation verdict or compensation command.

Admission records the authorized cancellation request. The common regulator/effect control path prevents later eligible work and retires outstanding reservations where lawful; the receipt itself does not claim a racing send was prevented. If an effect may already have been sent, show that uncertainty and preserve its attempt. Compensation is a different authorized effect. Cancellation does not erase results, override independent receiving, or fulfill the original intent. Changed cancellation text at the same retry key conflicts under L-IM03.

## L-IB06 — Independent assessment

payload is exactly {result,disposition,evidence,observation}. result is the exact persisted result-proposal Ref, not a bare artifact digest or latest status. disposition is accept or reject. evidence is the bounded Ref array and observation is a bounded JSON value interpreted by the result's declared receiving predicate. It may express human observation; its shape or assertion is not independent proof of satisfaction.

The boundary independently establishes the receiving principal and current receiving authority. Resolve the proposal's exact result identity, execution, intent, committed assignment/allocation revision, producer and receiving predicate. For personal work verify the persisted PersonalWorkAssignment@1's owner, provider, receiver and scope; for institutional work verify the real allocation/delegation. Never infer personal authority from a missing institutional allocation. The provider and required independent receiver differ. Schema-valid evidence or a producer's success flag cannot create that separation.

Evaluate the declared receiving predicate against admissible evidence/observation and preserve what was actually observed. An assessment command is an input to shared receiving/discharge, not a client-set task status. A reject assessment leaves this result unaccepted; it does not automatically cancel the intent or erase the result. Later execution-authority revocation cannot erase or prohibit an otherwise authorized assessment of the already committed result. Unavailable historical correspondence or current receiving authority obstructs assessment rather than manufacturing success or a negative fact.

## L-IB07 — Enforcement and fabrication receiving

Pure body admission must enforce the structural schema, exact JSON/resource/identifier/reference/time laws, ordered sets, nonempty message and withdrawal shape before private reads. Real-instant and interval-order validation must accompany the timestamp pattern. At this stage it cannot establish reference existence, attachment custody, permission, decision succession, restriction enforcement or receiving truth. Keep these failures separate from protected domain results and unavailable storage.

On verified vacancy, the protected domain path resolves the newly submitted typed dependencies, authority, policy and required bodies before publication. On occupancy, follow L-IM03: validate the incoming bounded body, authorize resolution, compare the complete body and synchronize the original closure/current authority. A changed candidate need not resolve its alternative dependencies to return conflict. No second intent or domain action follows merely from existing admission.

Before generation, commit independent observations for every branch and malformed cross-branch payload, injected identity/authority/version/path fields, resource excess, noncanonical sets, wrong reference kind/context/digest, mismatched conversation root/reply, unavailable attachments, attachment-use restrictions, denied correction authority and inherited restriction propagation through cached/mixed-source outputs. Exercise exact-proposal decisions, malformed/expired/future intervals, current-grant refusal, wrong approval withdrawal, retirement without old-approval revival, cancellation versus already sent work, and independent receiving with wrong result/assignment/provider identity and later execution revocation. Distinguish pure structural observations from real source/domain effects; no schema pass proves personal isolation or an operating assistant.

The payload representation and projections are closed by this document. Concrete authority/decision/restriction interpreters, exact proposal/assignment/result carriers, protected admission factoring, prepared host consumers and user-facing receipt/projection semantics still require bound fabrication and independent acceptance. Source generation must not invent those missing authorities or convert these obligations into permissive callbacks. This is a specification for the existing capability family, not acceptance of a smaller message-only application.
