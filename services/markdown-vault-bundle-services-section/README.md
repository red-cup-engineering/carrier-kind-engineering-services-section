# Markdown Vault Bundle Services Section

Concatenates a Markdown vault subtree's admitted carriers (glossary terms,
topics, concepts, and articles) into a small number of large, deterministic
aggregate Markdown files, sized and capped for bulk ingestion by an external
tool with a small-source-count limit (e.g. Google Gemini Notebook's free-tier
50-source cap). It does not upload anywhere; it only produces files on disk.

## Output location

`--output` (or the `output` option) is required and has no default inside
this git checkout. The checkout is a dev root, not a runtime: generated
bundle files and `manifest.json` are not repo state, and this package never
writes them under its own tree. Point `--output` at a directory outside the
checkout (e.g. a sync staging directory or `/tmp`).

## Determinism

Given the same source carriers, the bundle files and `manifest.json` are
byte-identical across runs: selection, grouping, and packing all sort
explicitly, and no run-varying value (timestamps, absolute host paths)
enters bundle text or the manifest. Only the semantic-record-journal receipt
of a run carries a timestamp.

## Usage

```sh
node scripts/bundle-markdown-vault-carriers.mjs \
  --root /path/to/a/section \
  --output /path/outside/the/checkout/bundle
```

Options: repeatable `--role` (one of `glossary-terms`, `glossary-topics`,
`glossary-concepts`, `articles`; default all four), `--word-budget`
(default 200000), `--max-files` (default 50, Gemini Notebook's free-tier cap),
`--root-label`, `--journal-root`.

If the corpus cannot fit within `--max-files` at `--word-budget`, the run
fails loudly rather than truncating; raise the budget or narrow `--role`.

A carrier whose frontmatter fails to parse is excluded from the bundle and
reported as a defect (`manifest.json`'s `defects`, and on stderr) rather
than aborting the whole run.

## Custody

Every run is recorded through
`@red-cup-engineering/semantic-record-journal-service` at this section's own
`data/logs/` (or `--journal-root` when overridden for testing).
