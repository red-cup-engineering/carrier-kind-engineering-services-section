---
title: "561 Group Operations Manifold Agentic Drift Control"
date-modified: 2026-06-17
status: "proposed"
goal: "goal:design-operations-manifold-context-injection-and-drift-control-archi:40e5159e06ad"
---

# 561 Group Operations Manifold Agentic Drift Control

## Frame

Agentic drift is not only a model behavior problem.
In 561 Group Operations Manifold it is a record integrity problem: an agent was suited with some admitted context, acted through some transports, and produced some outcomes.
Drift is the measured failure of those filings to remain lawfully related.

The controlling loop is:

```text
form -> eavt -> sensor -> eavt -> actuator -> eavt -> form
```

User prompts, MCP tool calls, OpenAPI requests, Codex hook events, and HTTP forms are all form submissions.
561 Group Operations Manifold should file each of them as an EAVT witness before projecting a finite state snapshot.

## External Practice

Current agent platforms converge on four relevant patterns:

- Prompt and instruction layers provide procedural context, but must be scoped and bounded.
  Codex uses `AGENTS.md` as durable project guidance discovered from broad to local scope.
- MCP splits context and action into resources, prompts, and tools.
  Resources are application-driven context, prompts are user-controlled templates, and tools are model-controlled actions with schemas, validation, audit, and human-in-the-loop expectations.
- Session memory and context callbacks keep multi-turn runs coherent, but production designs need explicit control over how history is merged, filtered, and persisted.
- Tracing records model generations, tool calls, handoffs, guardrails, and custom spans so later systems can inspect what actually happened.

The web pattern is useful but insufficient by itself: generic systems usually optimize what to retrieve or inject.
561 Group Operations Manifold needs to record why the context was admitted, how it was projected, and whether subsequent action remained within that admitted projection.

## Local Theory

561 Group Operations Manifold should follow the research library rather than copying a LangGraph-like state machine:

- Context-spacesuit and memory form a residuation pair.
  Suiting is the read path, restriction, and should not write durable learning.
  Consolidating is the write path, extension, and is the only path that posts memory.
- Context presence is not durable learning.
  A thing placed in the suit is only transient awareness until a later settling step files it with provenance.
- Memory is settled consensus, not asserted storage.
  Contradiction remains open pressure until study resolves it within budget.
- The thing is its log.
  Snapshots are finite projections over append-only EAVT witnesses.
- Recognition weight comes from provenance.
  Sense beats remembered sense, and both beat derived learning when they conflict.

## Architecture

### 1. Context Admission

Add an 561 Group Operations Manifold context admission surface that accepts:

- `intent`: the user or workitem purpose.
- `focus`: package, site, file, goal, or operation.
- `candidateSources`: AGENTS files, goals, research archive paths, MCP resources, traces, prior pulse records, and user-provided text.
- `budget`: token, time, authority, and risk limits.
- `authority`: user, hook, MCP server, automation, or heartbeat origin.

The output is not a prompt.
The output is an EAVT filing:

```text
agent-run/context.admitted/context-admission-event/transaction
```

The finite projection can then produce a context-spacesuit.

### 2. Suit Projection

Add a pure suit projector:

```text
admitted context + current goal + budget -> context-spacesuit
```

This projector writes nothing durable except an optional trace of the projection decision.
The suit should carry explicit sections:

- identity and role for this run
- constraints and refusal boundaries
- capabilities and available tools
- perception/resources included
- remembered settled claims
- mission/next work
- omitted candidates with reasons

Each included item must carry provenance and relevance weight.
The suit is a restriction of filed memory, not memory itself.

### 3. Action Trace Filing

Hook and MCP transports should file action events:

- `UserPromptSubmit`: user request form.
- `SessionStart`: instruction chain, AGENTS sources, active MCP servers, active goals, and current suit id.
- `PreToolUse`: proposed tool, arguments, goal/suit relation, risk class.
- `PostToolUse`: result digest, changed files, stdout/stderr summary, resource links.
- `PreCompact` / `PostCompact`: compaction input/output and lost-context risk.
- `Stop`: work summary, open loops, candidates for consolidation.

These events should be EAVT witnesses first and UI records second.

### 4. Drift Measurement

Drift should be a projection over filed traces, not an LLM self-report.

Candidate metrics:

- `goal-alignment`: action predicates are supported by active goal/workitem predicates.
- `context-support`: tool arguments and edits cite suit sources or admitted user intent.
- `authority-fit`: action authority does not exceed source authority.
- `scope-fit`: touched paths remain inside admitted focus or explicit escalation evidence exists.
- `memory-pollution`: durable memory candidates came from consolidation, not raw suit inclusion.
- `contradiction-pressure`: unresolved contradictory claims are surfaced as pressure, not silently flattened.
- `compression-loss`: compaction summary preserves active goal, pending work, constraints, and evidence links.

The result should be another EAVT projection:

```text
agent-run/drift.assessed/drift-assessment/transaction
```

No single scalar is enough.
561 Group Operations Manifold should keep a vector of partially contradictory witnesses and only project a finite gate when an actuator needs a decision.

### 5. Control Surfaces

561 Group Operations Manifold should expose this through:

- MCP resources: active goals, current suit, recent drift assessments, admitted context candidates, research-library theory.
- MCP prompts: "compose suit", "assess drift", "consolidate memory", "surface contradiction", "plan next heartbeat".
- MCP tools: `context-admit`, `context-suit`, `trace-file`, `drift-assess`, `memory-consolidate`.
- HTTP views: drift dashboard, suit inspector, context candidate queue, hook event ledger.
- Hooks: Codex lifecycle events that POST local forms to 561 Group Operations Manifold loopback.

The local Codex hooks should be thin actuators.
561 Group Operations Manifold should own the record logic, scoring, projection, and UX.

## Implementation Order

1. Define `src/context-control.mts` with EAVT log/state paths: `data/logs/context.jsonl`, `data/logs/agent-events.jsonl`, and `data/state/context.json`.
2. Add pure functions for `admitContext`, `projectSuit`, and `assessDrift`.
3. Add MCP/HTTP/script routes for context admission, suit projection, and drift assessment.
4. Add a repo-local `.codex/hooks.json` proposal whose command hooks POST form-encoded events to loopback 561 Group Operations Manifold.
5. Extend heartbeat so open drift pressure becomes workitems and spacesuits.
6. Add a web UX section for current goal, current suit, active constraints, recent tool drift, and pending consolidation candidates.

## Sources

- Codex manual, `AGENTS.md`, MCP, hooks, memories, and automations sections.
- MCP specification, resources, prompts, and tools sections.
- OpenAI Agents SDK, context management, sessions, and tracing sections.
- LangGraph memory overview.
- `triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-context-spacesuit-and-memory.md`
- `triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-self-studying-claim-lattice.md`
- `triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-action-tower-and-consciousness-loop.md`
- `triage/2026/05/24/claude-code-harness/docs/dev/journal/2026-05-28-cognitive-layer.md`
- `triage/2026/05/26/swarm-intelligence/README.md`
