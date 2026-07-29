/**
 * references — the call-site half of cross-package usage.
 *
 * imports.mts reads *which* symbols a file pulls in from a provider; this reads
 * *where they are used*: for each named import from a given provider, the local
 * binding it introduces, and the top-level declarations of the consumer file
 * that reference that binding. Joined with the import read it answers "package A
 * imports `foo` from package B — and `foo` is used in these functions of A".
 *
 * Purely syntactic, per-file (`ts.createSourceFile`, no type resolution), like
 * imports.mts — cheap enough for a workspace sweep. It is therefore an
 * *over-approximation*: a local shadowing the binding's name, or a property
 * access that happens to share the name, can read as a use. The fail-safe
 * direction for a "what relates these?" view (better to show a candidate site
 * than to hide a real one); never cite it as type-resolved precision.
 */
import ts from "typescript";

/** A named/default import resolved to its local binding in one file. */
export interface NamedImportBinding {
  /** The name as the provider exports it (`a` in `import { a as b }`). */
  readonly providerName: string;
  /** The local identifier this file binds it to (`b` in `import { a as b }`). */
  readonly local: string;
  readonly typeOnly: boolean;
}

const specifierText = (node: ts.Expression | undefined): string | undefined =>
  node && ts.isStringLiteralLike(node) ? node.text : undefined;

/** Collect a file's named/default imports whose module specifier satisfies
 *  `fromProvider`, each paired with the local name it binds. Namespace and
 *  star-reexport forms name no symbol and are excluded (they are coarse reaches,
 *  handled by the import read). */
export function namedImportsFrom(
  source: ts.SourceFile,
  fromProvider: (specifier: string) => boolean,
): NamedImportBinding[] {
  const out: NamedImportBinding[] = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const specifier = specifierText(statement.moduleSpecifier);
    if (specifier === undefined || !fromProvider(specifier)) continue;
    const clause = statement.importClause;
    if (!clause) continue;
    const clauseTypeOnly = clause.isTypeOnly;
    if (clause.name) out.push({ providerName: "default", local: clause.name.text, typeOnly: clauseTypeOnly });
    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        out.push({
          providerName: (element.propertyName ?? element.name).text,
          local: element.name.text,
          typeOnly: clauseTypeOnly || element.isTypeOnly,
        });
      }
    }
  }
  return out;
}

// The name of a top-level statement, for attributing a reference to its
// enclosing declaration. A variable statement may declare several names.
function declarationNames(statement: ts.Statement): string[] {
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return statement.name ? [statement.name.text] : ["(anonymous)"];
  }
  if (ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEnumDeclaration(statement)) {
    return [statement.name.text];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .map((declaration) => (ts.isIdentifier(declaration.name) ? declaration.name.text : undefined))
      .filter((name): name is string => name !== undefined);
  }
  return ["(module)"];
}

// Whether an identifier node is a *reference* to a binding rather than a property
// name. `obj.foo` — the `foo` is a property, not our local `foo`. Shorthand and
// bare identifiers are references.
function isReference(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent && ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if (parent && ts.isQualifiedName(parent) && parent.right === node) return false;
  return true;
}

/** For each local name, the set of enclosing top-level declarations that
 *  reference it. Import statements are skipped (the binding site is not a use). */
export function enclosingReferences(source: ts.SourceFile, locals: ReadonlySet<string>): Map<string, Set<string>> {
  const usedIn = new Map<string, Set<string>>();
  const record = (local: string, decl: string): void => {
    let set = usedIn.get(local);
    if (!set) usedIn.set(local, (set = new Set()));
    set.add(decl);
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) continue;
    const names = declarationNames(statement);
    const seen = new Set<string>();
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && locals.has(node.text) && isReference(node)) seen.add(node.text);
      node.forEachChild(visit);
    };
    visit(statement);
    for (const local of seen) for (const name of names) record(local, name);
  }
  return usedIn;
}
