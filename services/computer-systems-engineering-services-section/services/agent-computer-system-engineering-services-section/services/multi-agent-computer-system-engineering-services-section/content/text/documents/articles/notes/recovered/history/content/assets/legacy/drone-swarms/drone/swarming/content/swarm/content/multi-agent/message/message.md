---
type: object
class: classical
status: active
depends-on: []
see-also:
  - protocol.md
  - ../morphisms/message-passing.md
references: []
---

# Message

A **message** is a unit of inter-agent communication: a discrete payload sent from one agent (the sender) to one or more other agents (the recipients), within a defined [protocol](protocol.md).
Messages are how agents in a multi-agent system share information, request action, coordinate, and negotiate.

## Anatomy

A typical message has:

- **Sender identifier.** Which agent sent it.
- **Recipient(s).** One agent (unicast), some (multicast), or all (broadcast).
- **Payload.** The content — request, response, notification, vote, bid, signal, natural-language text.
- **Metadata.** Timestamp, sequence number, authentication, routing information.
- **Protocol slot.** Which step in a protocol the message represents (request, response, ack, prepare, commit).

## Message types

- **Informative.** Sharing observations or beliefs.
- **Directive.** Requesting action.
- **Commissive.** Promising future action.
- **Declarative.** Asserting changes to shared state.
- **Negotiative.** Proposing terms.
- **Strategic.** Designed to influence others' beliefs or actions.

Speech-act theory (Austin, Searle) classifies messages by their illocutionary force; agent communication languages (KQML, FIPA-ACL) formalize this for multi-agent systems.

## Communication topology

Messages flow over a *topology*:

- **Star.** All messages through a central hub.
- **Mesh.** Any agent to any agent.
- **Pipeline.** Sequential message flow.
- **Tree.** Hierarchical with parent-child relationships.
- **Random graph.** Sparse but no fixed structure.

Topology affects message complexity (how many messages are needed for a coordination task), latency, and fault tolerance.

## In contemporary systems

For LLM agent systems, messages are typically:

- **Natural language text.** Unstructured prose between agents.
- **Tool calls.** Structured function invocations.
- **Memory writes/reads.** Updates to shared context.
- **Status reports.** Progress, completion, error notifications.

The looseness of natural-language messaging gives flexibility but loses the precise semantics of formal agent communication languages — interpretation is agent-side rather than protocol-side.

## Reliability concerns

Real systems must address:

- **Message loss.** Network failures or queue overflows.
- **Message reordering.** Messages arriving out of order.
- **Message duplication.** Receiving the same message twice.
- **Message tampering.** Adversaries modifying messages.
- **Message misinterpretation.** Recipient misunderstands payload (a serious risk for natural-language messages).

Protocols specify how each is handled; reliability guarantees vary.

## Message economy

Multi-agent communication has a cost: each message takes bandwidth, processing, possibly tokens (for LLM agents).
Efficient protocols minimize message complexity.
The relationship between message budget and achievable coordination is studied in distributed computing under the *communication complexity* heading.
