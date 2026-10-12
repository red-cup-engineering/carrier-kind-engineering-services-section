---
name: "The TRC thing-directory IS an Anthropic skill-directory — 2026-05-26"
description: Recognition that the SPOTCOMP typed-resource-catalog thing-directory layout is a strict superset of the Anthropic Claude Code skill-directory spec — every well-formed TRC thing is already a skill in waiting, and the library/{persona}/library/{skill}/ pattern I built in the personhood layer was a parallel nesting that ignored this. Captured at the moment emsenn pointed it out, after I'd already shipped two phases (gatekeeper, personhood) without noticing.
---

# The TRC thing-directory IS an Anthropic skill-directory — 2026-05-26

emsenn pointed out, with meme-voice exasperation, that I had failed (twice, across the gatekeeper and personhood phases) to notice that the SPOTCOMP typed-resource-catalog thing-directory layout and the Anthropic Claude Code skill-directory spec are *the same shape*. Verbatim: *"wait, any directory on any system that's well-formed for ME can also be a sound categorical object?" "always has been."* The recognition is recorded here because it changes how every subsequent phase composes — skills aren't a layer to add on top of the TRC; they're a reading of what's already there.

## Side by side

The Anthropic Claude Code skill spec (`code.claude.com/docs/en/skills`, fetched 2026-05-26):

```
my-skill/
├── SKILL.md           # frontmatter (name, description, allowed-tools, …) + body
├── template.md        # optional
├── examples/          # optional
└── scripts/           # optional scripts Claude can execute
    └── validate.sh
```

The SPOTCOMP TRC thing-directory:

```
{thing-slug}/
├── {thing-slug}.schema.json   # typed I/O contract
├── {thing-slug}.md            # canonical prose with YAML frontmatter
├── {thing-slug}.jsonl         # per-thing positing log (optional)
├── scripts/                   # morphism scripts (closure rules)
│   └── {verb}.mjs
├── library/                   # sub-things
├── hacking/library/           # admitted derivation gaps
└── docs/                      # specifications, dev journal, conformance
```

The Anthropic skill is a strict subset. Every field the Anthropic spec asks for, the TRC layout already supplies:

- `SKILL.md` ↔ `{thing-slug}.md` (both are markdown with YAML frontmatter carrying `name` and `description`; the TRC adds typed schema-validated fields)
- Optional `scripts/` ↔ `scripts/` (literally the same name)
- Optional `examples/`, `templates/` ↔ `library/` (the sub-thing region)

The TRC adds, on top of the Anthropic spec:

- `{thing}.schema.json` — the typed input/output contract the morphism honors (Anthropic skills carry types only in prose)
- `{thing}.jsonl` — the per-thing positing log; cells about this thing accumulate here (Anthropic skills are stateless)
- `hacking/library/` — admitted-but-undischarged sub-derivations (the `sorry` analogue per Lean / Agda / Coq, surfaced at the file-system level)
- `docs/` — normative specification, dev journal, conformance tests (Anthropic skills carry conformance only in prose)

By-yoneda the two formats present the same identity at the structural level: a directory that satisfies one satisfies the other. SPOTCOMP is the Anthropic skill spec with typed I/O, persistent state, gap-marking, and a documentation discipline added — the same primitive, more fully derived.

## What this means in practice

Every existing TRC morphism is already a Claude Code skill, modulo two operational hookups:

1. **Naming.** Claude Code's skill loader looks for `SKILL.md` by filename. The TRC's canonical prose lives at `{thing-slug}.md`. The fix is either to add a `SKILL.md` alongside (with Anthropic-spec frontmatter — `description` for activation triggering, `disable-model-invocation`, `allowed-tools`, etc.) or to rename. I picked "add alongside" for the demonstration commits (`find/SKILL.md`, `persona-loader/SKILL.md`) — the typed schema and the script remain at their canonical TRC paths; SKILL.md is the operator-facing surface.

2. **Discoverability.** Claude Code's loader walks `~/.claude/skills/`, project `.claude/skills/`, and `--add-dir` paths. The TRC sits deep inside `active/`. A future bridge — symlinks from `.claude/skills/<slug>/SKILL.md` into the TRC, or `--add-dir` pointed at the TRC root — will surface the existing thing-directories to Claude Code's skill loader without restructuring them.

The recognition retires the library/{persona}/library/{skill}/ pattern I built in the personhood layer (commit a883f74e4). Skills are not sub-things of personas; they are first-class typed-things at their own canonical TRC paths. The persona's `roles.grants-skills` field references skill slugs, resolved through the catalog. I deleted the empty `library/` directories from `in-dir-claude/` and `top-level-claude/` and updated their canonical prose to record this reading.

## What was missed twice

Both shipped phases — the gatekeeper (commit 969959578) and the personhood layer (commit a883f74e4) — could have made the SKILL.md isomorphism explicit:

- The gatekeeper phase introduced morphisms (`find`, `list`, `chain`, `check-placement`, `log-justification`, plus the schema-tools family) that are *exactly* the kind of thing Anthropic skills name. Each could have shipped with a SKILL.md.
- The personhood phase created persona directories that ARE skill-shaped (CLAUDE.md, SOUL.md, MEMORY.md, AGENTS.md — all instruction-bearing markdown files Claude Code already knows how to load). Adding SKILL.md would have made the personas invocable via `/in-dir-claude` and `/top-level-claude` — a persona-switch slash command, free of additional infrastructure.

Neither phase did so. The reading "TRC thing-directory IS skill-directory" wasn't internalized. The fix this turn — two demonstration SKILL.md files plus the personhood library/ cleanup — encodes the recognition; subsequent phases will inherit it.

## Where the demonstration files live

- `…/spotcomp/hacking/library/spotcomp-tools/library/finding/SKILL.md` — first demonstration, attached to an existing MCP-exposed morphism
- `…/claude-code/library/persona-loader/SKILL.md` — second demonstration, attached to a morphism authored this phase

Both SKILL.md files explicitly reference the dual reading: the same directory is a Claude Code skill (the SKILL.md interface) and a SPOTCOMP typed-thing (the schema + script + future jsonl). The TRC files are the substance; SKILL.md is the surface.

## Forward implications

- Every existing TRC morphism (find, list, chain, check-placement, write/validate/lint/audit/name-a-schema, log-justification, persona-loader, derive-rules, gate, resume, checkpoint, articulate, …) is a candidate skill. Adding SKILL.md to each takes minutes per file.
- A future "expose to .claude/skills/" closure-rule could scan the TRC for SKILL.md files and symlink them into the project's `.claude/skills/` directory automatically — same substrate, exposed to the loader.
- Personas themselves are skill-shaped (they have CLAUDE.md already). Adding SKILL.md to each persona directory with `disable-model-invocation: true` would make persona switching invocable via `/persona-slug`. Operationally this needs the env-var-AGENT_ID mechanism to be flippable mid-session, which it currently is not — a real switch requires a new session — but the skill manifest can document the intent.
- The "any well-formed directory is a sound categorical object" reading suggests the same pattern applies one level out: any well-formed Claude Code skill-directory IS a SPOTCOMP-conformant TRC thing once typed schemas, jsonl logs, and docs are added. Skills imported from `~/.claude/skills/` could be lifted into the TRC and immediately gain typed I/O, cell-log accumulation, conformance specs.

## References

- `code.claude.com/docs/en/skills` — the Anthropic Claude Code skill spec (fetched 2026-05-26)
- `agentskills.io` — the open standard Claude Code's skill spec follows
- `lab/hacking/library/doing/governing/characters/karen-wiener/` — the lab's existing character convention this work also builds on
- `lab/tech/computing/continuous-computation/artificial-intelligence/agentic-intelligence/agentic-orchestration-platform/pyfars/governance/skills/running-roadmap-enrichment-cycle/SKILL.md` — a lab example of SKILL.md authored for the running-roadmap-enrichment-cycle skill
- commit a883f74e4 — the personhood layer that introduced the (now-retired) library/{persona}/library/{skill}/ pattern
