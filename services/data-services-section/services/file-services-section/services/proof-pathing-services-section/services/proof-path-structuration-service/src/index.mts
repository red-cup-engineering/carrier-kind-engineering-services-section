/**
 * The recovered proof-pathing fold, normalized to the live file-service
 * boundary.  It is deliberately pure: the target atom and the witnesses are
 * data, and a path is returned only when those witnesses earn every step.
 */

export type JsonPrimitive = null | boolean | number | string;
export type AddressableTerm = JsonPrimitive | readonly AddressableTerm[] | { readonly [key: string]: AddressableTerm };

export const GENERATORS = Object.freeze([
  "specialization",
  "converse",
  "subject-projection",
  "object-projection",
] as const);
export type Generator = (typeof GENERATORS)[number];

export interface RelationalCell {
  readonly subject: AddressableTerm;
  readonly predicate: AddressableTerm;
  readonly object: AddressableTerm;
}

export interface GeneratorWitness {
  readonly domain: AddressableTerm;
  readonly generator: Generator;
  readonly codomain: AddressableTerm;
}

/**
 * RMN's small, transport-safe proof vocabulary.  A coordinate is a settled
 * term, rather than a pathname or a digest.  The file-path AST below is one
 * read-only rendering of a settlement coordinate.
 */
export interface ArticulationTerm {
  readonly type: "articulation";
  readonly resourceType: string;
  readonly value: AddressableTerm;
}

export interface PredicationTerm {
  readonly type: "predication";
  readonly resourceType: string;
  readonly subject: AddressableTerm;
  readonly predicate: AddressableTerm;
  readonly object: AddressableTerm;
}

export interface PositingTerm {
  readonly type: "positing";
  readonly resourceType: string;
  readonly value: AddressableTerm;
}

export interface GeneratorWitnessTerm {
  readonly type: "generator-witness";
  readonly witness: GeneratorWitness;
}

export interface SettlementTerm {
  readonly type: "settlement";
  readonly resourceType: string;
  readonly root: AddressableTerm;
  readonly target: AddressableTerm;
  readonly witnesses: readonly GeneratorWitness[];
}

export type RmnProofTerm = ArticulationTerm | PredicationTerm | PositingTerm | GeneratorWitnessTerm | SettlementTerm;

/** Settled proof coordinate. It is semantic material, not by itself an identity. */
export interface ProofCoordinate {
  readonly type: "rmn-proof-coordinate";
  readonly version: 1;
  readonly settlement: SettlementTerm;
}

/** A dynamic name is deliberately not assignable to ProofCoordinate. */
export interface ProofSelector {
  readonly type: "rmn-proof-selector";
  readonly selector: string;
  readonly resolver: string;
}

export interface CryptographicWitness {
  readonly type: "commitment" | "merkle" | "signature" | "anchor-5615611";
  readonly algorithm: string;
  readonly value: string;
}

/** Public carriers always retain the coordinate; witnesses are boundary policy. */
export interface ProofEnvelope {
  readonly type: "rmn-proof-envelope";
  readonly coordinate: ProofCoordinate;
  readonly witnesses: readonly CryptographicWitness[];
}

export type ProofCoordinateResult =
  | Readonly<{ ok: true; coordinate: ProofCoordinate; route: ProofRoute }>
  | Readonly<{ ok: false; reason: "invalid-coordinate" | "invalid-resource-type" | "invalid-witness" | "unearned-coordinate" }>;

export interface RouteStep {
  readonly generator: Generator;
  readonly node: AddressableTerm;
}

export interface ProofRoute {
  readonly root: AddressableTerm;
  readonly steps: readonly RouteStep[];
}

export interface TermSegmentNode {
  readonly type: "term-segment";
  readonly role: "root" | "codomain";
  readonly key: string;
  readonly segment: string;
}

export interface ProofStepNode {
  readonly type: "proof-step";
  readonly generator: Generator;
  readonly namespace: "library";
  readonly node: TermSegmentNode;
}

export interface PosixFilepathAst {
  readonly type: "posix-filepath";
  readonly absolute: false;
  readonly root: TermSegmentNode;
  readonly steps: readonly ProofStepNode[];
}

/** A derived catalog entry.  Its address is an earned path, never a lookup key. */
export interface ProofPathCatalogEntry<A extends AddressableTerm = AddressableTerm> {
  readonly atom: A;
  readonly address: string;
  readonly ast: PosixFilepathAst;
}

/** An evictable, deterministic projection of successful proof-path derivations. */
export interface ProofPathCatalog<A extends AddressableTerm = AddressableTerm> {
  readonly type: "proof-path-catalog";
  readonly entries: readonly ProofPathCatalogEntry<A>[];
  readonly refusals: readonly StructurationResult<A>[];
}

export interface ProofPathChartNode {
  readonly type: "proof-path-chart-node";
  readonly role: "root" | "codomain";
  readonly key: string;
  readonly segment: string;
}

export interface ProofPathChartEdge {
  readonly type: "proof-path-chart-edge";
  readonly from: ProofPathChartNode;
  readonly generator: Generator;
  readonly to: ProofPathChartNode;
}

/** The chart is a readout of catalogued proofs; it does not create evidence. */
export interface ProofPathChart {
  readonly type: "proof-path-chart";
  readonly nodes: readonly ProofPathChartNode[];
  readonly edges: readonly ProofPathChartEdge[];
}

export type RefusalCode =
  | "invalid-request"
  | "unaddressable-term"
  | "ambiguous-evidence"
  | "invalid-witness"
  | "unearned-path";

export interface StructurationDiagnostics {
  readonly witnessCount: number;
  readonly stepCount: number;
}

export type StructurationResult<A extends AddressableTerm = AddressableTerm> =
  | Readonly<{ ok: true; atom: A; ast: PosixFilepathAst; diagnostics: StructurationDiagnostics }>
  | Readonly<{ ok: false; atom: A; reason: RefusalCode; diagnostics: StructurationDiagnostics }>;

export type StructurationRequest<A extends AddressableTerm = AddressableTerm> = Readonly<{
  atom: A;
  root: AddressableTerm;
  context?: readonly RelationalCell[];
  witnesses?: readonly GeneratorWitness[];
  specializationPredicate?: AddressableTerm;
}>;

class AdmissionError extends TypeError {
  readonly code: Exclude<RefusalCode, "unearned-path">;

  constructor(code: Exclude<RefusalCode, "unearned-path">, message: string) {
    super(message);
    this.code = code;
  }
}

const generatorRank = new Map<string, number>(GENERATORS.map((value, index) => [value, index]));
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const SAFE_BYTE = /^[A-Za-z0-9._-]$/u;

function canonicalValue(value: unknown, ancestors = new Set<object>()): AddressableTerm {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new AdmissionError("unaddressable-term", "numbers must be finite JSON values");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") throw new AdmissionError("unaddressable-term", "terms must be finite JSON values");
  if (ancestors.has(value)) throw new AdmissionError("unaddressable-term", "cyclic values are not addressable");

  const next = new Set(ancestors);
  next.add(value);
  if (Array.isArray(value)) {
    const out: AddressableTerm[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new AdmissionError("unaddressable-term", "sparse arrays are not JSON values");
      out.push(canonicalValue(value[index], next));
    }
    return out;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new AdmissionError("unaddressable-term", "only plain JSON objects are addressable");
  }
  const out: Record<string, AddressableTerm> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    out[key] = canonicalValue((value as Record<string, unknown>)[key], next);
  }
  return out;
}

/** Collision-free local comparison key. This is not a content identity or external name. */
export function termKey(term: AddressableTerm): string {
  const value = canonicalValue(term);
  if (value === null) return "n:null";
  if (typeof value === "string") return `s:${value}`;
  if (typeof value === "boolean") return `b:${value}`;
  if (typeof value === "number") return `d:${JSON.stringify(value)}`;
  return `${Array.isArray(value) ? "a" : "o"}:${JSON.stringify(value)}`;
}

const escapedByte = (byte: number): string => `~${byte.toString(16).padStart(2, "0")}`;

/** Reversible POSIX segment encoding. Only ASCII [A-Za-z0-9._-] passes raw. */
export function sanitizeSegment(value: string): string {
  if (value === "") return "~e";
  if (value === ".") return "~2e";
  if (value === "..") return "~2e~2e";
  let out = "";
  let first = true;
  for (const character of value) {
    if (character === "~" || (first && character === ".") || !SAFE_BYTE.test(character)) {
      for (const byte of encoder.encode(character)) out += escapedByte(byte);
    } else {
      out += character;
    }
    first = false;
  }
  return out;
}

export function desanitizeSegment(value: string): string {
  if (value === "~e") return "";
  if (value === "" || value === "." || value === ".." || value.startsWith(".")) {
    throw new AdmissionError("invalid-request", "path segment is empty, hidden, or traversal-bearing");
  }
  const bytes: number[] = [];
  for (let index = 0; index < value.length;) {
    const character = value[index]!;
    if (character === "~") {
      const hex = value.slice(index + 1, index + 3);
      if (!/^[0-9a-f]{2}$/u.test(hex)) throw new AdmissionError("invalid-request", "path segment has an invalid escape");
      bytes.push(Number.parseInt(hex, 16));
      index += 3;
      continue;
    }
    if (!SAFE_BYTE.test(character)) throw new AdmissionError("invalid-request", "path segment contains a noncanonical raw byte");
    bytes.push(character.charCodeAt(0));
    index += 1;
  }
  let decoded: string;
  try {
    decoded = decoder.decode(Uint8Array.from(bytes));
  } catch {
    throw new AdmissionError("invalid-request", "path segment is not valid UTF-8");
  }
  if (sanitizeSegment(decoded) !== value) throw new AdmissionError("invalid-request", "path segment is not canonical");
  return decoded;
}

export const termSegment = (term: AddressableTerm): string => sanitizeSegment(termKey(term));

function isGenerator(value: unknown): value is Generator {
  return typeof value === "string" && generatorRank.has(value);
}

function witnessKey(witness: GeneratorWitness): string {
  return `${termKey(witness.domain)}\u0000${String(generatorRank.get(witness.generator)).padStart(2, "0")}\u0000${termKey(witness.codomain)}`;
}

/** Validate, sort, and structurally deduplicate direct generator evidence. */
export function normalizeWitnesses(values: readonly GeneratorWitness[]): readonly GeneratorWitness[] {
  if (!Array.isArray(values)) throw new AdmissionError("invalid-witness", "witnesses must be an array");
  const found = new Map<string, GeneratorWitness>();
  for (const value of values) {
    if (!value || typeof value !== "object" || !isGenerator(value.generator)) {
      throw new AdmissionError("invalid-witness", "every witness must name one canonical generator");
    }
    canonicalValue(value.domain);
    canonicalValue(value.codomain);
    const witness = Object.freeze({ domain: value.domain, generator: value.generator, codomain: value.codomain });
    found.set(witnessKey(witness), witness);
  }
  return Object.freeze([...found.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, witness]) => witness));
}

function resourceTypeOf(value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AdmissionError("invalid-request", "a proof coordinate requires a nonempty resource type");
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value));
}

/**
 * Settle a bounded proof coordinate. Identity is earned only after translating
 * this result into the canonical RMN term domain below.
 */
export function settleProofCoordinate(input: {
  readonly resourceType: string;
  readonly root: AddressableTerm;
  readonly target: AddressableTerm;
  readonly witnesses: readonly GeneratorWitness[];
}): ProofCoordinateResult {
  try {
    if (!input || typeof input !== "object") return Object.freeze({ ok: false, reason: "invalid-coordinate" });
    const resourceType = resourceTypeOf(input.resourceType);
    canonicalValue(input.root);
    canonicalValue(input.target);
    const witnesses = normalizeWitnesses(input.witnesses);
    const route = routeOf(witnesses, input.root, input.target);
    if (!route) return Object.freeze({ ok: false, reason: "unearned-coordinate" });
    const settlement: SettlementTerm = Object.freeze({
      type: "settlement",
      resourceType,
      root: input.root,
      target: input.target,
      witnesses,
    });
    return Object.freeze({
      ok: true,
      coordinate: Object.freeze({ type: "rmn-proof-coordinate", version: 1, settlement }),
      route,
    });
  } catch (error) {
    if (error instanceof AdmissionError && error.code === "invalid-witness") {
      return Object.freeze({ ok: false, reason: "invalid-witness" });
    }
    if (error instanceof AdmissionError && error.message.includes("resource type")) {
      return Object.freeze({ ok: false, reason: "invalid-resource-type" });
    }
    return Object.freeze({ ok: false, reason: "invalid-coordinate" });
  }
}

/** Canonical JSON transport encoding, also suitable as input to a commitment actuator. */
export function encodeProofCoordinate(coordinate: ProofCoordinate): string {
  const checked = settleProofCoordinate(coordinate?.settlement);
  if (!checked.ok || coordinate.type !== "rmn-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("a settled RMN proof coordinate is required");
  }
  return canonicalJson(checked.coordinate);
}

/**
 * Historical compact JSON rendering retained for compatibility. It is neither
 * SRN nor a content identity; identity consumers use the parent section adapter.
 */
export function renderProofCoordinate(coordinate: ProofCoordinate): string {
  return `rmn1:${sanitizeSegment(encodeProofCoordinate(coordinate))}`;
}

export type ParseProofCoordinateResult =
  | Readonly<{ ok: true; coordinate: ProofCoordinate }>
  | Readonly<{ ok: false; reason: "malformed-coordinate" | "noncanonical-coordinate" | "unearned-coordinate" }>;

export function parseProofCoordinate(value: string): ParseProofCoordinateResult {
  if (typeof value !== "string" || !value.startsWith("rmn1:")) {
    return Object.freeze({ ok: false, reason: "malformed-coordinate" });
  }
  try {
    const encoded = desanitizeSegment(value.slice(5));
    const parsed: unknown = JSON.parse(encoded);
    if (canonicalJson(parsed) !== encoded) return Object.freeze({ ok: false, reason: "noncanonical-coordinate" });
    if (!parsed || typeof parsed !== "object" || (parsed as { type?: unknown }).type !== "rmn-proof-coordinate" || (parsed as { version?: unknown }).version !== 1) {
      return Object.freeze({ ok: false, reason: "malformed-coordinate" });
    }
    const settled = settleProofCoordinate((parsed as { settlement?: never }).settlement);
    if (!settled.ok) return Object.freeze({ ok: false, reason: settled.reason === "unearned-coordinate" ? "unearned-coordinate" : "malformed-coordinate" });
    if (encodeProofCoordinate(settled.coordinate) !== encoded) return Object.freeze({ ok: false, reason: "noncanonical-coordinate" });
    return Object.freeze({ ok: true, coordinate: settled.coordinate });
  } catch {
    return Object.freeze({ ok: false, reason: "malformed-coordinate" });
  }
}

/** POSIX remains an optional rendering/projection of the settled coordinate. */
export function proofPathOfCoordinate(coordinate: ProofCoordinate): PosixFilepathAst {
  const settled = settleProofCoordinate(coordinate?.settlement);
  if (!settled.ok || coordinate.type !== "rmn-proof-coordinate" || coordinate.version !== 1) {
    throw new TypeError("an earned RMN proof coordinate is required");
  }
  return astOfRoute(settled.route);
}

/** Attach externally produced crypto evidence without confusing it with identity. */
export function envelopeProofCoordinate(coordinate: ProofCoordinate, witnesses: readonly CryptographicWitness[] = []): ProofEnvelope {
  encodeProofCoordinate(coordinate);
  if (!Array.isArray(witnesses)) throw new TypeError("cryptographic witnesses must be an array");
  const normalized = witnesses.map((witness) => {
    if (!witness || typeof witness !== "object" || !["commitment", "merkle", "signature", "anchor-5615611"].includes(witness.type)
      || typeof witness.algorithm !== "string" || witness.algorithm === "" || typeof witness.value !== "string" || witness.value === "") {
      throw new TypeError("a cryptographic witness requires type, algorithm, and value");
    }
    return Object.freeze({ type: witness.type, algorithm: witness.algorithm, value: witness.value });
  }).sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
  return Object.freeze({ type: "rmn-proof-envelope", coordinate, witnesses: Object.freeze(normalized) });
}

const cell = (subject: AddressableTerm, predicate: AddressableTerm, object: AddressableTerm): RelationalCell =>
  Object.freeze({ subject, predicate, object });

/** Recover the four generator classes from relational cells, preserving the old f* direction. */
export function witnessesOfCells(
  cells: readonly RelationalCell[],
  specializationPredicate: AddressableTerm = "is-a",
): readonly GeneratorWitness[] {
  if (!Array.isArray(cells)) throw new AdmissionError("invalid-witness", "context must be an array of relational cells");
  const specializationKey = termKey(specializationPredicate);
  const witnesses: GeneratorWitness[] = [];
  for (const value of cells) {
    if (!value || typeof value !== "object" || !("subject" in value) || !("predicate" in value) || !("object" in value)) {
      throw new AdmissionError("invalid-witness", "every context entry must be a relational cell");
    }
    canonicalValue(value.subject);
    canonicalValue(value.predicate);
    canonicalValue(value.object);
    if (termKey(value.predicate) === specializationKey) {
      witnesses.push({ domain: value.object, generator: "specialization", codomain: value.subject });
      continue;
    }
    const node = cell(value.subject, value.predicate, value.object);
    witnesses.push(
      { domain: node, generator: "converse", codomain: cell(value.object, value.predicate, value.subject) },
      { domain: node, generator: "subject-projection", codomain: value.subject },
      { domain: node, generator: "object-projection", codomain: value.object },
    );
  }
  return normalizeWitnesses(witnesses);
}

/** Canonical shortest route. Sorted witnesses make equal-length tie-breaking independent of input order. */
export function routeOf(
  witnesses: readonly GeneratorWitness[],
  root: AddressableTerm,
  target: AddressableTerm,
): ProofRoute | null {
  const normalized = normalizeWitnesses(witnesses);
  const rootKey = termKey(root);
  const targetKey = termKey(target);
  if (rootKey === targetKey) return Object.freeze({ root, steps: Object.freeze([]) });

  const adjacency = new Map<string, GeneratorWitness[]>();
  for (const witness of normalized) {
    const key = termKey(witness.domain);
    const outgoing = adjacency.get(key) ?? [];
    outgoing.push(witness);
    adjacency.set(key, outgoing);
  }
  const queue: Array<{ key: string; steps: RouteStep[] }> = [{ key: rootKey, steps: [] }];
  const seen = new Set([rootKey]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const witness of adjacency.get(current.key) ?? []) {
      const key = termKey(witness.codomain);
      if (seen.has(key)) continue;
      const steps = [...current.steps, Object.freeze({ generator: witness.generator, node: witness.codomain })];
      if (key === targetKey) return Object.freeze({ root, steps: Object.freeze(steps) });
      seen.add(key);
      queue.push({ key, steps });
    }
  }
  return null;
}

function nodeOf(term: AddressableTerm, role: "root" | "codomain"): TermSegmentNode {
  const key = termKey(term);
  return Object.freeze({ type: "term-segment", role, key, segment: sanitizeSegment(key) });
}

export function astOfRoute(route: ProofRoute): PosixFilepathAst {
  return Object.freeze({
    type: "posix-filepath",
    absolute: false,
    root: nodeOf(route.root, "root"),
    steps: Object.freeze(route.steps.map((step) => Object.freeze({
      type: "proof-step",
      generator: step.generator,
      namespace: "library",
      node: nodeOf(step.node, "codomain"),
    }))),
  });
}

export function renderProofPathAst(ast: PosixFilepathAst): string {
  let path = ast.root.segment;
  for (const step of ast.steps) path += `/${step.generator}/${step.namespace}/${step.node.segment}`;
  return path;
}

function isCanonicalTermKey(key: string): boolean {
  if (key.startsWith("s:")) return true;
  if (key === "n:null" || key === "b:true" || key === "b:false") return true;
  const separator = key.indexOf(":");
  if (separator !== 1 || !["d", "a", "o"].includes(key[0]!)) return false;
  try {
    const value = JSON.parse(key.slice(2));
    if (key[0] === "d" && typeof value !== "number") return false;
    if (key[0] === "a" && !Array.isArray(value)) return false;
    if (key[0] === "o" && (value === null || Array.isArray(value) || typeof value !== "object")) return false;
    return termKey(value) === key;
  } catch {
    return false;
  }
}

export type ParseProofPathResult =
  | Readonly<{ ok: true; ast: PosixFilepathAst }>
  | Readonly<{ ok: false; reason: "malformed-path" | "noncanonical-path" }>;

function parsedNode(segment: string, role: "root" | "codomain"): TermSegmentNode {
  const key = desanitizeSegment(segment);
  if (!isCanonicalTermKey(key)) throw new AdmissionError("invalid-request", "path segment is not a canonical term key");
  return Object.freeze({ type: "term-segment", role, key, segment });
}

export function parseProofPath(path: string): ParseProofPathResult {
  if (typeof path !== "string" || path === "" || path.startsWith("/") || path.endsWith("/")) {
    return Object.freeze({ ok: false, reason: "malformed-path" });
  }
  const parts = path.split("/");
  if ((parts.length - 1) % 3 !== 0) return Object.freeze({ ok: false, reason: "malformed-path" });
  try {
    const root = parsedNode(parts[0]!, "root");
    const steps: ProofStepNode[] = [];
    for (let index = 1; index < parts.length; index += 3) {
      const generator = parts[index];
      if (!isGenerator(generator) || parts[index + 1] !== "library") {
        return Object.freeze({ ok: false, reason: "malformed-path" });
      }
      steps.push(Object.freeze({
        type: "proof-step",
        generator,
        namespace: "library",
        node: parsedNode(parts[index + 2]!, "codomain"),
      }));
    }
    const ast = Object.freeze({ type: "posix-filepath" as const, absolute: false as const, root, steps: Object.freeze(steps) });
    if (renderProofPathAst(ast) !== path) return Object.freeze({ ok: false, reason: "noncanonical-path" });
    return Object.freeze({ ok: true, ast });
  } catch {
    return Object.freeze({ ok: false, reason: "noncanonical-path" });
  }
}

export function checkProofPathAst(ast: PosixFilepathAst, witnesses: readonly GeneratorWitness[]): boolean {
  try {
    if (!ast || ast.type !== "posix-filepath" || ast.absolute !== false || !ast.root || !Array.isArray(ast.steps)) return false;
    if (ast.root.type !== "term-segment" || ast.root.role !== "root" || !isCanonicalTermKey(ast.root.key) || sanitizeSegment(ast.root.key) !== ast.root.segment) return false;
    const edges = new Set(normalizeWitnesses(witnesses).map(witnessKey));
    let domainKey = ast.root.key;
    for (const step of ast.steps) {
      if (!step || step.type !== "proof-step" || !isGenerator(step.generator) || step.namespace !== "library" || !step.node) return false;
      if (step.node.type !== "term-segment" || step.node.role !== "codomain" || !isCanonicalTermKey(step.node.key) || sanitizeSegment(step.node.key) !== step.node.segment) return false;
      const edge = `${domainKey}\u0000${String(generatorRank.get(step.generator)).padStart(2, "0")}\u0000${step.node.key}`;
      if (!edges.has(edge)) return false;
      domainKey = step.node.key;
    }
    return true;
  } catch {
    return false;
  }
}

/** The one public fold requested by the section. It never throws for admitted call shapes. */
export function structureSemioticAtom<A extends AddressableTerm>(request: StructurationRequest<A>): StructurationResult<A> {
  const atom = request?.atom;
  const refusal = (reason: RefusalCode, witnessCount = 0): StructurationResult<A> => Object.freeze({
    ok: false,
    atom,
    reason,
    diagnostics: Object.freeze({ witnessCount, stepCount: 0 }),
  });
  try {
    if (!request || typeof request !== "object" || !("atom" in request) || !("root" in request)) return refusal("invalid-request");
    canonicalValue(atom);
    canonicalValue(request.root);
    const carriesContext = Object.hasOwn(request, "context");
    const carriesWitnesses = Object.hasOwn(request, "witnesses");
    if (carriesContext === carriesWitnesses) return refusal("ambiguous-evidence");

    const witnesses = carriesContext
      ? witnessesOfCells(request.context!, request.specializationPredicate ?? "is-a")
      : normalizeWitnesses(request.witnesses!);
    const route = routeOf(witnesses, request.root, atom);
    if (!route) return refusal("unearned-path", witnesses.length);
    const ast = astOfRoute(route);
    if (!checkProofPathAst(ast, witnesses)) return refusal("invalid-witness", witnesses.length);
    return Object.freeze({
      ok: true,
      atom,
      ast,
      diagnostics: Object.freeze({ witnessCount: witnesses.length, stepCount: ast.steps.length }),
    });
  } catch (error) {
    return refusal(error instanceof AdmissionError ? error.code : "invalid-request");
  }
}

/**
 * Derive a stable catalog from independently supplied proof requests.  Failed
 * derivations remain typed refusals and never become catalog entries.
 */
export function catalogProofPaths<A extends AddressableTerm>(
  requests: readonly StructurationRequest<A>[],
): ProofPathCatalog<A> {
  if (!Array.isArray(requests)) throw new TypeError("proof-path catalog requests must be an array");
  const entries = new Map<string, ProofPathCatalogEntry<A>>();
  const refusals: StructurationResult<A>[] = [];
  for (const request of requests) {
    const result = structureSemioticAtom(request);
    if (!result.ok) {
      refusals.push(result);
      continue;
    }
    const address = renderProofPathAst(result.ast);
    entries.set(address, Object.freeze({ atom: result.atom, address, ast: result.ast }));
  }
  return Object.freeze({
    type: "proof-path-catalog",
    entries: Object.freeze([...entries.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, entry]) => entry)),
    refusals: Object.freeze(refusals),
  });
}

const chartNodeOf = (node: TermSegmentNode): ProofPathChartNode => Object.freeze({
  type: "proof-path-chart-node",
  role: node.role,
  key: node.key,
  segment: node.segment,
});

const chartNodeKey = (node: ProofPathChartNode): string => `${node.role}\u0000${node.key}`;

/**
 * Project an evictable graph from the catalog's earned edges.  The projection
 * is intentionally unable to add edges that were not present in a proof.
 */
export function chartProofPathCatalog(catalog: ProofPathCatalog): ProofPathChart {
  if (!catalog || catalog.type !== "proof-path-catalog" || !Array.isArray(catalog.entries)) {
    throw new TypeError("proof-path chart requires a proof-path catalog");
  }
  const nodes = new Map<string, ProofPathChartNode>();
  const edges = new Map<string, ProofPathChartEdge>();
  const nodeOf = (node: TermSegmentNode): ProofPathChartNode => {
    const candidate = chartNodeOf(node);
    const key = chartNodeKey(candidate);
    const known = nodes.get(key);
    if (known) return known;
    nodes.set(key, candidate);
    return candidate;
  };
  for (const entry of catalog.entries) {
    let from = nodeOf(entry.ast.root);
    for (const step of entry.ast.steps) {
      const to = nodeOf(step.node);
      const key = `${chartNodeKey(from)}\u0000${step.generator}\u0000${chartNodeKey(to)}`;
      edges.set(key, Object.freeze({ type: "proof-path-chart-edge", from, generator: step.generator, to }));
      from = to;
    }
  }
  return Object.freeze({
    type: "proof-path-chart",
    nodes: Object.freeze([...nodes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, node]) => node)),
    edges: Object.freeze([...edges.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, edge]) => edge)),
  });
}
