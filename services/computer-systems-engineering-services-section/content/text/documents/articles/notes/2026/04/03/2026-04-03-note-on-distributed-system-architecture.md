---
title: Distributed System Architecture Phasing
description: Six-phase plan for building distributed coordination on the local service system, from file sync through federation and security to full implementation.
date-created: 2026-04-03
type: note
name: distributed-system-architecture
keywords:
  - phased-architecture
  - distributed-replication
  - federation-policy
  - conflict-resolution
  - workload-identity
specialization: plan
application: messaging
deferred-reason: Depends on local service system being solid. Local system uses EAVT+Rust now, not SQLite+Node as originally spec'd. Revisit when local service has file watcher and engine.
department: engineering
cross-cuts: [command, science]
project: distributed-system
in-service-of: lib/emsenn/services/561-group/services/561-group-services-section
---


## The problem

The confederacy is distributed. Chapters in different cities. People in different locations. Equipment in different places. The local service system runs on one machine. The distributed system connects multiple local service instances so they can share data, coordinate work, and federate authority.

## What the triage already specifies

The Distributed Relational Machine Runtime spec (`operations/engineering/triage/content/buckets/tech/distributed-relational-machine-runtime.md`) is the most detailed architecture document in the repo. It describes a full stack:

- **DataStore:** rqlite (distributed SQLite over Raft consensus)
- **Event streaming:** NATS JetStream (ordered per-thread step streams)
- **Engine workers:** Dapr virtual actors (stateless compute per history thread)
- **Engine logic:** LangGraph (loop control, persistence) + PydanticAI (structured output)
- **Constraint validation:** clingo (ASP solver for algebraic laws)
- **Authorization:** OPA/Rego (declarative policy) + SPIFFE/SPIRE (workload identity) + Biscuit (capability tokens)
- **Observation/API:** FastMCP per node + IBM ContextForge gateway
- **Peer connections:** A2A protocol (JSON-RPC 2.0 over HTTP with SSE)

This spec is thorough but it's designed for the full relational machine. The distributed system we need to build starts simpler.

## Phasing

### Phase 1: Two local services, file sync
Two machines running the local service system. Shared files via git (or rsync, or syncthing). No real-time coordination — just periodic sync. This is the simplest possible "distributed" system and it already works if you commit and push.

### Phase 2: Live replication
Replace file sync with database replication. rqlite is the candidate: it's distributed SQLite over Raft, which means the local service's SQLite database gets distributed for free. Each node runs rqlite instead of plain SQLite. Writes go through Raft consensus. Reads can come from any node.

### Phase 3: Event system
Add NATS JetStream for real-time event propagation. When something changes at node A, node B learns about it immediately — not on next sync. This enables: real-time dashboards, live coordination, equipment control from any node.

### Phase 4: Federation
Not every node needs to replicate everything. A chapter's internal records stay local. Shared resources (confederacy-wide contacts, shared knowledge, coordinated projects) replicate across chapters. Federation policy governs what crosses boundaries.

### Phase 5: Security and authorization
Workload identity (SPIFFE/SPIRE), capability delegation (Biscuit), authorization policy (OPA/Rego). This is when the distributed system becomes production-grade — when you trust it with real authority decisions across organizational boundaries.

### Phase 6: Full spec implementation
The algebraic constraint layer, the full engine with dual-nucleus normalization, the MCP federation gateway. This is when the triage spec's full architecture gets implemented.

## What we DON'T build from scratch

The distributed system is not a new codebase. It's the local service system with networking added. The DataStore is the same schema, just replicated. The engine is the same rules, just running on multiple nodes. The API is the same endpoints, just federated. Design decisions in the local service must not foreclose distribution.

## Key technical decisions to make

- **Replication topology:** full mesh? hub-and-spoke? configurable per entity type?
- **Conflict resolution:** Raft for writes means no conflicts at the consensus layer. But what about offline nodes that reconnect? CRDTs? Last-write-wins? Manual resolution?
- **Federation boundaries:** what metadata determines whether an entity replicates? A frontmatter key? A directory convention? An access control list?
- **The independence relation:** the math says commuting operations can parallelize without coordination. This is the key to efficient distribution. But computing which operations commute requires understanding the domain. This is where the algebraic layer earns its place.
