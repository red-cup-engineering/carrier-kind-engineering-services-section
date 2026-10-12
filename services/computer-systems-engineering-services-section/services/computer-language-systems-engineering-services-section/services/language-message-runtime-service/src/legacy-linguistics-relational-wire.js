import { basename } from "node:path";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { admitRelationalValuePayload } from "@red-cup-engineering/relation-model-notation-graph-services-section/relational-value-graph";
import { EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/computer-content-address-engineering-services-section/semantic-content-identity";
import { createSemanticRecordJournal } from "@red-cup-engineering/semiotic-eavt-services-section/record-semantic-record";

export const LEGACY_LINGUISTICS_RELATIONAL_WIRE = "legacy-linguistics-relational-wire/v1";
const NAME = /^([A-Za-z0-9_-]{43})\.sen\.cbor$/u;
const token = (bytes) => makeNiUri(bytes);

/** A one-way legacy admission boundary.  It has no encoder and no new legacy egress. */
export function admitLegacyLinguisticsRelationalWire({ bytes, filename } = {}) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("legacy wire bytes must be a Uint8Array");
  const match = NAME.exec(basename(filename ?? ""));
  if (!match) throw new TypeError("legacy wire filename must be a sha-256 .sen.cbor filename");
  const legacyToken = token(bytes);
  if (legacyToken !== `ni:///sha-256;${match[1]}`) throw new TypeError("legacy wire bytes do not match their immutable filename");
  const payload = admitRelationalValuePayload({ bytes, token: legacyToken });
  const receipt = Object.freeze({ wire: LEGACY_LINGUISTICS_RELATIONAL_WIRE, legacyToken, admittedClaim: payload.claim });
  return Object.freeze({ ...receipt, readdressedToken: identifyJsonSemanticContent({ objectKind: "lenticule.legacy-linguistics-relational-admission/v1", value: receipt, witnessRoot: EMPTY_WITNESS_ROOT }).token });
}

export function admitLegacyLinguisticsBlob(path) {
  return admitLegacyLinguisticsRelationalWire({ bytes: readFileSync(path), filename: path });
}

/** Admit one immutable blob and append only its new strict-JSON receipt. */
export function admitAndRecordLegacyLinguisticsBlob({ path, dataRoot, recordedAt } = {}) {
  if (typeof dataRoot !== "string" || dataRoot.length === 0) throw new TypeError("dataRoot is required for legacy readdressing");
  if (typeof recordedAt !== "string" || recordedAt.length === 0) throw new TypeError("recordedAt is required for legacy readdressing");
  const receipt = admitLegacyLinguisticsBlob(path);
  const journal = createSemanticRecordJournal({ root: resolve(dataRoot), objectKind: "lenticule.legacy-linguistics-readdress-record/v1" });
  const record = journal.record({ category: "legacy-linguistics-relational-readdress/v1", record: receipt, recordedAt, charge: { support: true, refutation: false } });
  return Object.freeze({ ...receipt, journalRecordToken: record.id });
}
