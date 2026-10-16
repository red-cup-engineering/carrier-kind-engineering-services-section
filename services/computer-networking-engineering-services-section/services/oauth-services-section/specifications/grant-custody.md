# OAuth grant custody and refresh exchange

The existing authorization server keeps its public endpoints, token format, per-kind JSON
files and grant lifetimes. It does not request a new authorization to recover a storage
failure. A failure to read or publish custody is a bounded server error, not evidence that
the caller's grant expired.

## Explicit storage profiles

`createJsonFileGrantStore(directory, { profile })` accepts `process-local-v1` (the existing
default) or `linux-local-flock-v1`. The default serializes one store object only. It is not
cross-process custody. Memory custody performs one synchronous compare/exchange and has
no filesystem durability claim.

The Linux profile requires Linux, an absolute store directory, util-linux `flock`, and a
supported local filesystem (ext, XFS, Btrfs, tmpfs or OverlayFS). Its `.oauth-grants.lock`
uses a kernel advisory lock held by the parent file descriptor. Process exit releases it;
there is no timed stale-lock deletion or grace lease. Contention and missing/unsupported
facilities refuse. The held lock file and store-directory identities are checked around
publication. All writers of the same directory must use the same profile and lock path.
An old writer or a process-local writer that ignores this contract defeats exclusion.

The four existing callers accept an explicit host selection: the FeltOS private service
option (or host environment), the principal-admission CLI flag (or host environment), the
Hive server option (or host environment), and L-Space's supplied environment. The common
environment field is `OAUTH_GRANT_STORE_PROFILE`; the CLI flag is `--grant-store-profile`.
These are host/operator inputs, never public OAuth request fields. No source change here
sets that field in a deployment. Actual selection, coordination of every writer, draining
older writers, and any live custody migration are separate operating decisions.
An explicit selection must match the returned store's profile. Each caller rejects an
older provider that ignores the option, and callers with an optional file-store location
reject explicit file custody when that location is absent. Omission preserves the existing
memory/default behavior. The platform captures one selection for bootstrap, full entrance,
reset and federation restart.

## One-use refresh publication

The server authenticates the client and validates scope/resource before preparing a
replacement. The store's `exchangeRefresh` compares the retained refresh and, for a
registered client, its unchanged client record inside custody serialization. A removed or
changed record refuses before publication. A custom store without this operation refuses
refresh rather than falling back to separate get/delete/mint calls.
Access scope may narrow to the validated request. The successor refresh retains the
predecessor's original scope, allowing later access within that same original grant.
Unknown custom exchange exceptions become a fixed server error; deliberate OAuth errors
retain their existing codes and descriptions. This is not a general claim that all accepted
payloads or all other historical custom-store diagnostics are private.

The new access record is written first. Old/new refresh entries are replaced together by
one refresh-file rename, the final grant-consumption boundary. Token values are returned
only after both publications complete. Existing token hashes and record shapes remain
readable; no old refresh token is extended, restored or given a retry grace period.

Each Linux-profile publication syncs its exclusive temporary file before rename and the
directory afterward. This requests the filesystem's durability boundary; it does not prove
underlying hardware power-loss behavior or make volatile storage persistent. Failed or
uncertain publication invalidates cached state and never rolls the durable file backward.
After a possible refresh commit, the next invocation observes retained state before it can
proceed. A crash before refresh publication may leave an unreturned random access record;
its token value was not returned and its original access expiry still applies. Expired
records are removed during the existing per-kind write compaction. It grants no refresh
retry exception.

## Standards and scope

[RFC6749 section 6](https://www.rfc-editor.org/rfc/rfc6749.html#section-6) requires client
authentication/binding and refresh validation without widening the requested scope.
[RFC9700 section 4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14) requires
public-client replay protection through sender constraints or rotation, including retained
token-family relationships and revocation of the active refresh on detected reuse.
The [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
also requires public-client refresh rotation and audience validation.

This correction addresses exchange serialization and publication. The existing provider
does not retain refresh-family relationships or revoke an active successor on predecessor
replay. That remains a separate security-contract defect; these tests are not a claim of
complete RFC9700 replay protection. No test or source inspection establishes why an actual
connector returned `invalid_grant`, or recovers a missing/consumed live refresh token.

## Qualification

Ordinary package tests keep memory/default controls portable and skip Linux-specific
cases only with an explicit missing-capability reason. `npm run test:linux-custody` requires
the Linux qualification and fails instead of skipping it when its facilities are absent.
Successful fixture checks are not evidence that a deployed host selected the profile.
