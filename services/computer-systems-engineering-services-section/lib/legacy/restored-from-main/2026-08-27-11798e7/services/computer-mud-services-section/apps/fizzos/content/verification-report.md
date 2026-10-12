# FizzOS verification report

Verified on 2026-08-12 with Node.js 20-or-newer package semantics.

## Archived benchmark

- Dedicated source generations compared: 2026-07-12 and 2026-08-01.
- Distinct archived test categories: 50.
- Categories registered with current implementation and test evidence: 50.
- Archived public paths retained as aliases: 0.
- Current one-to-one public module paths: 41.
- Current executables: 6.

## Current assays

- Syntax checks: passed for all source, examples, scripts, and tests.
- Current tests: 60 passed, 0 failed.
- HTTP: real ephemeral listener exercised end to end.
- Service lifecycle: real process terminated cleanly by SIGTERM.
- Stability: two identical 26,880-tick autonomous runs replayed exactly.
- Continuity: exact snapshot restoration and bounded active assertion trace.
- Packaging: the dry-run enumerated a 76-file, dependency-free source artifact.
- Public surface: all 41 exports and all 6 executables loaded during the sealed
  50-category concordance assay without importing the legacy corpus.

## Result

The current implementation meets the archived capability-category union and
beats the archived package form in modularity, immutable semantics, explicit
contradictory evidence, package independence, reproducible long-horizon replay,
graceful service lifecycle, and self-contained verification.

The authoritative reproducible command is:

```sh
npm run verify
```
