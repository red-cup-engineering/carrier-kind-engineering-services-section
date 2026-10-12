---
kind: harness
title: "Claude Code hooks harness"
type: harness
target-default: ".claude"
target-runtime: "claude-code"
---


Sister to the [`claude-code`](../claude-code/_index.md) harness. Where that harness projects substrate **agents** into Claude Code subagent definitions, this harness projects substrate **hook records** (under [`operations/engineering/hooks/`](../../hooks/)) into Claude Code's hook protocol — `.claude/settings.json` plus per-hook shell scripts under `.claude/hooks/`.

## What it writes

- `.claude/hooks/_pyfars-dispatch.sh` — **one** shim, regardless of hook count. Expects `pyfars` on `PATH` and execs `pyfars hook-dispatch "$1"`. Contains no record-specific text; adding a new hook record never regenerates the shim.
- `.claude/settings.json` — for each substrate record, an entry under `hooks.<event>[].hooks[]` with `type: command` and `command: $CLAUDE_PROJECT_DIR/.claude/hooks/_pyfars-dispatch.sh hook:<slug>`, plus `matcher` if the record declares a non-default one.

A manifest at `.fars/harness-manifests/claude-code-hooks.json` records the dispatcher path, every projected hook entry (with bilattice axes, truncation policy, and sentinel pattern labels), and the prior `hooks` block from settings.json so `--uninstall` is exact and reversible. The uninstaller also recognizes the prior **per-record-shim** manifest format (one `.sh` per hook record, per-entry `out-path`) so an operator who installed under the prior layout can `--uninstall` after upgrading the harness without manual cleanup.

If a `.claude/settings.json` already exists from another tool, this harness only rewrites the `hooks` block (preserving `permissions`, `env`, etc.). On uninstall it restores the captured prior `hooks` block exactly; if the file becomes effectively empty it is removed.

## Single-dispatcher architecture

The earliest version of this harness fan-out one bash script + one fresh `python3` interpreter per hook fire, with the record's bilattice axes and operator name interpolated as Python literals into a heredoc inside the shim. That layout had three problems the current single-dispatcher layout fixes:

1. **Code-injection surface.** Record content reached the runtime as bash/python source. The current dispatcher loads the record at dispatch-time inside python; record content never traverses a shell.
2. **Install cost grew with hook count.** O(N) shim writes; touching the harness installer for governance updates rewrote every shim. Now: one shim, written once.
3. **No place for governance policy.** Per-shim emission baked the bilattice axes into bash; there was nowhere to declare "cap evidence on truncation" or "only fire on regex match" without rewriting every shim. The current dispatcher reads `on-truncation` and `patterns` from the substrate record at dispatch-time.

## Why a projection, not hand-written scripts

Hand-written hook scripts drift, lose track of *why* each hook fires, and have no audit chain. Each substrate hook record carries the bilattice values (`truth`, `evidence`) the hook should emit on its witness — so the projection isn't "shell out and forget", it's "shell out and book to the ledger with a graded posting." The hook records sit alongside the agent records they observe; one substrate, two consumers (agents + hooks), no drift.

## Bilattice framing — the "weird" part

Claude Code's vanilla hook protocol is opaque: each event is a shell call that returns 0/non-0. Under FARS, every hook event becomes a structured `Witness` on the event log, with two graded axes the substrate cares about:

- **truth** — did the underlying thing succeed? `PostToolUse` defaults to 1.0; `PostToolUseFailure` defaults to 0.0; `SessionStart` is 1.0 (the session did start).
- **evidence** — how strong is our claim? We *observed* the post-event ourselves (1.0); we know a session started but nothing yet about its content (0.5); we *predicted* but did not yet observe a tool's outcome (0.5 for `PreToolUse`).

The substrate records own the (truth, evidence) defaults per hook, so different intercepts can be calibrated independently. Downstream `pyfars ledger tally --weight-by evidence` (or `--min-truth`) then surfaces *graded* views of session activity, not flat counts. A failing tool burns 1.0 evidence at truth 0.0 — invisible under truth-weighting, visible under evidence-weighting. That asymmetry is the integration's leverage.

## Hook record schema

```yaml
---
kind: hook
type: hook
slug: "hook:<slug>"
runtime: claude-code      # required: this walker only loads records targeting claude-code
event: PostToolUse        # one of the canonical Claude Code hook events
matcher: "Edit|Write"     # optional; tool-name regex (claude-code semantics)
channel: dispatch         # FARS witness channel; default `dispatch`
witness:
  operator: tool_use      # operator name on the witness
  truth: 1.0              # bilattice truth axis, in [0, 1]
  evidence: 1.0           # bilattice evidence axis, in [0, 1]
description: "Free-text — what this hook books, and why these bilattice values."
---
```

The canonical hook record schema is **runtime-agnostic in shape**; the `runtime` field decides which harness's walker picks it up. This walker accepts only `runtime: claude-code` records and validates `event` against Claude Code's enum: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `PreCompact`, `Notification`, `SubagentStart`, `PermissionRequest`, `SessionStart`. Out-of-range bilattice values, missing `witness.operator`, and unknown events are rejected at install time with a clear error rather than silently producing a broken hook script. Future runtimes (Aider, Cursor, …) will add their own walkers with their own enums; substrate records targeting other runtimes are simply skipped here.
