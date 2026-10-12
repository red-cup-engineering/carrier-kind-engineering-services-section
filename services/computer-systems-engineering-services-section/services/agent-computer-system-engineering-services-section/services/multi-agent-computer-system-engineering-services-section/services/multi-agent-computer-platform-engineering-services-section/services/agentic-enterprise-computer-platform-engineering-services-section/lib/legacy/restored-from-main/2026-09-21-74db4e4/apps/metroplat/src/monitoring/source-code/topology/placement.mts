/**
 * @packageDocumentation
 *
 * Categorical context/layer placement measurement for TypeScript declarations.
 *
 * @metroplatSubject source-code
 */
import path from "node:path";
import ts from "typescript";

import {
  nodeDeclarationReference,
  nodeBeingLayerOfFilenameSuffix,
  nodeBeingSpeciesFormula,
  nodeBeingTaxonConfidence,
  readNodeBeingTaxonomy,
  readNodeSubjectAnchor,
  type NodeBeingEffectClosure,
  type NodeBeingLayer,
  type NodeBeingObservation,
  type NodeBeingPredicateEvidence,
  type NodeBeingPredicateEvidenceBasis,
  type NodeBeingTaxonReading,
  type NodeSubjectAnchor,
} from "../../../lib/language/jsnode/index.mts";
import { contentAddress } from "../../../lib/identity/index.mts";
import {
  nodePackageLayerNames,
  type ModuleTopologyNodeBeing,
  type ModuleTopologyPlacement,
  type ModuleTopologySymbol,
  type NodePackageLayoutConvention,
  type NodeSubjectAnchorCoverage,
} from "./schema.mts";

type Layer = NodeBeingLayer;
type PackageRegion = "source" | "integration" | "library" | "application";
type ContextStatus = ModuleTopologyPlacement["contextStatus"];

const LAYERS = new Set<string>(nodePackageLayerNames);
const CONTAINER_SEGMENTS = new Set(["src", "modules"]);

export interface PlacementInput {
  readonly checker: ts.TypeChecker;
  readonly root: string;
  readonly source: ts.SourceFile;
  readonly node: ts.Node;
  readonly name: string;
  readonly kind: ModuleTopologySymbol["kind"];
  readonly dependsOnModules: readonly string[];
  readonly subjectAnchors: readonly NodeSubjectAnchor[];
  readonly subjectAnchorCoverage: NodeSubjectAnchorCoverage;
}

type SymbolPlacementInput = Omit<PlacementInput, "subjectAnchors">;

function slash(value: string): string {
  return value.split(path.sep).join("/");
}

function layerName(segment: string): Layer | undefined {
  if (LAYERS.has(segment)) return segment as Layer;
  return nodeBeingLayerOfFilenameSuffix(segment);
}

function pathForm(root: string, fileName: string): Readonly<{
  region: PackageRegion;
  layer?: Layer;
  context?: string;
  subjects: readonly string[];
  convention?: NodePackageLayoutConvention;
}> {
  const relative = slash(path.relative(root, fileName));
  const allSegments = relative.split("/").filter(Boolean);
  const sourceIndex = allSegments.indexOf("src");
  const segments = sourceIndex < 0 ? allSegments : allSegments.slice(sourceIndex + 1);
  const fileStem = (segments.at(-1) ?? "").replace(/\.(?:[cm]?[jt]sx?)$/u, "");
  const directories = segments.slice(0, -1);
  const head = directories[0];
  const region: PackageRegion = head === "integrations" ? "integration"
    : head === "lib" ? "library"
      : head === "apps" ? "application"
        : "source";
  const regionPrefix = region === "source" ? 0 : 1;
  let layer: Layer | undefined;
  let layerIndex = -1;
  for (let index = regionPrefix; index < directories.length; index += 1) {
    const candidate = layerName(directories[index]!);
    if (candidate !== undefined) {
      layer = candidate;
      layerIndex = index;
      break;
    }
  }
  const fileLayer = nodeBeingLayerOfFilenameSuffix(fileStem.split(".").at(-1) ?? "");
  if (layer === undefined) layer = fileLayer;

  const contextCandidates = directories.filter((segment, index) =>
    index >= regionPrefix
    && !CONTAINER_SEGMENTS.has(segment)
    && layerName(segment) === undefined
    && !(layerIndex >= 0 && index === layerIndex));
  const context = contextCandidates[0];
  const contextIndex = context === undefined ? -1 : directories.indexOf(context, regionPrefix);
  const convention: NodePackageLayoutConvention | undefined = contextCandidates.length !== 1 || layer === undefined
    ? undefined
    : layerIndex < 0 && fileLayer !== undefined
      ? "context-directory-layer-filename"
      : contextIndex < layerIndex
        ? "context-layer-directories"
        : "layer-context-directories";
  return Object.freeze({
    region,
    ...(layer === undefined ? {} : { layer }),
    ...(context === undefined ? {} : { context }),
    subjects: Object.freeze(contextCandidates),
    ...(convention === undefined ? {} : { convention }),
  });
}

/** Observe only the carrier's project-level nesting color. Semantic placement
 * remains a separate declaration judgment below. */
export function nodePackageLayoutConventionOfPath(root: string, fileName: string): NodePackageLayoutConvention | undefined {
  return pathForm(root, fileName).convention;
}

function subjectsByDeclaration(anchors: readonly NodeSubjectAnchor[]): ReadonlyMap<string, ReadonlySet<string>> {
  const subjects = new Map<string, Set<string>>();
  for (const candidate of anchors) {
    const anchor = readNodeSubjectAnchor(candidate);
    for (const declaration of anchor.declarations) {
      const values = subjects.get(declaration) ?? new Set<string>();
      values.add(anchor.subject);
      subjects.set(declaration, values);
    }
  }
  return new Map([...subjects].map(([declaration, values]) => [declaration, new Set(values)]));
}

function declarationReference(root: string, source: ts.SourceFile, symbol: string): string | undefined {
  const relative = slash(path.relative(root, source.fileName));
  if (relative.startsWith("../") || path.isAbsolute(relative)) return undefined;
  return nodeDeclarationReference(relative, symbol);
}

function typeSubjects(
  root: string,
  type: ts.Type,
  anchors: ReadonlyMap<string, ReadonlySet<string>>,
  seen: ReadonlySet<ts.Type> = new Set(),
): ReadonlySet<string> {
  if (seen.has(type)) return new Set();
  const nextSeen = new Set(seen);
  nextSeen.add(type);
  const subjects = new Set<string>();
  const symbols = [type.aliasSymbol, type.getSymbol()].filter((symbol): symbol is ts.Symbol => symbol !== undefined);
  for (const symbol of symbols) {
    for (const declaration of symbol.declarations ?? []) {
      const reference = declarationReference(root, declaration.getSourceFile(), symbol.getName());
      if (reference !== undefined) for (const subject of anchors.get(reference) ?? []) subjects.add(subject);
    }
  }
  if (type.isUnionOrIntersection()) {
    for (const member of type.types) for (const subject of typeSubjects(root, member, anchors, nextSeen)) subjects.add(subject);
  }
  for (const argument of (type as ts.TypeReference).typeArguments ?? []) {
    for (const subject of typeSubjects(root, argument, anchors, nextSeen)) subjects.add(subject);
  }
  return subjects;
}

function signatureOf(checker: ts.TypeChecker, node: ts.Node): ts.Signature | undefined {
  if (ts.isFunctionLike(node)) return checker.getSignatureFromDeclaration(node);
  if (ts.isVariableDeclaration(node) && node.initializer !== undefined && ts.isFunctionLike(node.initializer)) {
    return checker.getSignatureFromDeclaration(node.initializer);
  }
  return undefined;
}

function parameterNodes(node: ts.Node): readonly ts.ParameterDeclaration[] {
  if (ts.isFunctionLike(node)) return node.parameters;
  if (ts.isVariableDeclaration(node) && node.initializer !== undefined && ts.isFunctionLike(node.initializer)) return node.initializer.parameters;
  return Object.freeze([]);
}

function importedModuleOf(symbol: ts.Symbol | undefined): string | undefined {
  if (symbol === undefined) return undefined;
  for (const declaration of symbol.declarations ?? []) {
    let cursor: ts.Node | undefined = declaration;
    while (cursor !== undefined && !ts.isImportDeclaration(cursor)) cursor = cursor.parent;
    if (cursor !== undefined && ts.isStringLiteral(cursor.moduleSpecifier)) return cursor.moduleSpecifier.text;
  }
  return undefined;
}

function rootIdentifier(expression: ts.Expression): ts.Identifier | undefined {
  let current: ts.Expression = expression;
  while (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) current = current.expression;
  return ts.isIdentifier(current) ? current : undefined;
}

interface EffectRead {
  readonly concrete: readonly string[];
  readonly abstract: readonly string[];
  readonly unknown: readonly string[];
  readonly requestResponse: boolean;
  readonly continuation: boolean;
  readonly closure: NodeBeingEffectClosure;
}

interface InternalCall {
  readonly node: ts.Node;
  readonly label: string;
}

interface DirectEffectRead {
  readonly concrete: readonly string[];
  readonly abstract: readonly string[];
  readonly unknown: readonly string[];
  readonly requestResponse: boolean;
  readonly continuation: boolean;
  readonly internal: readonly InternalCall[];
}

/** A TypeScript node belongs to one Program/TypeChecker instance, so its
 * direct observation is stable for that node's lifetime and reusable by every
 * caller whose closure crosses it. */
const directEffectCache = new WeakMap<ts.Node, DirectEffectRead>();
const transitiveEffectCache = new WeakMap<ts.Node, EffectRead>();

const EFFECTFUL_NODE_MODULES = new Set([
  "async_hooks", "child_process", "cluster", "dgram", "diagnostics_channel",
  "dns", "fs", "http", "http2", "https", "net", "perf_hooks", "readline", "repl",
  "stream", "tls", "tty", "v8", "vm", "worker_threads", "zlib",
]);

/** `node:crypto` is not one effect. Hashing is deterministic computation over
 * its arguments, while random generation and process-wide engine/FIPS state
 * are genuine host observations or mutations. Treating the whole module as
 * one concrete port makes content addressing look like I/O and consequently
 * misplaces any caller whose transitive closure computes an artifact address. */
const CRYPTO_RANDOMNESS_CALLS = new Set([
  "generateKey", "generateKeyPair", "generateKeyPairSync", "generateKeySync",
  "generatePrime", "generatePrimeSync", "getRandomValues", "pseudoRandomBytes",
  "randomBytes", "randomFill", "randomFillSync", "randomInt", "randomUUID",
]);
const CRYPTO_PROCESS_STATE_CALLS = new Set([
  "getFips", "secureHeapUsed", "setEngine", "setFips",
]);
const DETERMINISTIC_CRYPTO_CALLS = new Set([
  "createHash", "createHmac", "timingSafeEqual",
]);

function resolvedSymbolName(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): string | undefined {
  if (symbol === undefined) return undefined;
  return ((symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol)).getName();
}

function cryptoEffectOfCall(name: string | undefined): string | undefined {
  if (name !== undefined && CRYPTO_RANDOMNESS_CALLS.has(name)) return "node:crypto:randomness";
  if (name !== undefined && CRYPTO_PROCESS_STATE_CALLS.has(name)) return "node:crypto:process-state";
  return undefined;
}

function aliasedDeclarations(checker: ts.TypeChecker, symbol: ts.Symbol | undefined): readonly ts.Declaration[] {
  if (symbol === undefined) return Object.freeze([]);
  const resolved = (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol);
  return Object.freeze([...(resolved.declarations ?? [])]);
}

function integrationPortOf(checker: ts.TypeChecker, symbol: ts.Symbol | undefined, root: string, source: ts.SourceFile): string | undefined {
  const sourceRelative = slash(path.relative(root, source.fileName));
  const sourceIntegration = /(?:^|\/)src\/integrations\/([^/]+)/u.exec(sourceRelative)?.[1];
  for (const declaration of aliasedDeclarations(checker, symbol)) {
    const relative = slash(path.relative(root, declaration.getSourceFile().fileName));
    const match = /(?:^|\/)src\/integrations\/([^/]+)/u.exec(relative);
    if (match?.[1] !== undefined && match[1] !== sourceIntegration) return `integration:${match[1]}`;
  }
  return undefined;
}

function abstractPortName(checker: ts.TypeChecker, parameter: ts.ParameterDeclaration): string | undefined {
  const type = checker.getTypeAtLocation(parameter);
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol === undefined || symbol.name === "__type" || ["Array", "ReadonlyArray", "Map", "ReadonlyMap", "Set", "ReadonlySet", "Promise", "String", "Number", "Boolean"].includes(symbol.name)) return undefined;
  const declarations = symbol.declarations ?? [];
  // Plain TS does not reify its effect row. An arbitrary interface parameter
  // may be a pure algebra/data view (`Walk`, `JsonValue`, a formatter), so its
  // method calls do not by themselves witness a Kleisli port. In the heuristic
  // regime, require the declaration to state a conventional port role in its
  // type name; Effect-style signatures can later supply reified evidence.
  return /(?:Repository|Port|Gateway|Client|Transport|Store|Clock|Logger)$/u.test(symbol.name)
    && declarations.some((declaration) => ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration))
    ? symbol.name
    : undefined;
}

function callableBody(node: ts.Node): ts.Node | undefined {
  if (ts.isVariableDeclaration(node) && node.initializer !== undefined && ts.isFunctionLike(node.initializer)) return node.initializer;
  if (!ts.isFunctionLike(node)) return undefined;
  return (node as ts.FunctionLikeDeclaration).body;
}

function callableName(node: ts.Node): string {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node)) {
    if (node.name !== undefined) return node.name.getText(node.getSourceFile());
  }
  return "<anonymous>";
}

function callableLabel(root: string, node: ts.Node): string {
  const source = node.getSourceFile();
  const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  return `${slash(path.relative(root, source.fileName))}#${callableName(node)}:${line}`;
}

function packageCallable(root: string, declaration: ts.Declaration): ts.Node | undefined {
  const source = declaration.getSourceFile();
  const relative = path.relative(root, source.fileName);
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative.includes(`${path.sep}node_modules${path.sep}`)) return undefined;
  return callableBody(declaration) === undefined ? undefined : declaration;
}

/** Read only the effects and internal call arrows stated directly by one
 * callable. The finite least closure over those arrows is computed below. */
function directEffectsOf(input: SymbolPlacementInput, declaration: ts.Node): DirectEffectRead {
  const parameters = parameterNodes(declaration);
  const parameterNames = new Set(parameters
    .map((parameter) => ts.isIdentifier(parameter.name) ? parameter.name.text : undefined)
    .filter((name): name is string => name !== undefined));
  const abstract = new Set<string>();
  const concrete = new Set<string>();
  const unknown = new Set<string>();
  const internal = new Map<ts.Node, InternalCall>();
  let requestResponse = false;
  let continuation = false;

  for (const parameter of parameters) {
    const name = ts.isIdentifier(parameter.name) ? parameter.name.text : "";
    const rendered = input.checker.typeToString(input.checker.getTypeAtLocation(parameter));
    if (/^(?:req|request|res|response)$/iu.test(name) || /(?:Request|Response)/u.test(rendered)) requestResponse = true;
    if (/^(?:next|continuation|proceed)$/iu.test(name)) continuation = true;
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAccessExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "globalThis"
      && ["fetch", "setTimeout", "setInterval", "queueMicrotask"].includes(node.name.text)
    ) {
      concrete.add(`host:${node.name.text}`);
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const expression = node.expression;
      const root = rootIdentifier(expression);
      if (root !== undefined) {
        const directPortCall = ts.isPropertyAccessExpression(expression)
          && ts.isIdentifier(expression.expression)
          && expression.expression.text === root.text;
        if (directPortCall && parameterNames.has(root.text)) {
          const parameter = parameters.find((candidate) => ts.isIdentifier(candidate.name) && candidate.name.text === root.text);
          const port = /^(?:req|request|res|response)$/iu.test(root.text)
            ? "request-response"
            : parameter === undefined ? undefined : abstractPortName(input.checker, parameter);
          if (port !== undefined) abstract.add(port);
        }
        const rootSymbol = input.checker.getSymbolAtLocation(root);
        const calledSymbol = ts.isPropertyAccessExpression(expression)
          ? input.checker.getSymbolAtLocation(expression.name) ?? rootSymbol
          : rootSymbol;
        const resolvedCalledName = resolvedSymbolName(input.checker, calledSymbol);
        // This program is deliberately built with noResolve/noLib (see
        // sourceModuleProgram's own comment): the checker can never bind an
        // import from an unresolvable specifier (every Node builtin) to a
        // real declaration, so it names every such symbol with its internal
        // "unknown" placeholder instead of the source text. The identifier
        // actually called is always available straight from the syntax tree
        // regardless, so that is the fallback whenever the checker couldn't
        // resolve one — this is what makes createHash(...).update(...)
        // .digest(...) resolvable as the deterministic crypto call it is,
        // instead of every crypto member call collapsing onto one placeholder.
        const calledName = resolvedCalledName === undefined || resolvedCalledName === "unknown"
          ? (ts.isPropertyAccessExpression(expression) ? expression.name.text : root.text)
          : resolvedCalledName;
        const module = importedModuleOf(rootSymbol);
        const integration = integrationPortOf(input.checker, calledSymbol, input.root, declaration.getSourceFile());
        if (integration !== undefined) concrete.add(integration);
        else if (module !== undefined) {
          const nodeModule = module.replace(/^node:/u, "").split("/")[0]!;
          const cryptoEffect = nodeModule === "crypto" ? cryptoEffectOfCall(calledName) : undefined;
          if (cryptoEffect !== undefined) concrete.add(cryptoEffect);
          else if (EFFECTFUL_NODE_MODULES.has(nodeModule)) concrete.add(`node:${nodeModule}`);
          else if (nodeModule === "crypto" && calledName !== undefined && DETERMINISTIC_CRYPTO_CALLS.has(calledName)) {
            // Known deterministic cryptographic computation is part of the
            // pure carrier, not a host port. Its returned object's methods are
            // followed below as ordinary local calls.
          }
          else {
            const targets = aliasedDeclarations(input.checker, calledSymbol)
              .map((candidate) => packageCallable(input.root, candidate))
              .filter((candidate): candidate is ts.Node => candidate !== undefined);
            if (targets.length === 0) unknown.add(`call:${module}`);
            for (const target of targets) internal.set(target, Object.freeze({ node: target, label: callableLabel(input.root, target) }));
          }
        } else {
          for (const candidate of aliasedDeclarations(input.checker, calledSymbol)) {
            const target = packageCallable(input.root, candidate);
            if (target !== undefined) internal.set(target, Object.freeze({ node: target, label: callableLabel(input.root, target) }));
          }
        }
        if (["fetch", "setTimeout", "setInterval", "queueMicrotask"].includes(root.text)) concrete.add(`host:${root.text}`);
        if (["Date", "process", "console"].includes(root.text)) concrete.add(`host:${root.text}`);
        if (root.text === "crypto") {
          const cryptoEffect = cryptoEffectOfCall(calledName);
          if (cryptoEffect !== undefined) concrete.add(`host:${cryptoEffect.slice("node:".length)}`);
        }
        if (root.text === "globalThis" && node.getText().startsWith("globalThis.crypto.")) {
          const cryptoEffect = cryptoEffectOfCall(calledName);
          if (cryptoEffect !== undefined) concrete.add(`host:${cryptoEffect.slice("node:".length)}`);
        }
      }
    }
    if (ts.isFunctionLike(node) && node !== callableBody(declaration)) return;
    ts.forEachChild(node, visit);
  };
  const body = callableBody(declaration);
  if (body !== undefined) ts.forEachChild(body, visit);
  return Object.freeze({
    concrete: Object.freeze([...concrete].sort()),
    abstract: Object.freeze([...abstract].sort()),
    unknown: Object.freeze([...unknown].sort()),
    requestResponse,
    continuation,
    internal: Object.freeze([...internal.values()].sort((left, right) => left.label.localeCompare(right.label))),
  });
}

function reachesCycle(start: ts.Node, graph: ReadonlyMap<ts.Node, DirectEffectRead>): boolean {
  const visited = new Set<ts.Node>();
  const active = new Set<ts.Node>();
  const visit = (node: ts.Node): boolean => {
    if (active.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    active.add(node);
    for (const target of graph.get(node)?.internal ?? []) if (visit(target.node)) return true;
    active.delete(node);
    return false;
  };
  return visit(start);
}

function reachableCallablesOf(start: ts.Node, graph: ReadonlyMap<ts.Node, DirectEffectRead>): number {
  const reached = new Set<ts.Node>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const target of graph.get(node)?.internal ?? []) {
      if (!reached.has(target.node)) {
        reached.add(target.node);
        queue.push(target.node);
      }
    }
  }
  return reached.size - 1;
}

function closureRoundsOf(start: ts.Node, graph: ReadonlyMap<ts.Node, DirectEffectRead>): number {
  const visiting = new Set<ts.Node>();
  const settled = new Map<ts.Node, number>();
  const visit = (node: ts.Node): number => {
    const known = settled.get(node);
    if (known !== undefined) return known;
    if (visiting.has(node)) return 1;
    visiting.add(node);
    let rounds = 0;
    for (const target of graph.get(node)?.internal ?? []) rounds = Math.max(rounds, 1 + visit(target.node));
    visiting.delete(node);
    settled.set(node, rounds);
    return rounds;
  };
  return visit(start);
}

/** Compute the least fixed point of named effects over the package-internal
 * call graph. Monotone set union settles recursive SCCs without erasure or an
 * order-dependent recursion cutoff. */
function effectsOf(input: SymbolPlacementInput): EffectRead {
  const cached = transitiveEffectCache.get(input.node);
  if (cached !== undefined) return cached;
  const graph = new Map<ts.Node, DirectEffectRead>();
  const queue: ts.Node[] = [input.node];
  while (queue.length > 0) {
    const declaration = queue.shift()!;
    if (graph.has(declaration)) continue;
    const direct = directEffectCache.get(declaration) ?? directEffectsOf(input, declaration);
    directEffectCache.set(declaration, direct);
    graph.set(declaration, direct);
    for (const target of direct.internal) if (!graph.has(target.node)) queue.push(target.node);
  }

  const values = new Map([...graph].map(([node, direct]) => [node, {
    concrete: new Set(direct.concrete),
    abstract: new Set(direct.abstract),
    unknown: new Set(direct.unknown),
  }] as const));
  let rounds = 0;
  while (true) {
    let changed = false;
    for (const [node, direct] of graph) {
      const value = values.get(node)!;
      for (const target of direct.internal) {
        const inherited = values.get(target.node)!;
        for (const entry of inherited.concrete) if (!value.concrete.has(entry)) { value.concrete.add(entry); changed = true; }
        for (const entry of inherited.abstract) if (!value.abstract.has(entry)) { value.abstract.add(entry); changed = true; }
        for (const entry of inherited.unknown) if (!value.unknown.has(entry)) { value.unknown.add(entry); changed = true; }
      }
    }
    if (!changed) break;
    rounds += 1;
  }

  for (const [node, direct] of graph) {
    const settled = values.get(node)!;
    const material = Object.freeze({
      kind: "metroplat.language.jsnode.effect-closure" as const,
      directPorts: Object.freeze([...direct.abstract.map((port) => `abstract:${port}`), ...direct.concrete.map((port) => `concrete:${port}`)].sort()),
      ports: Object.freeze([...settled.abstract].map((port) => `abstract:${port}`).concat([...settled.concrete].map((port) => `concrete:${port}`)).sort()),
      callables: Object.freeze(direct.internal.map((call) => call.label)),
      reachableCallables: reachableCallablesOf(node, graph),
      unresolved: Object.freeze([...settled.unknown].sort()),
      rounds: closureRoundsOf(node, graph),
      recursive: reachesCycle(node, graph),
    });
    const closure: NodeBeingEffectClosure = Object.freeze({ ...material, identity: contentAddress(material) });
    transitiveEffectCache.set(node, Object.freeze({
      concrete: Object.freeze([...settled.concrete].sort()),
      abstract: Object.freeze([...settled.abstract].sort()),
      unknown: material.unresolved,
      requestResponse: direct.requestResponse,
      continuation: direct.continuation,
      closure,
    }));
  }
  return transitiveEffectCache.get(input.node)!;
}

function isCallable(node: ts.Node): boolean {
  return ts.isFunctionLike(node)
    || (ts.isVariableDeclaration(node) && node.initializer !== undefined && ts.isFunctionLike(node.initializer));
}

/** Translate host syntax into the atomic predicates consumed by the RMN
 * formal context. These are observations, not placement verdicts: all layer
 * names and species formulae remain owned by `lib/language/jsnode`.
 */
function predicateEvidence(
  predicate: string,
  basis: NodeBeingPredicateEvidenceBasis,
  confidence: "reified" | "heuristic",
): NodeBeingPredicateEvidence {
  return Object.freeze({ predicate, basis, confidence });
}

function structuralPredicateEvidence(input: SymbolPlacementInput): readonly NodeBeingPredicateEvidence[] {
  const evidence: NodeBeingPredicateEvidence[] = [];
  if (isCallable(input.node)) {
    if (/^use[A-Z]/u.test(input.name)) evidence.push(predicateEvidence("hook:reified", "identifier-convention", "heuristic"));
    if (/^(?:validate|assert|is[A-Z])/u.test(input.name)) evidence.push(predicateEvidence("admission:checking", "identifier-convention", "heuristic"));
    if (/(?:Command)$/u.test(input.name)) evidence.push(predicateEvidence("port:command", "identifier-convention", "heuristic"));
    if (/^(?:to|from|map)[A-Z]/u.test(input.name) || /Mapper$/u.test(input.name)) evidence.push(predicateEvidence("mapping:reified", "identifier-convention", "heuristic"));
    return Object.freeze(evidence);
  }
  if (input.kind === "interface" || input.kind === "type") {
    evidence.push(predicateEvidence("being:type-object", "syntax", "reified"));
    if (/(?:Request|Response|Input|Output|Dto)$/u.test(input.name)) evidence.push(predicateEvidence("boundary:transfer", "identifier-convention", "heuristic"));
    return Object.freeze(evidence);
  }
  if (input.kind === "class") {
    evidence.push(
      predicateEvidence("being:class", "syntax", "reified"),
      predicateEvidence("coalgebra:reified", "syntax", "reified"),
    );
    const heritage = ts.isClassDeclaration(input.node)
      ? input.node.heritageClauses?.map((clause) => clause.getText()).join(" ") ?? ""
      : "";
    if (/\bError\b/u.test(heritage)) evidence.push(predicateEvidence("error:reified", "type-system", "reified"));
    else if (/Error$/u.test(input.name)) evidence.push(predicateEvidence("error:reified", "identifier-convention", "heuristic"));
    return Object.freeze(evidence);
  }
  evidence.push(predicateEvidence("being:binding", "syntax", "reified"));
  if (/(?:Schema|Contract)$/u.test(input.name)) evidence.push(predicateEvidence("admission:reified", "identifier-convention", "heuristic"));
  if (/(?:Routes?|Router)$/u.test(input.name)) evidence.push(predicateEvidence("automaton:route-table", "identifier-convention", "heuristic"));
  if (/(?:Plugin)$/u.test(input.name)) evidence.push(predicateEvidence("signature:extension", "identifier-convention", "heuristic"));
  if (/(?:State|Store|Registry|Cache)$/u.test(input.name)) evidence.push(predicateEvidence("reference-cell:reified", "identifier-convention", "heuristic"));
  return Object.freeze(evidence);
}

function beingOf(
  input: SymbolPlacementInput,
  contextStatus: ContextStatus,
  effects: EffectRead | undefined,
): NodeBeingObservation {
  const ports = effects === undefined
    ? []
    : [...effects.abstract.map((port) => `abstract:${port}`), ...effects.concrete.map((port) => `concrete:${port}`)];
  const effectCount = effects === undefined ? undefined : new Set(ports).size;
  const effectConfidence = effects?.unknown.length === 0 ? "reified" as const : "heuristic" as const;
  const predicates = [
    predicateEvidence(`form:${input.kind}`, "syntax", "reified"),
    ...(isCallable(input.node) ? [predicateEvidence("being:callable", "syntax", "reified")] : []),
    ...structuralPredicateEvidence(input),
    contextStatus === "anchored" ? predicateEvidence("context:anchored", "subject-anchor", "reified")
      : contextStatus === "cross-cutting" ? predicateEvidence("context:none", "subject-anchor", "reified")
        : predicateEvidence("context:unresolved", "subject-anchor", "heuristic"),
    ...(effects === undefined ? []
      : effects.unknown.length > 0 && effectCount! < 2
        ? [predicateEvidence("effects:unknown", "type-system", "heuristic")]
        : effectCount === 0 ? [
          predicateEvidence("effects:none", "type-system", effectConfidence),
          predicateEvidence("model:none", "type-system", effectConfidence),
        ]
          : effectCount === 1 ? [predicateEvidence("effects:one", "type-system", effectConfidence)]
            : [predicateEvidence("effects:multiple", "type-system", effectConfidence)]),
    ...(effects === undefined || effectCount === 0 ? []
      : effects.abstract.length > 0 && effects.concrete.length > 0 ? [predicateEvidence("model:mixed", "type-system", effectConfidence)]
        : effects.abstract.length > 0 ? [predicateEvidence("model:abstract", "type-system", effectConfidence)]
          : [predicateEvidence("model:concrete", "type-system", effectConfidence)]),
    ...(effects?.requestResponse === true ? [predicateEvidence("port:request-response", "identifier-convention", "heuristic")] : []),
    ...(effects?.continuation === true ? [predicateEvidence("continuation:reified", "identifier-convention", "heuristic")] : []),
    ...(effects === undefined ? [] : [predicateEvidence("effects:closed", "type-system", "reified")]),
    ...(effects === undefined ? [] : effects.closure.callables.length === 0
      ? [predicateEvidence("composition:direct", "type-system", "reified")]
      : [predicateEvidence("composition:composed", "type-system", "reified")]),
    ...(effects?.closure.recursive === true ? [predicateEvidence("composition:recursive", "type-system", "reified")] : []),
    ...ports.map((port) => predicateEvidence(`port:${port}`, "type-system", effectConfidence)),
    ...(effects?.unknown.map((port) => predicateEvidence(`unresolved:${port}`, "type-system", "heuristic")) ?? []),
  ];
  return Object.freeze({
    kind: "metroplat.language.jsnode.being" as const,
    subject: `${slash(path.relative(input.root, input.source.fileName))}#${input.name}:${input.source.getLineAndCharacterOfPosition(input.node.getStart(input.source)).line + 1}`,
    predicates: Object.freeze([...new Map(predicates.map((evidence) => [
      `${evidence.predicate}\u0000${evidence.basis}\u0000${evidence.confidence}`,
      evidence,
    ])).values()].sort((left, right) => left.predicate.localeCompare(right.predicate) || left.basis.localeCompare(right.basis))),
    ports: Object.freeze([...ports].sort()),
    ...(effects === undefined ? {} : { effectClosure: effects.closure }),
  });
}

function primaryTaxon(readings: readonly NodeBeingTaxonReading[]): NodeBeingTaxonReading | undefined {
  // More structurally specific species precede their general carrier. A
  // boundary-transfer object is still a type object; an Error is still a
  // class; a schema, route table, plugin, or state cell is still a binding.
  const priority = [
    "middleware", "controller", "command", "service", "repository-port", "adapter",
    "validator", "mapper", "hook", "domain-morphism", "generic-utility",
    "schema", "boundary-transfer-object", "type-object", "error", "entity",
    "route-table", "plugin", "state-binding", "domain-value", "generic-value",
  ] as const;
  for (const name of priority) {
    const reading = readings.find((candidate) => candidate.taxon === name && candidate.charge === "held");
    if (reading !== undefined) return reading;
  }
  return undefined;
}

function classification(input: SymbolPlacementInput, contextStatus: ContextStatus): Readonly<{
  signals: readonly string[];
  confidence: "reified" | "heuristic";
  being: NodeBeingObservation;
  taxon?: NodeBeingTaxonReading;
}> {
  const effects = isCallable(input.node) ? effectsOf(input) : undefined;
  const being = beingOf(input, contextStatus, effects);
  const taxa = readNodeBeingTaxonomy(being);
  const taxon = primaryTaxon(taxa);
  const confidence = taxon === undefined ? "heuristic" as const : nodeBeingTaxonConfidence(being, taxon.taxon);
  const callableEffects = effects;
  const signals = [
    ...(callableEffects === undefined ? [] : [
      `concrete-effects:${callableEffects.concrete.length}`,
      `abstract-ports:${callableEffects.abstract.length}`,
      `unresolved-calls:${callableEffects.unknown.length}`,
      ...callableEffects.concrete.map((effect) => `concrete:${effect}`),
      ...callableEffects.abstract.map((effect) => `port:${effect}`),
    ]),
    ...(taxon === undefined ? ["JSNode being taxon unresolved"] : [`taxon:${taxon.taxon}`, `taxon-charge:${taxon.charge}`]),
  ];
  return Object.freeze({
    signals: Object.freeze(signals),
    confidence,
    being,
    ...(taxon === undefined ? {} : { taxon }),
  });
}

/**
 * Derive the research note's two independent placement axes. Existing path
 * names are observations of the current carrier only. Semantic subjects come
 * from addressed JSNode subject anchors; target layers come from the RMN-read
 * being taxonomy, never from the directory being judged.
 */
/** Verify one anchor presentation and retain its index for this read only. */
export function createPlacementReader(subjectAnchors: readonly NodeSubjectAnchor[]) {
  const anchors = subjectsByDeclaration(subjectAnchors);
  return {
    subjectsByDeclaration: anchors,
    read: (input: SymbolPlacementInput) => readPlacement(input, anchors),
  };
}

export function placementOfSymbol(input: PlacementInput): Readonly<{ placement: ModuleTopologyPlacement; being: ModuleTopologyNodeBeing }> {
  return createPlacementReader(input.subjectAnchors).read(input);
}

function readPlacement(input: SymbolPlacementInput, anchors: ReadonlyMap<string, ReadonlySet<string>>): Readonly<{ placement: ModuleTopologyPlacement; being: ModuleTopologyNodeBeing }> {
  const reference = declarationReference(input.root, input.source, input.name);
  const declaration = new Set(reference === undefined ? [] : anchors.get(reference) ?? []);
  const signature = signatureOf(input.checker, input.node);
  const codomain = new Set<string>();
  if (signature !== undefined) {
    for (const subject of typeSubjects(input.root, input.checker.getReturnTypeOfSignature(signature), anchors)) codomain.add(subject);
  }
  const domain = new Set<string>();
  for (const parameter of parameterNodes(input.node)) {
    for (const subject of typeSubjects(input.root, input.checker.getTypeAtLocation(parameter), anchors)) domain.add(subject);
  }
  if (signature === undefined && (input.kind === "interface" || input.kind === "type" || input.kind === "class")) {
    if (reference !== undefined) for (const subject of anchors.get(reference) ?? []) domain.add(subject);
  }
  const candidates = declaration.size > 0 ? declaration : codomain.size > 0 ? codomain : domain;
  const ordered = [...candidates].sort();
  const context = ordered.length === 1 ? ordered[0] : undefined;
  const contextStatus: ContextStatus = ordered.length === 0
    ? input.subjectAnchorCoverage === "complete" ? "cross-cutting" : "unknown"
    : ordered.length === 1 ? "anchored"
      : "contested";
  const contextReason = declaration.size > 0
    ? "stated declaration subject anchor"
    : codomain.size > 0 ? "stated codomain subject anchor"
    : domain.size > 0 ? "stated domain subject anchor"
      : input.subjectAnchorCoverage === "complete"
        ? "the complete subject-anchor vocabulary has no anchor in the declaration domain or codomain; the being is cross-cutting"
        : "the partial subject-anchor vocabulary has no observed anchor in the declaration domain or codomain; subject context remains unknown";
  const classified = classification(input, contextStatus);
  const actual = pathForm(input.root, input.source.fileName);
  const placementObstructions = [
    ...(classified.taxon === undefined ? [
      "no JSNode species has held evidence; unknown or contested taxonomy cannot authorize a package layer",
    ] : []),
    ...(contextStatus === "unknown" ? [contextReason] : []),
    ...(contextStatus === "contested" ? [
      `multiple subject anchors prevent a single context coordinate: ${ordered.join(", ")}`,
    ] : []),
  ];
  const ambiguityCauses = [
    ...(contextStatus === "unknown" ? [contextReason] : []),
    ...(ordered.length > 1 ? [`multiple ${contextReason}s: ${ordered.join(", ")}`] : []),
    ...(classified.taxon === undefined ? ["JSNode being taxon unresolved"] : []),
    ...(actual.subjects.length > 1 ? [`nested package subjects are not yet represented by the placement pair: ${actual.subjects.join("/")}`] : []),
  ];
  const nearest = classified.taxon
    ?? [...readNodeBeingTaxonomy(classified.being)].sort((left, right) => left.defect - right.defect || left.taxon.localeCompare(right.taxon))[0]!;
  const being: ModuleTopologyNodeBeing = Object.freeze({
    ...classified.being,
    confidence: classified.confidence,
    formula: nodeBeingSpeciesFormula(classified.being),
    taxon: classified.taxon?.taxon ?? "unresolved",
    taxonIdentity: nearest.taxonIdentity,
    taxonCharge: classified.taxon?.charge ?? nearest.charge,
    taxonomicDefect: nearest.defect,
    taxonSupport: nearest.support,
    taxonMissing: nearest.missing,
    taxonObstructions: nearest.obstructions,
  });
  const observed = {
    contextStatus,
    ...(context === undefined ? {} : { context }),
    contextReason,
    signals: Object.freeze([...classified.signals]),
    confidence: classified.confidence,
    ambiguous: ambiguityCauses.length > 0,
    ambiguityCauses: Object.freeze(ambiguityCauses),
    actualPackageRegion: actual.region,
    ...(actual.layer === undefined ? {} : { actualLayer: actual.layer }),
    ...(actual.context === undefined ? {
      ...(contextStatus === "cross-cutting" ? { contextMatches: true } : {}),
    } : {
      actualContext: actual.context,
      ...(contextStatus === "unknown" || contextStatus === "contested"
        ? {}
        : { contextMatches: contextStatus === "anchored" && actual.context === context }),
    }),
  } as const;
  const placement: ModuleTopologyPlacement = placementObstructions.length > 0
    ? Object.freeze({
      kind: "metroplat.monitoring.source-code.placement:obstruction" as const,
      ...observed,
      ambiguous: true,
      obstructions: Object.freeze(placementObstructions),
    })
    : (() => {
      const layer = classified.taxon!.layer;
      const realizesHostBoundary = layer === "adapters" || layer === "clients" || layer === "plugins";
      const belongsToAnchoredIntegration = actual.region === "integration"
        && contextStatus === "anchored"
        && actual.context === context;
      const packageRegion: PackageRegion = realizesHostBoundary || belongsToAnchoredIntegration
        ? "integration"
        : "source";
      const packageRegionReason = realizesHostBoundary
        ? `${layer} realizes a concrete host integration boundary`
        : belongsToAnchoredIntegration
          ? `${context} is an anchored integration context; its ${layer} layer remains with that complete boundary`
          : "the measured being neither realizes a concrete host integration boundary nor belongs to an anchored integration context";
      return Object.freeze({
        kind: "metroplat.monitoring.source-code.placement:witness" as const,
        ...observed,
        layer,
        packageRegion,
        packageRegionReason,
        ...(actual.layer === undefined ? {} : { layerMatches: actual.layer === layer }),
      });
    })();
  return Object.freeze({ placement, being });
}
