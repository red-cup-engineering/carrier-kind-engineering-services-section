---
title: Personal request identity and protected journal materialization
date-created: 2026-09-27
type: specification
status: derived LLD; body and authority contracts required before fabrication
derived-from: 2026-09-27-muse-assist-personal-interaction-lld.md
derived-from-sha256: cc8bab68371f5b7e3e69a89c7ad3c9fcc0ffe631e600222f23f9b40f8e61f048
---

## Effect and derivation

A person can resend the same request after interruption and recover the first admission while the host checks permission afresh. Changed request content conflicts. The carrier remains the owning causal journal: one immutable input fact, its causal creation evidence, and a current resolver decision. Preserve the exact wire identity, original observation time and durable closure. Eliminate the need for a second request ledger, an application retry cache, or an unlocked read followed by a separately protected append.

This refines L-I01–L-I03/L-I06, L-J01–L-J07, L-C02/L-C03/L-C09/L-C13 and L-D02–L-D06. It does not weaken the exact command comparison in L-J03 or confer execution rights on admission. It selects the missing mapping between the personal body and the common unique command; the existing generic adapter remains valid for callers supplying complete wire commands.

The predecessor bindings below are normative derivation inputs. They distinguish this design from merely preserving the current implementation.

| Predecessor | SHA-256 |
|---|---|
| [2026-09-27-muse-assist-personal-interaction-lld.md](2026-09-27-muse-assist-personal-interaction-lld.md) | `cc8bab68371f5b7e3e69a89c7ad3c9fcc0ffe631e600222f23f9b40f8e61f048` |
| [2026-09-27-muse-assist-journal-admission-lld.md](2026-09-27-muse-assist-journal-admission-lld.md) | `0ce36f3f5d8bbe4b79660d4d9ee8cda94f9861494fc2831c79441e66d283ab0a` |
| [2026-09-27-muse-assist-context-admission-lld.md](2026-09-27-muse-assist-context-admission-lld.md) | `7a49df1b99749428a5974b08b46e1062df03241bc86fe196903161329259f3e9` |
| [2026-09-27-muse-assist-protected-domain-admission-lld.md](2026-09-27-muse-assist-protected-domain-admission-lld.md) | `9de06dbde71df07dc4748f0378a9571c52677f7c2307181a82691afa2a150962` |

## L-IM01 — Three identities with distinct purposes

The client body is the six-field L-I02 object: context, requestId, conversation, replyTo, kind and payload. Its version is fixed by the installed operation's domain contract and the version-1 interaction mapping; do not insert a seventh client field or infer a version from arbitrary payload content. Decode and snapshot the bounded body with shared canonical JSON before private journal access. Full variant validation remains mandatory. Canonical equality, including array order and exact strings, governs same-body retry. JSON member order and transport whitespace are not semantic changes. No trimming, Unicode normalization, inferred text replacement or default injection changes the admitted body.

The retry slot is the existing shared L-J02 tuple, with the deployment journal, domain interaction, and key {context: body.context, principal: authenticatedPrincipal, requestId: body.requestId}. Obtain principal from the prepared invocation's current authenticated call capability. It is not a property of the body, worker, model response or stored original. Context/journal association must be admitted before access to the slot. Reuse the shared slot derivation; if its current private helper must be exposed for this operation, specify and fabricate that change in Code. Do not maintain a second implementation of its encoding or digest in the app or Systems.

The complete wire command is the closed L-J01 object. Its value is exactly the canonical client body. Its subject is the admitted context identifier; per-request and per-conversation views follow the body and causal references within that subject. This gives a stable context subject without creating a second mutable conversation authority. Its key is the key above. Its causes and artifactRefs include the verified creation evidence and typed input dependencies defined below. These additional references participate fully in wire identity. Newly observed time, current resolver grants, RPC invocation identity and transport retry metadata do not get added on every retry.

Changing the mapping version or operation schema cannot silently reinterpret an occupied slot. A source requiring a different interpretation is unavailable for this resolver until an explicit compatible interpretation or migration is admitted. It does not become a vacant key or an invitation to overwrite the original.

## L-IM02 — Exact creation materialization

For a new request, construct one command from the immutable body, authenticated principal, admitted journal/context and the creation evidence established by the domain interpreter inside the protected admission. Use the existing wire constructor and canonical artifact identity; do not invent a personal digest or serializer.

The causes are the ordinal-distinct union of the body's declared typed event dependencies and the admitted creation evidence events. The direct artifact references are the ordinal-distinct union of declared attachment artifacts and any direct creation proof artifacts required by that interpreter. The complete wire and retained envelope must satisfy the existing JSON_RESOURCE_ENVELOPE and configured command/attachment limits before publication. The materializer may sort and deduplicate the projection it constructs; it must not rewrite the client body's arrays or relax the wire verifier's rejection of noncanonical source arrays.

Typed references are exact L-W02/L-J06 objects {journal,subject,event,payload}. The reference's event participates as a cause. Its payload identifies what must be resolved and checked against that event; it is not automatically copied into the direct attachment set. The witness/source closure retains the causal payload. A string resembling a reference inside ordinary text or a replacement claim is not a typed dependency and never authorizes traversal.

The body schema must enumerate dependency positions: conversation and replyTo when nonnull; correction target and supporting references; decision proposal; cancel intent; assessment result and receiving evidence references. Message attachments contribute their declared immutable artifact references. The downstream closed payload contract fixes those field names and exact shapes before source generation; this enumeration alone is not a permissive JSON parser. Expected kinds, full reference correspondence, admitted context and authorized use must be checked by the domain interpreter. A valid digest is neither permission nor proof of the referred fact.

Creation evidence must include the actual context/operation/policy/authority basis that authorized this admission, with existing custody for the authority facts it relies on. The newly submitted request cannot manufacture its own prior grant. Persist this basis once as part of the command's causes/artifactRefs. Only actual declared attachment bodies are carried under the existing verified retained-artifact mechanism; no path/URL fetching or synthetic missing witnesses is permitted.

## L-IM03 — Occupied resolution preserves creation identity

Under the same live owner operation, reverify the occupied record and its correspondence to the expected journal, interaction domain, key, subject and version-1 body mapping. An unsupported or contradictory retained domain representation cannot be used as a creation template. Do not turn that obstruction into absence, silently relabel it as a user conflict, or expose private source bytes.

Independently establish current permission to resolve this retry slot before returning the original reference or a conflict. Current resolver authority can use different evidence from creation. It is retained and checked by the acknowledgment's required closure barrier but is not inserted into the original command. Old creation authority establishes provenance, not current permission. In particular, revocation can refuse an unchanged retry without modifying its original record.

Compare the incoming body's canonical bytes with the original command.value canonical bytes after verifying that the original obeys this mapping. Equal bodies reuse the exact original complete command and its verified commandRef; no field of that command changes. A different body is a personal-key conflict because value is necessarily different under L-IM01. This is a fixed comparison of the entire closed body, not an application callback, text similarity check or subset comparison. Do not suppress changed fields or compare only requestId. The caller of this personal port cannot supply causes/artifactRefs independently; full-wire callers continue to be compared over all wire fields under L-J03.

Do not build a hypothetical replacement wire command for a differing body merely to report this conflict. Combining its new dependencies with the original creation basis can exceed the aggregate wire envelope even when each body is individually valid, and that discarded command has no admission role. The incoming body must pass its own bounded domain contract; its alternative dependencies need only be syntactically valid on the occupied path. A conflict does not require reading, retaining or authorizing their content. Resolve and synchronize the original closure and current resolver authority, as L-D05 requires, rather than treating the rejected candidate as a new admission. A different body can never be existing; an equal body does not authorize reconstruction using new creation evidence.

A successful equal-body result is existing with the original reference and original time. A changed-body result is conflict with only the authorized original reference. Neither outcome writes a replacement, invokes the creation clock, appends a second intent, starts work again, or transfers an effect reservation. A known key, equal body or preserved creation basis cannot bypass a denied resolver decision.

## L-IM04 — One protected operation, shared publication mechanism

The prepared personal action port accepts the closed client body, not a caller-supplied complete unique command or selected creation evidence. It validates and snapshots the body and authenticated association before owner entry. The complete creation command cannot be finalized before that entry because the verified slot and current causal authority determine which creation basis applies.

The selected Systems realization extends the common journal admission implementation with this fixed interaction path. Both complete-wire admission and personal-body admission share the same internal protected publication, closure and result mechanics. Retain the existing complete-wire API's exact comparison and behavior. Do not add a public arbitrary equivalence callback, generic request-driven materializer, second owner, second lock protocol, or Muse-specific persistence implementation.

Within exactly one owner operation: read the slot; choose verified vacancy or occupancy; establish the applicable current domain authority; on vacancy materialize the complete creation command and build the complete record and verify its existing evidence before publication; on occupancy verify the original closure; complete the required durability barrier and return only after the owner has finished successfully. No await, external provider call, unlocked intermediate read, nested owner entry or reacquisition may intervene. Physical concurrent callers must converge on one original source. An unexpected occupied publication follows the occupied rules without reusing creation permission as resolver permission.

The current createUniqueAdmission(...).admit(command) snapshots a complete command before entering its private owner. Calling it after a separate read does not implement this law. The fabrication order must bind the connected internal factoring and concrete personal interpreter before generating it. A fixture callback returning true or a preserved original command obtained out of band demonstrates neither production authority nor this protected personal entry.

Prepared host authority and current-use policy checks remain L-C03/L-C09/L-C13 obligations. Permission to admit or resolve the request is separate from permission to read history, infer, disclose a response, assign a provider or dispatch an external effect. After an await, a new use requires its own current check. Unsupported source/policy/domain contracts refuse rather than falling back to the process actor or generic append.

## L-IM05 — Receiving conditions and fabrication closure

The connected realization must demonstrate:

- First submission and concurrent identical retries retain one original request with one reference and first observation time, including after reopening the journal.
- Changing the current resolver grant while preserving permission still returns existing for the same body; it does not replace the creation basis.
- Changing text, a declared use, conversation/reply reference, typed payload field or attachment under the same key conflicts; unavailable alternative dependencies cannot make the system replace the original.
- Current resolver denial, wrong principal/context, or invalid prepared scope returns no occupied reference and causes no request/work mutation.
- Changed creation authority cannot retroactively allow new execution; assignment and effect boundaries still establish their own current permission.
- Missing/corrupt original closure or failure after possible publication remains unavailable/uncertain, not vacancy; original bytes survive and no duplicate work starts.
- No unprotected read/materialize/reacquire path exists in the mounted consumers; complete-wire callers retain exact L-J03 behavior, including conflict for changed wire evidence.

The recorded counterexample at evidence/2026-09-27-interaction-replay-materialization/observation.json demonstrates why this mapping is necessary. On the installed owner and generic adapter, identical client bodies with different creation causes have the same slot but different commandRefs and correctly conflict. Reusing the original complete command while checking the later resolver evidence returns existing. Both grants in that exercise are fixture assertions, and no production personal intake is exercised. This evidence derives the mapping; it does not accept an implementation of L-IM04.

Generation remains closed until the five exact payload variants and dependency projections, concrete current-use/domain authority interpreter, shared slot interface, internal protected factoring and prepared-host consumers are bound in fabrication inputs. Correction restriction representation and result/assignment receiving correspondence must be closed through their own predecessor laws rather than invented by a source generator. Commit independent receiving observations before generation and preserve original failed candidate evidence. This document closes the identity/materialization decision; it does not claim the complete personal boundary or assistant is ready.
