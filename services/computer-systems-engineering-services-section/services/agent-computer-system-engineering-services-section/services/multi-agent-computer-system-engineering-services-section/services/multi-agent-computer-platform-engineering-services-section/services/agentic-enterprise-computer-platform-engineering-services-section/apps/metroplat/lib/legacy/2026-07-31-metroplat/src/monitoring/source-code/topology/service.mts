/**
 * @packageDocumentation
 *
 * monitoring/source-code/topology - live package source-tree scale and import topology.
 *
 * This monitor consumes the source-code filesystem adapter's one traversal of a
 * package and parses each file through the TypeScript compiler's own AST. Structural
 * facts (line counts, declared functions, declared classes, import edges) are
 * read from the parse tree, not pattern-matched from text — the same discipline
 * src/integrations/anthropic/services and src/integrations/openai/codex/services use for their host formats.
 *
 * @metroplatSubject source-code
 */
import path from "node:path";
import ts from "typescript";

import {
  moduleTopologyReadContract as moduleTopologyReadSchemaContract,
  moduleTopologyPageContract,
  type ModuleTopologyModule,
  type ModuleTopologyPage,
  type ModuleTopologyPlacement,
  type ModuleTopologyRead,
  type ModuleTopologyReadOptions,
  type ModuleTopologyReexport,
  type ModuleTopologySpeciesCensusEntry,
  type ModuleTopologySymbol,
  type NodePackageLayoutConvention,
  type NodePackageLayoutConventionReading,
  type NodeSubjectAnchorCoverage,
} from "./schema.mts";
import { nodePackageLayoutConventionOfPath, placementOfSymbol } from "./placement.mts";
import type { ContractValue } from "../../../lib/contracts/index.mts";
import { contentAddress } from "../../../lib/identity/index.mts";
import {
  nodeDeclarationReference,
  nodeBeingFormalContext,
  nodeBeingTaxa,
  nodeSubjectAnchor,
  nodeSubjectJSDocTag,
  projectNodeBeingDocumentation,
  readNodeBeingSpeciesConcepts,
  readNodeSubjectAnchor,
  type NodeBeingSpeciesFormula,
  type NodeSubjectAnchor,
} from "../../../lib/language/jsnode/index.mts";

import {
  DEFAULT_SOURCE_DIRECTORIES,
  DEFAULT_SOURCE_FILE_LIMIT,
  readSourceModuleCorpus,
  sourceModuleProgram,
  sourceModuleRelativePath,
  sourceModuleSyntax,
  type SourceModuleCorpus,
} from "../filesystem.mts";
import { moduleCohesionOfCorpus } from "../cohesion/service.mts";

export type {
  ModuleTopologyModule,
  ModuleTopologyPage,
  ModuleTopologyRead,
  ModuleTopologyReadOptions,
  ModuleTopologyReadRequest,
  ModuleTopologyReexport,
  ModuleTopologySpeciesCensusEntry,
  ModuleTopologySymbol,
  NodePackageLayoutConvention,
  NodePackageLayoutConventionReading,
} from "./schema.mts";

function countLines(content: string): { readonly loc: number; readonly sloc: number } {
  const lines = content.split("\n");
  const loc = lines.length;
  const sloc = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
  }).length;
  return Object.freeze({ loc, sloc });
}

interface FileTopology {
  readonly summary?: string;
  readonly loc: number;
  readonly sloc: number;
  readonly functions: number;
  readonly classes: number;
  readonly imports: readonly string[];
  readonly typeImports: readonly string[];
  readonly externalImports: readonly string[];
  readonly externalTypeImports: readonly string[];
  readonly reexports: readonly ModuleTopologyReexport[];
  readonly symbols: readonly ModuleTopologySymbol[];
}

type PlacementWitness = Extract<ModuleTopologyPlacement, Readonly<{
  kind: "metroplat.monitoring.source-code.placement:witness";
}>>;
type PlacedSymbol = ModuleTopologySymbol & Readonly<{ placement: PlacementWitness }>;

function hasPlacementWitness(symbol: ModuleTopologySymbol): symbol is PlacedSymbol {
  return symbol.placement.kind === "metroplat.monitoring.source-code.placement:witness";
}

interface ModuleReferenceUsage {
  readonly runtime: boolean;
  readonly typeOnly: boolean;
}

interface ImportBinding {
  readonly module: string;
  readonly imported: string;
}

/** Classify the parts of one static module reference that survive JavaScript
 * emission separately from bindings erased by TypeScript. Mixed declarations
 * intentionally inhabit both sets. */
function moduleReferenceUsage(node: ts.ImportDeclaration | ts.ExportDeclaration): ModuleReferenceUsage {
  if (ts.isImportDeclaration(node)) {
    const clause = node.importClause;
    if (clause === undefined) return Object.freeze({ runtime: true, typeOnly: false });
    if (clause.isTypeOnly) return Object.freeze({ runtime: false, typeOnly: true });
    let runtime = clause.name !== undefined;
    let typeOnly = false;
    const bindings = clause.namedBindings;
    if (bindings === undefined || ts.isNamespaceImport(bindings)) runtime = true;
    else {
      runtime ||= bindings.elements.length === 0 || bindings.elements.some((element) => !element.isTypeOnly);
      typeOnly = bindings.elements.some((element) => element.isTypeOnly);
    }
    return Object.freeze({ runtime, typeOnly });
  }
  if (node.isTypeOnly) return Object.freeze({ runtime: false, typeOnly: true });
  const clause = node.exportClause;
  if (clause === undefined || ts.isNamespaceExport(clause)) {
    return Object.freeze({ runtime: true, typeOnly: false });
  }
  const runtime = clause.elements.length === 0 || clause.elements.some((element) => !element.isTypeOnly);
  const typeOnly = clause.elements.some((element) => element.isTypeOnly);
  return Object.freeze({ runtime, typeOnly });
}

/** The first non-empty, non-`@tag` line of a node's leading `/** … *\/` comment,
 *  if it has one — the same summary a human would read first in an editor. */
function jsDocSummaryOf(sourceText: string, node: ts.Node): string | undefined {
  const ranges = ts.getLeadingCommentRanges(sourceText, node.getFullStart());
  if (ranges === undefined || ranges.length === 0) return undefined;
  const range = ranges[ranges.length - 1]!;
  const raw = sourceText.slice(range.pos, range.end);
  if (!raw.startsWith("/**")) return undefined;
  const body = raw.slice(3, raw.endsWith("*/") ? -2 : undefined);
  for (const line of body.split("\n")) {
    const trimmed = line.replace(/^\s*\*\s?/, "").trim();
    if (trimmed.length > 0 && !trimmed.startsWith("@")) return trimmed;
  }
  return undefined;
}

function isExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false);
}

/** Resolve one import specifier to the module-path form used elsewhere in this
 *  read (relative imports normalized to the source's own directory; external
 *  package specifiers passed through unchanged). */
function resolveImportModule(specifier: string, sourcePath: string): string {
  if (!specifier.startsWith(".")) return specifier;
  const resolvedByTypeScript = ts.resolveModuleName(specifier, sourcePath, {
    allowJs: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    target: ts.ScriptTarget.ES2022,
  }, ts.sys).resolvedModule?.resolvedFileName;
  const sourceSpecifier = specifier.replace(/\.(?:mjs|cjs|js)$/u, ".mts");
  const resolved = path.normalize(resolvedByTypeScript ?? path.join(path.dirname(sourcePath), sourceSpecifier));
  return resolved.split(path.sep).join("/");
}

/** Every local name a file's import declarations bind (default, namespace, and
 *  named bindings, aliases included), mapped to the module it was imported
 *  from — the missing link between "this file imports X" (file-level) and
 *  "this specific function/class uses X" (symbol-level). */
function collectImportBindings(source: ts.SourceFile, sourcePath: string): ReadonlyMap<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const moduleValue = resolveImportModule(statement.moduleSpecifier.text, sourcePath);
    const clause = statement.importClause;
    if (clause === undefined) continue;
    if (clause.name !== undefined) bindings.set(clause.name.text, Object.freeze({ module: moduleValue, imported: "default" }));
    const namedBindings = clause.namedBindings;
    if (namedBindings === undefined) continue;
    if (ts.isNamespaceImport(namedBindings)) {
      bindings.set(namedBindings.name.text, Object.freeze({ module: moduleValue, imported: "*" }));
    } else if (ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        bindings.set(element.name.text, Object.freeze({
          module: moduleValue,
          imported: element.propertyName?.text ?? element.name.text,
        }));
      }
    }
  }
  return bindings;
}

/** Exact public names projected by `export ... from` declarations. This makes
 * package assembly visible as evidence instead of collapsing a barrel into an
 * unexplained module edge. `*` denotes the source module's complete export set. */
function collectReexports(source: ts.SourceFile, sourcePath: string): readonly ModuleTopologyReexport[] {
  const reexports: ModuleTopologyReexport[] = [];
  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement) || statement.moduleSpecifier === undefined
      || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const module = resolveImportModule(statement.moduleSpecifier.text, sourcePath);
    const clause = statement.exportClause;
    if (clause === undefined) {
      reexports.push(Object.freeze({ module, imported: "*", exported: "*", typeOnly: statement.isTypeOnly }));
    } else if (ts.isNamespaceExport(clause)) {
      reexports.push(Object.freeze({ module, imported: "*", exported: clause.name.text, typeOnly: statement.isTypeOnly }));
    } else {
      for (const element of clause.elements) {
        reexports.push(Object.freeze({
          module,
          imported: element.propertyName?.text ?? element.name.text,
          exported: element.name.text,
          typeOnly: statement.isTypeOnly || element.isTypeOnly,
        }));
      }
    }
  }
  return Object.freeze(reexports);
}

/** Every name a top-level declaration in this file binds, exported or not —
 *  a symbol calling a private helper is still a real same-file dependency. */
function collectTopLevelLocalNames(source: ts.SourceFile): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name !== undefined) names.add(statement.name.text);
    else if (ts.isClassDeclaration(statement) && statement.name !== undefined) names.add(statement.name.text);
    else if (ts.isInterfaceDeclaration(statement)) names.add(statement.name.text);
    else if (ts.isTypeAliasDeclaration(statement)) names.add(statement.name.text);
    else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
      }
    }
  }
  return names;
}

/** Every identifier a declaration's own subtree references, excluding the
 *  declaration's own name — an approximate but AST-grounded read of "what
 *  does this specific symbol touch," not the whole file's import list. */
function referencedIdentifierNames(node: ts.Node, ownName: string): ReadonlySet<string> {
  const names = new Set<string>();
  const visit = (child: ts.Node): void => {
    if (ts.isIdentifier(child) && child.text !== ownName) names.add(child.text);
    ts.forEachChild(child, visit);
  };
  ts.forEachChild(node, visit);
  return names;
}

function pushSymbol(
  symbols: ModuleTopologySymbol[],
  sourceText: string,
  source: ts.SourceFile,
  node: ts.Node,
  name: string,
  kind: ModuleTopologySymbol["kind"],
  exported: boolean,
  importBindings: ReadonlyMap<string, ImportBinding>,
  localNames: ReadonlySet<string>,
  checker: ts.TypeChecker,
  root: string,
  subjectAnchors: readonly NodeSubjectAnchor[],
  subjectAnchorCoverage: NodeSubjectAnchorCoverage,
): void {
  const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const documentationCarrier = ts.isVariableDeclaration(node)
    && ts.isVariableDeclarationList(node.parent)
    && ts.isVariableStatement(node.parent.parent)
    ? node.parent.parent
    : node;
  const summary = jsDocSummaryOf(sourceText, documentationCarrier);
  const referenced = referencedIdentifierNames(node, name);
  const dependsOnModules = new Set<string>();
  const dependsOnImportedSymbols = new Set<string>();
  const dependsOnLocal = new Set<string>();
  for (const identifier of referenced) {
    const binding = importBindings.get(identifier);
    if (binding !== undefined) {
      dependsOnModules.add(binding.module);
      dependsOnImportedSymbols.add(`${binding.module}#${binding.imported}`);
    }
    else if (localNames.has(identifier)) dependsOnLocal.add(identifier);
  }
  const classified = placementOfSymbol({
    checker,
    root,
    source,
    node,
    name,
    kind,
    dependsOnModules: Object.freeze([...dependsOnModules].sort()),
    subjectAnchors,
    subjectAnchorCoverage,
  });
  symbols.push(Object.freeze({
    name,
    kind,
    line,
    exported,
    ...(summary === undefined ? {} : { summary }),
    dependsOnModules: Object.freeze([...dependsOnModules].sort()),
    dependsOnImportedSymbols: Object.freeze([...dependsOnImportedSymbols].sort()),
    dependsOnLocal: Object.freeze([...dependsOnLocal].sort()),
    referencedBySymbols: Object.freeze([]),
    being: classified.being,
    placement: classified.placement,
  }));
}

/** Every top-level declaration's name, visibility, kind, line, doc summary, and
 *  its own symbol-level dependency footprint (which imported modules and
 *  which same-file helpers ITS body actually references) — read from the
 *  same AST pass as the counts, so "what does this file have, and does it
 *  actually belong together" is answerable per symbol, not just per file. */
function readFileSymbols(
  source: ts.SourceFile,
  sourceText: string,
  sourcePath: string,
  checker: ts.TypeChecker,
  root: string,
  subjectAnchors: readonly NodeSubjectAnchor[],
  subjectAnchorCoverage: NodeSubjectAnchorCoverage,
): readonly ModuleTopologySymbol[] {
  const importBindings = collectImportBindings(source, sourcePath);
  const localNames = collectTopLevelLocalNames(source);
  const symbols: ModuleTopologySymbol[] = [];
  for (const node of source.statements) {
    const exported = isExported(node);
    if (ts.isFunctionDeclaration(node) && node.name !== undefined) {
      pushSymbol(symbols, sourceText, source, node, node.name.text, "function", exported, importBindings, localNames, checker, root, subjectAnchors, subjectAnchorCoverage);
    } else if (ts.isClassDeclaration(node) && node.name !== undefined) {
      pushSymbol(symbols, sourceText, source, node, node.name.text, "class", exported, importBindings, localNames, checker, root, subjectAnchors, subjectAnchorCoverage);
    } else if (ts.isInterfaceDeclaration(node)) {
      pushSymbol(symbols, sourceText, source, node, node.name.text, "interface", exported, importBindings, localNames, checker, root, subjectAnchors, subjectAnchorCoverage);
    } else if (ts.isTypeAliasDeclaration(node)) {
      pushSymbol(symbols, sourceText, source, node, node.name.text, "type", exported, importBindings, localNames, checker, root, subjectAnchors, subjectAnchorCoverage);
    } else if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          pushSymbol(symbols, sourceText, source, declaration, declaration.name.text, "const", exported, importBindings, localNames, checker, root, subjectAnchors, subjectAnchorCoverage);
        }
      }
    }
  }
  return Object.freeze(symbols);
}

function readFileTopology(
  source: ts.SourceFile,
  sourcePath: string,
  checker: ts.TypeChecker,
  root: string,
  subjectAnchors: readonly NodeSubjectAnchor[],
  subjectAnchorCoverage: NodeSubjectAnchorCoverage,
): FileTopology {
  let functions = 0;
  let classes = 0;
  const imports: string[] = [];
  const typeImports: string[] = [];
  const externalImports: string[] = [];
  const externalTypeImports: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      ts.isFunctionDeclaration(node)
      || ts.isMethodDeclaration(node)
      || ts.isArrowFunction(node)
      || ts.isFunctionExpression(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node)
      || ts.isConstructorDeclaration(node)
    ) {
      functions += 1;
    }
    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      classes += 1;
    }
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const usage = moduleReferenceUsage(node);
      if (specifier.startsWith(".")) {
        // Source imports reference the eventual .mjs/.js output extension
        // (NodeNext resolution); normalize back to .mts so edges match the
        // .mts paths used as module keys elsewhere in this read.
        const resolved = resolveImportModule(specifier, sourcePath);
        const normalized = resolved.split(path.sep).join("/");
        if (usage.runtime) imports.push(normalized);
        if (usage.typeOnly) typeImports.push(normalized);
      } else {
        if (usage.runtime) externalImports.push(specifier);
        if (usage.typeOnly) externalTypeImports.push(specifier);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const { loc, sloc } = countLines(source.getFullText());
  const summary = source.statements.length === 0
    ? undefined
    : jsDocSummaryOf(source.getFullText(), source.statements[0]!);
  return Object.freeze({
    ...(summary === undefined ? {} : { summary }),
    loc,
    sloc,
    functions,
    classes,
    imports: Object.freeze([...new Set(imports)].sort()),
    typeImports: Object.freeze([...new Set(typeImports)].sort()),
    externalImports: Object.freeze([...new Set(externalImports)].sort()),
    externalTypeImports: Object.freeze([...new Set(externalTypeImports)].sort()),
    reexports: collectReexports(source, sourcePath),
    symbols: readFileSymbols(source, source.getFullText(), sourcePath, checker, root, subjectAnchors, subjectAnchorCoverage),
  });
}

function jsDocCommentText(comment: string | ts.NodeArray<ts.JSDocComment> | undefined): string {
  if (typeof comment === "string") return comment.trim();
  if (comment === undefined) return "";
  return [...comment].map((part) => "text" in part && typeof part.text === "string" ? part.text : part.getText()).join("").trim();
}

function declaredSubjects(node: ts.Node, coordinate: string): readonly string[] {
  const subjects: string[] = [];
  for (const tag of ts.getJSDocTags(node)) {
    if (tag.tagName.text !== nodeSubjectJSDocTag) continue;
    const subject = jsDocCommentText(tag.comment);
    if (subject.length === 0) throw new TypeError(`${coordinate} has an empty @${nodeSubjectJSDocTag} declaration`);
    subjects.push(subject);
  }
  return Object.freeze([...new Set(subjects)].sort());
}

/** Translate compiler-readable JSNode subject declarations from the admitted
 * source corpus into the same addressed language artifacts callers may pass. */
function sourceSubjectAnchors(corpus: SourceModuleCorpus, program: ts.Program): readonly NodeSubjectAnchor[] {
  const anchors = new Map<string, NodeSubjectAnchor>();
  const admit = (module: string, symbol: string, subjects: readonly string[]): void => {
    const declaration = nodeDeclarationReference(module, symbol);
    for (const subject of subjects) {
      const anchor = nodeSubjectAnchor(subject, [declaration]);
      anchors.set(anchor.identity, anchor);
    }
  };
  for (const file of corpus.files) {
    const source = program.getSourceFile(file.absolutePath);
    if (source === undefined) continue;
    const firstStatement = source.statements[0];
    const moduleCoordinate = `${file.path}:1`;
    const moduleSubjects = firstStatement !== undefined
      && ts.getJSDocTags(firstStatement).some((tag) => tag.tagName.text === "packageDocumentation")
      ? declaredSubjects(firstStatement, moduleCoordinate)
      : Object.freeze([]);
    const moduleDeclarations: string[] = [];
    const record = (symbol: string, subjects: readonly string[]): void => {
      moduleDeclarations.push(nodeDeclarationReference(file.path, symbol));
      admit(file.path, symbol, subjects);
    };
    for (const statement of source.statements) {
      const coordinate = `${file.path}:${source.getLineAndCharacterOfPosition(statement.getStart(source)).line + 1}`;
      const statementSubjects = statement === firstStatement && moduleSubjects.length > 0
        ? Object.freeze([])
        : declaredSubjects(statement, coordinate);
      if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
        if (statement.name !== undefined) record(statement.name.text, statementSubjects);
      } else if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) {
        record(statement.name.text, statementSubjects);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name)) continue;
          const declarationSubjects = declaredSubjects(declaration, coordinate);
          record(declaration.name.text, Object.freeze([...new Set([...statementSubjects, ...declarationSubjects])].sort()));
        }
      } else if (statementSubjects.length > 0) {
        throw new TypeError(`${coordinate} attaches @${nodeSubjectJSDocTag} to an unsupported top-level declaration`);
      }
    }
    if (moduleSubjects.length > 0 && moduleDeclarations.length === 0) {
      throw new TypeError(`${moduleCoordinate} declares a module @${nodeSubjectJSDocTag} without a top-level declaration`);
    }
    for (const subject of moduleSubjects) {
      const anchor = nodeSubjectAnchor(subject, moduleDeclarations);
      anchors.set(anchor.identity, anchor);
    }
  }
  return Object.freeze([...anchors.values()].sort((left, right) => left.identity.localeCompare(right.identity)));
}

/** Read the finite set of nesting colors actually carried by the package.
 * Zero colors is knowledge-bottom; one is a held convention; more than one is
 * contested evidence and therefore cannot authorize a target path. */
function layoutConventionReading(
  root: string,
  files: readonly Readonly<{ path: string; absolutePath: string }>[],
): NodePackageLayoutConventionReading {
  const pathsByConvention = new Map<NodePackageLayoutConvention, string[]>();
  for (const file of files) {
    const convention = nodePackageLayoutConventionOfPath(root, file.absolutePath);
    if (convention === undefined) continue;
    const paths = pathsByConvention.get(convention);
    if (paths === undefined) pathsByConvention.set(convention, [file.path]);
    else paths.push(file.path);
  }
  const candidates = Object.freeze([...pathsByConvention.keys()].sort());
  const observations = Object.freeze(candidates.map((convention) => Object.freeze({
    convention,
    paths: Object.freeze([...pathsByConvention.get(convention)!].sort()),
  })));
  const charge = candidates.length === 0 ? "unknown" as const
    : candidates.length === 1 ? "held" as const
      : "contested" as const;
  const reasons = Object.freeze(charge === "unknown"
    ? ["the observed tree carries no unambiguous context/layer nesting convention"]
    : charge === "held"
      ? [`every observed context/layer nesting witness uses ${candidates[0]}`]
      : [`the observed tree carries incompatible nesting conventions: ${candidates.join(", ")}`]);
  const material = Object.freeze({
    kind: "metroplat.monitoring.source-code.layout-convention" as const,
    charge,
    ...(charge === "held" ? { convention: candidates[0]! } : {}),
    candidates,
    observations,
    reasons,
  });
  return Object.freeze({ ...material, identity: contentAddress(material) }) as NodePackageLayoutConventionReading;
}

/** One graph color for one proposed carrier: subject × layer × host region. */
function placementColorOf(symbol: PlacedSymbol): string {
  return [
    symbol.placement.packageRegion,
    symbol.placement.context ?? `_${symbol.placement.contextStatus}`,
    symbol.placement.layer,
  ].join("|");
}

/**
 * FOUR-valued metry over every formulaic Node species in the observed tree.
 * Counts are derived from each being's content-addressed FCA formula rather
 * than from its current path or the single primary placement projection.
 */
function speciesCensusOf(symbols: readonly ModuleTopologySymbol[]): readonly ModuleTopologySpeciesCensusEntry[] {
  const count = (taxon: string, charge: "held" | "denied" | "contested" | "unknown"): number =>
    symbols.filter((symbol) => symbol.being.formula[charge].includes(taxon as never)).length;
  return Object.freeze(nodeBeingTaxa.map((taxon) => Object.freeze({
    taxon: taxon.name,
    taxonIdentity: taxon.identity,
    layer: taxon.layer,
    held: count(taxon.name, "held"),
    denied: count(taxon.name, "denied"),
    contested: count(taxon.name, "contested"),
    unknown: count(taxon.name, "unknown"),
  })));
}

/** Every maximal runtime-import component whose members mutually depend on one
 * another. Unlike the causal-order obstruction, this reports the complete
 * dependency knot rather than selecting one representative cycle witness. */
function directedCyclicComponents(
  modules: readonly Readonly<{ path: string; imports: readonly string[] }>[],
): readonly (readonly string[])[] {
  const paths = new Set(modules.map((module) => module.path));
  const edges = new Map(modules.map((module) => [
    module.path,
    Object.freeze(module.imports.filter((target) => paths.has(target)).sort()),
  ]));
  const indexByPath = new Map<string, number>();
  const lowlinkByPath = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  const connect = (modulePath: string): void => {
    const index = nextIndex;
    nextIndex += 1;
    indexByPath.set(modulePath, index);
    lowlinkByPath.set(modulePath, index);
    stack.push(modulePath);
    onStack.add(modulePath);
    for (const target of edges.get(modulePath) ?? []) {
      if (!indexByPath.has(target)) {
        connect(target);
        lowlinkByPath.set(modulePath, Math.min(lowlinkByPath.get(modulePath)!, lowlinkByPath.get(target)!));
      } else if (onStack.has(target)) {
        lowlinkByPath.set(modulePath, Math.min(lowlinkByPath.get(modulePath)!, indexByPath.get(target)!));
      }
    }
    if (lowlinkByPath.get(modulePath) !== indexByPath.get(modulePath)) return;
    const component: string[] = [];
    let member: string;
    do {
      member = stack.pop()!;
      onStack.delete(member);
      component.push(member);
    } while (member !== modulePath);
    component.sort();
    if (component.length > 1 || (edges.get(modulePath) ?? []).includes(modulePath)) components.push(component);
  };

  for (const modulePath of [...paths].sort()) if (!indexByPath.has(modulePath)) connect(modulePath);
  return Object.freeze(components
    .sort((left, right) => left[0]!.localeCompare(right[0]!))
    .map((component) => Object.freeze(component)));
}

/** Read one package's own source-tree scale and import dependency graph from the TypeScript AST. */
export function readModuleTopology(root: string, options: ModuleTopologyReadOptions = {}): ModuleTopologyRead {
  const rootAbs = path.resolve(root);
  const sourceDirs = options.sourceDirs ?? DEFAULT_SOURCE_DIRECTORIES;
  const maxFiles = options.maxFiles ?? DEFAULT_SOURCE_FILE_LIMIT;
  return moduleTopologyOfCorpus(readSourceModuleCorpus(rootAbs, sourceDirs, maxFiles), {
    ...(options.subjectAnchors === undefined ? {} : { subjectAnchors: options.subjectAnchors }),
    ...(options.subjectAnchorCoverage === undefined ? {} : { subjectAnchorCoverage: options.subjectAnchorCoverage }),
  });
}

/** Read topology from one already-admitted corpus without repeating filesystem I/O. */
export function moduleTopologyOfCorpus(
  corpus: SourceModuleCorpus,
  options: Readonly<{
    readonly subjectAnchors?: readonly NodeSubjectAnchor[] | undefined;
    readonly subjectAnchorCoverage?: NodeSubjectAnchorCoverage | undefined;
  }> = {},
): ModuleTopologyRead {
  const rootAbs = corpus.root;
  const program = sourceModuleProgram(corpus);
  const cohesionByPath = new Map(moduleCohesionOfCorpus(corpus, { minSymbols: 1 }).modules
    .map((moduleEntry) => [moduleEntry.path, moduleEntry.components] as const));
  const anchorByIdentity = new Map<string, NodeSubjectAnchor>();
  for (const anchor of sourceSubjectAnchors(corpus, program)) anchorByIdentity.set(anchor.identity, anchor);
  for (const candidate of options.subjectAnchors ?? []) {
    const anchor = readNodeSubjectAnchor(candidate);
    anchorByIdentity.set(anchor.identity, anchor);
  }
  const subjectAnchors = Object.freeze([...anchorByIdentity.values()].sort((left, right) => left.identity.localeCompare(right.identity)));
  const subjectAnchorIdentities = Object.freeze(subjectAnchors.map((anchor) => anchor.identity));
  const subjectAnchorCoverage = options.subjectAnchorCoverage ?? "partial";
  const anchoredSubjectsByDeclaration = new Map<string, Set<string>>();
  for (const anchor of subjectAnchors) {
    for (const declaration of anchor.declarations) {
      const subjects = anchoredSubjectsByDeclaration.get(declaration) ?? new Set<string>();
      subjects.add(anchor.subject);
      anchoredSubjectsByDeclaration.set(declaration, subjects);
    }
  }
  const layoutConvention = layoutConventionReading(rootAbs, corpus.files);
  const checker = program.getTypeChecker();
  const modulesWithoutConsumers: Omit<ModuleTopologyModule, "importedBy" | "typeImportedBy">[] = [];
  let totalLoc = 0;
  let totalSloc = 0;
  let totalFunctions = 0;
  let totalClasses = 0;

  for (const file of corpus.files) {
    const source = sourceModuleSyntax(program, file);
    const topology = readFileTopology(
      source,
      file.absolutePath.split(path.sep).join("/"),
      checker,
      rootAbs,
      subjectAnchors,
      subjectAnchorCoverage,
    );
    const symbols = Object.freeze(topology.symbols.map((symbol) => Object.freeze({
      ...symbol,
      dependsOnModules: Object.freeze(symbol.dependsOnModules.map(
        (ref) => path.isAbsolute(ref) ? sourceModuleRelativePath(rootAbs, ref) : ref,
      )),
      dependsOnImportedSymbols: Object.freeze(symbol.dependsOnImportedSymbols.map((ref) => {
        const separator = ref.lastIndexOf("#");
        const module = separator < 0 ? ref : ref.slice(0, separator);
        const name = separator < 0 ? "" : ref.slice(separator + 1);
        const normalized = path.isAbsolute(module) ? sourceModuleRelativePath(rootAbs, module) : module;
        return name.length === 0 ? normalized : `${normalized}#${name}`;
      })),
    })));
    totalLoc += topology.loc;
    totalSloc += topology.sloc;
    totalFunctions += topology.functions;
    totalClasses += topology.classes;
    const symbolClusters = cohesionByPath.get(file.path) ?? Object.freeze([]);
    const placedSymbols = symbols.filter(hasPlacementWitness);
    const subjectAnchorCounts = symbols.map((symbol) =>
      anchoredSubjectsByDeclaration.get(`${file.path}#${symbol.name}`)?.size ?? 0);
    const placementColors = Object.freeze([...new Set(placedSymbols.map(placementColorOf))].sort());
    modulesWithoutConsumers.push(Object.freeze({
      path: file.path,
      ...(topology.summary === undefined ? {} : { summary: topology.summary }),
      identity: file.identity,
      loc: topology.loc,
      sloc: topology.sloc,
      functions: topology.functions,
      classes: topology.classes,
      imports: Object.freeze(topology.imports.map((abs) => sourceModuleRelativePath(rootAbs, abs))),
      typeImports: Object.freeze(topology.typeImports.map((abs) => sourceModuleRelativePath(rootAbs, abs))),
      externalImports: topology.externalImports,
      externalTypeImports: topology.externalTypeImports,
      reexports: Object.freeze(topology.reexports.map((reexport) => Object.freeze({
        ...reexport,
        module: path.isAbsolute(reexport.module)
          ? sourceModuleRelativePath(rootAbs, reexport.module)
          : reexport.module,
      }))),
      symbols,
      symbolClusters,
      subjectAnchoredSymbols: subjectAnchorCounts.filter((count) => count > 0).length,
      subjectUnanchoredSymbols: subjectAnchorCounts.filter((count) => count === 0).length,
      multiplySubjectAnchoredSymbols: subjectAnchorCounts.filter((count) => count > 1).length,
      placementObstructions: symbols.length - placedSymbols.length,
      placementLayers: Object.freeze([...new Set(placedSymbols.map((symbol) => symbol.placement.layer))].sort()),
      placementContexts: Object.freeze([...new Set(symbols.flatMap((symbol) => symbol.placement.context === undefined ? [] : [symbol.placement.context]))].sort()),
      placementColors,
      carrierChromaticNumber: placementColors.length,
      mixedPlacement: placementColors.length > 1,
    }));
  }

  const runtimeConsumers = new Map<string, string[]>();
  const typeConsumers = new Map<string, string[]>();
  const symbolConsumers = new Map<string, string[]>();
  for (const moduleEntry of modulesWithoutConsumers) {
    for (const target of moduleEntry.imports) {
      const consumers = runtimeConsumers.get(target) ?? [];
      consumers.push(moduleEntry.path);
      runtimeConsumers.set(target, consumers);
    }
    for (const target of moduleEntry.typeImports) {
      const consumers = typeConsumers.get(target) ?? [];
      consumers.push(moduleEntry.path);
      typeConsumers.set(target, consumers);
    }
    for (const symbol of moduleEntry.symbols) {
      for (const target of symbol.dependsOnImportedSymbols) {
        const consumers = symbolConsumers.get(target) ?? [];
        consumers.push(`${moduleEntry.path}#${symbol.name}`);
        symbolConsumers.set(target, consumers);
      }
    }
  }
  const modules: ModuleTopologyModule[] = modulesWithoutConsumers.map((moduleEntry) => Object.freeze({
    ...moduleEntry,
    symbols: Object.freeze(moduleEntry.symbols.map((symbol) => Object.freeze({
      ...symbol,
      referencedBySymbols: Object.freeze([...(symbolConsumers.get(`${moduleEntry.path}#${symbol.name}`) ?? [])].sort()),
    }))),
    importedBy: Object.freeze([...(runtimeConsumers.get(moduleEntry.path) ?? [])].sort()),
    typeImportedBy: Object.freeze([...(typeConsumers.get(moduleEntry.path) ?? [])].sort()),
  }));

  const modulesWithDisconnectedSymbolClusters = modules.filter((moduleEntry) => moduleEntry.symbolClusters.length > 1).length;
  const maxSymbolClusters = modules.reduce((max, moduleEntry) => Math.max(max, moduleEntry.symbolClusters.length), 0);
  const cyclicComponents = directedCyclicComponents(modules);
  const allSymbols = modules.flatMap((moduleEntry) => moduleEntry.symbols);
  const symbols = allSymbols.length;
  const subjectAnchoredSymbols = modules.reduce((total, moduleEntry) => total + moduleEntry.subjectAnchoredSymbols, 0);
  const subjectUnanchoredSymbols = modules.reduce((total, moduleEntry) => total + moduleEntry.subjectUnanchoredSymbols, 0);
  const multiplySubjectAnchoredSymbols = modules.reduce((total, moduleEntry) => total + moduleEntry.multiplySubjectAnchoredSymbols, 0);
  const speciesContext = nodeBeingFormalContext(allSymbols.map((symbol) => symbol.being.formula as NodeBeingSpeciesFormula));
  const speciesConcepts = readNodeBeingSpeciesConcepts(speciesContext);
  const speciesCensus = speciesCensusOf(allSymbols);
  const speciesFormulas = speciesContext.formulas.length;
  const placementObstructions = allSymbols.filter((symbol) =>
    symbol.placement.kind === "metroplat.monitoring.source-code.placement:obstruction").length;
  const ambiguousPlacements = allSymbols.filter((symbol) => symbol.placement.ambiguous).length;
  const layerMismatches = allSymbols.filter((symbol) =>
    hasPlacementWitness(symbol) && symbol.placement.layerMatches === false).length;
  const contextMismatches = allSymbols.filter((symbol) => symbol.placement.contextMatches === false).length;
  const mixedPlacementModules = modules.filter((moduleEntry) => moduleEntry.mixedPlacement).length;
  const multicoloredCarriers = modules.filter((moduleEntry) => moduleEntry.carrierChromaticNumber > 1).length;
  const maxCarrierChromaticNumber = modules.reduce((maximum, moduleEntry) => Math.max(maximum, moduleEntry.carrierChromaticNumber), 0);
  const crossCuttingContexts = allSymbols.filter((symbol) => symbol.placement.contextStatus === "cross-cutting").length;
  const unresolvedContexts = allSymbols.filter((symbol) =>
    symbol.placement.contextStatus === "unknown" || symbol.placement.contextStatus === "contested").length;
  const observation = contentAddress(Object.freeze({
    source: corpus.source,
    subjectAnchors: subjectAnchorIdentities,
    subjectAnchorCoverage,
    layoutConvention,
    modules: Object.freeze(modules.map((moduleEntry) => contentAddress(moduleEntry))),
    loc: totalLoc,
    sloc: totalSloc,
    functions: totalFunctions,
    classes: totalClasses,
    modulesWithDisconnectedSymbolClusters,
    maxSymbolClusters,
    cyclicComponents,
    symbols,
    subjectAnchoredSymbols,
    subjectUnanchoredSymbols,
    multiplySubjectAnchoredSymbols,
    speciesContext,
    speciesConcepts,
    speciesCensus,
    speciesFormulas,
    placementObstructions,
    ambiguousPlacements,
    layerMismatches,
    contextMismatches,
    mixedPlacementModules,
    multicoloredCarriers,
    maxCarrierChromaticNumber,
    crossCuttingContexts,
    unresolvedContexts,
  }));
  return moduleTopologyReadSchemaContract.assert(Object.freeze({
    kind: "metroplat.module-topology.read" as const,
    operation: "read-module-topology" as const,
    source: corpus.source,
    observation,
    root: rootAbs,
    sourceDirs: corpus.sourceDirs,
    subjectAnchors,
    subjectAnchorCoverage,
    layoutConvention,
    files: modules.length,
    ...(corpus.truncated ? { truncated: true } : {}),
    loc: totalLoc,
    sloc: totalSloc,
    functions: totalFunctions,
    classes: totalClasses,
    modules: Object.freeze(modules),
    modulesWithDisconnectedSymbolClusters,
    maxSymbolClusters,
    cyclicComponents,
    symbols,
    subjectAnchoredSymbols,
    subjectUnanchoredSymbols,
    multiplySubjectAnchoredSymbols,
    speciesContext,
    speciesConcepts,
    speciesCensus,
    speciesFormulas,
    placementObstructions,
    ambiguousPlacements,
    layerMismatches,
    contextMismatches,
    mixedPlacementModules,
    multicoloredCarriers,
    maxCarrierChromaticNumber,
    crossCuttingContexts,
    unresolvedContexts,
  }), "Module topology read") as ModuleTopologyRead;
}

export interface ModuleTopologyPageOptions {
  readonly offset?: number;
  readonly limit?: number;
  readonly includeSymbols?: boolean;
  readonly paths?: readonly string[];
}

function requestedTopologyPathMatches(modulePath: string, requestedPath: string): boolean {
  const prefix = requestedPath.endsWith("/") ? requestedPath : `${requestedPath}/`;
  return modulePath === requestedPath || modulePath.startsWith(prefix);
}

/** Project a complete topology observation into a deterministic bounded RPC page. */
export function moduleTopologyPage(
  read: ModuleTopologyRead,
  options: ModuleTopologyPageOptions = {},
): ModuleTopologyPage {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 25;
  if (!Number.isInteger(offset) || offset < 0) throw new TypeError("module topology offset must be a nonnegative integer");
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new TypeError("module topology limit must be an integer from 1 through 50");
  const includeSymbols = options.includeSymbols === true;
  const paths = options.paths === undefined ? undefined : Object.freeze([...new Set(options.paths)].sort());
  const selectedSet = paths === undefined
    ? read.modules
    : read.modules.filter((moduleEntry) => paths.some((requestedPath) =>
      requestedTopologyPathMatches(moduleEntry.path, requestedPath)));
  const selected = selectedSet.slice(offset, offset + limit);
  const modules = Object.freeze(selected.map((moduleEntry) => Object.freeze({
    path: moduleEntry.path,
    ...(moduleEntry.summary === undefined ? {} : { summary: moduleEntry.summary }),
    identity: moduleEntry.identity,
    loc: moduleEntry.loc,
    sloc: moduleEntry.sloc,
    functions: moduleEntry.functions,
    classes: moduleEntry.classes,
    imports: moduleEntry.imports,
    typeImports: moduleEntry.typeImports,
    importedBy: moduleEntry.importedBy,
    typeImportedBy: moduleEntry.typeImportedBy,
    externalImports: moduleEntry.externalImports,
    externalTypeImports: moduleEntry.externalTypeImports,
    reexports: moduleEntry.reexports,
    symbolCount: moduleEntry.symbols.length,
    symbolClusterCount: moduleEntry.symbolClusters.length,
    subjectAnchoredSymbols: moduleEntry.subjectAnchoredSymbols,
    subjectUnanchoredSymbols: moduleEntry.subjectUnanchoredSymbols,
    multiplySubjectAnchoredSymbols: moduleEntry.multiplySubjectAnchoredSymbols,
    placementObstructions: moduleEntry.placementObstructions,
    placementLayers: moduleEntry.placementLayers,
    placementContexts: moduleEntry.placementContexts,
    placementColors: moduleEntry.placementColors,
    carrierChromaticNumber: moduleEntry.carrierChromaticNumber,
    mixedPlacement: moduleEntry.mixedPlacement,
    ...(includeSymbols ? {
      symbols: Object.freeze(moduleEntry.symbols.map((symbol) => Object.freeze({
        ...symbol,
        documentation: projectNodeBeingDocumentation({
          declaration: nodeDeclarationReference(moduleEntry.path, symbol.name),
          declarationKind: symbol.kind,
          exported: symbol.exported,
          ...(symbol.summary === undefined ? {} : { sourceSummary: symbol.summary }),
          being: symbol.being,
        }),
      }))),
      symbolClusters: moduleEntry.symbolClusters,
    } : {}),
  })));
  const nextOffset = offset + modules.length < selectedSet.length ? offset + modules.length : undefined;
  return moduleTopologyPageContract.assert(Object.freeze({
    kind: "metroplat.monitoring.source-code.module-topology" as const,
    operation: "read-module-topology" as const,
    source: read.source,
    observation: read.observation,
    root: read.root,
    sourceDirs: read.sourceDirs,
    subjectAnchors: read.subjectAnchors,
    subjectAnchorCoverage: read.subjectAnchorCoverage,
    layoutConvention: read.layoutConvention,
    files: read.files,
    ...(read.truncated === true ? { truncated: true } : {}),
    loc: read.loc,
    sloc: read.sloc,
    functions: read.functions,
    classes: read.classes,
    modulesWithDisconnectedSymbolClusters: read.modulesWithDisconnectedSymbolClusters,
    maxSymbolClusters: read.maxSymbolClusters,
    cyclicComponents: read.cyclicComponents,
    symbols: read.symbols,
    subjectAnchoredSymbols: read.subjectAnchoredSymbols,
    subjectUnanchoredSymbols: read.subjectUnanchoredSymbols,
    multiplySubjectAnchoredSymbols: read.multiplySubjectAnchoredSymbols,
    speciesContext: read.speciesContext,
    speciesConcepts: read.speciesConcepts,
    speciesCensus: read.speciesCensus,
    speciesFormulas: read.speciesFormulas,
    placementObstructions: read.placementObstructions,
    ambiguousPlacements: read.ambiguousPlacements,
    layerMismatches: read.layerMismatches,
    contextMismatches: read.contextMismatches,
    mixedPlacementModules: read.mixedPlacementModules,
    multicoloredCarriers: read.multicoloredCarriers,
    maxCarrierChromaticNumber: read.maxCarrierChromaticNumber,
    crossCuttingContexts: read.crossCuttingContexts,
    unresolvedContexts: read.unresolvedContexts,
    totalModules: read.modules.length,
    ...(paths === undefined ? {} : { paths, matchedModules: selectedSet.length }),
    offset,
    limit,
    returned: modules.length,
    ...(nextOffset === undefined ? {} : { nextOffset }),
    includeSymbols,
    modules,
  }), "Module topology page") as ModuleTopologyPage;
}

/** One exported symbol matching a capability search, with the file it lives in. */
export interface ModuleTopologySymbolHit {
  readonly path: string;
  readonly name: string;
  readonly kind: ModuleTopologySymbol["kind"];
  readonly line: number;
  readonly exported: boolean;
  readonly summary?: string;
}

/**
 * Search a module-topology read for exported symbols whose name or doc
 * summary mentions a term — "does this codebase already have X" as a real
 * query over the AST-derived index, not a guess from directory names.
 * Answer this before writing a function that might already exist.
 */
export function searchModuleTopologySymbols(read: ModuleTopologyRead, query: string): readonly ModuleTopologySymbolHit[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return Object.freeze([]);
  const hits: ModuleTopologySymbolHit[] = [];
  for (const moduleEntry of read.modules) {
    for (const symbol of moduleEntry.symbols) {
      const haystack = `${symbol.name} ${symbol.summary ?? ""}`.toLowerCase();
      if (haystack.includes(needle)) {
        hits.push(Object.freeze({
          path: moduleEntry.path,
          name: symbol.name,
          kind: symbol.kind,
          line: symbol.line,
          exported: symbol.exported,
          ...(symbol.summary === undefined ? {} : { summary: symbol.summary }),
        }));
      }
    }
  }
  return Object.freeze(hits);
}

/**
 * Project the canonical module-cohesion partition carried by this topology
 * readout. Cohesion owns the persistent-H0 filtration over declaration
 * references and consumer co-import evidence; topology does not calculate a
 * second connectivity graph.
 */
export function symbolClustersOf(moduleEntry: ModuleTopologyModule): readonly (readonly string[])[] {
  return moduleEntry.symbolClusters;
}
