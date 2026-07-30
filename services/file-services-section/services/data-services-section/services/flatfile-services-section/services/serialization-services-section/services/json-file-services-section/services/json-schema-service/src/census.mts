export type CensusEntry = Readonly<{ path: string; content: string }>;
export type CensusKind = "schema-document" | "schema-implementation" | "legacy-schema-document" | "legacy-implementation" | "other";
export type LegacyDisposition = "retain-as-evidence" | "retain-as-compatibility-input" | "supersede-with-explicit-migration" | "out-of-scope";
export type ArtifactRole = "schema-document" | "implementation" | "schema-declaration" | "consumer" | "test" | "documentation" | "package" | "other";
export type RecoveryDisposition = LegacyDisposition | "canonical-owner" | "retain-distinct-authority" | "consumer-of-canonical-owner" | "live-schema-law" | "test-evidence" | "documentation-evidence";
export type SchemaCapability = "authoring" | "canonicalization" | "census" | "reference-resolution" | "schema-assertion-trace" | "third-party-validation" | "validation";

export type ClassifiedCensusEntry = Readonly<{
  path: string;
  kind: CensusKind;
  role: ArtifactRole;
  generation: string;
  dialect: string | null;
  capabilities: readonly SchemaCapability[];
  recoveryDisposition: RecoveryDisposition | null;
  legacyDisposition: LegacyDisposition | null;
}>;

export type Census = Readonly<{
  entries: readonly ClassifiedCensusEntry[];
  counts: Readonly<Record<CensusKind, number>>;
  roleCounts: Readonly<Record<ArtifactRole, number>>;
}>;

const code = /\.(?:[cm]?[jt]s)$/u;
const documentation = /\.(?:md|rml|txt)$/u;
const archivedPath = /(?:^|\/)(?:legacy|_archive|archive|retired-carriers|content\/assets\/legacy)(?:\/|$)/u;
const schemaWords = /(?:JSON Schema|json-schema|read-a-schema|write-a-schema|\.schema\.json|\$schema|SchemaAssertion|schemaCorpus)/iu;
const implementationWords = /(?:export\s+function\s+(?:validateInstance|createSchema|schemaCorpus|resolveJsonPointer|resolvePointer|projectSchemaAssertions|cohereSchemaAssertions|unfoldSchema|foldSchema|schemaRegistry)|function\s+(?:validate|schemaErrors)\s*\([^)]*schema|classifyCensusEntry\s*\()/u;

function generation(path: string): string {
  const dated = /content\/assets\/legacy\/([^/]+)/u.exec(path)?.[1];
  if (dated) return dated;
  if (path.includes("/lib/legacy/metroplat/")) return "metroplat";
  if (path.includes("/relating-experimental/")) return "relating-experimental";
  if (path.includes("/services/relating/")) return "relating";
  if (path.includes("/executive-office/")) return "executive-office";
  if (path.includes("/json-schema-service/")) return "json-schema-service";
  return "current";
}

function capabilities(content: string): SchemaCapability[] {
  const found: SchemaCapability[] = [];
  const add = (capability: SchemaCapability, pattern: RegExp): void => { if (pattern.test(content)) found.push(capability); };
  add("authoring", /(?:createSchema|write-a-schema|schemaErrors)/u);
  add("canonicalization", /(?:canonicalJson|canonicalBytes|canonical\()/u);
  add("census", /(?:json-schema-census|classifyCensusEntry)/u);
  add("reference-resolution", /(?:resolveJsonPointer|resolvePointer|schemaCorpus|schemaRegistry|\$ref)/u);
  add("schema-assertion-trace", /(?:SchemaAssertion|projectSchemaAssertions|unfoldSchema|cohereSchemaAssertions)/u);
  add("third-party-validation", /(?:new\s+Ajv|Ajv2020|zodToJsonSchema)/u);
  add("validation", /(?:validateInstance|function\s+validate\s*\([^)]*schema)/u);
  return found.sort();
}

function role(entry: CensusEntry, found: readonly SchemaCapability[]): ArtifactRole {
  const { path, content } = entry;
  if (path.endsWith(".schema.json")) return "schema-document";
  if (/(?:^|\/)test(?:\/|$)|\.test\.[cm]?[jt]s$/u.test(path) && schemaWords.test(content)) return "test";
  if (documentation.test(path) && schemaWords.test(content)) return "documentation";
  if (path.endsWith("package.json") && schemaWords.test(content)) return "package";
  if (code.test(path) && implementationWords.test(content)) return "implementation";
  if (code.test(path) && /(?:new\s+Ajv|Ajv2020|zodToJsonSchema)/u.test(content)) return "consumer";
  if (code.test(path) && schemaWords.test(content)) {
    if (/(?:^|\/)schema\.[cm]?[jt]s$/u.test(path) && found.length === 0) return "schema-declaration";
    return "consumer";
  }
  return "other";
}

function disposition(path: string, artifactRole: ArtifactRole, archived: boolean): RecoveryDisposition | null {
  if (archived) {
    if (artifactRole === "implementation") return "supersede-with-explicit-migration";
    if (artifactRole === "schema-document" || artifactRole === "schema-declaration" || artifactRole === "test" || artifactRole === "documentation") return "retain-as-evidence";
    return "out-of-scope";
  }
  if (path.includes("/json-schema-service/") && artifactRole === "implementation") return "canonical-owner";
  if (artifactRole === "implementation") return "retain-distinct-authority";
  if (artifactRole === "consumer") return "consumer-of-canonical-owner";
  if (artifactRole === "schema-document" || artifactRole === "schema-declaration") return "live-schema-law";
  if (artifactRole === "test") return "test-evidence";
  if (artifactRole === "documentation") return "documentation-evidence";
  return null;
}

/** Classify implementation, consumer, declaration, test, and documentary generations without promoting an archive. */
export function classifyCensusEntry(entry: CensusEntry): ClassifiedCensusEntry {
  const archived = archivedPath.test(entry.path);
  const found = capabilities(entry.content);
  const artifactRole = role(entry, found);
  const schemaDocument = artifactRole === "schema-document";
  const implementation = artifactRole === "implementation";
  const kind: CensusKind = schemaDocument
    ? (archived ? "legacy-schema-document" : "schema-document")
    : implementation
      ? (archived ? "legacy-implementation" : "schema-implementation")
      : "other";
  const recoveryDisposition = disposition(entry.path, artifactRole, archived);
  const legacyDisposition: LegacyDisposition | null = archived
    ? recoveryDisposition as LegacyDisposition
    : null;
  return Object.freeze({
    path: entry.path,
    kind,
    role: artifactRole,
    generation: generation(entry.path),
    dialect: /["']\$schema["']\s*:\s*["']([^"']+)["']/u.exec(entry.content)?.[1] ?? null,
    capabilities: Object.freeze(found),
    recoveryDisposition,
    legacyDisposition,
  });
}

export function census(entries: readonly CensusEntry[]): Census {
  return censusClassified(entries.map(classifyCensusEntry));
}

/** Count already-classified entries so filesystem census need not retain source bodies. */
export function censusClassified(entries: readonly ClassifiedCensusEntry[]): Census {
  const counts: Record<CensusKind, number> = { "schema-document": 0, "schema-implementation": 0, "legacy-schema-document": 0, "legacy-implementation": 0, other: 0 };
  const roleCounts: Record<ArtifactRole, number> = { "schema-document": 0, implementation: 0, "schema-declaration": 0, consumer: 0, test: 0, documentation: 0, package: 0, other: 0 };
  const classified = [...entries].sort((left, right) => left.path.localeCompare(right.path));
  for (const entry of classified) { counts[entry.kind] += 1; roleCounts[entry.role] += 1; }
  return Object.freeze({ entries: Object.freeze(classified), counts: Object.freeze(counts), roleCounts: Object.freeze(roleCounts) });
}
