# @561/development.lab.claude-code-harness

**A Claude Code harness for SWARM: a thin carrier adapter that binds a running Claude Code session into the greenfield SWARM substrate.**

This is not another copy of SWARM.
Per the harness study (`development/lab/swarm/docs/dev/notes/2026-06-03-archived-claude-code-harness-study.md`) and the platform note (`development/lab/swarm/docs/dev/notes/2026-06-03-next-gen-agentic-orchestration-platform.md`), a harness is a **Layer 7 carrier**: it decodes carrier IO into utterances, captures events as experience rows, projects memory back into carrier-native context, and exposes a carrier tool surface — and it **owns no substrate math**.
Every durable effect routes through SWARM's public ESM API.
The dependency points one way: **harness → SWARM**, never the reverse.

## Boundary (the one rule)

The harness imports SWARM through a single seam, `src/swarm.mjs`, which re-exports `development/lab/swarm/src/index.mjs` by relative path (SWARM is a `lab` sibling and not a pnpm workspace member, so `workspace:*` cannot resolve it).
No bilattice, no descent, no memory engine lives here.
`recall`, `dream`, `recordMessage`, `learnFromMessage`, `descendUtterance`, `writePlayerTuple`, `message`, and the work/cost summaries all come from SWARM.

## Which office the session serves as

A Claude Code session inhabits one SWARM office (a real agent definition).
Resolution precedence (`src/config.mjs`):

1. `options.agent`
2. env `SWARM_AGENT`
3. `<SWARM_ROOT>/harness.json` → `{ "agent": "..." }`
4. default `programmer`

The office is loaded via SWARM's own `loadAgent`, so `<SWARM_ROOT>/agents/<name>.json` overrides bundled offices, and an unknown office produces SWARM's helpful error listing the available ones (`leader`, `orchestrator`, `coordinator`, `researcher`, `programmer`, `governance`, plus provider workers).

The SWARM root resolves with SWARM's `resolveSwarmRoot`: `--root`/`options.root` → env `SWARM_ROOT` → nearest git root's `.swarm` → `cwd/.swarm`.

## MCP tool surface (`scripts/conductor-mcp.mjs`)

Inward verbs read/derive over memory with **no network**; the one outward verb runs a full governed SWARM turn (how the session acts *through* the swarm).

| tool | routes to | kind |
| --- | --- | --- |
| `swarm_remember` | `recall` | inward |
| `swarm_context` | spacesuit (`recall` + `renderCognitiveContext`) | inward, read-only |
| `swarm_plan` | `derivePlan` | inward |
| `swarm_dream` | `dream` | inward |
| `swarm_message` | `message(office, prompt)` | outward (governed) |
| `swarm_work_status` | `summarizeWorkStatuses` | read-only |
| `swarm_costs` | `costGraphSummary` | read-only |

`swarm_message` defaults to this session's office but accepts an explicit `agent`, so you can route durable creation/planning through the leader-mediated boundary.

Try it with no network and no API keys:

```sh
node scripts/conductor-mcp.mjs --demo
```

The harness is registered in the repo root `.mcp.json` as `claude-code-conductor`.

## Hooks: process the session like a native SWARM turn

A native SWARM turn is one `message()` (recall → plan → descent → record → learn → dream → player tuple).
A Claude Code session is a *stream*, so the hooks make it look like SWARM experience.
All hooks **fail open** — they never block the prompt or the session Stop.

| hook event | script | effect |
| --- | --- | --- |
| `SessionStart` | `hooks/session-start.mjs` | inject a context spacesuit; **writes nothing durable** |
| `UserPromptSubmit` | `hooks/prompt-ingress.mjs` | capture the prompt; inject a prompt-focused spacesuit |
| `PostToolUse` | `hooks/tool-capture.mjs` | capture a tool-call envelope |
| `Stop` | `hooks/stop.mjs` | capture the final reply, **consolidate** the session into durable governed memory + dream + player tuple |

"Context presence is not learning": session-start and prompt injection write nothing.
Capture rows are experience admitted into a session stream at `<SWARM_ROOT>/harness/claude/sessions/<session-id>/capture.jsonl`.
The only durable, governed memory write happens at `Stop`, via `src/consolidate.mjs` — and it does **not** make a redundant model call, because the assistant reply already exists in the transcript.

### Registering the hooks

Add to the target project's `.claude/settings.json` (paths relative to this package), and set the office via env or `<SWARM_ROOT>/harness.json`:

```json
{
  "env": { "SWARM_AGENT": "programmer" },
  "hooks": {
    "SessionStart": [{ "hooks": [{ "type": "command", "command": "node development/lab/claude-code-harness/hooks/session-start.mjs" }] }],
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "node development/lab/claude-code-harness/hooks/prompt-ingress.mjs" }] }],
    "PostToolUse": [{ "hooks": [{ "type": "command", "command": "node development/lab/claude-code-harness/hooks/tool-capture.mjs" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "node development/lab/claude-code-harness/hooks/stop.mjs" }] }]
  }
}
```

## Tests

```sh
node --test tests/*.test.mjs
```

Deterministic, no network, no API keys: office precedence, capture row shape, consolidation writing durable governed memory through the SWARM API, and MCP verb routing — all against throwaway swarm roots.

## Layout

- `src/swarm.mjs` — the single import seam to SWARM.
- `src/config.mjs` — office + root + session-id resolution.
- `src/capture.mjs` — Claude IO → utterance-shaped capture rows + transcript reading.
- `src/spacesuit.mjs` — read-only context projection.
- `src/consolidate.mjs` — capture stream → durable native-shaped SWARM turn.
- `src/mcp.mjs` — the carrier tool surface.
- `src/hook-io.mjs` — fail-open stdin/stdout for hooks.
- `scripts/conductor-mcp.mjs` — MCP stdio server (+ `--demo`).
- `hooks/*.mjs` — the four live-loop hooks.

## Status

v0.1.0: MCP surface and the full hook loop, proven against the current SWARM substrate with deterministic tests and a network-free demo.
SWARM core is untouched by this package.
