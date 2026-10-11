# Explicit historical Discord receiving

The native Discord journal store does not import a SQL reader. Its original revision/update/rate-limit behavior remains unchanged. The former public runtime SQL importer is private here.

`importSqlDiscordAdmission(source, store, {expectedSha256, python?})` requires an independently supplied exact digest, a regular original no larger than16 MiB, no symbolic-link ancestors or unresolved sidecars, and a distinct native destination. Source and native destination must not overlap. A private read-only snapshot is read before any rows are exposed. Every present historical table must contain its declared schema columns, even when empty; at least one admission table must exist. Missing optional tables stay absent. Existing native rows are retained, and rate-limit windows are not imported. Partial admitted rows can survive a failure; retries leave them unchanged. Original bytes and all retained siblings remain intact.

## Historical qualification boundary

These private sources are excluded from their parent runtime package and default test enrollment. The explicit `test:legacy-sql` command executes SQLite through the private Python reader and requires separate permission; it was not run during native qualification. Tests under `original/` are byte-conserved historical evidence and are not enrolled as executable tests. The adapted SQL assays retain their original receiving assertions and are also unexecuted.

Source/custody qualification checks inert bytes, exact digests, aliases, filesystem-root and other overlapping destinations, sidecars, original mutation, and private snapshots without executing a SQL parser. It does not establish a successful historical conversion. No ordinary native opening converts, renames, checkpoints, deletes or resets the original source.
