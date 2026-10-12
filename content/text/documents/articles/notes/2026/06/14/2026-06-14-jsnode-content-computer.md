---
title: "jsnode-content-computer"
description: "Reviews the jsnode-doc-computer app built this session — which audits a workspace package for missing README/AGENTS.md/CLAUDE.md/dev artifacts and generates deterministic skeletons from package.json metadata alone — and diagnoses what is wrong with that purely deterministic approach."
keywords:
  - package
  - computing
  - organizing
  - structure
  - codec
  - knowing
---


## What exists and what's wrong with it

`apps/jsnode-doc-computer` was built this session.
It can: - audit a workspace package for missing README/AGENTS.md/CLAUDE.md/dev/ artifacts - generate README/AGENTS.md/CLAUDE.md skeletons from `package.json` metadata alone

The skeletons are purely deterministic: they reflect the package name, description, exports list, and dependency list.
They contain no real explanation of what the package does, no usage examples derived from the actual source, no tutorials, no guides.
A human still has to write all the content.
The tool is useful for auditing and for first-pass stubs, but it is not a content producer.

The `dev/docs/{explanations,guides,tutorials,references}` and `dev/planning/` directory structure should only exist when there is real content to put in it — empty scaffolding is noise.

`jsnode-doc-computer` should be deprecated once `jsnode-content-computer` exists.

## What we actually need

`apps/jsnode-content-computer` — a content-farm property adapter for jsnode packages.

The `services/content-farm` already runs a full witnessed cultivation cycle: demand creates an assignment, the farm selects a source story as the lens, `makeAsk` drafts over an OpenAI-compatible endpoint (NIM by default), editorial gates judge the draft, revisions happen at most twice, and the candidate is projected into a content store.
This is exactly the machinery we need — we just need to point it at a jsnode package instead of a news publication.

## The mapping

| content-farm concept | jsnode-content-computer equivalent |
|---|---|
| property | one workspace package |
| seed terms / beats | doc types: `explanation`, `tutorial`, `guide`, `reference` |
| source intake / syndication | package surface: types, functions, exports extracted by `javascript-computer` + `jsnode-computer`; existing source comments and any existing docs |
| story selection | pick the most load-bearing exported symbol(s) as the lens for this doc |
| voice | operator-configured: technical depth, audience (maintainer vs user), house style |
| content store | `<pkg>/dev/docs/<type>/` |
| run trace | `<pkg>/dev/planning/runs.jsonl` |
| gates | doc-specific: has-example, cites-types, no-hallucinated-api, length, prose-lint |

## What jsnode-content-computer needs to do

1. **Read the package surface** — use `jsnode-computer`'s workspace discovery and `javascript-computer`'s TypeScript introspection to extract the exported types, functions, and classes with their doc-comment context.

2. **Read existing material** — scrape any existing README, source comments, `dev/docs/` files, and the package description as intake context.

3. **Build a property config** from those inputs: seed terms are the doc types (`explanation`, `tutorial`, `guide`, `reference`) crossed with the package's most load-bearing exports (ranked by consumer count from `jsnode-computer`'s consumption index).

4. **Run `cultivate`** (or a derivative) with `makeAsk` pointing at the configured LLM endpoint (NIM / groq / whatever the operator configures) to produce the actual doc files.

5. **Project output** into `<pkg>/dev/docs/<type>/<symbol-or-topic>.md`.

6. **Audit command** (inherited from `jsnode-doc-computer`) — show which doc types exist for which packages, ordered by load-bearing rank.

## CLI shape

```
jsnode-content-computer cultivate <pkg> [--type explanation|tutorial|guide|reference] [--symbol <name>] [--model nim|groq]
jsnode-content-computer audit [<pkg>] [--format text|json]
jsnode-content-computer readme <pkg> [--write]   # LLM-written, not template skeleton
jsnode-content-computer agents <pkg> [--write]
jsnode-content-computer claude-md <pkg> [--write]
```

## Dependencies

- `@emsenn/jsnode-ick/workspace` and `@emsenn/jsnode-ick/actions` — workspace discovery, package facts, consumption index, decommission audit, and ICK action dispatch (load-bearing rank)
- `@emsenn/javascript-computer` — TypeScript surface introspection
- `@561-group/content-computer` — `makeAsk`, provider config (NIM/groq)
- `@561-group/content-topology` — production cycle carriers (witness/obstruction)
- `@561-group/language-editing` — prose gate (already used by content-farm gates)

## Order of work

1. Define `JsnodeProperty` — the property shape for a package (surface + voice + content store path + ask config).
2. Build `readPackageProperty(dir, opts)` — reads the package into a `JsnodeProperty` by combining `@emsenn/jsnode-ick` workspace/topology discovery + TypeScript surface introspection + existing doc scrape.
3. Port/adapt the content-farm `cultivate` loop for doc production (gates differ: doc gates, not news gates).
4. Wire the CLI.
5. Deprecate `jsnode-doc-computer` — keep `audit` and the deterministic skeleton generators only as thin module/package documentation strategies over `@emsenn/jsnode-ick` workspace/topology/action carriers, or delete them once the LLM-written versions supersede them.

## Apply in load-bearing order

Once built, run against: 1.
Root workspace (`@561-group/workspace`) 2.
`lib/meme-topology` (49 consumers) 3.
`lib/content-topology` (40 consumers) 4.
`apps/jsnode-ick/topology` 5.
`lib/llm-topology` (10 consumers) 6.
`lib/web-topology` (7 consumers) 7.
`apps/jsnode-content-computer` itself
