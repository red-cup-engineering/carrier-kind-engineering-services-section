---
kind: harness
title: "Repo instructions harness"
type: harness
target-default: "."
target-runtime: "repo-root"
---


Generates the repo's root-level agent-instruction files from substrate state plus templates owned by this harness, so they stay in sync with the rest of the corpus instead of drifting as static prose.

## What it writes

| File | Template | Consumer |
|---|---|---|
| `CLAUDE.md` | [`templates/CLAUDE.md.j2`](templates/CLAUDE.md.j2) | Claude Code |
| `README.md` | [`templates/README.md.j2`](templates/README.md.j2) | GitHub renderer; first-time human readers |
| `replit.md` | [`templates/replit.md.j2`](templates/replit.md.j2) | Replit Agent (project context) |

Each generated file carries a banner at the top noting it's harness-generated and pointing at the regeneration command, so a human (or agent) reading it knows not to hand-edit it.

The manifest is written to `.fars/harness-manifests/repo-instructions.json`.

## Substrate context the templates see

The installer assembles a context dict from these sources and passes it to every template:

- **`polity`** — title and slug from [`operations/command/group/561-group.md`](../../../command/group/561-group.md).
- **`captain`** — the personnel record holding `office:command` (handle, title, public-domain pulled from [`operations/command/group/personnel/`](../../../command/group/personnel/_index.md)).
- **`ship`** — title, designation, current-voyage from [`operations/command/group/ships/rsc-quiescent.md`](../../../command/group/ships/rsc-quiescent.md).
- **`charter_path`** — the polity's `charter:` field (path string).
- **`top_theories`** — list of `{slug, title}` for every `library/theories/<area>/_index.md`.
- **`predicated_computing_subtheories`** — list of `{slug, title, path}` for every direct sub-theory under `predicated-computing/theories/`.
- **`pyfars_verb_count`** — count of registered verbs in `pyfars.cli.__main__.VERB_MODULES`.
- **`skill_count`** — count of `SKILL.md` files under `operations/engineering/skills/`.
- **`generated_at`** — UTC ISO timestamp.
- **`generation_command`** — the literal command that regenerates the files.

If the polity / captain / ship records are missing or under-specified, the installer fills the corresponding context fields with `null` and the template emits a `(missing)` marker so the gap is visible in the rendered file rather than silently absorbed.

## Run

```bash
pyfars install-harness repo-instructions                  # write CLAUDE.md, README.md, replit.md
pyfars install-harness repo-instructions --dry-run        # show what would be written
pyfars install-harness repo-instructions --uninstall      # remove via manifest
```

## Editing

To change the prose, edit the templates under [`templates/`](templates/) and re-install. To change a substrate-derived value, edit the substrate (the polity record, the personnel record, the theory's `_index.md`) and re-install. The harness intentionally has no override: if a fact belongs in a generated file, it must be sourced from substrate that anyone can audit.
