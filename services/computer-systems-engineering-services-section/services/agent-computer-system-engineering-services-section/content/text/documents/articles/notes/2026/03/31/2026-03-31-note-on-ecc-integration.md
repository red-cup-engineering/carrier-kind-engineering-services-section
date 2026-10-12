---
title: ECC Integration Strategy
description: Systematic approach to integrating ECC patterns as capabilities develop, organized by implementation stage and evaluated through work taxonomy.
date-created: 2026-03-31
type: note
name: ecc-integration
keywords:
  - ecc-integration
  - pattern-mining
  - work-taxonomy
  - settlement-path
  - skill-development
specialization: plan
department: engineering
supersedes: ecc-skill-audit.md
---


## Goal

Treat everything-claude-code as a recurring source of patterns, not a one-time audit target. As this system grows from a content repository into a multi-language computer system, different ECC patterns become relevant at different stages. This plan defines how to mine ECC systematically and what to look for.

## Context

- ECC source: `operations/engineering/fars/src/everything-claude-code/`
- ECC is a mature, actively maintained system: 136 skills, 60 commands, 30 agents, 77 language-specific rules, sophisticated hooks, manifest-driven installation, multi-harness adapters
- Already imported or adapted: writing-*, search-first, blueprint, decision-records, strategic-compact (hook), verification patterns, session infrastructure
- The previous plan (ecc-skill-audit) framed this as a single categorization pass — that was too narrow

## What ECC offers by category

### Already relevant now

- **Agent patterns** — planning, review, verification loops, context management
- **Session infrastructure** — state persistence, compaction, evaluation hooks
- **Skill development** — `docs/SKILL-DEVELOPMENT-GUIDE.md` for writing good skills
- **Hook architecture** — matcher-driven hooks, runtime gating via profiles, loop prevention
- **Research workflows** — deep-research skill, source attribution, research playbook

### Relevant as the system adds software

- **Language-specific rules** — 12 ecosystems with coding-style, hooks, patterns, security, testing rules each
- **Testing patterns** — TDD workflow, E2E testing, eval harness, verification loops
- **Build and CI** — build resolvers, CI workflow patterns, cost tracking
- **Security** — security review agent, security scan skill, secrets detection hooks
- **Code quality** — coding standards, code review agent, formatting hooks

### Relevant at scale

- **Manifest-driven installation** — selective install with dependency graphs, state store, atomic apply
- **Multi-harness adapters** — same repo serving Claude Code, Codex, Cursor, Kiro
- **Enterprise governance** — team config sync, approval workflows, audit trail hooks
- **Continuous learning** — instinct extraction with confidence scoring, automatic import/export
- **Orchestration** — worktree coordination, multi-agent orchestration, status monitoring

## How to mine

1. **When starting a new capability area**, check ECC first for existing patterns. Read the relevant skill, command, or agent definition before building from scratch.
2. **When importing**, adapt to this system's conventions — don't copy wholesale. ECC targets software teams; this system has different principles (see `SOUL.md`).
3. **Periodically pull upstream** — `git -C operations/engineering/fars/src/everything-claude-code pull` to get new ECC content.
4. **Track what's been reviewed** — maintain a record of which ECC components have been evaluated and what was decided. The ecc-skill-audit plan's step 2 (categorization table) is still useful as a living document.

## Grounding in the work taxonomy

The library defines a complete work taxonomy at `library/theories/humanities/theories/sociology/theories/work/terms/`. ECC patterns should be evaluated through this lens — it tells us what kind of thing each pattern is and where it sits on the settlement path.

**The settlement path applies to ECC integration itself:**
- Patterns we haven't evaluated yet are **inquiry** — we don't know what they'll produce for us.
- Patterns under evaluation are **derivation** — we follow the rules (read, assess, adapt) but don't know the output.
- Patterns with known adaptation strategies are **procedure** — we know what we're producing, the path depends on context.
- Patterns already imported are **process** — repeat the adaptation and it works the same way.

**The continuous learning pipeline (observations → instincts → skills → hooks) is the settlement path in action:**
- Observations capture raw practice (inquiry-level: what's happening?)
- Instincts detect regularities (derivation: following detection rules, meaning emerges)
- Skills codify reliable patterns (procedure: known output, branching conditions)
- Hooks automate deterministic patterns (process: no judgment required)

When importing ECC patterns, classify them by work type. A pattern that requires judgment in our context should become a skill or agent, not a hook — even if ECC implements it as a hook. Our own theory tells us how to place things correctly.

## Current priorities

1. Complete the initial skill audit (categorize all 136 skills) — carry forward from ecc-skill-audit.md
2. Study ECC's hook architecture more deeply — our hooks are basic compared to what's possible
3. Review ECC's `docs/` directory for patterns applicable to our system documentation
4. Evaluate `SOUL.md` and `identity.json` patterns — done, SOUL.md created

## Success criteria

- ECC is a known resource that sessions consult before building new capabilities
- Imported patterns are adapted, not cargo-culted
- The system's own theory (in the library) informs what gets imported
- This plan stays potential and gets revisited as the system grows
