---
title: Controller-bound MARSH resource admission
date-created: 2026-09-27
type: specification
status: closed behavioral work order; source derivation and independent assessment pending
derived-from: 2026-09-27-muse-assist-work-platform-lld.md
derived-from-sha256: 73251c7d11ba406eee7f2ec19823f874bc8a6a73d38a78ce55ab4f9fb0624139
realization-contract: 2026-09-27-muse-assist-fabrication-lld.md
realization-contract-sha256: b55a7b9cd27054b2e5ddf6a06463409d22a400176f15196ff921d20dac85fff2
---

## Purpose and authority

This work order derives the controller-bound first-admission transformation required by L-P04/L-M01 of the [work-platform LLD](2026-09-27-muse-assist-work-platform-lld.md). It preserves MARSH's useful controlled resource head, compare-and-swap (CAS) update, and event witness. It removes arbitrary-key first admission from a **new contract deployment**. The existing deployed/code identity is not changed by this work order.

This order is limited to generic MARSH EVM admission, its ABI/storage/event compatibility, and the existing reader's compatibility. It does not implement the shared-work body/resolver, write operation, grant resolver, signer, transaction submission or replacement, chain finality, live deployment, or peer acceptance. A settled chain head still means only that this MARSH controller admitted the corresponding digests. These exclusions keep H-O3/L-O3 and L-P03's content/evidence resolution work distinct.

The governing predecessor chain is Customer Demand → Requirements → arc42 → SAS → HLD → work-platform LLD → this order. The LLD's L-P01 fixes the shared relation body kind as `SharedWorkReference@1`, and sharing ID as an unpredictable 32-byte identifier; L-P04 requires key derivation at the contract boundary; L-M01 requires current inputs and affected consumers. The [bounded fabrication LLD](2026-09-27-muse-assist-fabrication-lld.md) governs generation isolation, codemod output, independent assays, and stale-input promotion.

## Recovered contract and consumer effects

The current [MARSH contract][marsh] stores `controller`, `kind`, `content`, `evidence`, `uint64 sequence`, and `exists` in a public `mapping(bytes32 => Resource)`. Its `resourceId` view hashes the tuple `("MARSH", chainid, contract, controller, kind, subject)`. Current `admitResource(resource, kind, content, evidence)` accepts any caller-provided nonzero resource key, then assigns `msg.sender` as controller at sequence 1. `transitionResource` already checks caller/controller and expected prior content, increments sequence once, and emits the accepted transition. The admission gap is that the helper-derived key is not enforced by admission.

The immediate EVM ABI consumer is [resource-read.mjs][read]. Its inline ABI declares only the public `resources(bytes32)` getter; it reads one tuple at a provider-verified Base block boundary and returns block/provider provenance. [resource-operations.mjs][ops] exposes this credential-free read in MetroPlat, registered by [catalog.mjs][catalog]. The reader accepts a raw resource key, does not call `resourceId`, and cannot independently prove the caller/kind/subject derivation. Preserve its present read behavior; do not claim that arbitrary-key legacy results are controller-bound. Resolving a `SharedWorkReference@1` body remains a separate, authenticated off-chain consumer contract.

Recovered EVM/data contracts constrain reuse. [`OnchainDataResource.resourceKey`][data-resource] hashes `abi.encode(string[])` and publishes SHA-256 body digests; it is a distinct public data-resource effect and is not MARSH's identity or digest encoding. The [fixed-block contract identity observation][identity-observation] binds observed runtime code to a verified block and deliberately admits only public read RPC methods. It supplies neither signing authority nor deployment evidence for this candidate. Use the existing Foundry/Solidity toolchain declared by [foundry.toml][foundry]; add no key, RPC, signer, ABI, hashing, or framework dependency for this contract-only transformation.

## Closed wire contract

**F-M01 — Domain and resource key.** The new contract MUST preserve the exact existing derivation expression and types:

```solidity
keccak256(abi.encode("MARSH", block.chainid, address(this), controller, kind, subject))
```

The domain is the exact UTF-8 Solidity string literal `"MARSH"` passed as the first value to Solidity `abi.encode`; encoding is standard ABI encoding, **not** `abi.encodePacked`, `bytes32("MARSH")`, or a pre-hash. `block.chainid` is `uint256`; `address(this)` and `controller` are EVM `address`; `kind` and `subject` are `bytes32`. The helper remains `resourceId(address controller, bytes32 kind, bytes32 subject) public view returns (bytes32)`. The admission controller is always the actual `msg.sender`; no caller-supplied controller parameter may influence admission.

For this work-platform relation only, the application-level `kind` is `keccak256(bytes("SharedWorkReference@1"))`. This is the Keccak-256 digest of the exact case-sensitive UTF-8 schema label, without a prefix, terminator, JSON encoding, or ABI wrapper. The contract remains generic over nonzero `bytes32 kind` and `bytes32 subject`; this fixed relation kind is enforced by the shared-work producer/resolver, not by an application-specific allowlist in generic MARSH. `subject` is the raw 32-byte `sharingId` value, not a hash of its hex rendering or of the underlying personal goal. Producers and readers render bytes32 in lowercase `0x` plus 64 hex digits. A zero subject, kind, content, or evidence is invalid.

Because chain ID and `address(this)` are inputs, a new chain or new contract address forms a different resource namespace. The domain and encoding remain unchanged. A new deployment MUST NOT reuse the old deployment's address or imply that old state was rewritten.

**F-M02 — ABI.** The candidate ABI MUST expose these exact functions and parameter types:

| Function | Required signature and effect |
|---|---|
| `resourceId` | `resourceId(address,bytes32,bytes32) view returns (bytes32)`; same public deterministic helper semantics |
| `admitBoundResource` | `admitBoundResource(bytes32 kind,bytes32 subject,bytes32 content,bytes32 evidence)`; external, caller-controlled admission only; no arbitrary resource or controller argument and no return value |
| `transitionResource` | `transitionResource(bytes32 resource,bytes32 priorContent,bytes32 content,bytes32 evidence)`; same controller-only CAS semantics |
| `resources` | `resources(bytes32) view returns (address controller,bytes32 kind,bytes32 content,bytes32 evidence,uint64 sequence,bool exists)`; same public mapping getter tuple |

The new contract MUST NOT expose `admitResource(bytes32,bytes32,bytes32,bytes32)`. No fallback/delegate route may preserve an arbitrary-key admission selector. A call using the legacy selector against the new direct deployment must fail as an unsupported call. Existing deployments retain their old selector and behavior; this order does not alter their code.

**F-M03 — Admission state transition.** `admitBoundResource` MUST reject zero kind, subject, content, or evidence using the existing `EmptyResourceField(bytes32 field)` error (field tags are the exact bytes32 strings `"kind"`, `"subject"`, `"content"`, and `"evidence"`). It computes `resourceId(msg.sender, kind, subject)` internally, rejects an occupied derived key using `ResourceAlreadyExists(bytes32 resource)`, then writes exactly the current `Resource` tuple with `controller = msg.sender`, supplied kind/content/evidence, `sequence = 1`, and `exists = true`. It emits exactly one `ResourceAdmitted(resource,msg.sender,kind,content,evidence,1)` and performs no additional state write. There is no user-provided key to validate or reserve.

The generic helper may still calculate a key for any typed tuple, but only the derived key of the actual caller can be admitted by this ABI. An attacker who knows another controller's tuple cannot reserve that controller's key by submitting an arbitrary resource value; an attacker may admit the same kind/subject under their own controller, which is a separate key and must not affect the target's resource.

**F-M04 — Transition, event, error, and storage compatibility.** Preserve the existing public `Resource` field order and types, the `resources` mapping name/visibility, and the exact return order of its Solidity-generated getter. Add no storage variable, owner slot, proxy, migration flag, or secondary resource registry. Keep `ResourceAdmitted` and `ResourceTransitioned` event signatures and topic-indexed fields unchanged. Keep the existing errors and their parameter order/selectors: `EmptyResourceField(bytes32)`, `ResourceAlreadyExists(bytes32)`, `ResourceNotFound(bytes32)`, `ResourceControllerRequired(bytes32,address)`, and `PriorContentMismatch(bytes32,bytes32,bytes32)`. Successful first admission keeps sequence 1; successful transition remains one CAS advance and emits the prior head and new sequence. No event is an assertion that its content/evidence bytes are available or semantically valid.

`resource-read.mjs`'s current six-field getter ABI and tuple decoder MUST remain compatible without requiring a change to `resource-operations.mjs` or MetroPlat registration. Its null-for-absent and provider/block provenance behavior remains intact. The raw-ID read API remains a low-level read, not a typed lookup or identity proof. Later resolver work must derive the expected key from an authenticated controller/kind/subject, compare the result's controller and kind, and verify off-chain bytes against `content`/`evidence`; it must not infer those checks from this reader's current success result.

**F-M05 — Namespace migration.** Build and identify this as a new direct contract deployment with its own reviewed address, runtime code identity, and chain identity. No proxy upgrade or in-place storage migration is selected. Old resources remain queryable at the old contract using the existing getter and retain explicitly **unbound legacy identity** status even if their key happens to equal the helper's output. They acquire no new authority or automatic migration. Any future migration must be a separately authorized fresh admission by the actual source controller into the new contract, and must preserve a verified provenance reference; it is outside this work order. The new deployment MUST have no arbitrary-key first-admission route.

## Bounded transformation inputs

The generator receives the public predecessor clauses, this order, the following current files and their exact captured bytes, and the existing compiler/interface information they require. It receives no signer key, live endpoint credentials, private work journal, peer-resolution data, or assessor material. Inputs changed after capture cause stale-input refusal and a newly bound order.

| Input or protected consumer | Captured SHA-256 |
|---|---|
| Work-platform LLD (direct predecessor) | `73251c7d11ba406eee7f2ec19823f874bc8a6a73d38a78ce55ab4f9fb0624139` |
| Fabrication LLD (generation/assay contract) | `b55a7b9cd27054b2e5ddf6a06463409d22a400176f15196ff921d20dac85fff2` |
| [MARSH.sol][marsh] (transformation input) | `10d762d961e1ee86807c65b2d3679cc0add558e63c2aa43a458573d5041b4c87` |
| [test/MARSH.t.sol][solidity-test] (transformation input) | `c618aa39456d14ddd45f8519b0294a2cefd4a4f297ad4dc8fc2e9ff78b6c3bb9` |
| [foundry.toml][foundry] (compiler profile) | `3898856eff7f2855b51f8fdba9d39a297f80c0a9c1f8e614e34efc83ef3a29e8` |
| [resource-read.mjs][read] (protected ABI/read consumer) | `a5c51ad9d344daae8c857e9daea20030fb7ace4d2413bea3781c913a657e80b8` |
| [resource-operations.mjs][ops] (protected public operation) | `7f04869dec8b02bb320547b3212e22332786b8cb08521bad80cbba6af0778ff9` |
| [MetroPlat catalog.mjs][catalog] (protected consumer registration) | `ae1f56615fa1d37adc334d08f9251777c8176e59b911d618f16067ec826926bf` |
| [OnchainDataResource.sol][data-resource] (distinct recovered data contract) | `180a3cad3ddc46c38a533857f9557302969555adcd0ceffeaef8fb26af962ebf` |
| [fixed-block-contract-identity-observation.mjs][identity-observation] (read-only identity evidence) | `24af033a126ef92a122a7118760ab08f8dd75aaa109e707863b6a41dd6cfea31` |

The source toolchain is the existing MARSH package's Solidity `0.8.28`, optimizer enabled with 200 runs and `via_ir = true`. No dependency or workspace manifest change is admitted. The only intended source outputs are replacements to the already existing MARSH contract and its Solidity assay target. No new file, runtime adapter, deploy script, registry entry, or live chain effect is authorized by this order. Read consumers above are protected compatibility inputs and must remain byte-identical unless an independently demonstrated ABI break makes a separately revised order necessary.

Candidate output follows L-F02: a closed JSON object with `disposition`, `reason`, and `edits`; each edit has exactly `path`, `inputSha256`, `before`, `after`, and `clauses`. Candidate edits name only the two existing source/test paths above, match unique exact substrings against the bound input digests, and cite these clauses. A refusal has zero edits and a specific reason. The output is untrusted source; it is not applied to the shared checkout by the generator.

## Public acceptance obligations

The independently held assessor derives executable assays before source generation and evaluates compiled candidate effects, not only text or ABI descriptions. Assays MUST establish:

- The expected key equals the Keccak-256 of the exact standard ABI encoding in F-M01 for the actual chain ID, new contract address, actual calling controller, kind, and subject; changing any one of those inputs changes the expected identity.
- First admission by controller A writes only `resourceId(A,kind,subject)`, sets the exact six getter fields and sequence 1, and emits exactly one correctly indexed `ResourceAdmitted` event. Repeated admission of that tuple refuses with `ResourceAlreadyExists` and leaves state unchanged.
- Controller B cannot front-run or reserve A's derived key through any new-contract ABI path. B's admission with the same kind/subject, if allowed, affects only `resourceId(B,kind,subject)`. The old arbitrary-key selector is absent and cannot mutate the new deployment.
- Zero kind, subject, content, or evidence refuses with the specified field tag. Existing caller-only transition, stale-head refusal, sequence increment, getter shape, and event fields remain correct.
- A reader compiled from the protected current `resource-read.mjs` continues to decode an admitted candidate resource at one verified block and to return null for a missing resource; this proves getter compatibility only. It must not be presented as proof of off-chain content availability, controller authority, or receiver acceptance.
- A legacy deployment fixture remains readable under its old ABI/key behavior; candidate migration neither changes nor silently re-labels it. A new deployment has a distinct contract identity and derived resource key namespace.

Assays must use isolated local EVM accounts and an ephemeral fixture only. Evidence records candidate/input/assay digests, compiler settings, method, environment, assessor, observed calls/storage/events/reverts, and limits. Structural validation, compilation, passing inherited tests, or a local fixture does not establish live deployment, signer custody, resolver authorization, content validity, chain finality, or an accepted external work effect. Those remain separate contracts.

## Remaining boundary

The current SHA-256 and content-body canonicalization for `SharedWorkReference@1`, access-control rules for its resolver, relation-state transition checks, controller-grant verification, transaction signing/reconciliation, code-identity deployment evidence, and live finality policy are not fabricated here. L-P03/L-P05/L-P06 and L-O1/L-O3/L-O4 govern their own subsequent work. The work order closes only the deterministic contract-level identity/admission behavior and its existing read ABI compatibility.

[marsh]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/src/MARSH.sol
[solidity-test]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/test/MARSH.t.sol
[foundry]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/foundry.toml
[read]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/src/resource-read.mjs
[ops]: ../../../../../../../../../../../../computer-blockchain-system-services-section/apps/multi-agent-resource-sharing-host/src/resource-operations.mjs
[catalog]: ../../../../../../../../../../../../agent-computer-system-engineering-services-section/services/multi-agent-computer-system-engineering-services-section/services/multi-agent-computer-platform-engineering-services-section/services/agentic-enterprise-computer-platform-engineering-services-section/apps/metroplat/src/catalog.mjs
[data-resource]: ../../../../../../../../../../../../computer-blockchain-system-services-section/services/ethereum-engineering-services-section/services/smart-contract-services-section/services/onchain-data-resource-service/src/OnchainDataResource.sol
[identity-observation]: ../../../../../../../../../../../../computer-blockchain-system-services-section/services/ethereum-engineering-services-section/src/fixed-block-contract-identity-observation.mjs

Protected-consumer recapture: the concurrent MetroPlat catalog revision retains the EVM MARSH resource operation import/registration and also registers a separate Hive Engine resource family. Both registrations are protected. This contract-only order changes neither the catalog nor the other resource family. The stale original catalog digest caused source generation to refuse before invocation; the digest above binds the inspected current consumer.
