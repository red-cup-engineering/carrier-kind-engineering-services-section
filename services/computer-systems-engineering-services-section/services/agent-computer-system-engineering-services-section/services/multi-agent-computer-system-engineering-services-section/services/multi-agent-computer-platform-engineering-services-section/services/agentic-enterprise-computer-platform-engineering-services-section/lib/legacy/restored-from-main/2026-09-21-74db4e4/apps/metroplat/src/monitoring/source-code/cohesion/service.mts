/**
 * @packageDocumentation
 *
 * monitoring/source-code/cohesion - live package per-module declaration cohesion.
 *
 * This monitor consumes the same filesystem-adapter policy and TypeScript-AST
 * discipline as the sibling topology monitor, over the same source trees, but
 * reads a different structural fact: for each module, do its own top-level
 * exported declarations form one connected object, or does the available
 * evidence also preserve separations among them? Connectivity is read by the existing persistent-H0
 * union-find law in lib/math/graphs/module-cohesion.mts — this service's
 * own job is admitting the two evidence graphs that law consumes (internal
 * cross-reference, cross-file co-import), not computing components itself.
 *
 * "Internal cross-reference" has two sources, both same-file, both strong
 * evidence: one declaration's body naming another declaration's identifier,
 * and one declaration's schema literal `$ref`-ing another declaration's
 * `$id`. Those addresses are structural dependency evidence even though
 * cross-contract validation remains a loose slot until an explicit composition
 * boundary supplies both contracts. Reading only identifiers and ignoring `$ref`/`$id` address
 * composition over-reports fragmentation for every schema file that
 * uses this (deliberate, correct) addressing style.
 *
 * Obsmetrologia's `Calculus.Order.components_only_merge` proves the monotone
 * filtration fact used to interpret added evidence: connectivity can merge but
 * cannot split as graph edges accumulate. It does not certify this adapter's
 * TypeScript declaration extraction or its choice of evidence edges; those
 * remain explicitly tested implementation obligations.
 *
 * @metroplatSubject source-code
 */
import path from "node:path";
import ts from "typescript";
import {
  contentAddress } from "../../../lib/identity/index.mts";

import { moduleCohesionReceipt,
  type GraphEdge } from "@lenticule-science/metrologic/models/graphs/module-cohesion";
import {
  moduleCohesionReadContract as moduleCohesionReadSchemaContract,
  moduleCohesionPageContract,
  type ModuleCohesionModule,
  type ModuleCohesionPage,
  type ModuleCohesionRead,
  type ModuleCohesionReadOptions,
  } from "./schema.mts";

import {
  DEFAULT_SOURCE_DIRECTORIES,
  DEFAULT_SOURCE_FILE_LIMIT,
  readSourceModuleCorpus,
  sourceModuleProgram,
  sourceModuleRelativePath,
  sourceModuleSyntax,
  type SourceModuleCorpus,
  } from "../filesystem.mts";
import { finiteClosureRegime,
  zeroOrdinal } from "@lenticule-science/metrologic/articulation/predicating/positing/settling";
import {
} from "@red-cup-engineering/computer-data-engine/bilattice-charge";
import {
  chargeValueOfEvidenceRecord,
  evidenceRecord,
  evidenceRecordTopMass,
  addEvidenceRecords,
} from "@red-cup-engineering/computer-data-engine/evidence-record";


export type {
  ModuleCohesionModule,
  ModuleCohesionPage,
  ModuleCohesionRead,
  ModuleCohesionReadOptions,
  ModuleCohesionReadRequest,
} from "./schema.mts";

const DEFAULT_MIN_SYMBOLS = 5;

function resolveRelativeSpecifier(sourcePath: string, specifier: string): string {
  const sourceSpecifier = specifier.replace(/\.m?js$/, ".mts");
  const resolved = path.normalize(path.join(path.dirname(sourcePath), sourceSpecifier));
  return resolved.split(path.sep).join("/");
}

interface RefIdFacts {
  /** `$id` string literals this declaration's own schema publishes (normally at most one). */
  readonly ids: readonly string[];
  /** `$ref` string literals this declaration's schema points at, anywhere in its nested properties. */
  readonly refs: readonly string[];
}

interface FileDeclarations {
  /** Ordered, de-duplicated top-level exported declaration names. */
  readonly symbols: readonly string[];
  /** Same-file identifier-reference edges (one declaration's body naming another). */
  readonly identifierReferenceEdges: readonly GraphEdge[];
  /** `$id`/`$ref` facts per declaration, resolved against the whole tree's `$id` map once every file is read. */
  readonly refIdFactsBySymbol: ReadonlyMap<string, RefIdFacts>;
  /** Named imports pulled from another module in this package, keyed by that module's resolved path. */
  readonly namedImportsByModule: ReadonlyMap<string, readonly string[]>;
}

function topLevelDeclarationNodes(source: ts.SourceFile): ReadonlyMap<string, ts.Node> {
  const declarations = new Map<string, ts.Node>();
  for (const statement of source.statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name !== undefined) {
      declarations.set(statement.name.text, statement);
    } else if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
      declarations.set(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const declarator of statement.declarationList.declarations) {
        if (ts.isIdentifier(declarator.name)) declarations.set(declarator.name.text, declarator);
      }
    }
  }
  return declarations;
}

function identifiersReferencedBy(node: ts.Node, ownName: string): ReadonlySet<string> {
  const referenced = new Set<string>();
  const visit = (current: ts.Node): void => {
    if (ts.isIdentifier(current) && current.text !== ownName) referenced.add(current.text);
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return referenced;
}

function propertyAssignmentKey(node: ts.PropertyAssignment): string | undefined {
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return undefined;
}

/** Every `$id`/`$ref` string literal anywhere inside a declaration's own schema literal. */
function refIdFactsOf(node: ts.Node): RefIdFacts {
  const ids: string[] = [];
  const refs: string[] = [];
  const visit = (current: ts.Node): void => {
    if (ts.isPropertyAssignment(current) && ts.isStringLiteral(current.initializer)) {
      const key = propertyAssignmentKey(current);
      if (key === "$id") ids.push(current.initializer.text);
      else if (key === "$ref") refs.push(current.initializer.text);
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return Object.freeze({ ids: Object.freeze(ids), refs: Object.freeze(refs) });
}

function readFileDeclarations(source: ts.SourceFile, sourcePath: string): FileDeclarations {
  const declarationNodes = topLevelDeclarationNodes(source);
  const symbolNames = new Set(declarationNodes.keys());
  const identifierReferenceEdges: GraphEdge[] = [];
  const refIdFactsBySymbol = new Map<string, RefIdFacts>();
  for (const [name, node] of declarationNodes) {
    const referenced = identifiersReferencedBy(node, name);
    for (const other of referenced) {
      if (symbolNames.has(other)) identifierReferenceEdges.push(Object.freeze([name, other]) as GraphEdge);
    }
    refIdFactsBySymbol.set(name, refIdFactsOf(node));
  }

  const namedImportsByModule = new Map<string, string[]>();
  const visitImports = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node)
      && node.importClause?.namedBindings !== undefined
      && ts.isNamedImports(node.importClause.namedBindings)
      && ts.isStringLiteral(node.moduleSpecifier)
      && node.moduleSpecifier.text.startsWith(".")
    ) {
      const modulePath = resolveRelativeSpecifier(sourcePath, node.moduleSpecifier.text);
      const names = node.importClause.namedBindings.elements.map((element) =>
        (element.propertyName ?? element.name).text,
      );
      const existing = namedImportsByModule.get(modulePath) ?? [];
      existing.push(...names);
      namedImportsByModule.set(modulePath, existing);
    }
    ts.forEachChild(node, visitImports);
  };
  visitImports(source);

  return Object.freeze({
    symbols: Object.freeze([...symbolNames]),
    identifierReferenceEdges: Object.freeze(identifierReferenceEdges),
    refIdFactsBySymbol,
    namedImportsByModule: namedImportsByModule,
  }) as FileDeclarations;
}

interface RefOwner {
  readonly file: string;
  readonly symbol: string;
}

/** Every declaration's own `$id`, resolved once across the whole tree, so a `$ref` can be traced to its owner. */
function idOwnersAcross(declarationsByFile: ReadonlyMap<string, FileDeclarations>): ReadonlyMap<string, RefOwner> {
  const owners = new Map<string, RefOwner>();
  for (const [file, declarations] of declarationsByFile) {
    for (const [symbol, facts] of declarations.refIdFactsBySymbol) {
      for (const id of facts.ids) owners.set(id, Object.freeze({ file, symbol }));
    }
  }
  return owners;
}

/** Same-file edges from one declaration's `$ref` to another declaration's `$id` — the address-composed twin of an identifier reference. */
function refResolvedEdgesFor(
  file: string,
  declarations: FileDeclarations,
  idOwners: ReadonlyMap<string, RefOwner>,
): readonly GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const [symbol, facts] of declarations.refIdFactsBySymbol) {
    for (const ref of facts.refs) {
      const owner = idOwners.get(ref);
      if (owner !== undefined && owner.file === file && owner.symbol !== symbol) {
        edges.push(Object.freeze([symbol, owner.symbol]) as GraphEdge);
      }
    }
  }
  return Object.freeze(edges);
}

function coImportEdgesFor(targetPath: string, importerNamedImports: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>>): readonly GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const namedImportsByModule of importerNamedImports.values()) {
    const names = namedImportsByModule.get(targetPath);
    if (names === undefined || names.length < 2) continue;
    for (let left = 0; left < names.length; left += 1) {
      for (let right = left + 1; right < names.length; right += 1) {
        edges.push(Object.freeze([names[left] as string, names[right] as string]) as GraphEdge);
      }
    }
  }
  return Object.freeze(edges);
}

/** Read one package's own per-module declaration-cohesion partition from the TypeScript AST. */
export function readModuleCohesion(root: string, options: ModuleCohesionReadOptions = {}): ModuleCohesionRead {
  const rootAbs = path.resolve(root);
  const sourceDirs = options.sourceDirs ?? DEFAULT_SOURCE_DIRECTORIES;
  const maxFiles = options.maxFiles ?? DEFAULT_SOURCE_FILE_LIMIT;
  return moduleCohesionOfCorpus(readSourceModuleCorpus(rootAbs, sourceDirs, maxFiles), options);
}

/** Read cohesion from one already-admitted corpus without repeating filesystem I/O. */
export function moduleCohesionOfCorpus(
  corpus: SourceModuleCorpus,
  options: Pick<ModuleCohesionReadOptions, "minSymbols"> = {},
): ModuleCohesionRead {
  const rootAbs = corpus.root;
  const minSymbols = options.minSymbols ?? DEFAULT_MIN_SYMBOLS;
  const identityByFile = new Map(corpus.files.map((file) => [file.absolutePath, file.identity]));
  const program = sourceModuleProgram(corpus);

  const declarationsByFile = new Map<string, FileDeclarations>();
  for (const file of corpus.files) {
    const posixPath = file.absolutePath.split(path.sep).join("/");
    const source = sourceModuleSyntax(program, file);
    declarationsByFile.set(posixPath, readFileDeclarations(source, posixPath));
  }

  const importerNamedImports = new Map<string, ReadonlyMap<string, readonly string[]>>(
    [...declarationsByFile.entries()].map(([file, declarations]) => [file, declarations.namedImportsByModule]),
  );
  const idOwners = idOwnersAcross(declarationsByFile);

  const modules: ModuleCohesionModule[] = [];
  for (const [file, declarations] of declarationsByFile) {
    if (declarations.symbols.length < minSymbols) continue;
    const ownSymbols = new Set(declarations.symbols);
    // A consumer may import a name this file only re-exports (`export type
    // { X } from "./other"`), which is not one of this file's own top-level
    // declarations and so is not a vertex in its graph; drop such edges.
    const coImportEdges = coImportEdgesFor(file, importerNamedImports)
      .filter(([source, target]) => ownSymbols.has(source) && ownSymbols.has(target));
    const internalReferenceEdges = [
      ...declarations.identifierReferenceEdges,
      ...refResolvedEdgesFor(file, declarations, idOwners),
    ];
    const receipt = moduleCohesionReceipt({
      path: file,
      symbols: declarations.symbols,
      internalReferenceEdges,
      coImportEdges,
    });
    modules.push(Object.freeze({
      path: sourceModuleRelativePath(rootAbs, file),
      identity: identityByFile.get(file)!,
      symbols: declarations.symbols,
      componentCount: receipt.componentCount,
      components: receipt.components,
      valuation: Object.freeze({
        ...receipt.valuation,
        ordinal: Object.freeze({
          kind: "ordinal.closure.ordinal.successor" as const,
          predecessor: zeroOrdinal,
        }),
        regime: finiteClosureRegime,
      }),
    }));
  }
  modules.sort((left, right) => right.componentCount - left.componentCount || right.symbols.length - left.symbols.length);

  const record = modules.reduce(
    (accumulator, moduleEntry) => addEvidenceRecords(accumulator, moduleEntry.valuation.record),
    evidenceRecord(0, 0),
  );
  const valuation = Object.freeze({
    kind: "metroplat.module-cohesion.valuation" as const,
    record,
    charge: chargeValueOfEvidenceRecord(record),
    topMass: evidenceRecordTopMass(record),
    ordinal: Object.freeze({
      kind: "ordinal.closure.ordinal.successor" as const,
      predecessor: zeroOrdinal,
    }),
    regime: finiteClosureRegime,
    evidence: Object.freeze([
      `modules:${modules.length}`,
      `record-sum:pos:${record.pos};neg:${record.neg}`,
    ]),
  });
  const observation = contentAddress(Object.freeze({
    source: corpus.source,
    minSymbols,
    modules: Object.freeze(modules.map((moduleEntry) => contentAddress(moduleEntry))),
    valuation,
  }));

  return moduleCohesionReadSchemaContract.assert(Object.freeze({
    kind: "metroplat.module-cohesion.read" as const,
    operation: "read-module-cohesion" as const,
    source: corpus.source,
    observation,
    root: rootAbs,
    sourceDirs: corpus.sourceDirs,
    files: declarationsByFile.size,
    ...(corpus.truncated ? { truncated: true } : {}),
    minSymbols,
    modules: Object.freeze(modules),
    valuation,
  }), "Module cohesion read") as ModuleCohesionRead;
}

export interface ModuleCohesionPageOptions {
  readonly offset?: number;
  readonly limit?: number;
  readonly includeSymbols?: boolean;
}

/** Project a complete cohesion observation into a deterministic bounded RPC page. */
export function moduleCohesionPage(
  read: ModuleCohesionRead,
  options: ModuleCohesionPageOptions = {},
): ModuleCohesionPage {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 25;
  if (!Number.isInteger(offset) || offset < 0) throw new TypeError("module cohesion offset must be a nonnegative integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new TypeError("module cohesion limit must be an integer from 1 through 50");
  const includeSymbols = options.includeSymbols === true;
  const selected = read.modules.slice(offset, offset + limit);
  const modules = Object.freeze(selected.map((moduleEntry) => Object.freeze({
    path: moduleEntry.path,
    identity: moduleEntry.identity,
    symbolCount: moduleEntry.symbols.length,
    componentCount: moduleEntry.componentCount,
    valuation: moduleEntry.valuation,
    ...(includeSymbols ? { symbols: moduleEntry.symbols, components: moduleEntry.components } : {}),
  })));
  const nextOffset = offset + modules.length < read.modules.length ? offset + modules.length : undefined;
  return moduleCohesionPageContract.assert(Object.freeze({
    kind: "metroplat.monitoring.source-code.module-cohesion" as const,
    operation: "read-module-cohesion" as const,
    source: read.source,
    observation: read.observation,
    root: read.root,
    sourceDirs: read.sourceDirs,
    files: read.files,
    ...(read.truncated === true ? { truncated: true } : {}),
    minSymbols: read.minSymbols,
    valuation: read.valuation,
    totalModules: read.modules.length,
    offset,
    limit,
    returned: modules.length,
    ...(nextOffset === undefined ? {} : { nextOffset }),
    includeSymbols,
    modules,
  }), "Module cohesion page") as ModuleCohesionPage;
}
