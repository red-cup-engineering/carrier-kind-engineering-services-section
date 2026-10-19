---
name: contextual-software-roles
identity: contextual-software-roles
kind: engineering-definition
date-created: 2026-10-19
status: typed-source-declared; installed-role-receiving-unverified
relations:
  schema-owner: red-cup-engineering/computer-system-engine/specifications/software-role.schema.json
  representation: cellularization
  downstream: signcraft
---

# Contextual software roles — engine, system, server, client, platform, application

The six words name **independently predicable roles of a software entity relative to an interface, task and receiving context**, not mutually exclusive nominal classes, a strict inheritance tree, a one-way build pipeline or claims that a package is already deployed. The single source of their machine-readable declarations is the [versioned software-role JSON Schema](https://github.com/red-cup-engineering/computer-system-engine/blob/feature/architecture-signcell-projection-20261019/specifications/software-role.schema.json). The schema is a **role binding object** with a required `role` (one of six named values), a required nonempty `interface`, and an optional `receiver` naming the intended consumer. These are distinct type dimensions: a role cannot be admitted without its interface; a receiver name is not proof of deployment or acceptance. The six `role` values are documented by precise capability contracts. Other applicable roles, such as database, operating system, workflow or library, may require distinct downstream specialized schemas rather than silently admitting arbitrary aliases into this six-role vocabulary.

| Role | Exact distinguishing capability | What independently demonstrates the role | Invalid shortcut |
| --- | --- | --- | --- |
| **Engine** | Reusable state/operation transition from admitted input to output/changed state under a declared contract | A distinct caller can invoke the same implementation with two valid inputs and obtain contract-governed results, with invalid input refused | Calling a file, flowchart or service name an engine; deriving execution from a declaration |
| **System** | Bounded composition of interacting capabilities and resources with explicit state, interfaces, constraints and lifecycle | Participating components actually interoperate and exhibit an observable system-level behavior not implied by each part alone | Equating a directory, index or abstract diagram with an integrated running composition |
| **Server** | Provides an offered protocol endpoint that handles admitted request/event, result and refusal | An authorized distinct client reaches the selected deployed instance and receives a correct response/refusal through its actual protocol | Calling a function a server because it can theoretically receive a request |
| **Client** | Consumes a provider's declared protocol, handles result/refusal, and initiates the relevant interaction | A situated authorized client invokes a real provider and makes correct use of returned data/effects | Assuming every application is a client or that protocol participation confers operator power |
| **Platform** | Hosts reusable provider/extension lifecycle and governed capabilities for *independently configurable consumers* | Two distinguishable eligible consumers can select the exposed extension/capability contract without forked platform core logic | Relabeling a single vertical application or hosted web page a platform |
| **Application** | Configures underlying capabilities for a particular human/agent/domain task with usable receiving behavior | A real authorized recipient completes the intended task with the configured system, with error and recovery behavior available | Calling a package an application because it has a UI, a URL or a README |

## Roles compose across dimensions, not by compulsory nesting

A deployed browser may be a **client** when requesting a remote API and a **server** when exposing a local debugging endpoint; a rendering or rules **engine** may run inside that browser, a standalone server or an agent. One provider may be simultaneously an **engine**, **system** and **platform** when its actual interfaces satisfy each independent role. An **application** may include a server and client but can have other architectures. No implication of the form 'engine → server', 'system → platform' or 'application → client' holds solely from vocabulary. A specific dependency or operational role implication must be presented as an additional typed relation and supported at its own contract boundary.

The representation is one **SignCell per contextual role binding**, under the reserved `computer-architecture/has-role` predicate. For example, `(service-A, has-role, {role: "server", interface: "http/v1", receiver: "browser"})` and `(service-A, has-role, {role: "server", interface: "mcp/v1", receiver: "agent"})` are *different triples* despite sharing the word *server*. A client role is another bound assertion, not a disjoint class. Two source occurrences presenting the same canonical triple may contribute opposing witnesses and join into one extensional cell while preserving both occurrence pointers. An untold role is **unobserved**; no role name establishes a running server, licensed interaction, installed platform or accepted application. The native [roleReadingsOfArchitecture](https://github.com/red-cup-engineering/computer-system-engine/blob/feature/architecture-signcell-projection-20261019/src/architecture-cellularization.mjs) reader consumes these cells and can select one declared interface without erasing the other.

The computational **type of an artifact**, **role in an interaction**, **version of installed code**, **actor legally authorized to invoke it**, and **beneficiary acceptance** are separate predicates. Do not collapse them by package names, README descriptions, manifest fields such as softwareKind, matching JSON Schema IDs or a passing CI job.

## Context with the computer tiers

**Computer Data / SignCell:** Contextual role bindings and typed relation source values become canonical witnessed cells. Component and interface identity uses the existing canonical content-address comparator: NFC-equivalent text representations cannot silently create two components, while original source spellings and performed occurrences remain retained. Data identity is never proof of a runtime role.

**Computer Code / SignChain:** Actual operation signatures, allowed input→output transitions, ordered compositions and witnessed rule claims are explicit. A chain of possible operations is not automatically a lawful executable transaction.

**Computer Networking / SignGraph:** Oriented client/server and supplier/consumer incidences can be represented without losing direction. A schema-matching graph edge is an *interface-composition candidate*, not an authenticated network exchange.

**Computer Systems / SignCraft:** The complete effectful producer may use the upstream structures to expose governed capabilities. Domain-specific organizing/communicating/gaming/socializing engines belong further downstream. Permission, installed code, runtime health and actual output must be received from their competent owners.

For an HTTP-specific client/server distinction, RFC 9110 describes message roles; that protocol semantics must not be silently generalized to every IPC or ActivityPub++ transport. JSON Schema (2020-12) qualifies the admitted source shape; it is not a proof that an assertion is true. The current producer is [cellularizeArchitecture](https://github.com/red-cup-engineering/computer-system-engine/blob/feature/architecture-signcell-projection-20261019/src/architecture-cellularization.mjs), with real current consumer [operationsManifoldOf](https://github.com/red-cup-engineering/computer-system-engine/blob/feature/architecture-signcell-projection-20261019/src/rpc/manifold.mjs). These links identify *source*, not an independently confirmed release or public deployment.
