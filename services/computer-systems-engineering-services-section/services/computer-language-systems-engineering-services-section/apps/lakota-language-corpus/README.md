# @emsenn/communicating-in-lakota

Lakota communicating fiber over `@emsenn/communicating`.

This package is a finite, manifest-backed computational Lakota seed.
It does not claim full Lakota grammar.
It admits witnessed bundle data, a small pronominal-affix corpus, finite orthographic variants, finite verb paradigms, finite particle witnesses, finite verb-frame witnesses, and dispatcher actions that read and generate only the forms carried in the package evidence.

## Maturity

- Built+green: the package loads `data/manifest.json`, compiles the Lakota bundle, reads `data/corpus.jsonl`, exposes manifest/corpus/generation/paradigm actions, and has package-local tests for finite morphotactic readback.
- Research-grade: the admitted orthographic normalizations, pronominal-affix series, sentence-final particles, implicit agreement participants, and verb frames are small slices of computational Lakota morphology and semantics, currently represented as token/frame features and cross-checked against local source-corpus notes.
- Roadmap: orthography normalization, broader verb classes, enclitics, valence, implicit arguments, semantic frames, and source-expanded corpora.

## Evidence

- `data/manifest.json` is the language manifest and RWIL evidence surface.
- `data/corpus.jsonl` is the package-local witnessed corpus.
  Token entries may assert zero dependency arcs.
  Contextual sentence entries omit `expect.arcs` when syntax is still underdetermined and only assert defensible token features.
- `data/maturity.json` is the machine-readable maturity report. It explicitly makes no `Proven-in-Lean` claim for Lakota-specific capabilities yet.
- `data/research-obligations.json` is the machine-readable list of remaining Roadmap obligations and the evidence needed to upgrade them.
- Source anchor for the current finite verb forms:
  LDL 121 Intensive Lakota/Dakota for Beginners,
  <https://wotakuye.weebly.com/uploads/2/3/7/4/23749479/ldl121_packet.pdf>.
- Additional line-cited research witnesses live in:
  `dev/content/researching/notes/lakota-corpus.md/2026-06-26-black-elk-letters.md`
  and `dev/content/researching/notes/lakota-corpus.md/2026-06-26-lakota-corpus.md`.

## Interfaces

The root import exposes the complete Lakota fiber:

```js
import { read, settle, articulate, actions } from "@emsenn/communicating-in-lakota";
```

Use the named subpaths when a consumer needs only one package surface:

- `@emsenn/communicating-in-lakota/compiled`: the compiled Lakota bundle.
- `@emsenn/communicating-in-lakota/raw-bundle`: the raw manifest bundle.
- `@emsenn/communicating-in-lakota/manifest`: manifest evidence and receipts.
- `@emsenn/communicating-in-lakota/actions`: dispatcher action surface.
- `@emsenn/communicating-in-lakota/corpus`: witnessed corpus and finite form generation.
- `@emsenn/communicating-in-lakota/paradigms`: finite paradigm generation.
- `@emsenn/communicating-in-lakota/orthography`: variant-preserving finite normalization.
- `@emsenn/communicating-in-lakota/particles`: finite particle witnesses.
- `@emsenn/communicating-in-lakota/frames`: finite verb-frame witnesses.
- `@emsenn/communicating-in-lakota/maturity`: maturity-graded capability report.
- `@emsenn/communicating-in-lakota/obligations`: remaining Roadmap obligations.

## Actions

The `communicate` binary exposes the inherited communicating actions plus:

- `read-lakota-corpus`: read the witnessed corpus.
- `generate-lakota-form`: finite generation by corpus readback.
- `generate-lakota-paradigm`: finite paradigm generation by corpus and orthography readback.
- `normalize-lakota-orthography`: finite orthography normalization that preserves each observed variant.
- `analyze-lakota-particles`: finite particle analysis by line-cited evidence readback.
- `analyze-lakota-frames`: finite verb-frame analysis with agreement-derived implicit participants.
- `read-lakota-maturity`: read the maturity-graded capability report.
- `read-lakota-research-obligations`: read remaining Roadmap obligations and upgrade criteria.

Example:

```sh
printf '{"root":"čhíŋ","features":["agreement:actor:1sg"]}' \
  | communicate generate-lakota-form
```

This returns `wačhíŋ` because that exact form is admitted in the corpus.
It does not generalize beyond witnessed entries.

```sh
printf '{"root":"yuhá"}' \
  | communicate generate-lakota-paradigm
```

This returns the witnessed `yuhá` paradigm cells and includes the attested/recorded surface variants `bduhá` and `duhá` without treating the package as a full conjugator.

```sh
printf '{"text":"bduhá weló duhÁ"}' \
  | communicate normalize-lakota-orthography
```

This normalizes the witnessed variants to `bluhá yeló luhá` while keeping `bduhá`, `weló`, and `duhÁ` as preserved observed variants in the token records.

```sh
printf '{"text":"Míš-eyá héčha waŋží wačhíŋ kštó."}' \
  | communicate analyze-lakota-particles
```

This returns an underdetermined witness for `kštó`.

```sh
printf '{"text":"wačhíŋ. luhá. ečíyapi."}' \
  | communicate analyze-lakota-frames
```

This returns underdetermined frame carriers for the witnessed roots and marks participants as implicit when they are read from agreement features rather than from explicit sentence dependents.

```sh
printf '{}' \
  | communicate read-lakota-maturity
```

This returns Built+green and Research-grade package capabilities, Roadmap obligations, and the explicit `none-claimed` status for Lakota-specific `Proven-in-Lean` claims.

```sh
printf '{}' \
  | communicate read-lakota-research-obligations
```

This returns the package-local Roadmap obligations, including contextual syntax arcs, broader verb classes, productive generation, the enclitic system, semantic complements, orthography policy, and source governance.

## Verification

```sh
pnpm --filter @emsenn/communicating-in-lakota run check
pnpm --filter @emsenn/communicating-in-lakota run build
pnpm --filter @emsenn/communicating-in-lakota run test
pnpm --filter @emsenn/communicating-in-lakota run examples
```

`examples/current-surfaces.mjs` emits a compact JSON tour of the current finite surfaces: form generation, paradigm generation, orthography, particles, frames, maturity, and remaining obligations.

## Known limitations (recorded 2026-08-21)

- `src/scripts/communicate-serve.mts` imports `serve` from `@emsenn/relating`,
  which does not exist in the pinned-and-published `relating@0.0.0` (the
  script was written against a later, never-published build). It is excluded
  from `tsc` checking in `tsconfig.json` rather than patched; restoring it
  requires either publishing the later relating or porting the script to the
  current `@red-cup-engineering/agentic-relation-engine` lineage — a deliberate decision for
  a future session, not housekeeping.
- The legacy `@emsenn/communicating@0.0.0` and `@emsenn/relating@0.0.0`
  dependencies were published to the local Verdaccio on 2026-08-21 (from the
  semiotic-computer-system lib/legacy copy, `--ignore-scripts`, prebuilt
  dist) solely so this package installs; they remain legacy-era code and no
  new work should depend on them.
