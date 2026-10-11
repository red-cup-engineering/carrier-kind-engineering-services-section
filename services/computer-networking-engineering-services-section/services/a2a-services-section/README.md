# A2A Services Section

This existing package owns the plain-Node A2A client/server, signed Agent Card
custody, SEN Parts, and durable task/push stores. It has no A2A SDK dependency.
The package manifest declares its Group providers. Scientific or economic
meaning belongs to the hired operation and its receiving evidence, not to the
protocol transport.

## Implemented JSON-RPC representation boundary

The client and server implement the selected A2A 1.0 JSON-RPC wire operations
`SendMessage`, `GetTask`, and `CancelTask`. The normative source is the released
[A2A specification 1.0.0](https://a2a-protocol.org/v1.0.0/specification/), especially
sections 3.6, 4.1.6, and 9.4. This is a bounded interoperability improvement, not
a full A2A conformance or TCK claim.

- Discovery uses `/.well-known/agent-card.json`. Discovery and RPC clients send
  `A2A-Version: 1.0`; the RPC server refuses unsupported versions, including an
  empty/missing version's specified 0.3 interpretation. Specification patch
  numbers do not change major/minor compatibility. There is no automatic
  downgrade to the old draft protocol.
- `scripts/json-wire.mjs` converts internal `content: {$case, value}` Parts to
  exactly one direct JSON `text`, `raw`, `url`, or `data` member. Raw bytes are
  base64 on the wire. Incoming JSON Parts convert back to the existing internal
  union. Message parts, Task status messages/history, and Artifact parts are the
  only traversed protocol positions. Structured data and metadata stay opaque.
- `SendMessage` returns exactly one named `message` or `task`. The public client
  unwraps it into its existing Message-or-Task return value. `GetTask` and
  `CancelTask` return Tasks directly. JSON-RPC version, response ID, and exclusive
  result/error custody are checked before a result is admitted.
- Existing public client method arguments and provider handler keys such as
  `message/send` remain internal receiving interfaces. They convert to the
  normative PascalCase wire spelling; old draft names are not exposed as wire
  aliases. Custom handler operations are outside this conformance subset.
- `GetTask` accepts `historyLength`: absent retains the store default, zero
  omits history, and a positive safe integer returns at most that many most
  recent messages. Negative/noninteger lengths are refused.

The server's existing hired-operation path creates a task for each call and
binds the response to that task and context, including generic SEN message
factories whose optional context fields begin empty. The standard protocol
fields carry custody; no private task envelope is introduced. Every SEN Part
keeps its exact `application/sen+cbor` bytes and RFC 6920 `ni` metadata.

## Evidence and limits

The owner tests exercise an independently written raw-JSON peer on both sides,
all four Part alternatives, malformed/mixed oneofs, unsupported versions,
forged response IDs, blocking and nonblocking result wrappers, cancellation,
history bounds, and existing signed-card/SEN consumers. The tests are synthetic
in-process/loopback HTTP. They are not remote provider receiving, an A2A TCK
result, a production activation, or proof of federated ActivityPub delivery.

This correction does not qualify every lifecycle policy. In particular, the
existing task store's handling of caller-specified new task IDs, duplicate
terminal submissions, repeated cancellation, interrupted-task continuation,
full error taxonomy, list/push operation bindings, streaming, extension
negotiation, and complete Agent Card admission remain separate obligations.
Do not advertise those capabilities merely because a store or helper exists.
Production interface security is also a separate receiving obligation; these
local protocol tests make no deployment or access-policy change.

`./v1-core` separately admits Message, TaskStatus and Task data, and distinguishes
final states from successful completion. The client's `TERMINAL_TASK_STATES`
remains the established **stop-waiting** set, including interrupted
`INPUT_REQUIRED` and `AUTH_REQUIRED`; that set must not be read as permission to
close the underlying economic work.

An A2A completion is not financial settlement, ACK recognition of a disputed
claim, or a WIT cover. Those claims retain their own evidence domains. The
composed WIT receiving test carries the actual receipt through this wire into
the existing witness journal and typed SEAVT coordinates; metadata conversion
does not invent, remove, or endorse its economic/authority claims.
