# Workspace layout

This page used to describe the old many-crate prefix taxonomy. That
taxonomy no longer matches the code: the current workspace is
consolidated into two crates.

| Crate | Purpose |
|-------|---------|
| `mash-engine` | The substrate: Belnap values, morphism kinds, proof cascade, hub, SDK, and low-level utilities. |
| `mash-library` | The library corpus: OQRA vocabularies, scenes, projections, storage/document vocabulary, testing helpers, and operator binaries. |

The old names still appear in historical docs and porting comments,
but they are not valid Cargo packages in this workspace:

- `mash-math-*`
- `mash-sdk-*`
- `mash-vocab-*`
- `mash-port-*`
- `mash-scene-*`
- `mash-hub-*`
- `mash-testkit`

New code should land in the current modules unless there is an
explicit decision to split a crate back out. The current split is:

- `mash-engine::algebra`, `::inference`, `::proof`, `::hub`, `::sdk`,
  and `::util` own the ontology-neutral substrate.
- `mash-library::*` owns domain meaning: foundation, operation,
  storage, discourse, governance, MUD/Teraum content, projections, and
  test scenes.

## Enforcement

Run locally from the workspace root:

```bash
scripts/check-crate-taxonomy.sh
```

The script checks that the workspace still contains only the current
consolidated crates and that `Cargo.toml` names match their
directories. It is intentionally small until the project commits to a
new split-crate taxonomy.
