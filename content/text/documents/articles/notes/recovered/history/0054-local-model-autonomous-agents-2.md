---
title: "Plan 0054: Local Models as Autonomous Day-to-Day Agents"
date-created: 2026-03-08T00:00:00
authors:
  - emsenn
  - claude
type: plan
status: active
priority: medium
depends-on: [53]
goal: "003"
milestone: ""
tags:
  - LocalModels
  - Automation
  - AgentArchitecture
---

# Plan 0054: Local Models as Autonomous Day-to-Day Agents

## Problem

Currently, all agent work in this repository happens through the Claude
Code chat interface. An agent receives a message, does work, commits
results. This is appropriate for complex, judgment-intensive tasks like
writing specifications or resolving planning conflicts.

But many operational tasks are routine and recurring: scan new journal
issues for observations relevant to active topics, check triage for files
needing enrichment, monitor RSS feeds for domain literature, generate
daily observation summaries from recent triage additions. These tasks are
well-suited to local models running on the OmniBook's NPU without
consuming Claude API credits or requiring a human to be at the keyboard.

The gap: no infrastructure exists for local models to operate as
autonomous agents that schedule their own work, produce artifacts, and
deliver reports — as distinct from serving as tools called by a Claude
session.

## Goal

Establish practices and infrastructure for local model agents that:

1. Run on a schedule or trigger (not driven by chat interface)
2. Do well-defined operational work
3. Produce artifacts in the repository (observations, reports, new content)
4. Deliver a summary report when work is complete
5. Require human review only for output, not for execution

## Approach

### Agent model

Each autonomous agent is a Python script that:
- Has a single clearly-defined operational task
- Reads from designated parts of the repository
- Writes new artifacts (never modifies existing content without provenance)
- Produces a report file in a designated inbox
- Logs its run in a run log

This mirrors how `infer-triage-frontmatter.py` operates today — it runs,
enriches files, produces output — but extends this pattern to tasks that
require judgment: finding relevant content, writing observations,
identifying gaps.

### Report delivery

Reports are markdown files written to a designated inbox directory:
`content/personal/projects/emsemioverse/inbox/` (to be created).

Each report contains:
- What was processed (sources, date range)
- What was found (observations, links, new content created)
- What needs human attention (ambiguous cases, failures)
- Where artifacts were written

The inbox is reviewed in the chat interface, not the other way around.
The agent does work; the human reviews and promotes or discards.

### First agents to implement

**1. Journal scanner** (`scripts/scan-journals.py`)

Reads configured RSS feeds and journal sources for a topic. For each
new item since last scan, asks a local model: "Is this relevant to
[topic]? If so, write a 2-3 sentence observation."

Writes observations to the appropriate topic's `observations/` directory.
Reports new observations to inbox.

**2. Triage enrichment agent** (`scripts/enrich-triage-agent.py`)

Already effectively exists as `infer-triage-frontmatter.py` but runs
interactively. The agent version runs headlessly, enriches a batch,
and reports results to inbox rather than stdout.

**3. Gap reporter** (`scripts/report-content-gaps.py`)

Scans content for broken links, missing term files, unreferenced concepts.
Reports gaps to inbox as a prioritized list.

### Scheduling

Windows Task Scheduler (or a simple cron-style wrapper) triggers scripts
on a schedule. Each script is self-contained: reads its own configuration
from frontmatter in a config file, checks its own last-run timestamp,
and proceeds accordingly.

The existing `scripts/check-environment.py` approach (probe, report,
exit) is the model: scripts don't assume anything about their environment
and report clearly when they can't proceed.

### Configuration

Each agent has a configuration file at
`content/personal/projects/emsemioverse/agents/<agent-name>/config.md`
with frontmatter encoding:
- `schedule`: cron expression for intended frequency
- `sources`: list of feeds, directories, or queries
- `target-discipline`: where to write artifacts
- `model-capability`: minimum capability required (links to plan 0053)
- `last-run`: ISO timestamp of last successful run

### Human review flow

1. Agent runs, produces artifacts, writes report to inbox
2. Human opens inbox in next chat session
3. Human reviews artifacts, promotes good ones, discards poor ones
4. Review is the encoding loop, applied to agent output

This is analogous to how plans and decisions are reviewed: the agent
produces a draft; the human exercises judgment about what enters the
permanent record.

## Prerequisites

- Plan 0053 (model capability requirements) should be complete so
  agents can declare and check their capability requirements
- Plan 0052 (content gap filling) overlaps — the gap reporter agent
  is the operational form of that plan's gap-detection step
- `phi-3-mini-128k` should be loaded in Foundry (for journal scanning
  where articles may be long)

## Files to create

| File | Purpose |
|------|---------|
| `content/personal/projects/emsemioverse/inbox/` | Directory for agent reports |
| `content/personal/projects/emsemioverse/agents/` | Agent configuration directory |
| `scripts/scan-journals.py` | Journal/RSS scanner agent |
| `scripts/enrich-triage-agent.py` | Headless triage enrichment (wraps existing script) |
| `scripts/report-content-gaps.py` | Gap detection reporter |

## Not in scope

- Multi-agent coordination or agent-to-agent communication
- Fine-tuning agents for specific tasks (plan 0052 covers that)
- Replacing the chat interface for complex judgment tasks
- External API access (agents work only with local data and local models)

## Log

- 2026-03-08: Plan created. Captures emsenn's intent to have local models
  handle recurring operational tasks (journal scanning, background research)
  with reports delivered to an inbox, rather than driving operations
  exclusively through the chat interface.
