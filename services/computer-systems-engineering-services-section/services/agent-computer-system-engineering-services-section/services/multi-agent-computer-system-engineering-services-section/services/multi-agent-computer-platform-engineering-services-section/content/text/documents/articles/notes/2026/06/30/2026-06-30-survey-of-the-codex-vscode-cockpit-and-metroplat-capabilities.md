---
title: "Survey of the Codex VS Code Cockpit and MetroPlat Capabilities"
description: "Compares two live-checkout systems as they exist today: the decommissioned OpenAI Codex CLI/VS Code cockpit lineage under triage.bare-cedar-fog and today's potential @emsenn/metroplat, asking only what capabilities are visible now and where they sit relative to the current MetroPlat frame."
date-created: 2026-06-30
keywords:
  - capability
  - cockpit
  - Codex
  - organizing
  - structure
  - witness
  - projection
  - codec
  - action
  - agent
  - Lean
  - Jupyter
status: "exploratory"
source-roots:
  - "sites/triage.bare-cedar-fog.emsenn.net"
  - "sites/metroplat.emsenn.net"
---

This note compares two live-checkout systems as they exist today.

The first system is the older OpenAI Codex CLI and VS Code cockpit lineage preserved under `sites/triage.bare-cedar-fog.emsenn.net`.
Its relevant packages are marked `decommissioned`, so this is not a restoration plan.
The second system is today's potential `@emsenn/metroplat` package under `sites/metroplat.emsenn.net`.

The question here is only: what capabilities are visible now, and where do they sit relative to the current Infography [renamed later to MetroPlat] frame?

## Historical Cockpit System

The explicit Codex-in-VS-Code package is `@emsenn/organizing-with-openai-codex-in-vs-code`.
Its manifest describes "cockpit panels, command routes, MCP/LSP attachments, and readiness checks downstream of the Codex organizing package."
Its implementation mostly specializes and re-exports the generic VS Code agent cockpit.

The package's default cockpit commands show the old surface area:

- read the workspace package mesh;
- read readiness;
- read endeavor enactment;
- read opinions;
- read induced action surfaces for animating, communicating, socializing, and playing;
- read the cockpit structure itself;
- compute package and command impact;
- prepare a handoff.

The readiness checks were not decorative UI checks.
They tested whether the workspace was visible, whether the upstream Codex package exported session/harness/inference surfaces, whether MCP and LSP bridge files were present, and whether the dev site projected the same cockpit structure.

The generic VS Code agent layer supplied the cockpit structure shape.
Its panels were `workspace`, `agent-session`, `mcp-lsp`, `impact`, and `handoff`.
Its attachments were `.mcp.json`, `.vscode/mcp.json`, `.lsp-mcp.json`, and `pnpm-workspace.yaml`.
Its harness benchmark named the desired agent-harness capability set: editor context, workspace index context, persistent instructions, chat participants, language-model tools, MCP tooling, terminal execution, browser execution, file editing, diff review, human approval gates, sandbox policy, checkpoint restore, session memory, handoff, subagent orchestration, local/cloud continuity, model routing, hook lifecycle, and telemetry trace.

The upstream `@emsenn/organizing-with-openai-codex` package carried the Codex-specific session layer.
It exposed:

- workspace discovery and package loading;
- change-impact computation;
- suggested commands;
- recall and recall status;
- session capsule canonicalization;
- `codex exec --json` trace parsing;
- usage/cost event extraction;
- work task, work item, and work report structures;
- binaries named `organizing-with-openai-codex-harness` and `codex-session`.

The running cockpit was broader than those packages.
`dev.bare-cedar-fog.emsenn.net/scripts/inject-cockpit.mjs` was a Codex hook adapter for `SessionStart` and `UserPromptSubmit`.
It injected a compact cockpit capsule into Codex context: cockpit structure, habitat, benchmark, adapters, hook surface, first moves, panels, quests, facets, adapter standing, and a live orientation digest.
That file states the operating surface as hooks, context injection, MCP/LSP reachability, readiness, trace folding, checkpoints, and handoff.

`dev.bare-cedar-fog.emsenn.net/scripts/dev-runtime.mjs` was the larger orientation and witnessing engine.
It recorded dev events as witness invocations, converted hook/tool events into ActivityStreams activities, read hook and MCP surfaces, tracked current and peer harness sessions, derived focus lanes, produced collision awareness, and built an agent orientation with "your", shared, endeavor, and peer context.
It also exposed MASH actions such as `ingest-hook`, `orient-agent`, `claim-locus`, `settle-locus`, `read-capability-field`, `read-session-handoff`, `precompact-handoff`, and `statusline`.

The old cockpit had an explicit coordination law in `services/organizing/src/cockpit-coordination.mts`.
Held workspace write capabilities were read as accountable claims: authorized, witnessed, and queryable.
Contested paths were held as bilattice top rather than silently assigning a winner.
Peer disagreements were projected through graded federation so monotone overlaps lifted coordination-free while non-monotone residue routed to consensus.

The old cockpit also had analytic and inspectable views.
`services/organizing/src/default-jupyter-views.mts` generated default notebooks and data files over witness rows, MASH/session events, camps, graded federation reports, accountable records, accountable cockpit claims, and package mesh material.
`scripts/statusline.mjs` turned the same field into a compact harness status line: hook count, claims, capabilities, conflicts, ActivityPub coordination, and inbox state.

## MetroPlat Today

The potential package is `@emsenn/metroplat`.
Its manifest describes a relational boundary system where structures, actions, codecs, projections, witnesses, and generated service faces cohere from one package surface.
Its current process entrypoints are `infograph`, `infograph-serve`, and `infograph-mcp`.

MetroPlat now has the formal substrate that many old cockpit parts wanted to stand on:

- structure construction, validation, and projection bundles;
- action construction, induced bins, dispatch, and async dispatch;
- CLI, HTTP, OpenAPI, MCP, browser form, resource, prompt, and witness-log projections from one action apex;
- filesystem invocation witnessing;
- route and MCP observations;
- operation manifolds;
- session and WebSocket claim/judgement loops;
- workspace scanning through package-manifest admission;
- package-surface, bin-surface, export-surface, and registry readers;
- witness stores, witness feeds, EAVT/JSONL codecs, and witness-log readings;
- ActivityPub, identity, capability, value-settlement, accountable-transaction, consensus-log, Jupyter, provenance, schema.org, and MCP envelope codecs;
- Lean source/environment/import/declaration/theorem/capability structures and a Lean relational-configuration report surface;
- LSP, witness, memento, layout, typography, static-site, themed-page, visual-valuation, and article projections.

MetroPlat's MCP service is a real stdio process boundary.
It induces the default action apex from `src/actions`, handles newline-delimited JSON-RPC, serves MCP calls, and can witness invocations under `METROPLAT_DATA`.
The HTTP MCP codec admits remote `tools/list` catalogs as boundary material without executing them.

MetroPlat's running layer is the closest current analogue to the old cockpit's transport spine.
It says one action list should project the same accepted actions as discovery bins, OpenAPI paths, MCP tools, web forms, routes, and witness logs.
This gives the current system a cleaner foundation for "one operation, many faces" than the older cockpit had.

MetroPlat's workspace scanner is narrower than the old cockpit workspace panel.
It scans package roots, admits `package.json` material, and exposes the scan with a contract witness.
It does not currently produce a full agent-session workspace cockpit with open editor context, peer sessions, current focus, approval policy, or handoff state.

MetroPlat's Lean surface is now strong at host-neutral Lean material.
It admits toolchain, lakefile, module text, declarations, imports, theorem spine, obligation coverage, theorem-reference coverage, capability claims, and capability authority.
That is materially different from the old cockpit nudge scripts, which existed to steer a live agent away from shell Lean checks and toward the Lean MCP/LSP tooling.

## Capability Alignment

Some old cockpit capabilities already have a direct MetroPlat home:

- MCP tool projection: old cockpit used MCP/LSP attachments and reachability checks; MetroPlat now has MCP stdio serving, MCP HTTP envelope codecs, and MCP catalog admission.
- Action surfaces: old cockpit read induced action discovery from several packages; MetroPlat now induces CLI/HTTP/OpenAPI/MCP/web/witness projections from the package action apex.
- Witnessing: old cockpit recorded hook/tool events into the ICK/witness-log field; MetroPlat now has witness feeds, filesystem invocation witnessing, and EAVT/JSONL codecs.
- Accountable records: old cockpit modeled held capability claims and accountable transactions; MetroPlat has accountable-transaction and capability codecs, plus running invocation witnesses.
- Workspace package material: old cockpit read package mesh and impact; MetroPlat has package-manifest admission, bin/export/package-surface readers, and a workspace scanner.
- Lean material: old cockpit nudged live Lean work toward MCP/LSP; MetroPlat now carries Lean source/environment/import/declaration/capability/authority reports as package material.
- Jupyter-shaped evidence: old organizing generated default Jupyter views; MetroPlat has Jupyter witness codecs and examples.

Some old cockpit capabilities are present only as lower-level ingredients in MetroPlat:

- Context injection: MetroPlat can represent prompts, resources, actions, witnesses, and MCP tools, but it does not yet have a Codex/VS Code hook adapter that injects a cockpit capsule into an agent thread.
- Harness session identity: MetroPlat has sessions and witnesses, but not a current MASH-style agent orientation that separates your context, shared context, endeavor context, and peer context.
- Peer collision awareness: MetroPlat has consensus-log, accountable-transaction, capability, session, and cohomological machinery, but no current workspace-locus claim field for active agents editing files.
- Readiness checks: MetroPlat can expose contract reports and observations, but not the old cockpit's explicit "workspace visible, upstream built, MCP configured, site composes cockpit" readiness structure.
- Status line: MetroPlat can serve projections, but there is no current compact per-session agent statusline over hooks, claims, conflicts, inbox, and capabilities.
- Handoff: MetroPlat has witness and prompt/resource/action structures, but no current Codex session handoff capsule equivalent wired to hooks.
- VS Code extension contributions: MetroPlat has LSP projection and MCP surfaces, but not a VS Code chat participant, language-model-provider contribution, or extension manifest layer.
- Approval/checkpoint policy: MetroPlat has boundary contracts and invocation witnesses, but no current harness-policy surface for approvals, sandbox mismatch detection, checkpoints, or restore operations.

Some old cockpit capabilities are probably outside MetroPlat's core unless rebuilt as downstream applications:

- human-facing editor cockpit panels;
- provider-specific Codex, Claude, Copilot, or Cline harness evaluation;
- browser/editor selection/open-tabs capture;
- dev-site MASH ActivityPub actor pages for live agent sessions;
- package-specific command suggestions and blast-radius heuristics over dirty worktrees;
- archived action surfaces for animating, communicating, socializing, and playing as independent domain packages.

## Present Shape

The older system was an agent cockpit: a live operator surface for an AI coding session.
It assembled hooks, context injection, MCP/LSP reachability, package impact, session trace folding, peer awareness, workspace claims, ActivityPub/MASH projections, Jupyter views, status lines, and handoffs around Codex and VS Code.

MetroPlat today is not that cockpit.
It is the more formal structure/action/codec/projection/witness substrate that can make such a cockpit less ad hoc.
Its strongest current capabilities are boundary admission, action induction, service projection, witness persistence, package-surface reading, Lean material reading, and formal transport/accountability structures.

The useful observation is not "restore the old cockpit."
The useful observation is that the old cockpit's most valuable affordances were not the browser page.
They were the agent-facing operating guarantees:

- inject the right context before action;
- make tool and MCP reachability visible;
- keep work tied to package impact and verification;
- witness hook/tool events durably;
- identify the current harness session and peer sessions;
- claim and release active work loci;
- hold conflicts explicitly instead of hiding them;
- produce compact status and richer notebook/readout views;
- settle a handoff for the next session.

MetroPlat already owns many of the material laws and service faces those affordances need.
What it does not currently own is the harness-specific cockpit membrane that binds those laws to Codex, VS Code, hooks, editor context, peer agents, and user-visible operational rhythm.

## Evidence Opened

- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-openai-codex-in-vs-code/package.json`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-openai-codex-in-vs-code/src/index.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-openai-codex/package.json`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-openai-codex/src/session/index.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-openai-codex/src/session/events.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-vscode-agents/src/index.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-vscode-agents/src/cockpit.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/src/lib/organizing-with-vscode-agents/src/harness-benchmark.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/dev.bare-cedar-fog.emsenn.net/scripts/inject-cockpit.mjs`
- `sites/triage.bare-cedar-fog.emsenn.net/dev.bare-cedar-fog.emsenn.net/scripts/dev-runtime.mjs`
- `sites/triage.bare-cedar-fog.emsenn.net/dev.bare-cedar-fog.emsenn.net/scripts/statusline.mjs`
- `sites/triage.bare-cedar-fog.emsenn.net/sites/emsenn.net/services/organizing/src/cockpit-coordination.mts`
- `sites/triage.bare-cedar-fog.emsenn.net/sites/emsenn.net/services/organizing/test/cockpit-coordination.test.mjs`
- `sites/triage.bare-cedar-fog.emsenn.net/sites/emsenn.net/services/organizing/src/default-jupyter-views.mts`
- `sites/metroplat.emsenn.net/package.json`
- `sites/metroplat.emsenn.net/src/running/index.mts`
- `sites/metroplat.emsenn.net/services/mcp/index.mts`
- `sites/metroplat.emsenn.net/src/codecs/text/http/mcp/index.mts`
- `sites/metroplat.emsenn.net/services/workspace-scanner/index.mts`
- `sites/metroplat.emsenn.net/src/lean/index.mts`
- `sites/metroplat.emsenn.net/dev/content/2026/06/29/2026-06-29-survey-of-metroplat-capabilities.md`
