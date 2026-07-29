export type CensusEntry = Readonly<{ path: string; content: string }>;
export type CensusKind = "schema-document" | "schema-implementation" | "legacy-schema-document" | "legacy-implementation" | "other";
export type LegacyDisposition = "retain-as-evidence" | "retain-as-compatibility-input" | "supersede-with-explicit-migration" | "out-of-scope";
export type Census = Readonly<{ entries: readonly Readonly<{ path: string; kind: CensusKind; dialect: string | null; legacyDisposition: LegacyDisposition | null }>[]; counts: Readonly<Record<CensusKind, number>> }>;

/** Classify evidence only; legacy artifacts are retained as evidence, never promoted or deleted. */
export function classifyCensusEntry(entry: CensusEntry): Readonly<{ path: string; kind: CensusKind; dialect: string | null; legacyDisposition: LegacyDisposition | null }> {
  const archived = /(?:^|\/)(?:legacy|_archive|archive)(?:\/|$)/.test(entry.path);
  const schema = entry.path.endsWith(".schema.json");
  const implementation = /(?:read-a-schema|write-a-schema|json-schema|schema\.mts|registry\.mts)/.test(entry.path) && /\.(?:[cm]?js|[cm]?ts)$/.test(entry.path);
  const dialect = /"\$schema"\s*:\s*"([^"]+)"/.exec(entry.content)?.[1] ?? null;
  const kind: CensusKind = schema ? (archived ? "legacy-schema-document" : "schema-document") : implementation ? (archived ? "legacy-implementation" : "schema-implementation") : "other";
  const legacyDisposition: LegacyDisposition | null = kind === "legacy-schema-document" || kind === "legacy-implementation" ? "retain-as-evidence" : null;
  return Object.freeze({ path: entry.path, kind, dialect, legacyDisposition });
}
export function census(entries: readonly CensusEntry[]): Census { const counts: Record<CensusKind, number> = { "schema-document": 0, "schema-implementation": 0, "legacy-schema-document": 0, "legacy-implementation": 0, other: 0 }; const classified = entries.map(classifyCensusEntry).sort((a, b) => a.path.localeCompare(b.path)); for (const entry of classified) counts[entry.kind] += 1; return Object.freeze({ entries: Object.freeze(classified), counts: Object.freeze(counts) }); }
