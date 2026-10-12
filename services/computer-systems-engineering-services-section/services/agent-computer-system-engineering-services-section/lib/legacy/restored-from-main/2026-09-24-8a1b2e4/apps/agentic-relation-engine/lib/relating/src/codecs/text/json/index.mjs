/**
 * relating's JSON codec: the typed-resource projector for JSON documents and the witness that
 * an arbitrary runtime value is a JSON resource. The JSON forms themselves (canonical bytes,
 * parsing, admission) are the substrate's, @red-cup-engineering/json-services-section.
 */
import { define } from "@red-cup-engineering/computer-content-engineering-services-section/typed-resource-classification";
import { canonicalChecked, parse, requireJsonValue } from "@red-cup-engineering/json-services-section";

/** The JSON projector: recognizes content that parses as JSON, reads one carried value, writes one canonical document. */
export const jsonProjector = define({
  type: "json",
  corner: "data",
  rung: "identity",
  recognize: (resource) => {
    try {
      JSON.parse(resource.content);
      return true;
    } catch {
      return false;
    }
  },
  read: (resource) => [parse(resource.content)],
  write: (items) => (items.length === 0 ? "" : `${canonicalChecked(items[0], "json projector item")}\n`),
});

/** Witnesses an arbitrary runtime value as a JSON resource by round-tripping it through JSON and checking membership. */
export function jsonResource(value, context = "json resource") {
  return requireJsonValue(JSON.parse(JSON.stringify(value)), context);
}

export { jsonlProjector } from "./jsonl/projector.mjs";
import { ASSERT, RETRACT } from "@red-cup-engineering/datom";
import { toDatom } from "@red-cup-engineering/datom/admit-datom";
import { isDatomShape } from "@red-cup-engineering/datom/is-datom";
import { settledDatom, settledDatom as datom } from "@red-cup-engineering/datom/settle-row";
import { parse as parse_2 } from "@red-cup-engineering/datom/parse-datoms";
import { serialize } from "@red-cup-engineering/datom/serialize-datoms";
import { assertObjectDatom } from "@red-cup-engineering/datom/admit-datom-fact";
import { assertDatomFact } from "@red-cup-engineering/datom/assert-datom-fact";
import { retractDatomFact } from "@red-cup-engineering/datom/retract-datom-fact";
import { objectDatomId } from "@red-cup-engineering/datom/identify-datom-fact";
import { currentDatomValue } from "@red-cup-engineering/datom/current-datom-facts";
import { objectDatomsAsOf } from "@red-cup-engineering/datom/datom-facts-as-of";
import { foldObjectDatoms } from "@red-cup-engineering/datom/fold-datom-evidence";
import { objectDatomWitnesses, objectDatomWitnesses as objectDatomStatements } from "@red-cup-engineering/datom/datom-cell-witnesses";
import { settle } from "@red-cup-engineering/datom/settle-entries";
import { recordPathFor } from "@red-cup-engineering/datom/resolve-record-path";
import { readDatomsAtPath } from "@red-cup-engineering/datom/read-datoms";
import { commitSettledRecord } from "@red-cup-engineering/datom/commit-settlement";
import { admitRdfDatom } from "@red-cup-engineering/datom/admit-rdf-datom";
import { canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE } from "@red-cup-engineering/datom/rdf-datom";
import { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction } from "./jsonl/eavt/lean/index.mjs";
import { LeanGoldenVectorSchema, leanGoldenVectorCarrier } from "../../../carriers/codecs/text/json/jsonl/eavt/lean/index.mjs";
import { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom } from "./jsonl/eavt/triple/index.mjs";
import { isEavtShape, eavtRecord, eavtId, parse as parse_3, serialize as serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtToCell, cellToEavt, eavtOrder, EAVT_JSONL, eavtProjector } from "./jsonl/eavt/index.mjs";
export const jsonl = Object.freeze({ eavt: { datom: { ASSERT, RETRACT, toDatom, isDatomShape, settledDatom, datom, parse: parse_2, serialize, assertObjectDatom, assertDatomFact, retractDatomFact, objectDatomId, currentDatomValue, objectDatomsAsOf, foldObjectDatoms, objectDatomWitnesses, objectDatomStatements, settle, recordPathFor, readDatomsAtPath, commitSettledRecord, admitRdfDatom, canonicalEavtDatomJsonl, EAVT_DATOM_JSONL_MEDIA_TYPE }, lean: { decodeLeanGoldenVectorLine, decodeLeanGoldenVectorJsonl, encodeLeanGoldenVectorJsonl, leanGoldenVectorsByAction, LeanGoldenVectorSchema, leanGoldenVectorCarrier }, triple: { assertTriple, tripleId, dedupeTriples, tripleFromEavt, tripleFromDatom }, isEavtShape, eavtRecord, eavtId, parse: parse_3, serialize: serialize_2, serializeDatoms, toEavt, mergeEavtLogs, unfoldJson, foldJson, eavtTriple, eavtToCell, cellToEavt, eavtOrder, EAVT_JSONL, eavtProjector } });
