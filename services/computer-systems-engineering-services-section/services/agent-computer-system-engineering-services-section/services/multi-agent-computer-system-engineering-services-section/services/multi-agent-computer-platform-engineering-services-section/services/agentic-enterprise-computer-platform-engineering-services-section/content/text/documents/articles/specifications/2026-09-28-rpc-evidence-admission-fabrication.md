---
title: RPC continuation from admitted journal evidence
date-created: 2026-09-28
type: fabrication specification
derived-from: 2026-09-27-muse-assist-journal-client-receipts-lld.md L-R02/L-R07
status: specified; staged generation and independent receiving required
---

## F-RPC01 — Evidence snapshot and continuation boundary

Realize L-R07's common precondition and RPC witness rule in the existing journalRpcWitness module. The useful effect is that action dispatch proceeds only from admitted durable evidence, while a failure to record an already executed outcome reports that failure without repeating execution. Retain the current dispatch sequence, protocol and witness-port interfaces. Remove the optional-statements empty fallback and the use of mutable caller evidence after normalization; do not create another dispatcher or receipt registry.

Bind one writable file, computer-system-engine/src/rpc/journal-witness.mjs, at its exact full path and digest in the F-P input inventory. Snapshot evidence once with the existing bounded non-invoking canonical JSON snapshot primitive. The artifact identity, invocation, evidence kind, observation time, effect causes, options.causes callback argument, row material and returned evidence receipt must all derive from this same immutable snapshot. Do not infer successful admission from a nonempty list of IDs or a written flag.

Use the existing statementWriteResultContract to validate the complete trusted appendRows result before extracting event IDs. Its proposed batch has exactly one row: require rows=1 and exactly one statement occurrence, whose admission is admitted. Missing, malformed, empty, overfull, quarantined or blocked receipts throw through the existing witness-port error channel before mutating either heads or ownEvidence. Deduplicate resulting causal IDs, preserve admitted duplicates with written=false, and keep the previous head intact on refusal. No new serialized authority token or state store is introduced.

## F-RPC02 — Independent connected receiving

Before generation, bind the actual dispatcher, accepted staged ordinary journal, source owner and dependencies in the private network-denied receiver. Exercise unresolved attempt, decision, coordination and outcome with missing causes held by the real owner. Observe authorization/coordination/handler counts, actual owner admission state and retained previous heads. An unresolved attempt must stop before authorization; later unresolved prerequisites stop execution. Outcome refusal follows exactly one execution and returns the existing witnessing obstruction. Exercise an admitted complete invocation and duplicate evidence, plus malformed receipt shapes at the port boundary and non-invoking immutable evidence snapshot behavior. Keep that receiver unavailable to the provider; public inputs contain specifications, current source and dependency contracts only.

Generate one F-P02 edit in an isolated GPT-6 Luna invocation. The unchanged F-P03 materializer validates selectors and digests into a fresh stage. Assess actual effects before source review; generation output does not prove acceptance. Do not modify dispatch or acceptance expectations to conceal a witness-port failure. This component's acceptance does not activate the journal family: arrival/transport/encounter/monitoring consumers, historical custody, packet/head migration and competing-writer retirement remain required by L-R07 and the ordinary-admission order. No product promotion, licensing choice or public release is included.
