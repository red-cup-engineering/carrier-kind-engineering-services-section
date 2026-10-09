// Thin CLI over src/generate.mjs: reads one context, its readings, a
// conductance list, and an object, settles the valuation, then draws one
// continuation for that object Gibbs-style at the given temperature and
// prints the move, its energy, every candidate's energy, and the wit
// record of excluded mass. All generation law stays in src/generate.mjs.

import { jsonCommand } from "./json-command.mjs";
import { makeContext, lawfulBasis } from "@red-cup-engineering/metrologic/closure/formal-context";
import { makeValuation, withReading, settle } from "@red-cup-engineering/signcraft/inference/nuclei";
import { makeComplex, withConductance } from "@red-cup-engineering/signcraft/inference/complex";
import { generate, enabledMoves } from "@red-cup-engineering/signcraft/inference/generate";
import { mulberry32 } from "@red-cup-engineering/signcraft/inference/learn";

const HELP = `Usage: generate-continuation.mjs [corpus.json]

Reads {objects, attributes, pairs, denials?, readings?, conductances?, object,
temperature?, seed?} as JSON from the given file, or from stdin when no
file is given; settles the valuation, and prints one continuation for
\`object\` drawn from its enabled cone.

  objects, attributes, pairs   the witnessed context (required)
  denials       [[object, attribute], ...] witnessed denials (optional)
  readings       [[object, attribute, value], ...] extra readings (knowledge family) (optional)
  conductances  [[attribute, attribute, weight], ...] (optional)
  object        the object to continue (required; may be new to the context)
  temperature   Gibbs temperature, default 0.5
  seed          integer seed for the draw, default 7

Output: {"move": {g, attr, question} | null, "dF": number | null,
         "candidates": [{attr, dF}], "wit": {chosen, temperature,
         excludedMass, excluded: [{attr, p, dF}]} | null,
         "questions": [...], "ledger": {...}}

Exit 0 with {"ok":true,"result":...} on success.
Exit 1 with {"ok":false,"refusal":{"code":...,"message":...}} on refusal.

  --help, -h   print this text and exit
`;

export function generateContinuationRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throwMalformed("input must be one JSON object");
  const { objects, attributes, pairs, denials = [], readings = [], conductances = [], object, temperature = 0.5, seed = 7 } = input;
  if (!Array.isArray(objects) || !Array.isArray(attributes) || !Array.isArray(pairs)) {
    throwMalformed("input requires objects, attributes, and pairs arrays");
  }
  if (typeof object !== "string" || object.length === 0) throwMalformed("object must be a non-empty string");
  for (const [name, value] of [["denials", denials], ["readings", readings], ["conductances", conductances]]) {
    if (!Array.isArray(value)) throwMalformed(`${name} must be an array`);
  }
  if (typeof temperature !== "number" || !(temperature > 0)) throwMalformed("temperature must be a positive number");
  if (!Number.isInteger(seed)) throwMalformed("seed must be an integer");
  return { objects, attributes, pairs, denials, readings, conductances, object, temperature, seed };
}

export function generateContinuation(input) {
  const r = generateContinuationRequest(input);
  const ctx = makeContext(r.objects, r.attributes, r.pairs, r.denials);
  const basis = lawfulBasis(ctx);
  let cx = makeComplex(r.attributes);
  for (const [a, b, w] of r.conductances) cx = withConductance(cx, a, b, w);
  let v = makeValuation();
  for (const [g, m] of r.pairs) v = withReading(v, g, m, "potential");
  for (const [g, m] of r.denials) v = withReading(v, g, m, "active");
  for (const [g, m, value] of r.readings) v = withReading(v, g, m, value);
  const settled = settle(ctx, v, { basis, cx });
  const out = generate(ctx, basis, cx, settled.v, r.object, { T: r.temperature, rng: mulberry32(r.seed) });
  return {
    move: out.move,
    dF: out.dF ?? null,
    candidates: out.candidates.map((c) => ({ attr: c.move.attr, dF: c.dF })),
    wit: out.wit,
    questions: enabledMoves(ctx, basis, settled.v, r.object).map((m) => m.question),
    ledger: settled.ledger,
  };
}

function throwMalformed(message) {
  const error = new Error(message);
  error.code = "malformed-input";
  throw error;
}

/** The runnable declaration: javascript-node's runJavascriptNodeOperationModule executes it. */
export const command = jsonCommand({ help: HELP, errorCode: "generation-error", execute: (input, parsed) => generateContinuation(input) });
