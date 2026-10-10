// A JSON value as a canonical Entity/Ground graph: its nodes and grounding
// edges as one SEN term of RELATIONAL_VALUE_TYPE, identified by the semantic
// content address of its ascription.
import { base64ToBytes, bytesCompare, bytesEqual, bytesToBase64, canonicalizeSemioticJson, concatBytes, decodeSemantic as decodeCanonical, ownedBytes, semanticBytes, semanticId, utf8Bytes } from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import { makeNiUri } from "@red-cup-engineering/uri-services-section/ni-uri";
import { validateSenTerm, validateSenType } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation";
import { judgeSen } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/typing";
import { typedListItems, typedListTerm } from "@red-cup-engineering/computer-data-engineering-services-section/semiotic-expression-notation/json-codec";
import { NI_URI_PATTERN } from "@red-cup-engineering/uri-services-section/ni-uri";

// A mark is a textual term; it does not introduce a nominal type.
const MARK = ["base"];
// An entity is the mark of its RFC 6920 NI.
const ENTITY = ["base"];
const KINDS = ["record", "sequence", "null", "boolean", "integer", "decimal", "text", "bytes"];

// A node kind is the mark of its name.
function kindTerm(kind) { return ["mark", kind]; }
function kindOf(term) { if (term?.[0] !== "mark" || !KINDS.includes(term[1])) fail("malformed relational kind"); return term[1]; }
function tuple(values) { return values.length === 1 ? values[0] : ["pair", values[0], tuple(values.slice(1))]; }
function fields(term, count) { if (count === 1) return [term]; if (term?.[0] !== "pair") fail("malformed relational tuple"); return [term[1], ...fields(term[2], count - 1)]; }
function vector(values, type) { return typedListTerm(type, values); }
function vectorItems(term) { try { return typedListItems(term); } catch { fail("malformed relational list"); } }
function fail(message) { throw new Error(message); }
function constant(id) { return ["mark", id]; }
function constantId(term) { if (term?.[0] !== "mark" || !NI_URI_PATTERN.test(term[1])) fail("expected relational entity"); return term[1]; }
function mark(value) { return ["mark", value]; }
function marked(term) { if (term?.[0] !== "mark") fail("expected relational Mark"); return term[1]; }

function canonicalDecimal(value) {
  if (!Number.isFinite(value) || Number.isSafeInteger(value)) fail("relational decimal must be finite and non-integer");
  const source = String(value);
  if (/^-?(?:0|[1-9][0-9]*)\.[0-9]+$/u.test(source)) return source;
  const match = /^(?<sign>-?)(?<whole>[0-9]+)(?:\.(?<fraction>[0-9]+))?[eE](?<exponent>[+-]?[0-9]+)$/u.exec(source);
  if (!match) fail("relational decimal lacks a canonical finite spelling");
  const digits = `${match.groups.whole}${match.groups.fraction ?? ""}`;
  const point = match.groups.whole.length + Number(match.groups.exponent);
  const magnitude = point <= 0
    ? `0.${"0".repeat(-point)}${digits}`
    : point >= digits.length
      ? `${digits}${"0".repeat(point - digits.length)}.0`
      : `${digits.slice(0, point)}.${digits.slice(point)}`;
  return `${match.groups.sign}${magnitude}`;
}

const NODE = ["prod", ENTITY, ["prod", MARK, MARK]];
// An edge is the predication cell pair(subject, pair(predicate, object)).
const GROUND = ["prod", ENTITY, ["prod", MARK, ENTITY]];
export const RELATIONAL_VALUE_TYPE = ["prod", ENTITY, ["prod", ["list", NODE], ["list", GROUND]]];

function normalizeValue(source) {
  if (typeof source === "string") return source.normalize("NFC");
  if (source instanceof Uint8Array) return ownedBytes(source);
  if (typeof source === "number" && !Number.isSafeInteger(source)) {
    canonicalDecimal(source);
    return source;
  }
  if (Array.isArray(source)) return source.map(normalizeValue);
  if (source && Object.getPrototypeOf(source) === Object.prototype) {
    const result = {};
    for (const key of Object.keys(source)) {
      const name = key.normalize("NFC"); if (Object.hasOwn(result, name)) fail(`relational field names collide after NFC normalization: ${name}`);
      result[name] = normalizeValue(source[key]);
    }
    return result;
  }
  return canonicalizeSemioticJson(source);
}

function scalar(value) {
  if (value === null) return ["null", ""];
  if (typeof value === "boolean") return ["boolean", value ? "true" : "false"];
  if (typeof value === "number") return Number.isSafeInteger(value) ? ["integer", String(value)] : ["decimal", canonicalDecimal(value)];
  if (typeof value === "bigint") return ["integer", String(value)];
  if (typeof value === "string") return ["text", value];
  if (value instanceof Uint8Array) return ["bytes", bytesToBase64(value)];
  return null;
}

function assertRelationalClaim(type, term) {
  validateSenType(type);
  validateSenTerm(term);
  if (!judgeSen([], term, type)) fail("relational graph does not inhabit its declared SEN type");
}

export function encodeRelationalValue(source) {
  const value = normalizeValue(source), seed = makeNiUri(semanticBytes(["mark", makeNiUri(semanticBytes(["mark", String(value?.constructor?.name ?? typeof value)]))]));
  const carrierSeed = makeNiUri(concatBytes(utf8Bytes(seed), semanticBytes(["mark", structuralLexeme(value)])));
  const nodes = [], edges = [];
  function visit(member, path) {
    const id = makeNiUri(utf8Bytes(`${carrierSeed}\0${path}`));
    const primitive = scalar(member);
    let kind; let lexical = "";
    if (primitive) [kind, lexical] = primitive;
    else if (Array.isArray(member)) kind = "sequence";
    else if (member && Object.getPrototypeOf(member) === Object.prototype) kind = "record";
    else fail(`unsupported relational value ${Object.prototype.toString.call(member)}`);
    nodes.push(tuple([constant(id), kindTerm(kind), mark(lexical)]));
    if (kind === "sequence") member.forEach((child, index) => connect(id, `index:${index}`, child, `${path}/i:${index}`));
    if (kind === "record") for (const key of Object.keys(member).sort((left, right) => bytesCompare(utf8Bytes(left), utf8Bytes(right)))) connect(id, `field:${key}`, member[key], `${path}/f:${utf8Bytes(key).length}:${key}`);
    return id;
  }
  function connect(parent, label, child, path) {
    const childId = visit(child, path);
    edges.push(tuple([constant(parent), mark(label), constant(childId)]));
  }
  const root = visit(value, "root"), term = tuple([constant(root), vector(nodes, NODE), vector(edges, GROUND)]);
  assertRelationalClaim(RELATIONAL_VALUE_TYPE, term);
  return { type: RELATIONAL_VALUE_TYPE, term };
}

/**
 * Identify one relational value without re-normalizing the typed carrier just
 * constructed by {@link encodeRelationalValue}.  This is deliberately not a
 * general fast identity API. Here the fixed type and generated term are
 * canonical by construction.
 */
export function relationalValueId(source) {
  const { type, term } = encodeRelationalValue(source);
  return semanticId(["ascribe", type, term]);
}

function structuralLexeme(value) {
  const primitive = scalar(value);
  if (primitive) return `${primitive[0]}:${primitive[1]}`;
  if (Array.isArray(value)) return `sequence(${value.map(structuralLexeme).join("|")})`;
  return `record(${Object.keys(value).sort((left, right) => bytesCompare(utf8Bytes(left), utf8Bytes(right))).map((key) => `${utf8Bytes(key).length}:${key}=${structuralLexeme(value[key])}`).join("|")})`;
}

export function decodeRelationalValue(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("unknown relational value type");
  assertRelationalClaim(type, term);
  const [rootTerm, nodeTerms, edgeTerms] = fields(term, 3), root = constantId(rootTerm), nodes = new Map(), edges = new Map();
  for (const node of vectorItems(nodeTerms)) {
    const [entity, kind, lexical] = fields(node, 3), id = constantId(entity);
    if (nodes.has(id)) fail(`duplicate relational node ${id}`);
    nodes.set(id, { kind: kindOf(kind), lexical: marked(lexical) });
  }
  for (const edge of vectorItems(edgeTerms)) {
    const [subjectTerm, labelTerm, objectTerm] = fields(edge, 3);
    const subject = constantId(subjectTerm), object = constantId(objectTerm), label = marked(labelTerm);
    if (!nodes.has(subject) || !nodes.has(object)) fail("relational edge names an absent node");
    const values = edges.get(subject) ?? []; values.push({ label, object }); edges.set(subject, values);
  }
  const visited = new Set();
  function build(id) {
    if (visited.has(id)) fail("relational value contains a cycle or shared interior node");
    visited.add(id);
    const node = nodes.get(id); if (!node) fail(`missing relational node ${id}`);
    const outgoing = edges.get(id) ?? [];
    if (node.kind === "null") { if (node.lexical !== "" || outgoing.length) fail("malformed null node"); return null; }
    if (node.kind === "boolean") { if (!/^(?:true|false)$/u.test(node.lexical) || outgoing.length) fail("malformed boolean node"); return node.lexical === "true"; }
    if (node.kind === "integer") { if (!/^-?(?:0|[1-9][0-9]*)$/u.test(node.lexical) || outgoing.length) fail("malformed integer node"); const integer = BigInt(node.lexical); return integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(integer) : integer; }
    if (node.kind === "decimal") {
      const value = Number(node.lexical);
      if (!/^-?(?:0|[1-9][0-9]*)\.[0-9]+$/u.test(node.lexical) || outgoing.length || !Number.isFinite(value) || Number.isSafeInteger(value) || canonicalDecimal(value) !== node.lexical) fail("malformed decimal node");
      return value;
    }
    if (node.kind === "text") { if (outgoing.length) fail("text node has outgoing edges"); return node.lexical; }
    if (node.kind === "bytes") { if (outgoing.length) fail("bytes node has outgoing edges"); return ownedBytes(base64ToBytes(node.lexical)); }
    if (node.lexical !== "") fail("structural relational node has a lexical payload");
    if (node.kind === "sequence") {
      const indexed = outgoing.map(({ label, object }) => { const match = /^index:(0|[1-9][0-9]*)$/u.exec(label); if (!match) fail("sequence edge lacks a canonical index"); return [Number(match[1]), object]; }).sort((left, right) => left[0] - right[0]);
      if (indexed.some(([index], position) => index !== position)) fail("relational sequence indices are not contiguous");
      return indexed.map(([, object]) => build(object));
    }
    if (node.kind === "record") {
      const result = {};
      for (const { label, object } of outgoing.sort((left, right) => bytesCompare(utf8Bytes(left.label), utf8Bytes(right.label)))) {
        if (!label.startsWith("field:")) fail("record edge lacks a field predicate");
        const key = label.slice("field:".length); if (Object.hasOwn(result, key)) fail(`duplicate relational field ${key}`); result[key] = build(object);
      }
      return result;
    }
    fail(`unknown relational node kind ${node.kind}`);
  }
  const value = build(root);
  if (visited.size !== nodes.size) fail("relational value contains unreachable nodes");
  return value;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const member of Object.values(value)) deepFreeze(member);
  return Object.freeze(value);
}

function canonicalClaim(type, term) {
  return deepFreeze({ semanticType: type, term });
}

function ascriptionFromClaim(claim) {
  if (
    claim === null
    || typeof claim !== "object"
    || Array.isArray(claim)
    || !Object.hasOwn(claim, "semanticType")
    || !Object.hasOwn(claim, "term")
  ) fail("relational value claim must expose semanticType and term");
  return ["ascribe", claim.semanticType, claim.term];
}

function decodeRelationalAscription(bytes) {
  const ascription = decodeCanonical(bytes);
  if (!Array.isArray(ascription) || ascription.length !== 3 || ascription[0] !== "ascribe") {
    fail("relational value bytes must contain one typed SEN ascription");
  }
  const value = decodeRelationalValue(ascription[1], ascription[2]);
  const canonical = encodeRelationalValue(value);
  const canonicalBytes = semanticBytes(["ascribe", canonical.type, canonical.term]);
  if (!bytesEqual(canonicalBytes, bytes)) fail("relational value graph carrier is not canonical");
  return { canonical, canonicalBytes };
}

/**
 * Construct the canonical transported form of one relational value.
 * `token` commits to the exact canonical CBOR bytes; `claim` is the visible
 * typed SEN calculus and is not recovered by decoding the token.
 */
export function identifyRelationalValuePayload(source) {
  const encoded = encodeRelationalValue(source);
  const bytes = semanticBytes(["ascribe", encoded.type, encoded.term]);
  return Object.freeze({
    bytes,
    token: makeNiUri(bytes),
    claim: canonicalClaim(encoded.type, encoded.term),
  });
}

/**
 * Admit transported bytes only when their NI token matches and their decoded
 * graph is exactly the carrier the existing relational-value encoder emits.
 */
export function admitRelationalValuePayload({ bytes, token } = {}) {
  if (!(bytes instanceof Uint8Array)) fail("relational value payload bytes must be a Uint8Array");
  const transportedBytes = Uint8Array.from(bytes);
  if (makeNiUri(transportedBytes) !== token) fail("relational value payload token does not match its bytes");
  const { canonical, canonicalBytes } = decodeRelationalAscription(transportedBytes);
  return Object.freeze({
    bytes: canonicalBytes,
    token,
    claim: canonicalClaim(canonical.type, canonical.term),
  });
}

/** Verify a visible typed claim against an opaque NI token. */
export function verifyRelationalValuePayload({ token, claim } = {}) {
  try {
    const bytes = semanticBytes(ascriptionFromClaim(claim));
    admitRelationalValuePayload({ bytes, token });
    return true;
  } catch {
    return false;
  }
}
