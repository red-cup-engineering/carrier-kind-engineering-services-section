# Operation and SEN specification correction

This corrects the existing active CSE operation/SEN specification to its existing Computer Data and Computer Code owners. It does not introduce a language, codec, operation adapter, or execution path.

## Authorities and preserved identities

- Computer Data owns SEN grammar, structural validation, types, typing and JSON boundary descriptors. Its public `semiotic-expression-notation` entry exports `TmSchema` and `TySchema`; their definitions are derived from the owner's form declarations.
- Computer Code's `typed-operation` entry owns core operation admission and execution. The checked source baseline is Code `a098c977b54b27118b6af408c734f65286220dfc`; Data is `737c8ce9d7a0c33ee77412b783534da35f27d319`.
- The computer-engineering specification ID, existing schema IDs, core normalized operation `version: 1`, and specification-document `version: 1` are preserved. This is a correction to descriptions and structural envelopes of those existing implementations, not a new wire-version rollout. No runtime record is rewritten.
- The superseded CSE source remains recoverable at CE `b1cdbb09b06beef7e822e96228f2c55f9e47f02d`, CSE subtree `0b157b9e3ee2635ba0407887ae391292baa70dbb`. Historical object-term schemas are not retained as an alternative active SEN grammar. Consumers depending on those erroneous structural promises need explicit review; this correction does not promise their compatibility.

## Explicit source schema graph

`sen-term.schema.json` refers to the Data-owned `TmSchema` ID. CSE's specification module supplies `COMPUTER_ENGINEERING_SEN_SCHEMA_REFERENCES`, containing the actual `TySchema` and `TmSchema` objects. It does not copy their definitions or declare an ambient schema registry.

Compile a closed graph containing the desired CSE root, the CSE SEN-term reference document, and those owner references through the existing `schemaFromGraph` API. Include each schema once under its own `$id`. Local CSE term references use the existing absolute schema ID, avoiding ambiguity between public document addresses and evaluator-local addresses. Bare owner IDs require the explicit owner graph; a standalone downloaded CSE JSON document is not a self-contained language definition.

## Structural validation is not core admission

The operation schema describes the JSON carrier envelope of Code-admitted operations: specification, normalized version, ID, optional description, Data type-object domains/codomains, effect-name array, and SEN or capability-effect body. A SEN body carries the canonical term plus both boundary descriptors. Additional body metadata is permitted because current Code admission preserves it.

Domain/codomain declarations are opaque object carriers: this structural schema declares no fields, identities, parents, references or provenance for them. Boundary descriptors are also opaque objects. No separate type-provenance or descriptor grammar is defined here. Passing structural validation cannot establish a Data type, compatible type declarations, the SEN arrow judgment, executable authority, or permitted effects.

Use the existing Data declaration/admission and Code `admitOperation` gates. Execution must still use the existing execution/effect admission. A serialized copy of an admitted type object can pass this schema while correctly failing Code admission because it was not established in the receiving Data type system. A structurally present descriptor or syntactically valid term can likewise fail the owner semantic checks. These are expected distinctions, not reasons to add another local validator.

## RPC descriptors remain their existing projection

CSE RPC declarations and descriptors are not core Code operation records. RPC carries verbs, wire formats, schema graphs, operation references, effect classifications and host/SEN/addressed-JSNode selection. Core operations carry admitted Data type declarations, effect-name grants, and SEN/capability-effect selection.

RPC uses Code `createOperationExecutor` for schema pre/postcondition execution; that helper is not `admitOperation`. Sharing that helper does not equate the records or confer core effect grants. `ProgramSchema` describes the thinner `metroplat.program` presentation, not either core operations or the complete RPC descriptor. The existing RPC persisted descriptor also omits optional input/output SEN descriptors carried by an in-memory action. No lossless conversion or authority-preserving adapter is claimed.

This specification correction changes no RPC declaration hashing, descriptor bytes, executor binding, captured source, wire codec, or operation execution behavior. The declaration/executor separation must independently preserve those existing contracts.

## Explicitly separate obligations

The bounded terminology change replaces the active code tokens `rmn`/`rmn-term` with `sen`/`sen-term`, and makes SEN composition refer to the canonical source graph. It does not migrate the networking `rmn-cbor-envelope` entry or the protocol's media type. The existing SEN JSON projector does not prove a CBOR migration.

The complete engineering index still has unrelated pre-existing obligations: missing owner locators; a required but absent founder-direction entry; the document's unpermitted `$schema` field; and the term-record schema's rejection of existing external actor/message schema URIs. These require separately justified owner corrections. The bounded SEN proposal must not be reported as making the whole index valid.

FeltOS's actual strategy schema refers to `operation.schema.json`; its genuine Actor schema is available. In the checked schema-contract implementation, resolving this file-relative reference beneath an absolute public `$id` incorrectly targets an evaluator-private URL. Supplying the genuine Actor/operation/SEN graph does not cure that resolution error. Receiving the strategy consumer remains blocked until the schema-contract owner corrects that resolution or the FeltOS owner explicitly changes its reference to the existing absolute operation ID. Do not silently rewrite the consumer's schema during testing or substitute an Actor stub.

The separate owning receiving issues are [CSE index coherence #431](https://github.com/red-cup-engineering/computer-engineering-services-section/issues/431) and [Data relative schema references #185](https://github.com/red-cup-engineering/computer-data-engineering-services-section/issues/185). Neither is claimed fixed by this bounded correction.
