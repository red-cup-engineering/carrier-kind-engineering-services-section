---
title: "561 Group Operations Manifold Capability Audit"
date-modified: 2026-06-18
status: "current"
---

# 561 Group Operations Manifold Capability Audit

This audit records the current and intended capability shape of `@emsenn/operations-manifold` after moving the live surface to package scripts transported by `@emsenn/jsnode-ick/package-bin-web`.

## Current Capability Surface

561 Group Operations Manifold currently presents one package-script operation graph:

- `src/app.mts` mounts `createJSNodeWebServerApp()` at `/`.
- `GET /`, `GET /catalog.json`, `GET /diagram.json`, `GET /openapi.json`, `GET /health`, `POST /{process}`, and `POST /mcp` are projections of that same package-bin catalog.
- `scripts/run-operation.mjs` is the common script runner for 561 Group Operations Manifold operations.
- `scripts/*.mjs` are thin executable entrypoints.
- `package.json#bin` declares 59 561 Group Operations Manifold operations.
- scripts accept a JSON domain and emit canonical JSON resources at the stdio boundary; interface adapters admit HTTP/MCP bodies, key-value stdin, or raw EAVT stdin into that initial JSON domain before calling `src` functions.
- document morphisms such as `operations-manifold-admit-goal`, `operations-manifold-admit-work`, `operations-manifold-admit-context`, and `operations-manifold-record-hook` are registered in `src/scripts.mts` and implemented in `src/document-scripts.mts`; raw EAVT is interface input that becomes the `__stdin` JSON field when no explicit `document` field is supplied.
- cognitive verbs are exposed as thin script interfaces over `src/cognition.mts`: `operations-manifold-remember`, `operations-manifold-wonder`, `operations-manifold-imagine`, `operations-manifold-dream`, `operations-manifold-inquire`, `operations-manifold-derive`, `operations-manifold-explore`, and `operations-manifold-consolidate`.
- federation and handoff are exposed as thin script interfaces over `src/federation.mts`: `operations-manifold-agent-card`, `operations-manifold-agent-handoff`, and `operations-manifold-federation`.
  The federation reading presents the upstream `@emsenn/animating` `AgentFederation` carrier as the normative model and uses the existing operations ledger only when handoff recording is explicitly requested.
- checkpoint and replay are exposed as thin script interfaces over `src/checkpoints.mts`: `operations-manifold-checkpoint` appends compact EAVT JSONL witnesses to `data/logs/checkpoints.jsonl`, folds them to `data/state/checkpoints.json`, and returns canonical JSON; `operations-manifold-replay` reads those JSON files and compares a selected checkpoint with the current JSON state.
  The memory scope is one package-bin function run.
- recognition-weighted memory is exposed as thin script interfaces over `src/recognition.mts`: `operations-manifold-recognition` reads the context suit and admitted candidates as an explicit recognition lattice, and `operations-manifold-recognition-weight` resolves a focused subject so sense visibly outranks remembered-sense and learning.
- Codex CLI phase state is exposed as a thin script interface over `src/codex-phase.mts`: `operations-manifold-codex-phase` accepts a JSON phase domain (`phase`, `detail`, `intent`, `focus`, `session`, `trace`, `paths`, `budget`) and returns one canonical JSON codomain joining filed goals, active work, compact context suit, operations-ledger trace evidence, checkpoint evidence, drift pressure, and the next 561 Group Operations Manifold interfaces Codex should call.
  The default `detail=compact` keeps this usable as a planning surface; callers can request `detail=full` when they need the full context suit and drift carriers.
- Codex CLI plan state is exposed as a thin script interface over `src/codex-plan.mts`: `operations-manifold-codex-plan` accepts a JSON plan domain (`steps` or `plan`, plus `session`, `trace`, `focus`, `intent`, `paths`, and `budget`) and returns a bounded codomain joining the supplied Codex plan with open goals, work items, a compact context suit, pressures, and next 561 Group Operations Manifold interfaces.
  It does not persist a planner; it treats the Codex plan as the external interface input to a one-run JSON projection.
- Codex CLI session state is exposed as a thin script interface over `src/codex-session.mts`: `operations-manifold-codex-session` accepts a JSON session domain (`session`, `session_id`, `trace`, `focus`, `intent`, `paths`) and returns a compact replay view joining existing operations-ledger entries, work items, context admissions, drift assessments, checkpoint witnesses, pressures, and next 561 Group Operations Manifold interfaces for that session.
  It does not write a new session ledger; it projects existing JSON logs and regenerated JSON state in one package-bin function run.
  Exact session/trace matches are counted separately from contextual focus fallback so Codex consumers can tell bound session state from surrounding work context.
- Codebase reading is exposed as a thin script interface over `src/codebase-reading.mts`: `operations-manifold-codebase-reading` accepts a JSON reading domain (`package`/`pkg`/`focus`, `intent`/`q`, `paths`, `limit`, `budget`) and returns a workload-aware codebase reading over the jsnode package atlas, dependency graph, 561 Group Operations Manifold work/goals, context suit, next tooling interfaces, and a finite `@emsenn/gaming` arena/strategy/flow sketch.
- `operations-manifold-agentic-readiness` reads the live package-bin catalog and reports research-backed platform readiness criteria and gaps.

Verified examples:

```text
projectJSNodeWebServer({ packageDir: ".", basePath: "/", webPath: "/" })
=> 59 scripts, /openapi.json, /mcp

node scripts/goals.mjs
=> kind: operations-manifold.goals.snapshot

node scripts/codex-exec-trace.mjs
stdin: {"jsonl":"{\"type\":\"session.started\",\"thread_id\":\"t1\"}\n"}
=> kind: operations-manifold.codex-exec-trace

node scripts/codex-phase.mjs phase=progress intent="improve Codex CLI phase workflow interop" focus=sites/operations-manifold.561.group
=> kind: operations-manifold.codex.phase, detail=compact, codomain.nextInterfaces

node scripts/codex-plan.mjs steps='[{"step":"Inspect 561 Group Operations Manifold surfaces","status":"completed"},{"step":"Implement Codex plan projection","status":"in_progress"}]' focus=sites/operations-manifold.561.group
=> kind: operations-manifold.codex.plan, codomain.status=active

node scripts/codex-session.mjs session=codex-local focus=sites/operations-manifold.561.group
=> kind: operations-manifold.codex.session, codomain.nextInterfaces

node scripts/codebase-reading.mjs package=@emsenn/operations-manifold intent="read 561 Group Operations Manifold through jsnode computing and gaming"
=> kind: operations-manifold.codebase-reading, categorical.flow.reading=flow

node scripts/dream.mjs
=> kind: operations-manifold.cognition.dream

node scripts/federation.mjs
=> kind: operations-manifold.federation

node scripts/agent-handoff.mjs intent="federated coding task handoff"
=> kind: operations-manifold.agent.handoff, mode: preview

node scripts/checkpoint.mjs label=verification
=> kind: operations-manifold.checkpoint, data/logs -> function-run -> data/state -> stdout-json

node scripts/replay.mjs
=> kind: operations-manifold.replay, memoryScope: one function run

node scripts/recognition-weight.mjs
stdin: {"sources":"prompt-format=>HTML|sense|20\nprompt-format=>JSON|learning|100","subject":"prompt-format"}
=> kind: operations-manifold.recognition-weight, rule: sense-over-learning

node scripts/workspace-graph.mjs --focus sites/operations-manifold.561.group
=> focus: @emsenn/operations-manifold
```

## Current Functional Areas

| Area | Current carrier owner | 561 Group Operations Manifold operation examples |
| --- | --- | --- |
| Package-script transport | `@emsenn/jsnode-ick/package-bin-web`, `@emsenn/http-server`, `@emsenn/organizing-with-jsnode` | all `operations-manifold-*` bins, `/mcp`, `/openapi.json`, `/catalog.json` |
| Agent harness | `@emsenn/organizing-with-llm-agents`, `@emsenn/computing`, `@emsenn/gaming` | `operations-manifold-agents`, `operations-manifold-capability-check` |
| Agentic platform readiness | local projection over `@emsenn/organizing-with-jsnode` package-bin catalog and research-library criteria | `operations-manifold-agentic-readiness` |
| Workspace graph and atlas | `@emsenn/organizing-with-jsnode` | `operations-manifold-workspace-graph`, `operations-manifold-jsnode-package`, `operations-manifold-jsnode-types`, `operations-manifold-jsnode-functions` |
| Workload-aware codebase reading and categorical sketching | `@emsenn/organizing-with-jsnode`, `@emsenn/gaming`, 561 Group Operations Manifold work/context folds | `operations-manifold-codebase-reading`, `operations-manifold-jsnode-package`, `operations-manifold-jsnode-module`, `operations-manifold-jsnode-symbol`, `operations-manifold-context-suit` |
| Open goals and work | `@emsenn/animating`, `@emsenn/relating` | `operations-manifold-goals`, `operations-manifold-work`, `operations-manifold-work-items`, `operations-manifold-work-start`, `operations-manifold-work-update` |
| Context and drift control | local EAVT folds over `@emsenn/relating` JSONL codecs | `operations-manifold-admit-context`, `operations-manifold-context-admit`, `operations-manifold-context-suit`, `operations-manifold-drift-assess` |
| Codex CLI phase/plan/session projection | existing goal, work, context, operation, checkpoint, and readiness snapshots | `operations-manifold-codex-phase`, `operations-manifold-codex-plan`, `operations-manifold-codex-session` |
| Recognition-weighted memory | context suit candidates, admitted context tiers, local deterministic recognition reads | `operations-manifold-recognition`, `operations-manifold-recognition-weight` |
| Cognitive readings and consolidation | local projections over existing readiness, context, work, operation, and workspace carriers | `operations-manifold-remember`, `operations-manifold-wonder`, `operations-manifold-imagine`, `operations-manifold-dream`, `operations-manifold-inquire`, `operations-manifold-derive`, `operations-manifold-explore`, `operations-manifold-consolidate` |
| Operations ledger and hooks | local EAVT folds over `@emsenn/relating` JSONL codecs | `operations-manifold-record-hook`, `operations-manifold-operations-ledger`, `operations-manifold-operation-record`, `operations-manifold-hook-event` |
| Heartbeat and pressure | `@emsenn/organizing-with-llm-agents`, `@emsenn/animating`, local projections | `operations-manifold-heartbeat` |
| Agent trace ingestion | `@emsenn/computing-with-openai-codex`, `@emsenn/organizing-with-llm-agents` | `operations-manifold-agent-run-trace`, `operations-manifold-codex-exec-trace` |
| Federation and handoff | `@emsenn/animating` `AgentFederation`, local package-script projections, operations ledger witnesses | `operations-manifold-agent-card`, `operations-manifold-agent-handoff`, `operations-manifold-federation` |
| Checkpoint and replay | `data/logs/*.jsonl` append-only witnesses, `data/state/*.json` regenerated folds, existing ledger snapshots | `operations-manifold-checkpoint`, `operations-manifold-replay`, `operations-manifold-work-stop-gate` |
| Site administration | local site declarations plus upstream workspace readings | `operations-manifold-sites`, `operations-manifold-site-operations`, `operations-manifold-site-play` |

## Intended Capability Shape

561 Group Operations Manifold should be an orchestration and evidence surface, not a second ontology.
The intended path for new capability is:

```text
upstream carrier or script
-> package.json#bin entry
-> JSNode ICK package-bin WebUX projection
-> WebUX / OpenAPI / MCP / HTTP POST
```

561 Group Operations Manifold should:

- expose package scripts as the stable operation graph;
- keep package scripts as thin interfaces to source-level holography: JSON domain in, source function call, canonical JSON codomain out;
- externalize durable state through append-only `data/logs/*.jsonl` witnesses and regenerated `data/state/*.json` folds so no 561 Group Operations Manifold scheduler state must live in memory longer than one function run;
- use `@emsenn/jsnode-ick/package-bin-web` for web routing, OpenAPI, MCP, catalog, and diagram transport;
- use `@emsenn/relating` codecs for JSON, JSONL, and EAVT document boundaries;
- use `@emsenn/animating` work/governance carriers for goals, work, offices, reports, readiness, and dreaming;
- use `@emsenn/organizing-with-jsnode` for workspace graph, package atlas, symbol atlas, and package-bin catalog projection;
- use `@emsenn/organizing-with-llm-agents` and provider-specific packages for LLM harness, endpoint, run, and trace carriers;
- keep append-only `data/logs/*.jsonl` as evidence and treat `data/state/*.json` as regenerated folds.

## Identified Failures And Duplications

1. Resolved on 2026-06-18: stale custom MCP, OpenAPI, and HTML/WebUX surfaces were removed.
  `src/mcp-handler.mts`, `src/openapi.mts`, `src/views.mts`, and `src/html.mts` duplicated the package-script graph after the live surface moved to `@emsenn/jsnode-ick/package-bin-web`.
  They were unmounted and unexported; WebUX, OpenAPI, MCP, catalog, and HTTP POST are now projected only from `package.json#bin` through `src/app.mts`.

2. Resolved on 2026-06-18: the original admission and record-hook document morphisms no longer preserve a second `src/package-bin.mts` registry.
  `src/document-scripts.mts` now implements the EAVT document morphisms, `src/scripts.mts` exposes them as `admit-goal`, `admit-work`, `admit-context`, and `record-hook`, and the package-bin wrappers call the same script surface through `scripts/run-operation.mjs`.

3. `scripts/run-operation.mjs` contains local parameter parsing for JSON, EAVT-like rows, `key=value`, and raw stdin admission into `__stdin`.
  That is transport boundary logic and belongs in an upstream package-script runner or JSNode ICK package-bin WebUX option if it is normative.

4. `src/work-carriers.mts` exists because common work evidence reads are not exposed by `@emsenn/animating`.
  Helpers such as `workTitle`, `workStatusName`, `workPriority`, and `officeName` should move upstream if this evidence-token pattern is the normative work-carrier read model.

5. `@emsenn/computing-with-openai-codex/session/events` had depended on removed `@emsenn/animating` trace helpers.
  The package now owns a small Codex trace projection so 561 Group Operations Manifold trace operations run again, but this exposes a larger gap: a settled trace topology API should either be restored upstream or removed from packages that still assume it exists.

6. `services/web-server/src/service.mts` still imports `@emsenn/animating/topology/trace`, which is not exported by current `@emsenn/animating`.
  That service is outside 561 Group Operations Manifold, but it is evidence of the same trace-topology drift.

7. EAVT log/state folding is repeated across goals, work, context, and operations.
  The code uses `@emsenn/relating` codecs, but the append/fold/state pattern is still reimplemented locally in several modules.
  A shared EAVT log/fold helper should live upstream if this is the normative 561 Group Operations Manifold persistence pattern.

8. Resolved on 2026-06-18: capability coverage no longer rescans the workspace type index on every call.
  `src/capability-index.mts` now projects package/function/type carriers into `data/state/capability-carriers.json` and reuses that JSON state for capability search and coverage.
  Calls can pass `refresh=true` to rebuild the durable carrier index when the workspace package graph changes.
  This directly improves the Codex CLI workflow phase that uses 561 Group Operations Manifold capability checks for planning, handoff, and deciding whether an upstream carrier already exists.

9. Resolved on 2026-06-18: Codex CLI phase state no longer has to be inferred from chat context alone.
  `src/codex-phase.mts` now projects a phase-specific JSON codomain from the existing goal, work, context, operations, checkpoint, and readiness folds.
  This directly tests 561 Group Operations Manifold against the current Codex workflow: a CLI phase can ask for its goal/context/checkpoint/trace bindings and receive concrete package-bin interfaces for the next action without adding another transport or keeping scheduler state in memory.
  The default compact projection is bounded for planning use, with `detail=full` preserving access to broader context and drift carriers when explicitly requested.

10. Resolved on 2026-06-18: Codex session replay no longer requires manually
    cross-reading work, context, operations, and checkpoints.
    `src/codex-session.mts` now projects a compact session replay codomain from
    existing JSON logs and JSON state, keyed by `session`/`trace` plus optional
    focus, intent, and paths. This satisfies the harness need for replayable,
    context-bounded session inspection while preserving 561 Group Operations Manifold's stateless
    package-bin function boundary.

11. Resolved on 2026-06-18: Codex plan state no longer lives only in chat/tool
    process memory.
    `src/codex-plan.mts` now admits a JSON plan domain and projects it against
    existing goals, work, context-suit evidence, and next 561 Group Operations Manifold interfaces.
    This lets Codex present its current plan as a package-bin JSON carrier while
    keeping durable state in the existing `data/logs` and `data/state` folds.

12. Resolved on 2026-06-18: Codebase reading no longer requires manually
    cross-reading the jsnode package atlas, active work, context suit, and
    upstream gaming vocabulary.
    `src/codebase-reading.mts` now projects a compact package reading that fuses
    the jsnode dependency/package atlas with 561 Group Operations Manifold work/goals/context and a
    finite `@emsenn/gaming` arena/strategy/flow sketch. This is the first
    carrier for turning workload plus likely relevant tooling into context.

## Next Work

The next cleanup should promote useful local adapters upstream and keep reducing 561 Group Operations Manifold-only carrier code:

1. Move work evidence readers into `@emsenn/animating`.
2. Resolve trace topology ownership for `@emsenn/computing-with-openai-codex` and `@emsenn/web-server`.
3. Factor repeated EAVT append/fold/state code into a reusable upstream helper.
4. Promote the capability-carrier JSON state helper upstream if this cached workspace-reading pattern becomes normative beyond 561 Group Operations Manifold.
