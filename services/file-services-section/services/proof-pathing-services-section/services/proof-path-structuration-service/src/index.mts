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

/** Collision-free structural identity. Prefixes keep strings distinct from serialized compound terms. */
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
