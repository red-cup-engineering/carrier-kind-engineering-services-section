import { createHash } from "node:crypto";
import { checkTerm } from "@red-cup-engineering/relation-model-notation-runtime";
import { decodeSemantic, semanticBytes, semanticId } from "@red-cup-engineering/relation-model-notation-cbor-codec";
import { decodeRelationalValue, encodeRelationalValue, RELATIONAL_VALUE_TYPE } from "@red-cup-engineering/relational-value-graph-service";
import { RECORD_KIND, admit, identify } from "./semantic-content.mjs";

export const CURRENT_DURABLE_CELL_FORMAT = "semantic-content-identify/v2";
export const LEGACY_DURABLE_CELL_FORMAT = "relational-rmn-document/v1";

function legacyDocument(value) {
  const encoded = encodeRelationalValue(value);
  return ["ascribe", encoded.type, encoded.term];
}

export function legacyRecordDigest(value) { return semanticId(legacyDocument(value)); }

export function admitDurableRecord(bytes) {
  try {
    return Object.freeze({
      value: admit(bytes, RECORD_KIND),
      format: CURRENT_DURABLE_CELL_FORMAT,
      // `identify` admits a JSON value, not an encoded Uint8Array carrier.
      // The admitted value retains semantic identity through `recordDigest`;
      // this field names the exact durable bytes for migration/audit custody.
      sourceDigest: `ni:///sha-256;${createHash("sha256").update(bytes).digest("base64url")}`,
      recordDigest: (value) => identify(value, RECORD_KIND).id,
    });
  } catch (currentError) {
    try {
      const term = decodeSemantic(bytes);
      if (term?.[0] !== "ascribe" || term.length !== 3 || JSON.stringify(term[1]) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) throw new Error("legacy durable cell is not one relational RMN document");
      checkTerm(term[2], term[1]);
      if (!semanticBytes(term).equals(bytes)) throw new Error("legacy durable cell is not canonical RMN CBOR");
      return Object.freeze({
        value: decodeRelationalValue(term[1], term[2]),
        format: LEGACY_DURABLE_CELL_FORMAT,
        sourceDigest: semanticId(term),
        recordDigest: legacyRecordDigest,
      });
    } catch (legacyError) {
      throw new AggregateError([currentError, legacyError], "durable cell is neither current semantic content nor canonical legacy relational RMN");
    }
  }
}
