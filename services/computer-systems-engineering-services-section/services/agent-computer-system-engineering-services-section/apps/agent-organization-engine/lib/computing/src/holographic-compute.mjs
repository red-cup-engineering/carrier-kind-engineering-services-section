/**
 * holographic-compute - Nix-as-settling for content-addressed build terms.
 *
 * A Nix derivation is read here as a settled computing term. When a Nix store
 * path is present, the store hash is the term's `$id`; otherwise the finite
 * executable shadow uses the sha256 of the canonical derivation record. The
 * dependency graph is read as a LightObservation: sub-derivations causally
 * precede the derivations that depend on them.
 */

import { schemaFrom } from "@red-cup-engineering/json-schema-services-section/contracts";
import { createGraph, isAcyclic } from "@red-cup-engineering/metrologic/models/graphs/directed-multigraph";
import { semanticHex } from "@red-cup-engineering/computer-content-address-engineering-services-section/semiotic-content-address";

const hashPattern = "^[A-Za-z0-9._:+/-]+$";

const buildInputSchema = {
  type: "object",
  required: ["hash"],
  additionalProperties: false,
  properties: {
    hash: { type: "string", minLength: 1, pattern: hashPattern },
    name: { type: "string", minLength: 1 },
    storePath: { type: "string", minLength: 1 },
  },
};

export const buildDerivationSchema = {
  $id: "computing/build-derivation",
  title: "BuildDerivation",
  type: "object",
  required: ["kind", "name", "inputs"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-derivation" },
    name: { type: "string", minLength: 1 },
    builder: { type: "string", minLength: 1 },
    system: { type: "string", minLength: 1 },
    storePath: { type: "string", minLength: 1 },
    drvPath: { type: "string", minLength: 1 },
    outPath: { type: "string", minLength: 1 },
    args: { type: "array", items: { type: "string" } },
    env: { type: "object", additionalProperties: { type: "string" } },
    outputs: { type: "object", additionalProperties: { type: "string" } },
    inputs: { type: "array", items: buildInputSchema },
  },
};

export const buildDerivationCarrier = schemaFrom(buildDerivationSchema);

export const settledBuildTermSchema = {
  $id: "computing/settled-build-term",
  title: "SettledBuildTerm",
  type: "object",
  required: ["kind", "$id", "storeHash", "address", "workType", "hashAlgorithm", "derivation", "boundaryHashes"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.settled-build-term" },
    $id: { type: "string", minLength: 1, pattern: hashPattern },
    storeHash: { type: "string", minLength: 1, pattern: hashPattern },
    address: { type: "string", minLength: 1, pattern: hashPattern },
    workType: { const: "derivation" },
    hashAlgorithm: { enum: ["nix-store", "sha256"] },
    derivation: buildDerivationSchema,
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
  },
};

export const settledBuildTermCarrier = schemaFrom(settledBuildTermSchema);

export const lightObservationSchema = {
  $id: "computing/light-observation",
  title: "LightObservation",
  type: "object",
  required: ["kind", "nodes", "edges", "boundaryHashes", "causalOrder", "h1"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.light-observation" },
    nodes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    edges: {
      type: "array",
      items: {
        type: "object",
        required: ["from", "to"],
        additionalProperties: false,
        properties: {
          from: { type: "string", minLength: 1, pattern: hashPattern },
          to: { type: "string", minLength: 1, pattern: hashPattern },
        },
      },
    },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    causalOrder: { type: "boolean" },
    h1: { type: "integer", minimum: 0 },
  },
};

export const lightObservationCarrier = schemaFrom(lightObservationSchema);

export const buildReconstructionRequestSchema = {
  $id: "computing/build-reconstruction-request",
  title: "BuildReconstructionRequest",
  type: "object",
  required: ["kind", "targetHash", "boundaryHashes", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-reconstruction-request" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    tiles: { type: "array", items: settledBuildTermSchema },
  },
};

export const buildReconstructionRequestCarrier = schemaFrom(buildReconstructionRequestSchema);

export const buildReconstructionSchema = {
  $id: "computing/build-reconstruction",
  title: "BuildReconstruction",
  type: "object",
  required: [
    "kind",
    "targetHash",
    "reconstructible",
    "resultHash",
    "closureHashes",
    "boundaryHashes",
    "missingSubderivations",
    "boundaryObstructions",
    "cycleObstructions",
    "cover",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-reconstruction" },
    targetHash: { type: "string", minLength: 1, pattern: hashPattern },
    reconstructible: { type: "boolean" },
    resultHash: { type: "string", minLength: 1, pattern: hashPattern },
    closureHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    missingSubderivations: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryObstructions: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    cycleObstructions: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    cover: {
      type: "object",
      required: ["h1", "closed", "acyclic", "boundaryExact"],
      additionalProperties: false,
      properties: {
        h1: { type: "integer", minimum: 0 },
        closed: { type: "boolean" },
        acyclic: { type: "boolean" },
        boundaryExact: { type: "boolean" },
      },
    },
  },
};

export const buildReconstructionCarrier = schemaFrom(buildReconstructionSchema);

export const buildDiffRequestSchema = {
  $id: "computing/build-diff-request",
  title: "BuildDiffRequest",
  type: "object",
  required: ["kind", "leftTargetHash", "rightTargetHash", "leftBoundaryHashes", "rightBoundaryHashes", "tiles"],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-diff-request" },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    leftBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    rightBoundaryHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    tiles: { type: "array", items: settledBuildTermSchema },
  },
};

export const buildDiffRequestCarrier = schemaFrom(buildDiffRequestSchema);

export const buildDiffSchema = {
  $id: "computing/build-diff",
  title: "BuildDiff",
  type: "object",
  required: [
    "kind",
    "leftTargetHash",
    "rightTargetHash",
    "equivalent",
    "reconstructible",
    "sharedHashes",
    "addedHashes",
    "removedHashes",
    "boundaryDeltaHashes",
    "h1",
    "left",
    "right",
  ],
  additionalProperties: false,
  properties: {
    kind: { const: "computing.build-diff" },
    leftTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    rightTargetHash: { type: "string", minLength: 1, pattern: hashPattern },
    equivalent: { type: "boolean" },
    reconstructible: { type: "boolean" },
    sharedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    addedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    removedHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    boundaryDeltaHashes: { type: "array", items: { type: "string", minLength: 1, pattern: hashPattern } },
    h1: { type: "integer", minimum: 0 },
    left: buildReconstructionSchema,
    right: buildReconstructionSchema,
  },
};

export const buildDiffCarrier = schemaFrom(buildDiffSchema);

const nixStoreHashPattern = /(?:^|[/\\])nix[/\\]store[/\\]([0-9a-df-np-sv-z]{32})-[^/\\]+$/i;

export function nixStoreHash(path) {
  return nixStoreHashPattern.exec(path)?.[1];
}

function unique(values) {
  return Object.freeze([...new Set(values)]);
}

function sorted(values) {
  return Object.freeze([...values].sort((left, right) => left.localeCompare(right)));
}

export function settleBuildDerivation(input) {
  const derivation = buildDerivationCarrier.assert(input);
  const storePath = derivation.outPath ?? derivation.storePath ?? derivation.drvPath;
  const parsedHash = storePath === undefined ? undefined : nixStoreHash(storePath);
  const storeHash = parsedHash ?? semanticHex(derivation);
  return settledBuildTermCarrier.assert(Object.freeze({
    kind: "computing.settled-build-term",
    $id: storeHash,
    storeHash,
    address: storeHash,
    workType: "derivation",
    hashAlgorithm: parsedHash === undefined ? "sha256" : "nix-store",
    derivation,
    boundaryHashes: unique(derivation.inputs.map((entry) => entry.hash)),
  }));
}

/**
 * The light observation of a causal event graph, each event named with the events it follows: the
 * arrows run from each parent into its event, the boundary is the events no arrow reaches, and the
 * order is causal (h1 0) while the arrows close no cycle (h1 1 once one does). Build terms read by
 * their boundary hashes and Git commits read by their parents are both observed this way.
 */
export function causalLightObservation(events) {
  const edges = Object.freeze(events.flatMap(({ id, parents }) => parents.map((parent) => Object.freeze({ from: parent, to: id }))));
  const nodes = new Set(events.flatMap(({ id, parents }) => [id, ...parents]));
  const reached = new Set(edges.map((edge) => edge.to));
  const causalOrder = isAcyclic(createGraph({ edges }));
  return lightObservationCarrier.assert(Object.freeze({
    kind: "computing.light-observation",
    nodes: sorted(nodes),
    edges,
    boundaryHashes: sorted([...nodes].filter((node) => !reached.has(node))),
    causalOrder,
    h1: causalOrder ? 0 : 1,
  }));
}

/** The light observation of settled build terms, each following its boundary hashes. */
export function lightObservation(terms) {
  return causalLightObservation(terms.map((term) => {
    const settled = settledBuildTermCarrier.assert(term);
    return { id: settled.$id, parents: settled.boundaryHashes };
  }));
}

function symmetricDifference(left, right) {
  const l = new Set(left);
  const r = new Set(right);
  return sorted([...left.filter((value) => !r.has(value)), ...right.filter((value) => !l.has(value))]);
}

export function reconstructFromHashes(input) {
  const request = buildReconstructionRequestCarrier.assert(input);
  const tiles = new Map(request.tiles.map((tile) => [tile.$id, tile]));
  const missing = new Set();
  const closure = new Set();
  const cycles = new Set();
  const visiting = new Set();

  const visit = (hash) => {
    if (visiting.has(hash)) {
      cycles.add(hash);
      return;
    }
    if (closure.has(hash)) return;
    const tile = tiles.get(hash);
    if (tile === undefined) {
      missing.add(hash);
      return;
    }
    visiting.add(hash);
    for (const dependency of tile.boundaryHashes) visit(dependency);
    visiting.delete(hash);
    closure.add(hash);
  };

  visit(request.targetHash);
  const closureHashes = sorted(closure);
  const computedBoundary = sorted(closureHashes.filter((hash) => {
    const tile = tiles.get(hash);
    return tile !== undefined && tile.boundaryHashes.length === 0;
  }));
  const boundaryObstructions = symmetricDifference(computedBoundary, request.boundaryHashes);
  const cycleObstructions = sorted(cycles);
  const missingSubderivations = sorted(missing);
  const h1 = missingSubderivations.length + boundaryObstructions.length + cycleObstructions.length;

  return buildReconstructionCarrier.assert(Object.freeze({
    kind: "computing.build-reconstruction",
    targetHash: request.targetHash,
    reconstructible: h1 === 0,
    resultHash: request.targetHash,
    closureHashes,
    boundaryHashes: computedBoundary,
    missingSubderivations,
    boundaryObstructions,
    cycleObstructions,
    cover: Object.freeze({
      h1,
      closed: missingSubderivations.length === 0,
      acyclic: cycleObstructions.length === 0,
      boundaryExact: boundaryObstructions.length === 0,
    }),
  }));
}

function intersection(left, right) {
  const r = new Set(right);
  return sorted(left.filter((value) => r.has(value)));
}

function difference(left, right) {
  const r = new Set(right);
  return sorted(left.filter((value) => !r.has(value)));
}

export function diffFromBoundaryHashes(input) {
  const request = buildDiffRequestCarrier.assert(input);
  const left = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: request.leftTargetHash,
    boundaryHashes: request.leftBoundaryHashes,
    tiles: request.tiles,
  });
  const right = reconstructFromHashes({
    kind: "computing.build-reconstruction-request",
    targetHash: request.rightTargetHash,
    boundaryHashes: request.rightBoundaryHashes,
    tiles: request.tiles,
  });
  const sharedHashes = intersection(left.closureHashes, right.closureHashes);
  const addedHashes = difference(right.closureHashes, left.closureHashes);
  const removedHashes = difference(left.closureHashes, right.closureHashes);
  const boundaryDeltaHashes = symmetricDifference(left.boundaryHashes, right.boundaryHashes);
  const diffH1 = left.cover.h1 + right.cover.h1;
  return buildDiffCarrier.assert(Object.freeze({
    kind: "computing.build-diff",
    leftTargetHash: request.leftTargetHash,
    rightTargetHash: request.rightTargetHash,
    equivalent: addedHashes.length === 0 && removedHashes.length === 0 && boundaryDeltaHashes.length === 0,
    reconstructible: left.reconstructible && right.reconstructible,
    sharedHashes,
    addedHashes,
    removedHashes,
    boundaryDeltaHashes,
    h1: diffH1,
    left,
    right,
  }));
}
