---
type: object
class: classical
status: active
depends-on:
  - message.md
see-also:
  - ../morphisms/message-passing.md
  - ../morphisms/leader-election.md
  - teaching/explanations/byzantine-fault-tolerance.md
references: []
---

# Protocol

A **protocol** is a rule system specifying allowed inter-agent message exchanges: which messages may be sent, by whom, in what order, in response to what other messages, and what local actions agents take in response.
A protocol is the *grammar* of inter-agent communication.

## Anatomy

A protocol specification names:

- **States** that each agent can be in.
- **Messages** that may be sent.
- **Transitions** specifying when each message is sent and what state changes follow.
- **Termination conditions.**
- **Failure modes** and recovery procedures.

Formal protocols are often expressed as state machines or as sequence diagrams.

## Examples

- **Two-phase commit.** Coordinator-participant protocol for distributed transaction commit.
- **Paxos / Raft.** Consensus protocols for replicated state machines.
- **PBFT.** Byzantine fault-tolerant consensus.
- **Auction protocols** (English, Dutch, sealed-bid, Vickrey, combinatorial).
- **TCP handshake.** Network connection establishment.
- **Contract Net Protocol** (FIPA).
  Task allocation by bidding.
- **Leader election protocols** (Bully, ring-based, etc.).

## Properties to prove

- **Safety.** Bad outcomes never occur (no two leaders; no conflicting commits).
- **Liveness.** Good outcomes eventually occur (consensus is reached; tasks are allocated).
- **Termination.** The protocol always finishes.
- **Fault tolerance.** Survives specified failure modes (crash, omission, Byzantine).
- **Complexity.** Number of messages, rounds, computation per agent.

## Implicit vs explicit protocols

- **Explicit protocols.** Formally specified, agents follow specification verbatim.
  Standard in distributed systems.
- **Implicit protocols.** Emerge from agent interaction without explicit specification.
  Common in LLM agent systems where agents communicate in natural language without formal rules.

Implicit protocols are flexible but offer no guarantees; explicit protocols are rigid but verifiable.

## Protocol composition

Larger systems compose multiple protocols:

- A consensus protocol below an application protocol above.
- A leader election protocol switching between primary protocols on failure.
- A negotiation protocol within an auction protocol within a marketplace protocol.

Composition can introduce subtle interactions; correctness of components doesn't guarantee correctness of the whole.

## In LLM agent systems

LLM agent orchestration often uses:

- **Loose protocols** — agents communicate in natural language with role prompts indicating turn structure and expected outputs.
- **Hybrid protocols** — explicit message formats for structured handoffs, natural language inside.
- **Tool-use protocols** — formal function-calling semantics for agent-tool interactions.
- **Workflow specifications** — frameworks like LangGraph, AutoGen specify protocols as code.

The reliability tradeoff: looser protocols permit flexibility but make verification and debugging harder.

## Status

Foundational area of distributed systems with extensive classical literature.
Adaptation to LLM-agent systems is an active engineering area; classical protocol-design techniques apply with adjustments for the looseness of natural-language communication.
