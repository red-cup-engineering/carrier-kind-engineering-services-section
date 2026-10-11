# Native file history and explicit historical qualification

`createFileHistoryStore` remains the private flatfile port of the content
history kernel. Opening it does not run a database engine or convert historical
material. The existing offline reader/receiver remains the historical route.

A primary carrier with the earlier SQLite header refuses with
`SIGNCRAFT_LEGACY_HISTORY_UNRECEIVED` before native custody is constructed. Any
retained `.sqlite` backup beside a null native frontier also refuses, whether
the cache is missing or explicitly null and whether the backup is complete or
truncated. Primary and backup paths must be regular files when present. Invalid
native reference material is also refused at opening. Unresolved `-wal`, `-shm`, `-journal` or `.admission` sidecars beside either
primary or backup obstruct opening even if empty or a native frontier exists.
The store never reclaims these files. Refusal does not rename,
overwrite, delete, convert or seed a carrier.

A non-null native publication chain is read through the existing immutable
content-reference provider. Its latest frontier, rather than a missing, null
or stale acceleration cache, determines recovery. Native history and control
remain subject to the kernel's original validation. A saved SQL backup is left
byte-for-byte intact during native recovery and continuation. This does not
certify that the backup has been converted or that its contents equal native
history. A genuinely new location with no prior carrier retains the existing
native empty-to-current contract.

Default `test/**/*.test.mjs` keeps all native historical-row, protocol-boundary,
content-history, in-memory and flatfile cases. It also exercises the actual JS
receiver on an explicitly authored row carrier. No SQL file is built or read
by these cases; the protocol fixture is inert data.

The original mixed historical-admission test source is conserved under
`qualification/legacy-sql/history-admission-effects.test.mjs`, with only import
and fixture/script paths relocated. `npm run test:legacy-sql` explicitly
selects it. This suite builds a SQL file using Python and executes the original
read-only historical reader. It must not run under a no-SQL qualification.
Its original SQL-only body, reader, fixture builder and fixture bytes remain
available; relocation/source conservation is not execution evidence. The
existing reader and JS receiver are unchanged and are never invoked by native
startup. This change makes no historical migration or activation claim.
