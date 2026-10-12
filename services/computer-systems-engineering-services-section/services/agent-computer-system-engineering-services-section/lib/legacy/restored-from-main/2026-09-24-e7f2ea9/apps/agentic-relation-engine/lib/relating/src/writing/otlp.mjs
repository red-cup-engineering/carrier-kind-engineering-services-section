/**
 * writing/otlp - OpenTelemetry OTLP JSON as a channel-code of RWIL.
 *
 * OTLP is not a second trace ontology here. A span is the familiar witnessed
 * invocation row: E = caller/resource, A = operation+args/scope, V = result,
 * T = time. The source remains EAVT; this module only gives the log an OTLP
 * JSON wire face.
 */

import {
  agentEventChronicleCarrier,
  agentEventChronicleSchema,
  keyValueSchema,
  otlpSpanCarrier,
  otlpSpanSchema,
  otlpTracesCarrier,
  otlpTracesSchema,
} from "../carriers/writing/otlp/index.mjs";
import { canonical, requireJsonValue } from "@red-cup-engineering/json-services-section";
import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import { eavtId, eavtRecord } from "@red-cup-engineering/eavt/row";

export {
  agentEventChronicleCarrier,
  agentEventChronicleSchema,
  otlpSpanCarrier,
  otlpSpanSchema,
  otlpTracesCarrier,
  otlpTracesSchema,
} from "../carriers/writing/otlp/index.mjs";

const RWIL_ENTITY = "rwil.entity";
const RWIL_ATTRIBUTE = "rwil.attribute";
const RWIL_VALUE = "rwil.value";
const RWIL_TIME = "rwil.time";
const RWIL_EAVT_ID = "rwil.eavt_id";

const jsonString = (value) => canonical(value);
const jsonValue = (text, context) => requireJsonValue(JSON.parse(text), context);

function attr(key, value) {
  return Object.freeze({ key, value: Object.freeze({ stringValue: jsonString(value) }) });
}

function attrString(key, value) {
  return Object.freeze({ key, value: Object.freeze({ stringValue: value }) });
}

function readAttr(attributes, key) {
  const found = attributes.find((candidate) => candidate.key === key);
  if (found === undefined) throw new TypeError(`otlp witness: missing ${key}`);
  return found.value.stringValue;
}

function spanName(attribute) {
  if (attribute !== null && typeof attribute === "object" && !Array.isArray(attribute)) {
    const verb = (attribute).verb;
    if (typeof verb === "string" && verb.length > 0) return verb;
  }
  const text = canonical(attribute);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function hashHex(value) {
  return sha256Hex(value);
}

function timeUnixNano(time) {
  if (typeof time === "string") {
    const millis = Date.parse(time);
    if (Number.isFinite(millis)) return String(BigInt(millis) * 1_000_000n);
  }
  if (typeof time === "number" && Number.isFinite(time)) return String(BigInt(Math.trunc(time)) * 1_000_000n);
  return "0";
}

/** Encode one RWIL witness row as an OTLP span. */
export function spanFromWitness(row) {
  const witness = eavtRecord(row);
  const id = eavtId(witness);
  const traceSeed = hashHex(canonical(witness.e));
  const start = timeUnixNano(witness.t);
  return otlpSpanCarrier.assert(Object.freeze({
    traceId: traceSeed.slice(0, 32),
    spanId: hashHex(id).slice(0, 16),
    name: spanName(witness.a),
    kind: 1,
    startTimeUnixNano: start,
    endTimeUnixNano: start,
    attributes: Object.freeze([
      attr(RWIL_ENTITY, witness.e),
      attr(RWIL_ATTRIBUTE, witness.a),
      attr(RWIL_VALUE, witness.v),
      attr(RWIL_TIME, witness.t),
      attrString(RWIL_EAVT_ID, id),
    ]),
    status: Object.freeze({ code: 1 }),
  }));
}

/** Decode one OTLP span produced by {@link spanFromWitness} back to its RWIL row. */
export function witnessFromSpan(span) {
  const admitted = otlpSpanCarrier.assert(span, "otlp span");
  return eavtRecord({
    e: jsonValue(readAttr(admitted.attributes, RWIL_ENTITY), RWIL_ENTITY),
    a: jsonValue(readAttr(admitted.attributes, RWIL_ATTRIBUTE), RWIL_ATTRIBUTE),
    v: jsonValue(readAttr(admitted.attributes, RWIL_VALUE), RWIL_VALUE),
    t: jsonValue(readAttr(admitted.attributes, RWIL_TIME), RWIL_TIME),
  });
}

/** Encode a witness log as an OTLP ExportTraceServiceRequest. */
export function otlpFromWitnesses(rows) {
  const resources = new Map

 ();
  for (const row of rows.map(eavtRecord)) {
    const eKey = canonical(row.e);
    const aKey = canonical(row.a);
    let resource = resources.get(eKey);
    if (resource === undefined) {
      resource = Object.freeze({ entity: row.e, scopes: new Map() });
      resources.set(eKey, resource);
    }
    let scope = resource.scopes.get(aKey);
    if (scope === undefined) {
      scope = Object.freeze({ attribute: row.a, spans: [] });
      resource.scopes.set(aKey, scope);
    }
    scope.spans.push(spanFromWitness(row));
  }
  return otlpTracesCarrier.assert(Object.freeze({
    resourceSpans: Object.freeze([...resources.values()].map((resource) => Object.freeze({
      resource: Object.freeze({ attributes: Object.freeze([attr(RWIL_ENTITY, resource.entity)]) }),
      scopeSpans: Object.freeze([...resource.scopes.values()].map((scope) => Object.freeze({
        scope: Object.freeze({
          name: "rwil.attribute",
          version: "1",
          attributes: Object.freeze([attr(RWIL_ATTRIBUTE, scope.attribute)]),
        }),
        spans: Object.freeze(scope.spans),
      }))),
    }))),
  }));
}

/** Export a hub agent-event chronicle through the existing OTLP/RWIL bridge. */
export function otlpFromAgentEventChronicle(chronicle) {
  agentEventChronicleCarrier.assert(chronicle, "otlpFromAgentEventChronicle chronicle");
  return otlpFromWitnesses(chronicle.witnesses.map(eavtRecord));
}

/** Decode a hub agent-event OTLP export back to RWIL witnesses. */
export function agentEventWitnessesFromOtlp(traces) {
  return witnessesFromOtlp(traces);
}

/** Decode all RWIL witnesses carried by an OTLP ExportTraceServiceRequest. */
export function witnessesFromOtlp(traces) {
  const admitted = otlpTracesCarrier.assert(traces, "otlp traces");
  return Object.freeze(admitted.resourceSpans.flatMap((resourceSpans) =>
    resourceSpans.scopeSpans.flatMap((scopeSpans) => scopeSpans.spans.map(witnessFromSpan))));
}

/** The time-forgotten bulk cells carried by the OTLP channel. */
export function otlpBulkCells(traces) {
  const cells = new Set();
  for (const row of witnessesFromOtlp(traces)) cells.add(canonical({ e: row.e, a: row.a, v: row.v }));
  return Object.freeze([...cells].sort());
}
