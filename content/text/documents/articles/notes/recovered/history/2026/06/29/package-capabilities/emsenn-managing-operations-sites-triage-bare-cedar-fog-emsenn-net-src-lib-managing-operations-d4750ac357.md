---
title: "Capability note: @emsenn/managing-operations"
date: 2026-06-29
source-package: "sites/triage.bare-cedar-fog.emsenn.net/src/lib/managing-operations"
---

# Capability note: @emsenn/managing-operations

- Package path: `sites/triage.bare-cedar-fog.emsenn.net/src/lib/managing-operations`
- Package kind: `src-lib`
- Declared workspace entries: `lib/managing-operations`
- Description: Managing operations — the practice of running an organization's work as one category package. Realizes the work-management capabilities scattered across the ecosystem — work breakdown (portfolios, projects, milestones, sections, tasks, subtasks, dependencies, tags), scheduling (calendars, recurrence, critical path), prioritizing (priority, weighted scoring, capacity selection), workflow (statuses, boards, WIP), assigning (to offices, workload), automating (rules, recurrence spawning), accounting (time tracking, budgets), reporting (burndown, flow, throughput), and viewing (list, board, calendar, timeline) — as morphisms descending to organizing work records, computing decisions, socializing consensus, and @emsenn/relating cells, Marks, and Utterances.
- Capability tags from manifest/source hints: `service`, `cli`, `workspace-analysis`, `mathematics`
- Bins: `manage-breakdown`, `manage-schedule`, `manage-prioritize`, `manage-report`
- Export subpaths: `.`, `./structuring`, `./scheduling`, `./prioritizing`, `./flowing`, `./assigning`, `./governing`, `./automating`, `./accounting`, `./reporting`, `./viewing`, `./scripts`, `./package.json`
- Scripts: `clean`, `check`, `build`, `prepack`, `rebuild`
- Dependencies: `@emsenn/computing`, `@emsenn/organizing`, `@emsenn/relating`, `@emsenn/socializing`

## Local Evidence

- sites/triage.bare-cedar-fog.emsenn.net/src/lib/managing-operations/README.md: Managing operations — the practice of running an organization's work, as one category package downstream of [`@emsenn/animating`](../animating) and [`@emsenn/relating`](../relating).
- Source hints: `scripts/api.mts`, `scripts/breakdown.mts`, `scripts/prioritize.mts`, `scripts/report.mts`, `scripts/schedule.mts`, `scripts/wire.mts`, `src/accounting/budget.mts`, `src/accounting/context-budget.mts`, `src/accounting/index.mts`, `src/accounting/time-tracking.mts`, `src/actions.mts`, `src/assigning/assignment.mts`, `src/assigning/index.mts`, `src/assigning/workload.mts`, `src/automating/index.mts`, `src/automating/recurring.mts`, `src/automating/rule.mts`, `src/flowing/board.mts`, `src/flowing/index.mts`, `src/flowing/status.mts`, `src/governing/consensus.mts`, `src/governing/index.mts`, `src/governing/opinion.mts`, `src/index.mts`, `src/package-bin.mts`, `src/prioritizing/capacity.mts`, `src/prioritizing/index.mts`, `src/prioritizing/priority.mts`, `src/prioritizing/scoring.mts`, `src/reporting/index.mts`

## Relation To Infography Baseline

- Direct surface overlap with `@emsenn/infography`: `.`, `./package.json`
- Capability classes not directly realized by infography's exported package surface: none obvious from coarse tags

This note is generated from manifest, nearby prose, and source-path evidence.
It should be checked against opened source before making migration or deletion decisions.
