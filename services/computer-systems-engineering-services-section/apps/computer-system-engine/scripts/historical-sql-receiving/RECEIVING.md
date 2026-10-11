# Private historical SQL reader

This is the actual current system-engine JavaScript/Python reader relocated out of runtime exports and published native files. Its original bytes are conserved in `original/`; the three private Inference, Discord and CAIRN receivers depend on this owner. No runtime package depends on it.

`readLegacySqlite(file, specs, use, {python?})` still runs isolated Python read-only/immutable, checks source/header/bounds, receives typed rows into a private scratch file, waits for successful exit before invoking `use`, and conserves blob and numeric handling. Specs now accept `required: true` and `requiredColumns: [names]`. Required tables and all columns are checked while planning, before metadata or rows are emitted, so malformed empty tables cannot become a successful empty receipt. JOIN column checks remain unchanged. Missing optional tables remain absent. The explicit historical tests include malformed and valid empty-schema controls; they have not been executed.

## Historical qualification boundary

These private sources are excluded from their parent runtime package and default test enrollment. The explicit `test:legacy-sql` command executes SQLite through the private Python reader and requires separate permission; it was not run during native qualification. Tests under `original/` are byte-conserved historical evidence and are not enrolled as executable tests. The adapted SQL assays retain their original receiving assertions and are also unexecuted.

Source/custody qualification checks inert bytes, exact digests, aliases, filesystem-root and other overlapping destinations, sidecars, original mutation, and private snapshots without executing a SQL parser. It does not establish a successful historical conversion. No ordinary native opening converts, renames, checkpoints, deletes or resets the original source.
