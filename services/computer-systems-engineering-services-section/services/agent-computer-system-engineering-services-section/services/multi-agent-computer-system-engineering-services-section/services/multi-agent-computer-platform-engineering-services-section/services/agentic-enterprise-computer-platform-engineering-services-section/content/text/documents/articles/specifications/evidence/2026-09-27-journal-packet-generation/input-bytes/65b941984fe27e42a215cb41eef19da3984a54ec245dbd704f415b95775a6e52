---
title: Pure journal packet construction and resolution
date-created: 2026-09-27
type: fabrication specification
status: closed pure dependency order; host integration and historical migration pending
derived-from: 2026-09-27-muse-assist-journal-operation-lld.md
derived-from-sha256: 04ffd32846d299e1bd7f38fee4b79c1cf2f4d21bdbc7a583136632cb64f76e0a
---

Realize L-O19 through the existing source-patchset fabrication contract and L-F01–L-F07 isolation/independent receiving. This order creates only `src/semiotic-eavt/journal/packet.mjs` under the existing Code section. Its sole exports are journalPacket and resolveJournalPacket. It grants no package-export, host, source-retirement or application change. The Code module is a dependency of the connected storage realization, not an independently operational packet service.

## F-K01 — Exact constructor

Implement journalPacket(value) exactly as L-O19. Use addressArtifact(value) for bounded canonical snapshot/content identity; its result is {ref,canonical:{value,text,byteLength}}. The output artifact is exactly {ref,canonicalText:canonical.text}. Its reference is exactly the L-O19 shape and uses canonical.byteLength and sha256Hex(canonical.text). The existing SHA function hashes UTF-8. Explicitly freeze the newly constructed outer/reference/artifact records. Do not JSON-stringify input before bounded canonicalization; JSON.stringify could invoke accessors/toJSON or lose unsupported values. No told/seat/event/admitted/durable properties are manufactured.

## F-K02 — Exact resolution and failure separation

Implement resolveJournalPacket(reference, resolveArtifact) exactly as L-O19. Validate/snapshot the reference with canonicalizeJson(reference, JSON_RESOURCE_ENVELOPE) before property access, check its exact own keys, discriminants, artifact syntax with isArtifactRef, lowercase 64-character hexadecimal digest, nonnegative safe-integer byte count and resolver function. Malformed references invoke no resolver. Invoke the resolver once outside any catch that rewrites validation failures. Then validate its returned record through the F-K03 descriptor boundary, require the exact two keys and string types, matching ref, verifyArtifact(ref,canonicalText), exact canonical.text equality, SHA-256 and byte count. Return the verified canonical.value. Use explicit null/undefined checks for missing evidence so valid falsy JSON bodies still resolve. Any resolver-thrown value must escape unchanged, including a TypeError that happens to resemble a codec failure; do not classify it by its code/name.

## F-K03 — Resource, purity and diagnostic boundary

Use the existing JSON_RESOURCE_ENVELOPE, without locally duplicating, reducing or expanding its limits. The scalar canonicalText field of a resolver pair is an existing bounded transport representation: validate the pair's descriptors/shape/types without routing the whole pair through a JSON snapshot that would apply maxStringBytes to the encoded body. Otherwise a valid canonical JSON object near maxCanonicalBytes could be created and then become unresolvable. Read only own data descriptors, reject accessor/extra/symbol properties, exotic prototypes and thenable results without invoking accessors; pass the exact text to the bounded artifact verifier. For reference and input JSON, use the existing canonicalizer. Do not mutate arguments. Fixed diagnostics must not echo values and must use L-O19's two codes; normalize only codec/shape errors produced inside pure validation. Trusted resolver failures escape untouched.

Allowed direct imports are `../identity/index.mjs` (addressArtifact, verifyArtifact, isArtifactRef), `@red-cup-engineering/json-services-section` (JSON_RESOURCE_ENVELOPE, canonicalizeJson), and `@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity` (sha256Hex). Node builtins already used inside verified pure dependencies are not authority to add new host effects. No other direct import, dependency installation, dynamic import, eval, Function constructor, process/environment access or host IO is authorized.

## F-K04 — Fabrication and receiving

Bind exact public specifications/API source bytes, absent target, dependency closure, output schema and private receiving commitment before invoking the isolated requested GPT-6 Luna provider. Give it no tools, checkout, private fixtures or prior private receiving feedback. Validate the returned source-patchset and stage mechanically; never fill in source or hand-repair a rejected candidate. Assess against the actual admitted canonical/artifact primitives in a network-denied namespace. Observe L-O19's successful effects and refusal distinctions, especially non-ASCII byte counts, large canonical bodies without a giant original JSON string, accessor refusal and arbitrary thrown resolver values. Review source and recheck all bound source hashes/target absence before promotion. Acceptance of these two pure functions leaves historical correspondence, scope ownership, durable storage, actual consumers and full assistant acceptance open.
