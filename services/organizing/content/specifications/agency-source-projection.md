# Authored agency source projection

This contract belongs to Organizing's existing agency-record import and read boundary. It supplies source evidence for a record already admitted through the governing agency operation. It does not appoint an office, grant a capability, select a work executor, or turn a Git origin or pathname into institutional authority.

## Existing boundary and missing correspondence

`readAgency` identifies an authored record by its agency-relative `source`, `sectionPath`, key, and SHA-256 byte `revision`. `enactAgencyRecord` and `enactAgencyRecords` retain the revision chain through the existing governing-act log and admit changes under the pre-act agency's authority. The current record reader does not retain the source repository, immutable commit, Git blob, or source-to-agency projection that supplied those authored bytes.

An agency persisted separately from its software release therefore cannot recover that correspondence from a matching path or an equal record body. Existing records without a source-projection witness remain unresolved. No migration receipt may be reconstructed from an old description or from the repository that happens to be reachable now.

## Domain

A source projection takes all of the following from the actual authorized import boundary:

- A separately admitted exact source-working-copy binding, using the existing Git custody contract: repository identity, complete ref, immutable commit, source-copy identity, and custody identity/revision/evidence
- A regular-file observation at an exact path in that commit, with Git blob identity and the complete observed bytes
- An ordered parent-composition proof where the file arrived through submodules: each parent's independently admitted exact source binding, the committed `.gitmodules` blob and complete bytes, the unique matching declaration, and the committed mode-160000 gitlink naming the next child's exact commit
- The receiver's actual current agency record key, source, section, pool, and byte revision, plus exact readback bytes after the authorized import
- The original import's native evidence identity, time, exact source-copy/path/parent selection, target record identity, and raw selection commitment; these are supplied by the existing operation, not invented by a filename reader

A source-working-copy receipt proves only its declared custody and copy selection. It does not prove a file/blob observation, a parent gitlink, or institutional receiving. Those additional observations are checked separately. The same original custody identity must survive the read; no `latest`, branch-tip substitution, origin-only alias, or silently selected duplicate parent is admitted.

## Validation and codomain

Validation is pure and occurs before recording a source-projection claim. It checks the exact target revision against the receiver bytes; the source bytes against the selected Git blob; every parent `.gitmodules` byte identity; unique declaration and gitlink agreement; the child repository and commit at every edge; and exact source-path composition into the received agency source. A schema-valid value alone is not a custody or import admission.

This is a byte-preserving projection. Ordinary governing acts may append governance metadata to the authored record; that new revision does not inherit the original exact-source witness. Its owner must perform an actual qualified source projection or codification before correspondence is held again. Observations are bounded to one MiB of complete source plus parent declaration bytes and sixteen parent edges.

The exact import commitment uses the existing raw-byte RFC 6920 provider. Its bytes are UTF-8 encoding of compact JSON.stringify output of this ordered tuple: [sourceBinding, sourcePath, [pool, key, source, sectionPath, id, revision], parents.map([sourceBinding, path])]. This commitment must already be part of the authentic native import record. A later reader cannot manufacture it for an old unwitnessed import.

The correspondence carries its original strings and an `exact` commitment with encoding `utf8-json-tuple-v1`. The raw-byte name covers UTF-8 compact JSON.stringify of [[pool, key, source, sectionPath, id, revision], [sourceRepository, commit, sourcePath, blob], parents.map([sourceRepository, commit, gitmodulesBlob, gitlinkPath, childRepository, childCommit])]. Parent order is root to leaf. These fixed tuples preserve distinct NFC/NFD Git paths inside the existing semantic carrier; neither source names nor filesystem paths are normalized. The semantic content identity still owns the surrounding record.

The codomain is a typed `organizing.agency-source-projection` value carrying the complete source material, the checked custody and parent-composition witnesses, the exact received record revision, and the original import evidence. Its identity is obtained through the existing semantic-content/semantic-record admission carrier. Equal endpoint bytes do not erase different source paths or parent proof histories.

The authorized import records this value in its existing native semantic journal, with the import witness as a cause. There is no parallel JSON mapping file. Recording is allowed only after exact receiving readback; absent source custody, absent original import evidence, or failed readback records no successful projection. The original import cause must also be received in this journal custody. A computed identity for a causally unreceived claim is returned only as proposed, never as a receiving witness. The producer must reconcile an uncertain append by the same content identity before retrying.

## Selection by a consumer

The reader selects only witnesses for the exact current agency source, record key, and byte revision. It retains independent for/against evidence using the existing FOUR meaning. Missing, denied, contested, stale, malformed, or multiply applicable source witnesses do not establish a unique correspondence. Exact duplicate delivery remains one candidate; distinct repository or parent-composition witnesses remain distinct even when file bytes are equal.

A successful selection returns source correspondence evidence only. The GitHub receiving resolver must still use the current authenticated principal, `playerOfAct`, current offices, native territorial/home reading, and the current work realm. A source witness cannot supply an office, override a held office, invent a home, or authorize a private source's disclosure.

## Installation and receiving

The existing source-import owner supplies the qualified source reader, the authorized import event, and exact native receiving readback. The source module is not a new public write endpoint. No current node is opted in merely by publishing the module. Existing unwitnessed agency state needs an actual authorized migration that receives its original source; it cannot be activated by a hand-written repository-to-enterprise map.

Tests must use genuine Git objects and native semantic journal admission. They cover a direct source, a declared parent gitlink, changed source bytes, changed record revision, wrong parent/child pin, duplicate and ambiguous declarations, changed custody, exact replay, conflicting provenance, for/against evidence, and absence of any successful write on failed validation. They must preserve an unrelated incumbent agency record without inventing provenance for it.

The implementation imports the shared plain Git source-copy schema from the Git service codec boundary. This is a supplier prerequisite for source integration; an older provider without that export is not qualified by these tests. The prototype receiving factory has no installed node binding. No genuine production agency source-import adapter or original migration receipt has yet been recovered.
