# Explicit historical inference ledger receiving

Normal allowance and account-capacity opening accepts native journals only. The configured source locator, including an explicitly named retained backup, and any `-wal`, `-shm`, `-journal` or `.admission` carrier refuse before journal creation, even with an old receipt. Arbitrary sibling names are not guessed. Native records, CAS versions and allowance holds remain durable. Declarations now use the same existing writer lock as reservations so concurrent readers cannot race unprotected declaration appends.

`admitSqlOnce(ledger, source, rowsOf, {expectedSha256, python?})` is an explicit offline operation. It requires an independently supplied exact digest, bounded regular original (64 MiB), no symbolic-link ancestors, no sidecar/admission custody, and a distinct native destination. The source's original derived `.journal` destination is reserved. A private read-only snapshot goes to the existing reader implementation. Required columns of each present table are checked before rows are exposed; at least one recognized table must exist. Receipt identity binds the source digest and is written last. Earlier appended rows may survive a failure; this is not atomic rollback. Original sources are never removed.

## Historical qualification boundary

These private sources are excluded from their parent runtime package and default test enrollment. The explicit `test:legacy-sql` command executes SQLite through the private Python reader and requires separate permission; it was not run during native qualification. Tests under `original/` are byte-conserved historical evidence and are not enrolled as executable tests. The adapted SQL assays retain their original receiving assertions and are also unexecuted.

Source/custody qualification checks inert bytes, exact digests, aliases, filesystem-root and other overlapping destinations, sidecars, original mutation, and private snapshots without executing a SQL parser. It does not establish a successful historical conversion. No ordinary native opening converts, renames, checkpoints, deletes or resets the original source.
