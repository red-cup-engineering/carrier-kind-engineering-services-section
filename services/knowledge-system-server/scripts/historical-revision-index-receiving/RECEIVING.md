# Explicit historical revision-index receiving

This private owner is excluded from the CAIRN package's published files and default tests. Normal `openRevisionIndex` never imports it, probes a database header, spawns the Python reader or imports historical rows.

The configured historical file locator, whether an original or an explicitly named retained backup, and its exact `-wal`, `-shm`, `-journal` and `.admission` carriers cause native opening to refuse before journal creation. Arbitrary sibling names are not discovered or classified as backups. The native `<file>.journal` directory is permitted; an earlier admission inside that directory does not waive historical custody refusal.

## Offline contract

Call `importSqlRevisionIndex(file, store, { expectedSha256, python? })` only in an explicitly authorized offline receiving session. `expectedSha256` is the independently supplied lowercase SHA-256 digest of the original source. `store` must be an `openRevisionJournal` journal with a distinct destination root. The original's native `<file>.journal` root, source/carrier paths, overlapping ancestor destinations, non-directory destinations and symbolic-link ancestors are refused.

The wrapper refuses all recognized sidecar/admission carriers, including zero-byte files, directories and dangling symlinks. It reads the original using a no-follow descriptor, checks identity and stable file metadata, creates a private read-only snapshot, and verifies both snapshot and original again before recording completion. Only its own scratch snapshot is removed. It never checkpoints, renames, overwrites, deletes or resets original custody.

The actual existing private `historical-sql-reader-service` API remains the reader. It invokes isolated Python, exits before exposing received rows, and retains its bounded regular-file/header/row/time checks and blob/numeric handling. The body/body_text JOIN and `body_text.text` alias, cursor grouping, 500-row batching and journal idempotence are preserved. Required tables and invalid received row values refuse before receiving any row; an empty correct schema remains valid.

The relocated actual reader validates every required table and required column before emitting metadata or rows, including empty tables. Its original JS/Python bytes are conserved in the private reader package. This source correction has not been exercised against SQL; historical converter qualification remains open.

## Interruption and retry

Completion is the final admission receipt, carrying the expected source digest. A failure before that receipt is incomplete receiving. `discard()` clears only staged records; already-flushed batches remain durable. Retry with the same unchanged source and digest retains bodies and occurrences once. This operation does not claim atomic rollback of earlier batches.

## Assays and conserved sources

`test/` contains the explicitly invoked historical assays, including the adapted original receiving assertions and genuine Python fixture writer. They require separate authorization to run. They are not enrolled in the parent package's default `test/*.test.mjs` command. During this repair they were syntax-checked only; no historical fixture, Python SQL reader or converter was executed.

`original/` retains byte-for-byte copies of the current pre-repair importer, complete mixed journal test and Python fixture writer. These files preserve source history and are not executable test enrollment. Native journal behavior remains in the parent default suite, with all five original native test bodies intact.
