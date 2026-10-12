---
type: morphism
class: classical
status: active
depends-on:
  - ../objects/message.md
  - ../objects/protocol.md
see-also: []
references: []
---

# Message passing

**Message passing** is the morphism that transfers information between agents via discrete [messages](../objects/message.md) over a defined communication topology, governed by a [protocol](../objects/protocol.md).
It is the most basic inter-agent communication operation.

## Modes

- **Unicast.** One sender, one recipient.
- **Multicast.** One sender, defined subset of recipients.
- **Broadcast.** One sender, all recipients.
- **Anycast.** One sender, any one recipient from a set.
- **Gossip.** Stochastic propagation through a network.

Each mode has distinct cost, latency, and reliability properties.

## Synchrony and asynchrony

- **Synchronous.** Messages have bounded delay; agents proceed in rounds; recipient processes message before the next round.
- **Asynchronous.** Messages may have arbitrary delay; agents proceed independently; recipient processes messages as they arrive.
- **Partially synchronous.** Bounded delay sometimes, unbounded sometimes; common assumption for real networks.

The synchrony model affects what protocols can achieve; many distributed-systems impossibility results (FLP impossibility for asynchronous consensus, etc.) hinge on the synchrony assumption.

## Reliability

Message passing may guarantee:

- **At-most-once delivery.** No duplicates; possibly loss.
- **At-least-once delivery.** Possibly duplicates; no loss.
- **Exactly-once delivery.** No loss, no duplicates.
  Hardest to guarantee; expensive.
- **Ordered delivery.** Messages received in send order.
- **Causally ordered delivery.** Messages received consistent with happens-before relation.
- **Total order.** All recipients see all messages in same order.

Different reliability levels have different protocol complexities.

## Communication complexity

A central question: how many messages are needed to accomplish a coordination task?

- **Lower bounds.** Information-theoretic lower bounds characterize the minimum communication needed for agreement, leader election, etc.
- **Upper bounds.** Protocols achieving these bounds (or close to them) are designed.
- **Tradeoffs.** Communication vs computation, latency vs throughput, fault tolerance vs efficiency.

The communication-complexity theory of multi-agent systems parallels the time-complexity theory of computation.

## In multi-agent AI

Message passing in AI multi-agent systems is typically:

- **Natural language.** Most LLM agent communication is unstructured text; protocols are implicit.
- **Tool calls.** Structured function invocations across the agent-tool boundary.
- **Memory operations.** Reads and writes to shared context, knowledge bases, or vector stores.
- **Control messages.** Status, completion, error notification.

## Status

Foundational.
Message passing is the substrate of distributed computing and remains central to multi-agent AI systems.
Classical theory applies with adjustments for LLM-specific concerns (token cost, natural-language ambiguity, prompt-injection vulnerabilities).
