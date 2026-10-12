---
title: "Context Spacesuits in Agentic AI"
description: "Survey of how agentic AI systems package context at session start — the structural pattern, implementations in current systems, efficiency costs, and the three-domain convergence with military kits and RPG loadouts."
date-created: 2026-04-06
terms-used:
  - context-spacesuit
  - fiber
  - system-prompt
sources:
  - "Claude Code documentation — system prompt, CLAUDE.md, tool definitions, rules"
  - "Cursor IDE — .mdc files, @-mentions, workspace state"
  - "Cline — system prompt expansion, MCP tool definitions, workspace state"
  - "Devin (Cognition) — environment representation, directory structure, test harnesses"
  - "Settlingday Architecture Synthesis (operations/command/endeavor/records/analyses/settlingday-architecture-synthesis.md)"
  - "Wikipedia: Five Paragraph Order (SMEAC)"
  - "Wikipedia: Environment Variable"
---

Every agentic AI system that operates in a repository, codebase, or organizational context must solve the same problem: before the model can do anything useful, it must be told what it's looking at, what tools are available, what rules apply, and what happened before. This package — the [context spacesuit](../../../glossary/terms/context-spacesuit.md) — is loaded at session start and determines the agent's perceivable world for the duration of the session.

## How current systems implement it

**Claude Code** loads a layered suit: a system prompt (~3K tokens) defining role and tools, then CLAUDE.md files (project instructions, checked into the codebase), then rules (from `.claude/rules/`), then tool definitions, then session state including git status and recent context. Skills load on demand when invoked. The total can reach 25-30K tokens before any user input.

**Cursor IDE** assembles context from system-level rules (`.mdc` files with glob patterns for file-type-specific instructions), intent context (what the user is trying to do), state context (current file, workspace structure, diagnostics), and surgical `@-mentions` that pull specific files or documentation into scope.

**Cline** expands a system prompt with workspace state, environment variables, custom rules (`.clinerules`), MCP tool definitions, and conversation history before each model call. The expansion is aggressive — Cline aims for the model to have complete situational awareness.

**Devin** (Cognition's autonomous agent) builds a detailed environment representation including directory structure, test harnesses, API documentation, dependency graphs, and prior session state. The suit is designed for long-running autonomous sessions where the agent must navigate without human guidance.

## The structural pattern

Despite different implementations, all four systems assemble the same structural components:

| Component | What it provides | Claude Code | Cursor | Cline | Devin |
|-----------|-----------------|-------------|--------|-------|-------|
| Identity | Who am I? | System prompt | System rules | System prompt | Agent definition |
| Constraints | What can't I do? | Rules, hooks | .mdc files | .clinerules | Safety bounds |
| Capabilities | What can I do? | Tool defs, skills | Extensions | MCP tools | Tool inventory |
| Perception | What do I see? | Git status, files | Workspace state | Environment | Dir structure |
| Memory | What happened before? | CLAUDE.md, session | Conversation | History | Prior sessions |
| Mission | What should I do? | User message | User intent | User request | Task spec |

The first five components are the suit. The sixth — the mission — is what the suited agent encounters.

## The three-domain convergence

The context spacesuit solves the same structural problem that military operations and role-playing games solved independently:

**Military briefing kit.** The five-paragraph order (SMEAC: Situation, Mission, Execution, Administration/Logistics, Command/Signal) structures everything an officer needs before deploying. Situation = perception (what do I see?). Mission = the task. Execution = capabilities (what tools and tactics?). Admin/Logistics = constraints (what resources, what limits?). Command/Signal = identity and authority (who am I, who do I report to?). The officer who doesn't receive the briefing cannot parse the mission. The officer who receives a different briefing sees a different war.

**RPG character loadout.** A character sheet carries ability scores (base capacities), skills (learned aptitudes), inventory (equipment and resources), quest log (mission state), and character description (identity and constraints). The composition of the loadout determines what the character can attempt in the dungeon. A wizard and a barbarian in the same room have different available actions — not because the room is different, but because the loadout is different.

**OS process context.** Every Unix process inherits environment variables (PATH, HOME, configuration), file descriptors (stdin/stdout/stderr), a working directory, process limits (ulimit), and a privilege level (uid/gid). The process cannot access files outside its permissions, cannot find executables outside PATH, cannot exceed its CPU quota. The context is not the execution; it is the bounded space in which execution is possible.

All three are fiber compositions: the predicates an entity carries into a composition determine what it can perceive and do. The convergence is not metaphorical — all three domains discovered that agents operating in complex environments need a structured package of context that determines their perceivable world.

## The cost problem

Context spacesuits are expensive. The Settlingday Architecture Synthesis found that the current 561 system loads 515 tokens of context per 1 token of fresh input — a 515x overhead ratio. 82% of sessions have extreme overhead. 85% of total cost goes to sessions that load massive context to make small decisions.

This overhead is the same problem in all three domains:
- **Military:** an over-briefed officer spends more time reading than acting
- **RPG:** a character sheet so complex that turns take 20 minutes of bookkeeping
- **OS:** a process whose environment setup takes longer than its computation

The settlement path reduces suit size by moving work from the expensive shell (LLM with full context) to a deterministic kernel (zero tokens) and trained micromodels (near-zero marginal cost). The minimal suit loads ~1.5K tokens: task definition, core rules, and essential directives. Everything else is handled by the kernel or looked up on demand.

## See also

- [Context spacesuit](../../../glossary/terms/context-spacesuit.md) — the term definition
- [System prompt](../../../services/inference-services-section/content/glossary/terms/system-prompt.md) — the core identity layer of the suit
