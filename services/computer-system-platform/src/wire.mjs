import { COMPUTER_ENGINEERING_SPECIFICATION_ID } from "@red-cup-engineering/computer-system-engine/specification";
import { admit } from "@red-cup-engineering/computer-data-engineering-services-section/type-system";
import { TYPED_OPERATION_MESSAGE_VERSION as VERSION, TYPED_OPERATION_REQUEST_KIND as REQUEST, TYPED_OPERATION_RESULT_KIND as RESULT, TYPED_OPERATION_REFUSAL_KIND as REFUSAL, typedOperationRequestType as REQUEST_TYPE, typedOperationResultType as RESULT_TYPE, typedOperationRefusalType as REFUSAL_TYPE } from "@red-cup-engineering/computer-system-engine/typed-operation-message";
import { admitRelationalFieldDocument, relationalFieldDocument } from "@red-cup-engineering/computer-data-engineering-services-section/type-system/relations";

const refusal = (code, message) => Object.freeze({ ok: false, refusal: Object.freeze({ code, message }) });
const accepted = (value) => Object.freeze({ ok: true, value });

/** This package is a transport binding of the sole SEN-CBOR protocol specification. */
export const COMPUTER_NETWORKING_SPECIFICATION = COMPUTER_ENGINEERING_SPECIFICATION_ID;


function nonempty(value, field) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${field} must be a nonempty string`);
  return value;
}

function jsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  if (typeof value === "object") return Object.getPrototypeOf(value) === Object.prototype && Object.values(value).every(jsonValue);
  return false;
}

function admitted(type, value, label) {
  const admitted = admit(type, value);
  if (!admitted.ok) throw new TypeError(`${label} is not admitted: ${JSON.stringify(admitted.refusal.issues)}`);
  return admitted.value;
}

function encode(type, value, label) {
  return `${JSON.stringify(admitted(type, value, label))}\n`;
}

function parse(document) {
  if (typeof document !== "string") throw new TypeError("wire document must be a string");
  try { return JSON.parse(document); }
  catch { throw new TypeError("wire document must be JSON"); }
}

function codec(catalog, name) {
  if (!catalog || typeof catalog.resolve !== "function") throw new TypeError("wire codec catalog must resolve codec names");
  const resolved = catalog.resolve(name);
  if (!resolved || typeof resolved.decode !== "function" || typeof resolved.encode !== "function") throw new TypeError(`wire codec ${JSON.stringify(name)} is unavailable`);
  return resolved;
}

/** Define one explicit text codec for operation input and output bytes. */
export function defineWireCodec(definition) {
  const name = nonempty(definition?.name, "codec name");
  if (typeof definition?.decode !== "function" || typeof definition?.encode !== "function") {
    throw new TypeError("wire codec needs decode and encode functions");
  }
  return Object.freeze({ name, decode: definition.decode, encode: definition.encode });
}

/** Construct a finite codec resolver without binding any transport or evaluator. */
export function wireCodecCatalog(codecs) {
  if (!Array.isArray(codecs)) throw new TypeError("wire codecs must be an array");
  const byName = new Map();
  for (const item of codecs) {
    const codec = defineWireCodec(item);
    if (byName.has(codec.name)) throw new TypeError(`duplicate wire codec ${JSON.stringify(codec.name)}`);
    byName.set(codec.name, codec);
  }
  return Object.freeze({ resolve: (name) => byName.get(name) });
}

/** Canonical JSON boundary codec for request-response operation messages. */
export const jsonWireCodec = defineWireCodec({
  name: "json",
  decode: (document) => JSON.parse(document),
  encode: (value) => {
    if (!jsonValue(value)) throw new TypeError("json wire cannot encode a non-JSON value");
    const encoded = JSON.stringify(value);
    if (typeof encoded !== "string") throw new TypeError("json wire cannot encode a non-JSON value");
    return `${encoded}\n`;
  },
});

/** Bind the data engine's complete field carrier to JSON at one receiving catalog. */
export function relationalFieldWireCodec(declarations) {
  const decode = (value) => {
    const result = admitRelationalFieldDocument(declarations, value);
    if (!result.ok) throw new TypeError(`${result.refusal.code}: ${result.refusal.message}`);
    return result.value;
  };
  return defineWireCodec({
    name: "relational-field",
    decode: document => decode(parse(document)),
    encode: field => jsonWireCodec.encode(relationalFieldDocument(decode(relationalFieldDocument(field)))),
  });
}

/** Encode a request that names an operation in the receiving runtime catalog. */
export function encodeOperationRequest(request) {
  return encode(REQUEST_TYPE, { ...request, version: VERSION, kind: REQUEST }, "operation request");
}

/** Decode and admit the transport-owned request envelope. */
export function decodeOperationRequest(document) {
  return Object.freeze(admitted(REQUEST_TYPE, parse(document), "operation request"));
}

/** Encode a code-engine Result as a result or refusal transport envelope. */
export function encodeOperationOutcome(request, result, codecs) {
  const requestId = request?.requestId;
  if (result?.ok === true) {
    const outputCodec = request?.outputCodec;
    return encode(RESULT_TYPE, { version: VERSION, kind: RESULT, requestId, outputCodec, output: codec(codecs, outputCodec).encode(result.value) }, "operation result");
  }
  if (result?.ok === false) {
    return encode(REFUSAL_TYPE, { version: VERSION, kind: REFUSAL, requestId, code: result.refusal?.code, message: result.refusal?.message }, "operation refusal");
  }
  throw new TypeError("operation outcome must be a code-engine Result");
}

/** Decode a result/refusal envelope back to the code-engine Result shape. */
export function decodeOperationOutcome(document, codecs) {
  const parsed = parse(document);
  const type = parsed?.kind === RESULT ? RESULT_TYPE : parsed?.kind === REFUSAL ? REFUSAL_TYPE : undefined;
  if (!type) throw new TypeError("wire document must be a typed operation result or refusal");
  const outer = admitted(type, parsed, "operation outcome");
  const { requestId, outputCodec } = outer;
  if (outer.kind === RESULT) {
    return Object.freeze({ requestId, outputCodec, result: accepted(codec(codecs, outputCodec).decode(outer.output)) });
  }
  if (outer.kind === REFUSAL) {
    return Object.freeze({ requestId, result: refusal(outer.code, outer.message) });
  }
  throw new TypeError("unreachable operation outcome kind");
}
