# Receiving the journal kind layout

The journal uses the Data owner's kind/date address law. Dated feed stems live in subject-kind directories under `data/logs`; mutable heads live in the selected physical store's state tier. The source change does not convert a store or select a release.

## Addressed API changes

- `headPath({ indexDirectory }, at, namespace, key)` is pure arithmetic over a required absolute physical index binding. Its previous settlement-root argument cannot discover a linked store's physical state and is no longer accepted. Root-bound `readHead`/`writeHead` select `journalIndexDirectory` after resolving the store and refusing dangling links. Missing ordinary stores can be read without creation.
- `FilesystemJournal.storePacket(log, text)` takes the actual canonical log handle instead of an unbound date. Arrival derives this handle from the same finalized subject/date/options as its append. Relative settlement roots remain supported.
- Low-level `writePacketText(logPath, text)` also takes an actual feed path. `packetDirectoryPath`/`packetArtifactPath` take the store root. Standalone feeds retain their genuine `.metroplat-journal` store.
- The packet carrier stays feed-relative. Its current path is derived through `packetReferencePath` and the provider's shared packet area. A legitimate sibling path includes `..`; only the exact expected target is admitted. The exact historical `packets/sha256/<digest>.json` spelling remains readable after conversion without editing retained statements.

Packet identity and byte length commit to the exact input text. Files contain that text plus one LF. Reads verify raw bytes, the LF boundary, digest and valid UTF-8 before JSON parsing; they do not trim or reserialize. Create-exclusive duplicate writes require byte equality. Conflicting shared/local copies and symlinks below the selected store are refused before reading outside bytes. The selected store link itself is legitimate. These checks assume a controlled local filesystem during the operation; they are not a concurrent adversary or crash-transaction guarantee.

## Discovery and exchange

Daily inventory recognizes canonical plain feeds, witness segments and statement directories. Territory/subject reads retain the genuine admitted ledger's handles, including a missing segment so its read fails closed, and the existing earlier-layout source discovery. Subject reads normalize once and select only that kind. Admission span additionally inventories represented but unindexed feeds, without admitting them. Territory cache signatures include the kind directory entries.

Settlement exchange re-derives the full canonical Data address and checks exact relative spelling, tier, act, subject and date. Retired dated transfer paths are refused. Full-transfer preflight, allowed-label checks and causal admission are unchanged.

## Retained stores and source graph

Data's separately reviewed converter moves historical heads, packets and source representations. Computer readers do not invoke it automatically. The synthetic receiving graph uses Data PR133's additive converter candidate, including its packed-custody repairs; SignGraph's raw-carrier binding candidate; SignChain's proposed owner package; and current FeltOS with its separately proposed fixture-only correction. Each proposal remains separately identified; passing this composition is not source-pin adoption.

Converter conflicts and leftovers remain receiving blockers. Its per-entry moves are not a whole-store transaction, and unknown formats or unqualified linked/plain/packed layouts must not be inferred safe from the bounded fixtures. No retained host store has been inspected or migrated.

SystemEngine's three existing raw `semanticId` consumers now import the direct content-address owner. Their bodies and identity inputs are unchanged. The older content dependency remains for genuine projectors and Jupyter codecs.
