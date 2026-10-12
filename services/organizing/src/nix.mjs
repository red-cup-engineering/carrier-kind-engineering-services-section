/**
 * nix - organizing-owned standards boundary for reproducible compute closure.
 *
 * Nix/Guix is the scale-2 computing/IN-face reproducibility standard hosted on
 * the organizing bulk, the same way jupyter.mts hosts Jupyter. This module
 * models the derivation algebra; it never shells out to a real nix or guix
 * binary. A derivation is an SEN term, evaluation settles it to normal form, the
 * store path is the content address of that normal form, and a closure is the
 * transitive settled dependency set witnessed as ledger rows.
 */
import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";
import { tmCarrier } from "@red-cup-engineering/relating";
import { evaluate } from "@red-cup-engineering/computer-code-engineering-services-section/semiotic-expression-notation/eval";

export const NIX_NO_REAL_BINARY_ASSUMPTION =
  "organizing/nix models derivation algebra over SEN terms; it does not invoke a real nix or guix binary.";

const SenTermRefSchema = { $ref: tmCarrier.id };
const JsonValueSchema = {};
const JsonRecordSchema = { type: "object", additionalProperties: true };

export const NixWitnessSchema = {
  $id: "organizing/nix/witness",
  title: "Nix derivation witness",
  description: "A witness-ledger row emitted while settling Nix/Guix derivations.",
  type: "object",
  additionalProperties: false,
  required: ["e", "a", "v", "t"],
  properties: {
    e: { type: "string", minLength: 1 },
    a: { type: "string", minLength: 1 },
    v: JsonValueSchema,
    t: { type: "string", minLength: 1 },
  },
};

export const NixDerivationSchema = {
  $id: "organizing/nix/derivation",
  title: "Nix derivation",
  description:
    "A Nix/Guix derivation as a settled SEN term: deterministic evaluation reaches the normal form whose content address names the store path.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "id", "name", "system", "term", "inputIds", "env"],
  properties: {
    kind: { const: "organizing.nix.derivation" },
    id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    system: { type: "string", minLength: 1 },
    term: SenTermRefSchema,
    inputIds: { type: "array", items: { type: "string", minLength: 1 } },
    env: JsonRecordSchema,
  },
};

export const NixStorePathSchema = {
  $id: "organizing/nix/store-path",
  title: "Nix store path",
  description:
    "A content-addressed store path projected from a settled derivation normal form. The `$id` is the term content id.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "$id", "derivationId", "name", "hash", "path", "normalForm"],
  properties: {
    kind: { const: "organizing.nix.store-path" },
    $id: { type: "string", minLength: 1 },
    derivationId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    hash: { type: "string", minLength: 64 },
    path: { type: "string", minLength: 1 },
    normalForm: SenTermRefSchema,
  },
};

export const NixClosureSchema = {
  $id: "organizing/nix/closure",
  title: "Nix closure",
  description:
    "The transitive settled dependency set of a root derivation, with store paths and witness-ledger rows.",
  type: "object",
  additionalProperties: false,
  required: ["kind", "root", "storePaths", "witnesses"],
  properties: {
    kind: { const: "organizing.nix.closure" },
    root: { type: "string", minLength: 1 },
    storePaths: { type: "array", items: { $ref: "organizing/nix/store-path" } },
    witnesses: { type: "array", items: NixWitnessSchema },
  },
};

export const nixWitnessCarrier = schemaFrom(NixWitnessSchema);
export const nixDerivationCarrier = schemaFrom(NixDerivationSchema);
export const nixStorePathCarrier = schemaFrom(NixStorePathSchema);
export const nixClosureCarrier = schemaFrom(NixClosureSchema);

export function nixDerivation(input) {
  const term = tmCarrier.assert(input.term, "nixDerivation.term");
  const value = {
    kind: "organizing.nix.derivation",
    id: input.id,
    name: input.name,
    system: input.system ?? "x86_64-linux",
    term,
    inputIds: uniqueSorted(input.inputIds ?? []),
    env: Object.freeze({ ...(input.env ?? {}) }),
  };
  return nixDerivationCarrier.assert(value, "nixDerivation");
}

export function settleDerivation(input) {
  const derivation = isDerivation(input) ? input : nixDerivation(input);
  const normalForm = tmCarrier.assert(evaluate(derivation.term), "settleDerivation.normalForm");
  const storePath = storePathFromTerm(normalForm, derivation);
  return Object.freeze({
    derivation,
    normalForm,
    storePath,
    witnesses: Object.freeze(settlementWitnesses(derivation, storePath)),
  });
}

export function evaluateDerivation(input) {
  return settleDerivation(input).storePath;
}

export function termContentId(term) {
  const admitted = tmCarrier.assert(term, "termContentId");
  return `nix:sha256:${semanticHex(admitted)}`;
}

export function storePathFromTerm(term, derivation) {
  const normalForm = tmCarrier.assert(term, "storePathFromTerm");
  const $id = termContentId(normalForm);
  const hash = $id.slice("nix:sha256:".length);
  const value = {
    kind: "organizing.nix.store-path",
    $id,
    derivationId: derivation.id,
    name: derivation.name,
    hash,
    path: `/nix/store/${hash}-${storeName(derivation.name)}`,
    normalForm,
  };
  return nixStorePathCarrier.assert(value, "storePathFromTerm");
}

export function closureOf(root, derivations) {
  const rootDerivation = isDerivation(root) ? root : nixDerivation(root);
  const byId = new Map();
  byId.set(rootDerivation.id, rootDerivation);
  for (const item of derivations) {
    const derivation = isDerivation(item) ? item : nixDerivation(item);
    byId.set(derivation.id, derivation);
  }

  const order = [];
  const visiting = new Set();
  const visited = new Set();

  const visit = (id) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`closureOf: cyclic derivation dependency at ${id}`);
    const derivation = byId.get(id);
    if (derivation === undefined) throw new Error(`closureOf: missing derivation ${id}`);
    visiting.add(id);
    for (const inputId of derivation.inputIds) visit(inputId);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  visit(rootDerivation.id);

  const storePaths = [];
  const witnesses = [];
  for (const id of order) {
    const derivation = byId.get(id);
    const settled = settleDerivation(derivation);
    storePaths.push(settled.storePath);
    witnesses.push(...settled.witnesses);
    for (const inputId of derivation.inputIds) {
      witnesses.push(witness(derivation.id, "organizing/nix/input", inputId, `nix:closure:${rootDerivation.id}`));
    }
  }

  const value = {
    kind: "organizing.nix.closure",
    root: rootDerivation.id,
    storePaths: Object.freeze(storePaths),
    witnesses: Object.freeze(witnesses),
  };
  return nixClosureCarrier.assert(value, "closureOf");
}

function isDerivation(value) {
  return "kind" in value && value.kind === "organizing.nix.derivation";
}

function settlementWitnesses(derivation, storePath) {
  return Object.freeze([
    witness(derivation.id, "organizing/nix/settles-to", storePath.$id, `nix:settle:${storePath.$id}`),
    witness(storePath.$id, "organizing/nix/normal-form", storePath.normalForm, `nix:settle:${storePath.$id}`),
  ]);
}

function witness(e, a, v, t) {
  return nixWitnessCarrier.assert(Object.freeze({ e, a, v, t }), "nixWitness");
}

function uniqueSorted(values) {
  return Object.freeze([...new Set(values)].sort());
}

function storeName(name) {
  const normalized = name.toLowerCase().replace(/[^a-z0-9+._?-]+/gu, "-").replace(/^-+|-+$/gu, "");
  return normalized.length === 0 ? "derivation" : normalized;
}
