/**
 * codecs/text/json/otlp - OpenTelemetry OTLP JSON as a channel-code of the statement log.
 *
 * OTLP is not a second trace ontology here. A span is the familiar recorded
 * invocation row: E = caller/resource, A = operation+args/scope, V = result,
 * T = time. The source remains EAVT; this module only gives the log an OTLP
 * JSON wire face.
 */

import { canonicalJson } from "@red-cup-engineering/json-services-section";

import { sha256Hex } from "@red-cup-engineering/cryptographic-computer-data-engineering-services-section/integrity";
import {
  agentEventChronicleContract,
  agentEventChronicleSchema,
  keyValueSchema,
  otlpSpanContract,
  otlpSpanSchema,
  otlpTracesContract,
  otlpTracesSchema,
} from "./otlp-schema.mjs";
import { eavtKey, eavtRecord, toEavt } from "@red-cup-engineering/eavt-services-section/row";
import { requireJsonValue } from "@red-cup-engineering/json-services-section";

export {
  agentEventChronicleContract,
  agentEventChronicleSchema,
  otlpSpanContract,
  otlpSpanSchema,
  otlpTracesContract,
  otlpTracesSchema,
} from "./otlp-schema.mjs";

const EAVT_ENTITY = "eavt.entity";
const EAVT_ATTRIBUTE = "eavt.attribute";
const EAVT_VALUE = "eavt.value";
const EAVT_TIME = "eavt.time";
const EAVT_ID = "eavt.eavt_id";

const jsonString = (value) => canonicalJson(value);
const jsonValue = (text, context) => requireJsonValue(JSON.parse(text), context);

function attr(key, value) {
  return Object.freeze({ key, value: Object.freeze({ stringValue: jsonString(value) }) });
}

function attrString(key, value) {
  return Object.freeze({ key, value: Object.freeze({ stringValue: value }) });
}

function readAttr(attributes, key) {
  const found = attributes.find((candidate) => candidate.key === key);
  if (found === undefined) throw new TypeError(`otlp statement: missing ${key}`);
  return found.value.stringValue;
}

function spanName(attribute) {
  if (attribute !== null && typeof attribute === "object" && !Array.isArray(attribute)) {
    const verb = (attribute).verb;
    if (typeof verb === "string" && verb.length > 0) return verb;
  }
  const text = canonicalJson(attribute);
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

/** Encode one EAVT statement row as an OTLP span. */
export function spanFromStatement(row) {
  const statement = eavtRecord(row);
  const id = eavtKey(statement);
  const traceSeed = hashHex(canonicalJson(statement.e));
  const start = timeUnixNano(statement.t);
  return otlpSpanContract.assert(Object.freeze({
    traceId: traceSeed.slice(0, 32),
    spanId: hashHex(id).slice(0, 16),
    name: spanName(statement.a),
    kind: 1,
    startTimeUnixNano: start,
    endTimeUnixNano: start,
    attributes: Object.freeze([
      attr(EAVT_ENTITY, statement.e),
      attr(EAVT_ATTRIBUTE, statement.a),
      attr(EAVT_VALUE, statement.v),
      attr(EAVT_TIME, statement.t),
      attrString(EAVT_ID, id),
    ]),
    status: Object.freeze({ code: 1 }),
  }));
}

/** Decode one OTLP span produced by {@link spanFromStatement} back to its EAVT row. */
export function statementFromSpan(span) {
  const admitted = otlpSpanContract.assert(span, "otlp span");
  return toEavt({
    e: jsonValue(readAttr(admitted.attributes, EAVT_ENTITY), EAVT_ENTITY),
    a: jsonValue(readAttr(admitted.attributes, EAVT_ATTRIBUTE), EAVT_ATTRIBUTE),
    v: jsonValue(readAttr(admitted.attributes, EAVT_VALUE), EAVT_VALUE),
    t: jsonValue(readAttr(admitted.attributes, EAVT_TIME), EAVT_TIME),
  });
}

/** Encode a statement log as an OTLP ExportTraceServiceRequest. */
export function otlpFromStatements(rows) {
  const resources = new Map

 ();
  for (const row of rows.map(eavtRecord)) {
    const eKey = canonicalJson(row.e);
    const aKey = canonicalJson(row.a);
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
    scope.spans.push(spanFromStatement(row));
  }
  return otlpTracesContract.assert(Object.freeze({
    resourceSpans: Object.freeze([...resources.values()].map((resource) => Object.freeze({
      resource: Object.freeze({ attributes: Object.freeze([attr(EAVT_ENTITY, resource.entity)]) }),
      scopeSpans: Object.freeze([...resource.scopes.values()].map((scope) => Object.freeze({
        scope: Object.freeze({
          name: "eavt.attribute",
          version: "1",
          attributes: Object.freeze([attr(EAVT_ATTRIBUTE, scope.attribute)]),
        }),
        spans: Object.freeze(scope.spans),
      }))),
    }))),
  }));
}

/** Export a hub agent-event chronicle through the existing OTLP/EAVT bridge. */
export function otlpFromAgentEventChronicle(chronicle) {
  agentEventChronicleContract.assert(chronicle, "otlpFromAgentEventChronicle chronicle");
  return otlpFromStatements(chronicle.statements);
}

/** Decode a hub agent-event OTLP export back to EAVT statements. */
export function agentEventStatementsFromOtlp(traces) {
  return statementsFromOtlp(traces);
}

/** Decode all EAVT statements carried by an OTLP ExportTraceServiceRequest. */
export function statementsFromOtlp(traces) {
  const admitted = otlpTracesContract.assert(traces, "otlp traces");
  return Object.freeze(admitted.resourceSpans.flatMap((resourceSpans) =>
    resourceSpans.scopeSpans.flatMap((scopeSpans) => scopeSpans.spans.map(statementFromSpan))));
}

/** The time-forgotten bulk cells carried by the OTLP channel. */
export function otlpBulkCells(traces) {
  const cells = new Set();
  for (const eavt of statementsFromOtlp(traces)) {
    const row = eavtRecord(eavt);
    cells.add(canonicalJson({ e: row.e, a: row.a, v: row.v }));
  }
  return Object.freeze([...cells].sort());
}
