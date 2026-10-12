// Runtime boundary only: grammar, judgment, and reduction belong upstream.
import { NI_URI_PATTERN as NI } from "@red-cup-engineering/uri-services-section/ni-uri";
import { canonicalEqual } from "@red-cup-engineering/cbor-services-section";
import {
  canonicalizeSemioticJson as normalizeCarrier,
  semanticBytes,
  semanticId,
} from "@red-cup-engineering/computer-content-engineering-services-section/semiotic-content-address";
import {
  tm,
  validateEffectCell,
  validateSenType,
  validateSenTerm,
} from "./notation.mjs";
import { jsonToTerm, termToJson } from "./json-codec.mjs";
import { judgeSen } from "./typing.mjs";
import { step as reductionStep } from "./eval.mjs";
import { readingOfSides, witnessBit } from "@red-cup-engineering/computer-data-engineering-services-section/four";
export const PROFILE = "org.emsenn.sen.core.v1";
export const RML_LANGUAGE = "sen/v2";
function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function ni(value, field) {
  if (typeof value !== "string" || !NI.test(value))
    fail("malformed-sen", `${field} must be an RFC 6920 SHA-256 ni URI`);
  return value;
}

export function validateType(source) {
  return validateSenType(normalizeCarrier(source));
}
export function validateTerm(source) {
  return validateSenTerm(normalizeCarrier(source));
}
export function inferTerm(source, context = []) {
  const result = judgeSen(context.map(validateType), validateTerm(source));
  return result ?? fail("ill-typed-term", "term has no SEN type");
}
export function checkTerm(source, expectedSource, context = []) {
  return (
    judgeSen(
      context.map(validateType),
      validateTerm(source),
      validateType(expectedSource),
    ) || fail("ill-typed-term", "term does not have expected SEN type")
  );
}

export function normalizeEffectCell(source) {
  const cell = normalizeCarrier(source);
  validateEffectCell(cell);
  cell.measures = [...cell.measures].sort((left, right) =>
    Buffer.compare(
      Buffer.from(left.dimension, "utf8"),
      Buffer.from(right.dimension, "utf8"),
    ),
  );
  return cell;
}

/** The term an effect cell is: its JSON bridge term. */
export function effectTerm(cell) {
  return jsonToTerm(normalizeEffectCell(cell));
}

/** The effect cell an effect term carries, or undefined when it carries none. */
export function effectCellOfTerm(term) {
  try {
    return normalizeEffectCell(termToJson(term));
  } catch {
    return undefined;
  }
}

/** An effect bundle: `pair(effect cell term, operation)`. */
export function effectBundle(cell, operation) {
  return tm.pair(effectTerm(cell), operation);
}

/**
 * The type of one effect bundle whose operation has `operationType`: the
 * product of its cell term's structural type and the operation type. Refuses
 * a bundle whose first component is not an admitted effect cell.
 */
export function effectBundleType(bundle, operationType) {
  if (bundle?.[0] !== "pair")
    fail("malformed-effect-bundle", "an effect bundle is pair(effect cell term, operation)");
  let cell;
  try { cell = termToJson(bundle[1]); } catch { fail("malformed-effect-bundle", "an effect bundle's first component must be a JSON effect cell"); }
  normalizeEffectCell(cell);
  return ["prod", inferTerm(bundle[1]), operationType];
}

const readingOfOutcome = ({ positiveEvidence, negativeEvidence }) =>
  tm.reading(readingOfSides("extremal", positiveEvidence, negativeEvidence));

/**
 * One WIT: the proposal and completion of one effect, completed with the
 * named evidence, whose outcomes differ by exactly one FOUR knowledge cover.
 * The witness is the predication cell `pair(subject, pair(predicate, object))`
 * followed by the two readings and the evidence token.
 */
export function assayEffectTransition({
  proposalCell,
  completionCell,
  evidence,
}) {
  const proposal = normalizeEffectCell(proposalCell),
    completion = normalizeEffectCell(completionCell);
  ni(evidence, "transition evidence");
  witnessBit(proposal.outcome, completion.outcome);
  for (const field of ["caller", "parent", "provider"])
    if (!canonicalEqual(proposal[field], completion[field]))
      fail(
        "malformed-effect-transition",
        `${field} changed across one effect transition`,
      );
  if (completion.evidenceRoot !== evidence)
    fail(
      "malformed-effect-transition",
      "completion evidenceRoot must equal the WIT evidence identity",
    );
  const proposalId = semanticId(effectTerm(proposal));
  const grounded = tm.pair(
    tm.mark(proposalId),
    tm.pair(tm.mark("completed-with-evidence"), tm.mark(evidence)),
  );
  const witness = tm.pair(
    grounded,
    tm.pair(
      readingOfOutcome(proposal.outcome),
      tm.pair(readingOfOutcome(completion.outcome), tm.mark(evidence)),
    ),
  );
  return {
    proposal: proposalId,
    completion: semanticId(effectTerm(completion)),
    witness: semanticId(witness),
    witnessTerm: witness,
    outcome: completion.outcome,
  };
}

/** Resource bounding is a caller policy, not a claim about transfinite normalization. */
export function evaluate(source, fuel) {
  if (!Number.isInteger(fuel) || fuel < 0)
    fail("malformed-request", "fuel must be a nonnegative integer");
  let current = validateTerm(source),
    used = 0;
  while (true) {
    const next = reductionStep(current)[0];
    if (!next) return { normalForm: current, fuelUsed: used };
    if (used >= fuel)
      fail("fuel-exceeded", `reduction resource limit ${fuel} reached`);
    current = next;
    used += 1;
  }
}

function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === ";") {
      while (index < source.length && source[index] !== "\n") index += 1;
      continue;
    }
    if (character === "(" || character === ")") {
      tokens.push(character);
      index += 1;
      continue;
    }
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < source.length) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      try {
        tokens.push({ value: JSON.parse(source.slice(start, index)) });
      } catch {
        fail("malformed-rml", "invalid RML string literal");
      }
      continue;
    }
    const start = index;
    while (index < source.length && !/[\s();]/u.test(source[index])) index += 1;
    const atom = source.slice(start, index);
    if (atom === "#t") tokens.push({ value: true });
    else if (atom === "#f") tokens.push({ value: false });
    else if (atom === "nil") tokens.push({ value: null });
    else if (/^-?(0|[1-9][0-9]*)$/u.test(atom)) {
      const number = Number(atom);
      if (!Number.isSafeInteger(number))
        fail("malformed-rml", "RML integer exceeds the safe-integer profile");
      tokens.push({ value: number });
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
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        typeof entry[0] !== "string" ||
        Object.hasOwn(map, entry[0])
      )
        fail(
          "malformed-rml",
          "RML map entries must be unique (key value) pairs",
        );
      map[entry[0]] = entry[1];
    }
    return map;
  }
  return members;
}

export function parseRml(source) {
  if (typeof source !== "string")
    fail("malformed-rml", "RML source must be text");
  const header = source.match(/^#lang[ \t]+([^\r\n]+)[\r\n]+/u);
  if (!header || header[1].trim() !== RML_LANGUAGE)
    fail("unknown-rml-language", `RML source must begin #lang ${RML_LANGUAGE}`);
  const tokens = tokenize(source.slice(header[0].length)),
    state = { index: 0 },
    value = expression(tokens, state);
  if (state.index !== tokens.length)
    fail("malformed-rml", "RML source must contain exactly one expression");
  return normalizeCarrier(value);
}

function formatRmlExpression(source) {
  const value = normalizeCarrier(source);
  if (value === null) return "nil";
  if (typeof value === "boolean") return value ? "#t" : "#f";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value))
    return `(${value.map(formatRmlExpression).join(" ")})`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value).sort(([left], [right]) =>
      Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")),
    );
    return `(map ${entries.map(([key, child]) => `(${JSON.stringify(key)} ${formatRmlExpression(child)})`).join(" ")})`;
  }
  fail(
    "unprojectable-rml",
    "RML v2 text projection supports null, booleans, safe integers, text, sequences, and text-keyed maps",
  );
}

/** Deterministic, parse-round-tripping RML v2 projection for the public RML carrier subset. */
export function formatRml(source) {
  return `#lang ${RML_LANGUAGE}\n${formatRmlExpression(source)}\n`;
}

export function normalizeRml(source, expectedType) {
  const term = parseRml(source);
  checkTerm(term, expectedType);
  return term;
}
export function assay({ term, rml, expectedType, fuel }) {
  if ((term === undefined) === (rml === undefined))
    fail("malformed-request", "supply exactly one of term or rml");
  const type = validateType(expectedType),
    normalizedTerm =
      rml === undefined ? validateTerm(term) : normalizeRml(rml, type);
  checkTerm(normalizedTerm, type);
  const reduced = evaluate(normalizedTerm, fuel);
  checkTerm(reduced.normalForm, type);
  return {
    ...reduced,
    normalizedTerm,
    semanticId: semanticId(normalizedTerm),
    semanticBytes: semanticBytes(normalizedTerm),
  };
}

export * from "./runtime/conformance.mjs";
export * from "./runtime/semantic-content-identity.mjs";
