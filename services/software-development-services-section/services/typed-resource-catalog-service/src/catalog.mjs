import { classify, define, restrict } from "@red-cup-engineering/file-projection-kernel-service";
import * as writing from "@red-cup-engineering/computer-filepath-engineering-services-section/address";
import { canonicalJson, immutable, semanticId } from "./canonical.mjs";
import { recognize, validateRecognition } from "./recognition.mjs";

export const CATALOG_PROFILE = "org.red-cup-engineering.typed-resource-catalog.v1";
const CORNERS = new Set(["bottom", "data", "prose", "assertion"]);
const RUNGS = new Set(["identity", "scott", "non-monotone", "turing"]);
const MAX_RESOURCE_PATH_LENGTH = 16_384;
const MAX_RESOURCE_BYTES = 1_048_576;
const MAX_CATALOG_NODES = 256;
const MAX_CATALOG_IMPORTS = 256;

function requireResource(resource) {
  if (resource === null || typeof resource !== "object" || Array.isArray(resource)) throw new TypeError("resource must be an object");
  if (typeof resource.path !== "string") throw new TypeError("resource.path must be a string");
  if (typeof resource.content !== "string") throw new TypeError("resource.content must be a string");
  if (resource.path.length === 0 || resource.path.length > MAX_RESOURCE_PATH_LENGTH) throw new TypeError("resource.path must be a nonempty bounded locator");
  if (Buffer.byteLength(resource.content, "utf8") > MAX_RESOURCE_BYTES) throw new TypeError(`resource.content exceeds ${MAX_RESOURCE_BYTES} UTF-8 bytes`);
  return Object.freeze({ path: resource.path, content: resource.content });
}

function refsIn(value, refs = []) {
  if (Array.isArray(value)) for (const item of value) refsIn(item, refs);
  else if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "$ref" && typeof item === "string") refs.push(item);
      else refsIn(item, refs);
    }
  }
  return refs;
}

function auditSchemas(declaration) {
  const known = new Set(declaration.imports ?? []);
  const obligations = [];
  for (const node of declaration.nodes) {
    if (node.schema !== undefined) {
      if (node.schema === null || typeof node.schema !== "object" || Array.isArray(node.schema)) {
        obligations.push({ kind: "invalid-schema", type: node.type, reason: "schema is not an object" });
      } else if (typeof node.schema.$id !== "string" || node.schema.$id.length === 0) {
        obligations.push({ kind: "schema-without-identity", type: node.type });
      } else if (known.has(node.schema.$id)) {
        obligations.push({ kind: "duplicate-schema-identity", type: node.type, ref: node.schema.$id });
      } else known.add(node.schema.$id);
    }
  }
  for (const node of declaration.nodes) {
    if (node.schema === undefined || node.schema === null || typeof node.schema !== "object") continue;
    for (const ref of refsIn(node.schema)) {
      const base = ref.split("#")[0];
      if (base !== "" && !known.has(base)) obligations.push({ kind: "unresolved-schema-reference", type: node.type, ref });
    }
  }
  return obligations;
}

function validateDeclaration(declaration) {
  if (declaration === null || typeof declaration !== "object" || Array.isArray(declaration)) throw new TypeError("catalog declaration must be an object");
  if (declaration.profile !== CATALOG_PROFILE) throw new TypeError(`catalog.profile must be ${CATALOG_PROFILE}`);
  if (!Array.isArray(declaration.nodes) || declaration.nodes.length === 0 || declaration.nodes.length > MAX_CATALOG_NODES) throw new TypeError(`catalog.nodes must contain 1 to ${MAX_CATALOG_NODES} nodes`);
  if (declaration.imports !== undefined && (!Array.isArray(declaration.imports) || declaration.imports.some((item) => typeof item !== "string"))) {
    throw new TypeError("catalog.imports must be an array of schema identities");
  }
  if ((declaration.imports?.length ?? 0) > MAX_CATALOG_IMPORTS) throw new TypeError(`catalog.imports may contain at most ${MAX_CATALOG_IMPORTS} identities`);
  const byType = new Map();
  for (const node of declaration.nodes) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) throw new TypeError("catalog node must be an object");
    if (typeof node.type !== "string" || node.type.length === 0) throw new TypeError("catalog node.type must be nonempty");
    if (byType.has(node.type)) throw new TypeError(`duplicate catalog type: ${node.type}`);
    if (node.parent !== null && typeof node.parent !== "string") throw new TypeError(`${node.type}.parent must be a type or null`);
    if (!CORNERS.has(node.corner ?? "bottom")) throw new TypeError(`${node.type}.corner is invalid`);
    if (!RUNGS.has(node.rung ?? "identity")) throw new TypeError(`${node.type}.rung is invalid`);
    validateRecognition(node.recognize);
    byType.set(node.type, node);
  }
  for (const node of declaration.nodes) if (node.parent !== null && !byType.has(node.parent)) throw new TypeError(`${node.type}: unknown parent ${node.parent}`);
  const visiting = new Set();
  const visited = new Set();
  const visit = (type) => {
    if (visiting.has(type)) throw new TypeError(`catalog restriction cycle at ${type}`);
    if (visited.has(type)) return;
    visiting.add(type);
    const parent = byType.get(type).parent;
    if (parent !== null) visit(parent);
    visiting.delete(type);
    visited.add(type);
  };
  for (const type of byType.keys()) visit(type);
  return byType;
}

export function compileCatalog(declaration, options = {}) {
  const byType = validateDeclaration(declaration);
  const obligations = auditSchemas(declaration);
  if (options.closed === true && obligations.length > 0) {
    throw new TypeError(`catalog is not closed: ${obligations.map((item) => `${item.kind}:${item.type}${item.ref ? `:${item.ref}` : ""}`).join(", ")}`);
  }
  const projectors = new Map();
  const build = (type) => {
    if (projectors.has(type)) return projectors.get(type);
    const node = byType.get(type);
    const local = (resource) => recognize(resource, node.recognize);
    const projector = node.parent === null
      ? define({ type, recognize: local, corner: node.corner, rung: node.rung })
      : restrict(build(node.parent), { type, recognize: local, corner: node.corner, rung: node.rung });
    projectors.set(type, projector);
    return projector;
  };
  for (const type of byType.keys()) build(type);
  const normalized = JSON.parse(canonicalJson(declaration));
  return Object.freeze({
    profile: CATALOG_PROFILE,
    id: semanticId(normalized),
    declaration: immutable(normalized),
    projectors: Object.freeze([...projectors.values()]),
    nodes: byType,
    obligations: immutable(obligations),
  });
}

function lineage(compiled, type) {
  const out = [];
  let node = compiled.nodes.get(type);
  while (node) {
    out.push(node);
    node = node.parent === null ? null : compiled.nodes.get(node.parent);
  }
  return out.reverse();
}

function depth(compiled, type) { return lineage(compiled, type).length; }

export function classifyResource(compiledOrDeclaration, rawResource, options = {}) {
  const compiled = compiledOrDeclaration?.projectors ? compiledOrDeclaration : compileCatalog(compiledOrDeclaration, options);
  const resource = requireResource(rawResource);
  const recognized = compiled.projectors.filter((projector) => projector.recognize(resource));
  const maxDepth = recognized.reduce((value, projector) => Math.max(value, depth(compiled, projector.type)), 0);
  const maximal = recognized.filter((projector) => depth(compiled, projector.type) === maxDepth);
  const selected = classify(resource, compiled.projectors);
  const disposition = maximal.length === 0 ? "unclassified" : maximal.length === 1 ? "classified" : "ambiguous";
  const proofPath = disposition === "classified"
    ? lineage(compiled, maximal[0].type).map((node, ordinal) => Object.freeze({
        ordinal,
        type: node.type,
        parent: node.parent,
        localRecognition: node.recognize,
        witnessed: recognize(resource, node.recognize),
      }))
    : [];
  const term = options.term ?? (disposition === "classified" ? maximal[0].type : semanticId(resource));
  const type = options.pathType ?? "resource.json";
  const address = options.addressRoot === undefined ? undefined : writing.address(options.addressRoot, term, type);
  const receipt = {
    profile: "org.red-cup-engineering.typed-resource-classification.v1",
    catalog: compiled.id,
    // The complete admitted path is the resource's Curry-Howard coordinate:
    // each segment is an earned restriction and the full ancestor chain is
    // constitutive of identity. Equal bytes at different proof paths are
    // different resources. Keep content identity as a separate byte witness.
    resource: semanticId({ path: resource.path, content: resource.content }),
    resourcePath: resource.path,
    contentIdentity: semanticId({ content: resource.content }),
    disposition,
    classification: disposition === "classified" ? maximal[0].type : null,
    candidates: maximal.map((projector) => projector.type).sort(),
    recognized: recognized.map((projector) => projector.type).sort(),
    proofPath,
    pathReading: address === undefined ? null : {
      address,
      term,
      type,
      recoveredTerm: writing.termOf(options.addressRoot, address),
    },
    catalogObligations: compiled.obligations,
  };
  if (selected !== null && disposition === "classified" && selected.type !== maximal[0].type) throw new Error("relating classifier disagreed with TRC maximal witness");
  return immutable({ ...receipt, id: semanticId(receipt) });
}

export function auditCatalog(declaration) {
  const compiled = compileCatalog(declaration);
  const receipt = {
    profile: "org.red-cup-engineering.typed-resource-catalog-audit.v1",
    catalog: compiled.id,
    closed: compiled.obligations.length === 0,
    obligations: compiled.obligations,
    types: compiled.projectors.map((projector) => projector.type).sort(),
  };
  return immutable({ ...receipt, id: semanticId(receipt) });
}
