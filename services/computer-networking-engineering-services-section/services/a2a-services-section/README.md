# A2A Services Section

This section owns independently hireable dies implementing the official A2A
1.0 boundary: parts and task clients, signed Agent Card discovery,
contracted-agent serving and state custody, key provisioning, portfolio status,
and machine-bound deployed-provider observation. There is no section-level
runtime or package.

The serving die publishes the standard Agent Card discovery resource and the
official JSON-RPC and HTTP+JSON bindings supplied by `@a2a-js/sdk`. Legacy A2A
0.3 compatibility is deliberately disabled. Each carried operation has exactly
one raw `application/rmn+cbor` part with an RFC 6920 SHA-256 `ni` identity in
standard A2A metadata. Other standard A2A parts may carry Marks such as prompt
text or referenced resources; there is no private task envelope.

Each contracted executor reads one standard A2A 1.0 `Message` JSON value from
standard input and writes one standard A2A 1.0 `Message` JSON value to standard
output. JSON exists here because the public protocol requires it; the
operation identity remains the RMN CBOR part. The executor remains responsible
for the private effect named by its settlement contract. None of the protocol
dies reads the customer's interior or becomes a Union registry or scheduler.

Production Agent Cards must advertise HTTPS interfaces. Loopback HTTP is
admitted only for node-local conformance and supervised same-host operation.

The deployed-provider observation service joins an infrastructure owner's exact
resource/revision/origin observation to signed Agent Card and provider-owned
operation evidence. It does not infer application health from Cloud Run
readiness and does not own deployment effects.

`./v1-core` admits the A2A 1.0 `Message`, `TaskStatus` and `Task` objects a peer returns (`admitA2AV1Message`, `admitA2AV1TaskStatus`, `admitA2AV1Task`), with `isFinalTaskState` and `isSuccessfulTaskState`. It is a partial boundary and says so in `A2A_V1_CORE_PROFILE`; it reads no capability, office or authority field. The client's `TERMINAL_TASK_STATES` is the set of states a poller stops at and includes the interrupted `INPUT_REQUIRED` and `AUTH_REQUIRED`; `isFinalTaskState` excludes them.
