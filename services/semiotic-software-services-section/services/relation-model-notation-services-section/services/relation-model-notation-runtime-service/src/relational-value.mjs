// Pure placement-independent RMN die material.
import { niUri, rawNiUri } from "./canonical-cbor.mjs";
import { checkTerm, normalizeCarrier, semanticBytes } from "./rmn-core.mjs";

const UNIT = ["unit"];
const MARK = ["mark"];
const ENTITY = ["base", "Entity"];
const KINDS = ["record", "sequence", "null", "boolean", "integer", "decimal", "text", "bytes"];

function variantType(count) { return count === 1 ? UNIT : ["sum", UNIT, variantType(count - 1)]; }
function variant(index, count) { return count === 1 ? ["star"] : index === 0 ? ["left", ["star"], variantType(count - 1)] : ["right", UNIT, variant(index - 1, count - 1)]; }
function variantIndex(term, count) {
  if (count === 1) { if (term?.[0] !== "star") fail("malformed relational kind"); return 0; }
  if (term?.[0] === "left" && term[1]?.[0] === "star") return 0;
  if (term?.[0] === "right") return 1 + variantIndex(term[2], count - 1);
  fail("malformed relational kind");
}
function tuple(values) { return values.length === 1 ? values[0] : ["pair", values[0], tuple(values.slice(1))]; }
function fields(term, count) { if (count === 1) return [term]; if (term?.[0] !== "pair") fail("malformed relational tuple"); return [term[1], ...fields(term[2], count - 1)]; }
function vector(values, type) { return ["vector", type, values]; }
function vectorItems(term) { if (term?.[0] !== "vector" || !Array.isArray(term[2])) fail("malformed relational vector"); return term[2]; }
function fail(message) { throw new Error(message); }
function constant(id) { return ["constant", ENTITY, id]; }
function constantId(term) { if (term?.[0] !== "constant" || term[1]?.[0] !== "base" || term[1]?.[1] !== "Entity") fail("expected relational entity"); return term[2]; }
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

const KIND = variantType(KINDS.length);
const NODE = ["product", ENTITY, ["product", KIND, MARK]];
const GROUND = ["grounded", ENTITY, ENTITY];
export const RELATIONAL_VALUE_TYPE = ["product", ENTITY, ["product", ["vector", NODE], ["vector", GROUND]]];

function normalizeValue(source) {
  if (typeof source === "string") return source.normalize("NFC");
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
  return normalizeCarrier(source);
}

function scalar(value) {
  if (value === null) return ["null", ""];
  if (typeof value === "boolean") return ["boolean", value ? "true" : "false"];
  if (typeof value === "number") return Number.isSafeInteger(value) ? ["integer", String(value)] : ["decimal", canonicalDecimal(value)];
  if (typeof value === "bigint") return ["integer", String(value)];
  if (typeof value === "string") return ["text", value];
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return ["bytes", Buffer.from(value).toString("base64")];
  return null;
}

export function encodeRelationalValue(source) {
  const value = normalizeValue(source), seed = rawNiUri(semanticBytes(["mark", rawNiUri(semanticBytes(["mark", String(source?.constructor?.name ?? typeof source)]))]));
  const carrierSeed = rawNiUri(Buffer.concat([Buffer.from(seed), semanticBytes(["mark", structuralLexeme(value)])]));
  const nodes = [], edges = [];
  function visit(member, path) {
    const id = rawNiUri(Buffer.from(`${carrierSeed}\0${path}`, "utf8"));
    const primitive = scalar(member);
    let kind; let lexical = "";
    if (primitive) [kind, lexical] = primitive;
    else if (Array.isArray(member)) kind = "sequence";
    else if (member && Object.getPrototypeOf(member) === Object.prototype) kind = "record";
    else fail(`unsupported relational value ${Object.prototype.toString.call(member)}`);
    nodes.push(tuple([constant(id), variant(KINDS.indexOf(kind), KINDS.length), mark(lexical)]));
    if (kind === "sequence") member.forEach((child, index) => connect(id, `index:${index}`, child, `${path}/i:${index}`));
    if (kind === "record") for (const key of Object.keys(member).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)))) connect(id, `field:${key}`, member[key], `${path}/f:${Buffer.byteLength(key)}:${key}`);
    return id;
  }
  function connect(parent, label, child, path) {
    const childId = visit(child, path);
    edges.push(["ground", ["predicate", label, ENTITY, ENTITY], constant(parent), constant(childId)]);
  }
  const root = visit(value, "root"), term = tuple([constant(root), vector(nodes, NODE), vector(edges, GROUND)]);
  checkTerm(term, RELATIONAL_VALUE_TYPE);
  return { type: RELATIONAL_VALUE_TYPE, term };
}

/**
 * Identify one relational value without re-normalizing the typed carrier just
 * constructed by {@link encodeRelationalValue}.  This is deliberately not a
 * general fast identity API: external RMN values must still enter through
 * `semanticId`, which performs Unicode and carrier normalization.  Here both
 * the fixed type and generated term are canonical by construction and have
 * already passed `checkTerm` in `encodeRelationalValue`.
 */
export function relationalValueId(source) {
  const { type, term } = encodeRelationalValue(source);
  return niUri(["ascribe", type, term]);
}

function structuralLexeme(value) {
  const primitive = scalar(value);
  if (primitive) return `${primitive[0]}:${primitive[1]}`;
  if (Array.isArray(value)) return `sequence(${value.map(structuralLexeme).join("|")})`;
  return `record(${Object.keys(value).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))).map((key) => `${Buffer.byteLength(key)}:${key}=${structuralLexeme(value[key])}`).join("|")})`;
}

export function decodeRelationalValue(type, term) {
  if (JSON.stringify(type) !== JSON.stringify(RELATIONAL_VALUE_TYPE)) fail("unknown relational value type");
  checkTerm(term, type);
  const [rootTerm, nodeTerms, edgeTerms] = fields(term, 3), root = constantId(rootTerm), nodes = new Map(), edges = new Map();
  for (const node of vectorItems(nodeTerms)) {
    const [entity, kind, lexical] = fields(node, 3), id = constantId(entity);
    if (nodes.has(id)) fail(`duplicate relational node ${id}`);
    nodes.set(id, { kind: KINDS[variantIndex(kind, KINDS.length)], lexical: marked(lexical) });
  }
  for (const edge of vectorItems(edgeTerms)) {
    if (edge?.[0] !== "ground" || edge[1]?.[0] !== "predicate") fail("malformed relational edge");
    const subject = constantId(edge[2]), object = constantId(edge[3]), label = edge[1][1];
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
    if (node.kind === "bytes") { if (outgoing.length) fail("bytes node has outgoing edges"); return Buffer.from(node.lexical, "base64"); }
    if (node.lexical !== "") fail("structural relational node has a lexical payload");
    if (node.kind === "sequence") {
      const indexed = outgoing.map(({ label, object }) => { const match = /^index:(0|[1-9][0-9]*)$/u.exec(label); if (!match) fail("sequence edge lacks a canonical index"); return [Number(match[1]), object]; }).sort((left, right) => left[0] - right[0]);
      if (indexed.some(([index], position) => index !== position)) fail("relational sequence indices are not contiguous");
      return indexed.map(([, object]) => build(object));
    }
    if (node.kind === "record") {
      const result = {};
      for (const { label, object } of outgoing.sort((left, right) => Buffer.compare(Buffer.from(left.label), Buffer.from(right.label)))) {
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
