---
title: Expose the specified journal packet codec through its owning package
date-created: 2026-09-28
type: fabrication specification
status: specified; staged realization requires independent import observation
derived-from: 2026-09-27-muse-assist-journal-operation-lld.md
---

## F-KE01 — One supported import, unchanged codec

L-O19 assigns journalPacket and resolveJournalPacket to Code. Its package boundary must expose `./semiotic-eavt/journal/packet` as `./src/semiotic-eavt/journal/packet.mjs`. The accepted packet fabrication provided the module alone; the manifest presently prevents a supported package import. Maintenance L-O31 and connected packet consumers require that existing capability. No second decoder is introduced.

This is a deterministic manifest codemod, not behavioral source synthesis. The declarative rule in evidence/2026-09-28-journal-packet-package-export/rule.json is the complete transformation: insert its export key/value immediately after the exact existing sibling key/value, preserving all other bytes. Refuse an absent, duplicated, changed sibling or already-present destination. The provider reads only the bound manifest and rule in an isolated read-only filesystem, returns an F-P02 patchset, and writes no product source. The unchanged F-P03 materializer stages that patchset from the exact input digest. No dependencies, runtime modules, scripts, versions, lockfiles, existing exports, or other packages may change.

The exact effective Code manifest input is SHA-256 e346add012c63d686284c6e2c3bc581191ce5070d0666d70e9a277c97cc0ed98; the accepted packet module is SHA-256 8542083fac97db2fa2b6cee21912efa7ba18e62dfb65ff58449cfdae8ac36542. Bind the current LLD and these files in the invocation commitment. Preserve prior maintenance refusals; do not reinterpret those attempts as accepted.

## F-KE02 — Independent effect

Using Node's package-export resolution for the consumer's entry import, demonstrate that the unchanged manifest refuses the packet subpath and the generated manifest permits it. The loaded packet module must be the exact accepted bytes. Construct and resolve a representative packet through that imported namespace with its exact canonical artifact, and compare the recovered value. Dependency resolution may use the previously bound accepted module map, but must not bypass export resolution for the tested entry import. Compare parsed manifest values and exact output bytes against the single permitted insertion. Bind input, candidate, receipt, source module, receiver and observed results. No product promotion or assistant acceptance follows from this package-boundary observation.
