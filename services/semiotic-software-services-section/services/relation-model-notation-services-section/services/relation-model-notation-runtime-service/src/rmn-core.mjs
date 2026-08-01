// Pure placement-independent RMN die material.
import { canonicalEqual, decodeCanonical, encodeCanonical, niUri, NI_URI as NI } from "./canonical-cbor.mjs";
import { validateFour, witnessBit } from "./four.mjs";

export { FOUR, four, isKnowledgeCover, joinKnowledge, validateFour, witnessBit } from "./four.mjs";

export const PROFILE = "org.emsenn.rmn.core.v3";
export const RML_LANGUAGE = "rmn/v2";

const CAIP10 = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}:[-.%a-zA-Z0-9]{1,128}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/u;
// An effect cell carries only what was witnessed. Law, precondition,
// operation, postcondition, and refusal are derivations off the result,
// computed by the proofing engine — never stored fields.
const EFFECT_KEYS = ["caller", "evidenceRoot", "measures", "outcome", "parent", "provider"];

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function exactKeys(value, keys) {
  return value && Object.getPrototypeOf(value) === Object.prototype
    && Object.keys(value).sort().join("\u0000") === [...keys].sort().join("\u0000");
}
function ni(value, field) { if (typeof value !== "string" || !NI.test(value)) fail("malformed-rmn", `${field} must be an RFC 6920 SHA-256 ni URI`); return value; }

export function normalizeCarrier(value) {
  if (typeof value === "string") return value.normalize("NFC");
  if (Array.isArray(value)) return value.map(normalizeCarrier);
  if (Buffer.isBuffer(value) || value instanceof Uint8Array || value === null || typeof value === "boolean" || typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("malformed-rmn", "RMN numbers must be safe integers");
    return value;
  }
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const result = {};
    for (const key of Object.keys(value)) {
      const normalizedKey = key.normalize("NFC");
      if (Object.hasOwn(result, normalizedKey)) fail("malformed-rmn", `map keys collide after NFC normalization: ${normalizedKey}`);
      result[normalizedKey] = normalizeCarrier(value[key]);
    }
    return result;
  }
  fail("malformed-rmn", `unsupported RMN value ${Object.prototype.toString.call(value)}`);
}

export function semanticBytes(value) { return encodeCanonical(normalizeCarrier(value)); }
export function semanticId(value) { return niUri(normalizeCarrier(value)); }
export function decodeSemantic(bytes) { return normalizeCarrier(decodeCanonical(bytes)); }

export function validateType(source) {
  const type = normalizeCarrier(source);
  if (!Array.isArray(type) || typeof type[0] !== "string") fail("malformed-rmn", "type must be a tagged RMN sequence");
  if (["unit", "mark", "four", "effect"].includes(type[0]) && type.length === 1) return type;
  if (type[0] === "base" && type.length === 2 && typeof type[1] === "string" && type[1].length > 0) return type;
  if (["arrow", "product", "sum", "relation", "grounded"].includes(type[0]) && type.length === 3) {
    validateType(type[1]); validateType(type[2]); return type;
  }
  if (["list", "vector"].includes(type[0]) && type.length === 2) { validateType(type[1]); return type; }
  if (type[0] === "wit" && type.length === 2) { validateType(type[1]); return type; }
  fail("malformed-rmn", `unknown or malformed RMN type ${JSON.stringify(type)}`);
}

export function normalizeEffectCell(source) {
  const cell = normalizeCarrier(source);
  if (!exactKeys(cell, EFFECT_KEYS)) fail("malformed-effect", `effect cell must expose exactly ${EFFECT_KEYS.join(", ")}`);
  ni(cell.evidenceRoot, "evidenceRoot");
  if (cell.parent !== null) ni(cell.parent, "parent");
  if (!CAIP10.test(cell.caller) || !CAIP10.test(cell.provider)) fail("malformed-effect", "caller and provider must be CAIP-10 account identifiers");
  cell.outcome = validateFour(cell.outcome);
  if (!Array.isArray(cell.measures)) fail("malformed-effect", "measures must be a typed measure sequence");
  const dimensions = new Set();
  cell.measures = cell.measures.map((measure) => {
    if (!exactKeys(measure, ["dimension", "quantity", "unit"]) || ![measure.dimension, measure.quantity, measure.unit].every((part) => typeof part === "string" && part.length > 0)) {
      fail("malformed-effect", "each measure requires dimension, quantity, and unit text");
    }
    if (!DECIMAL.test(measure.quantity)) fail("malformed-effect", `measure ${measure.dimension} has a noncanonical nonnegative decimal quantity`);
    if (dimensions.has(measure.dimension)) fail("malformed-effect", `duplicate measure dimension ${measure.dimension}`);
    dimensions.add(measure.dimension); return measure;
  }).sort((left, right) => Buffer.compare(Buffer.from(left.dimension, "utf8"), Buffer.from(right.dimension, "utf8")));
  return cell;
}

export function assayEffectTransition({ proposalCell, completionCell, evidence }) {
  const proposal = normalizeEffectCell(proposalCell);
  const completion = normalizeEffectCell(completionCell);
  ni(evidence, "transition evidence");
  witnessBit(proposal.outcome, completion.outcome);
  for (const field of ["caller", "parent", "provider"]) {
    if (!canonicalEqual(proposal[field], completion[field])) {
      fail("malformed-effect-transition", `${field} changed across one effect transition`);
    }
  }
  if (completion.evidenceRoot !== evidence) {
    fail("malformed-effect-transition", "completion evidenceRoot must equal the WIT evidence identity");
  }
  const proposalTerm = ["effect", proposal];
  const completionTerm = ["effect", completion];
  const effectType = ["base", "Effect"];
  const evidenceType = ["base", "Evidence"];
  const grounded = [
    "ground",
    ["predicate", "completed-with-evidence", effectType, evidenceType],
    ["constant", effectType, semanticId(proposalTerm)],
    ["constant", evidenceType, evidence]
  ];
  const witness = [
    "witness",
    grounded,
    ["four", proposal.outcome.positiveEvidence, proposal.outcome.negativeEvidence],
    ["four", completion.outcome.positiveEvidence, completion.outcome.negativeEvidence],
    evidence
  ];
  checkTerm(witness, ["wit", ["grounded", effectType, evidenceType]]);
  return {
    proposal: semanticId(proposalTerm),
    completion: semanticId(completionTerm),
    witness: semanticId(witness),
    witnessTerm: witness,
    outcome: completion.outcome
  };
}

export function validateTerm(source) {
  const term = normalizeCarrier(source);
  if (!Array.isArray(term) || typeof term[0] !== "string") fail("malformed-rmn", "term must be a tagged RMN sequence");
  const [tag] = term;
  if (tag === "var" && term.length === 2 && Number.isInteger(term[1]) && term[1] >= 0) return term;
  if ((tag === "lam" || tag === "fst" || tag === "snd") && term.length === 2) return [tag, validateTerm(term[1])];
  if ((tag === "app" || tag === "pair") && term.length === 3) return [tag, validateTerm(term[1]), validateTerm(term[2])];
  if (tag === "ascribe" && term.length === 3) return [tag, validateType(term[1]), validateTerm(term[2])];
  if (tag === "left" && term.length === 3) return [tag, validateTerm(term[1]), validateType(term[2])];
  if (tag === "right" && term.length === 3) return [tag, validateType(term[1]), validateTerm(term[2])];
  if (tag === "nil" && term.length === 2) { validateType(term[1]); return term; }
  if (tag === "cons" && term.length === 3) return [tag, validateTerm(term[1]), validateTerm(term[2])];
  if (tag === "vector" && term.length === 3 && Array.isArray(term[2])) return [tag, validateType(term[1]), term[2].map(validateTerm)];
  if (tag === "star" && term.length === 1) return term;
  if (tag === "constant" && term.length === 3) { validateType(term[1]); ni(term[2], "constant identity"); return term; }
  if (tag === "mark" && term.length === 2 && (typeof term[1] === "string" || Buffer.isBuffer(term[1]) || term[1] instanceof Uint8Array)) return term;
  if (tag === "predicate" && term.length === 4 && typeof term[1] === "string" && term[1].length > 0) { validateType(term[2]); validateType(term[3]); return term; }
  if (tag === "ground" && term.length === 4) return [tag, validateTerm(term[1]), validateTerm(term[2]), validateTerm(term[3])];
  if (tag === "four" && term.length === 3) { validateFour({ positiveEvidence: term[1], negativeEvidence: term[2] }); return term; }
  if (tag === "witness" && term.length === 5) {
    return [tag, validateTerm(term[1]), validateTerm(term[2]), validateTerm(term[3]), ni(term[4], "WIT evidence")];
  }
  if (tag === "effect" && term.length === 2) return ["effect", normalizeEffectCell(term[1])];
  fail("malformed-rmn", `unknown or malformed RMN term tag ${tag}`);
}

export function inferTerm(source, context = []) {
  const term = validateTerm(source), [tag] = term;
  if (tag === "var") return context[term[1]] ?? fail("ill-typed-term", `unbound de Bruijn variable ${term[1]}`);
  if (tag === "star") return ["unit"];
  if (tag === "constant") return term[1];
  if (tag === "mark") return ["mark"];
  if (tag === "predicate") return ["relation", term[2], term[3]];
  if (tag === "four") return ["four"];
  if (tag === "effect") { normalizeEffectCell(term[1]); return ["effect"]; }
  if (tag === "ascribe") { checkTerm(term[2], term[1], context); return term[1]; }
  if (tag === "nil") return ["list", term[1]];
  if (tag === "vector") { for (const member of term[2]) checkTerm(member, term[1], context); return ["vector", term[1]]; }
  if (tag === "left") return ["sum", inferTerm(term[1], context), term[2]];
  if (tag === "right") return ["sum", term[1], inferTerm(term[2], context)];
  if (tag === "cons") {
    const elementType = inferTerm(term[1], context);
    checkTerm(term[2], ["list", elementType], context);
    return ["list", elementType];
  }
  if (tag === "app") {
    const fnType = inferTerm(term[1], context);
    if (fnType[0] !== "arrow") fail("ill-typed-term", "application function does not have arrow type");
    checkTerm(term[2], fnType[1], context); return fnType[2];
  }
  if (tag === "pair") return ["product", inferTerm(term[1], context), inferTerm(term[2], context)];
  if (tag === "fst" || tag === "snd") {
    const pairType = inferTerm(term[1], context);
    if (pairType[0] !== "product") fail("ill-typed-term", `${tag} operand does not have product type`);
    return pairType[tag === "fst" ? 1 : 2];
  }
  if (tag === "ground") {
    const predicateType = inferTerm(term[1], context);
    if (predicateType[0] !== "relation") fail("ill-typed-term", "ground requires an unsaturated relation");
    checkTerm(term[2], predicateType[1], context); checkTerm(term[3], predicateType[2], context);
    return ["grounded", predicateType[1], predicateType[2]];
  }
  if (tag === "witness") {
    const groundedType = inferTerm(term[1], context);
    if (groundedType[0] !== "grounded") fail("ill-typed-term", "WIT subject must be a grounded predication");
    checkTerm(term[2], ["four"], context); checkTerm(term[3], ["four"], context);
    witnessBit({ positiveEvidence: term[2][1], negativeEvidence: term[2][2] }, { positiveEvidence: term[3][1], negativeEvidence: term[3][2] });
    return ["wit", groundedType];
  }
  fail("ill-typed-term", "a lambda requires an expected arrow type");
}

export function checkTerm(source, expectedSource, context = []) {
  const term = validateTerm(source), expected = validateType(expectedSource);
  if (term[0] === "lam") {
    if (expected[0] !== "arrow") fail("ill-typed-term", "lambda expected type is not an arrow");
    checkTerm(term[1], expected[2], [expected[1], ...context]); return true;
  }
  if (term[0] === "pair" && expected[0] === "product") {
    checkTerm(term[1], expected[1], context); checkTerm(term[2], expected[2], context); return true;
  }
  if (term[0] === "app") {
    const argumentType = inferTerm(term[2], context);
    checkTerm(term[1], ["arrow", argumentType, expected], context);
    checkTerm(term[2], argumentType, context);
    return true;
  }
  const inferred = inferTerm(term, context);
  if (!canonicalEqual(inferred, expected)) fail("ill-typed-term", `expected ${JSON.stringify(expected)} but inferred ${JSON.stringify(inferred)}`);
  return true;
}

function shift(delta, cutoff, term) {
  const [tag] = term;
  if (tag === "var") return ["var", term[1] >= cutoff ? term[1] + delta : term[1]];
  if (tag === "lam") return ["lam", shift(delta, cutoff + 1, term[1])];
  if (tag === "fst" || tag === "snd") return [tag, shift(delta, cutoff, term[1])];
  if (tag === "app" || tag === "pair" || tag === "cons") return [tag, shift(delta, cutoff, term[1]), shift(delta, cutoff, term[2])];
  if (tag === "vector") return [tag, term[1], term[2].map((member) => shift(delta, cutoff, member))];
  if (tag === "ascribe") return [tag, term[1], shift(delta, cutoff, term[2])];
  if (tag === "left") return [tag, shift(delta, cutoff, term[1]), term[2]];
  if (tag === "right") return [tag, term[1], shift(delta, cutoff, term[2])];
  return term;
}

function substitute(index, replacement, term, depth = 0) {
  const [tag] = term;
  if (tag === "var") return term[1] === index + depth ? shift(depth, 0, replacement) : term;
  if (tag === "lam") return ["lam", substitute(index, replacement, term[1], depth + 1)];
  if (tag === "fst" || tag === "snd") return [tag, substitute(index, replacement, term[1], depth)];
  if (tag === "app" || tag === "pair" || tag === "cons") return [tag, substitute(index, replacement, term[1], depth), substitute(index, replacement, term[2], depth)];
  if (tag === "vector") return [tag, term[1], term[2].map((member) => substitute(index, replacement, member, depth))];
  if (tag === "ascribe") return [tag, term[1], substitute(index, replacement, term[2], depth)];
  if (tag === "left") return [tag, substitute(index, replacement, term[1], depth), term[2]];
  if (tag === "right") return [tag, term[1], substitute(index, replacement, term[2], depth)];
  return term;
}

function step(term) {
  const [tag] = term;
  if (tag === "app" && term[1][0] === "lam") return shift(-1, 0, substitute(0, shift(1, 0, term[2]), term[1][1]));
  if (tag === "fst" && term[1][0] === "pair") return term[1][1];
  if (tag === "snd" && term[1][0] === "pair") return term[1][2];
  if (tag === "lam" || tag === "fst" || tag === "snd") { const inner = step(term[1]); return inner ? [tag, inner] : null; }
  if (tag === "left") { const inner = step(term[1]); return inner ? [tag, inner, term[2]] : null; }
  if (tag === "right") { const inner = step(term[2]); return inner ? [tag, term[1], inner] : null; }
  if (tag === "app" || tag === "pair" || tag === "cons") {
    const left = step(term[1]); if (left) return [tag, left, term[2]];
    const right = step(term[2]); return right ? [tag, term[1], right] : null;
  }
  if (tag === "vector") {
    for (let index = 0; index < term[2].length; index += 1) {
      const inner = step(term[2][index]);
      if (inner) { const members = [...term[2]]; members[index] = inner; return [tag, term[1], members]; }
    }
    return null;
  }
  return null;
}

export function evaluate(source, fuel) {
  if (!Number.isInteger(fuel) || fuel < 0 || fuel > 10000) fail("malformed-request", "fuel must be an integer from 0 through 10000");
  let current = validateTerm(source), used = 0;
  while (true) {
    const next = step(current); if (!next) return { normalForm: current, fuelUsed: used };
    if (used >= fuel) fail("fuel-exceeded", `normal form not reached within ${fuel} reductions`);
    current = next; used += 1;
  }
}

function tokenize(source) {
  const tokens = []; let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/u.test(character)) { index += 1; continue; }
    if (character === ";") { while (index < source.length && source[index] !== "\n") index += 1; continue; }
    if (character === "(" || character === ")") { tokens.push(character); index += 1; continue; }
    if (character === '"') {
      const start = index; index += 1;
      while (index < source.length) {
        if (source[index] === "\\") { index += 2; continue; }
        if (source[index] === '"') { index += 1; break; }
        index += 1;
      }
      try { tokens.push({ value: JSON.parse(source.slice(start, index)) }); } catch { fail("malformed-rml", "invalid RML string literal"); }
      continue;
    }
    const start = index; while (index < source.length && !/[\s();]/u.test(source[index])) index += 1;
    const atom = source.slice(start, index);
    if (atom === "#t") tokens.push({ value: true });
    else if (atom === "#f") tokens.push({ value: false });
    else if (atom === "nil") tokens.push({ value: null });
    else if (/^-?(0|[1-9][0-9]*)$/u.test(atom)) {
      const number = Number(atom); if (!Number.isSafeInteger(number)) fail("malformed-rml", "RML integer exceeds the safe-integer profile"); tokens.push({ value: number });
    } else tokens.push({ value: atom.normalize("NFC") });
  }
  return tokens;
}

function expression(tokens, state) {
  const token = tokens[state.index++];
  if (token === undefined) fail("malformed-rml", "unexpected end of RML input");
  if (token === ")") fail("malformed-rml", "unexpected closing parenthesis");
  if (token !== "(") return token.value;
  const members = [];
  while (tokens[state.index] !== ")") members.push(expression(tokens, state));
  state.index += 1;
  if (members[0] === "map") {
    const map = {};
    for (const entry of members.slice(1)) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== "string" || Object.hasOwn(map, entry[0])) fail("malformed-rml", "RML map entries must be unique (key value) pairs");
      map[entry[0]] = entry[1];
    }
    return map;
  }
  return members;
}

export function parseRml(source) {
  if (typeof source !== "string") fail("malformed-rml", "RML source must be text");
  const header = source.match(/^#lang[ \t]+([^\r\n]+)[\r\n]+/u);
  if (!header || header[1].trim() !== RML_LANGUAGE) fail("unknown-rml-language", `RML source must begin #lang ${RML_LANGUAGE}`);
  const tokens = tokenize(source.slice(header[0].length)), state = { index: 0 }, value = expression(tokens, state);
  if (state.index !== tokens.length) fail("malformed-rml", "RML source must contain exactly one expression");
  return normalizeCarrier(value);
}

function formatRmlExpression(source) {
  const value = normalizeCarrier(source);
  if (value === null) return "nil";
  if (typeof value === "boolean") return value ? "#t" : "#f";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `(${value.map(formatRmlExpression).join(" ")})`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value).sort(([left], [right]) => Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
    return `(map ${entries.map(([key, child]) => `(${JSON.stringify(key)} ${formatRmlExpression(child)})`).join(" ")})`;
  }
  fail("unprojectable-rml", "RML v2 text projection supports null, booleans, safe integers, text, sequences, and text-keyed maps");
}

/** Deterministic, parse-round-tripping RML v2 projection for the public RML
 * carrier subset. Canonical semantic identity remains deterministic CBOR. */
export function formatRml(source) {
  return `#lang ${RML_LANGUAGE}\n${formatRmlExpression(source)}\n`;
}

export function normalizeRml(source, expectedType) {
  const term = parseRml(source); checkTerm(term, expectedType); return term;
}

export function assay({ term, rml, expectedType, fuel }) {
  if ((term === undefined) === (rml === undefined)) fail("malformed-request", "supply exactly one of term or rml");
  const normalizedType = validateType(expectedType);
  const normalizedTerm = rml === undefined ? validateTerm(term) : normalizeRml(rml, normalizedType);
  checkTerm(normalizedTerm, normalizedType);
  const reduced = evaluate(normalizedTerm, fuel); checkTerm(reduced.normalForm, normalizedType);
  return { ...reduced, normalizedTerm, semanticId: semanticId(normalizedTerm), semanticBytes: semanticBytes(normalizedTerm) };
}
