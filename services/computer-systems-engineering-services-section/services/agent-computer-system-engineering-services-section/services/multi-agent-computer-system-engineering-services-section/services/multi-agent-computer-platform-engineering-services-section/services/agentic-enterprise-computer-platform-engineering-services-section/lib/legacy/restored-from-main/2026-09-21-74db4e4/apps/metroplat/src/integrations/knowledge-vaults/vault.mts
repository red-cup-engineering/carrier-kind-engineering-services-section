/**
 * Pure vault computations for markdown-backed knowledge vaults.
 *
 * Filesystem service modules pass file contents in; this module performs the
 * reusable note projection, vault ingestion, and vault query reads over that
 * material. Projectors and services share these functions so a vault is read
 * the same way whether it arrived as a directory manifest or a direct
 * filesystem request.
 */
import { createMarkdown, markdownDataform, parseMarkdown } from "../../presentation/markdown.mts";
import { canonicalBytes } from "../../lib/identity/index.mts";
import {
  citedReferenceIds,
  decodeReferencesValue,
  internalReferenceTargets,
  referencesFrontmatterValue,
  referencesOfFrontmatter,
} from "../../lib/codecs/csl/index.mts";
import { type JsonRecord, type JsonValue } from "../../../../../../../../../../../../../../computer-data-engineering-services-section/services/serialized-computer-data-engineering-services-section/services/json-services-section/src/index.mjs";
import { mergeEavtLogs, type EAVTObject } from "../../lib/codecs/json/jsonl/eavt/index.mts";
import type { DigitalGardenGraph } from "../../sites/static-website/generator/digital-garden.mts";
import {
  vaultIngestionProfileContract,
  vaultNoteProjectionContract,
  vaultQueryResultContract,
  type VaultIngestionProfile,
  type VaultNoteProjection,
  type VaultNoteWriteRequest,
  type VaultQueryRequest,
  type VaultQueryResult,
  type VaultReadRequest,
} from "@red-cup-engineering/vault-note-schema/vault-note";
import { vaultLinkGraphMatter, vaultToContent, type VaultFiles } from "./wikilinks.mts";

export const MARKDOWN_FILE = /\.(?:md|markdown)$/iu;

export interface VaultNoteWriteMaterial {
  readonly text: string;
  readonly referenceCount: number;
  readonly referenceDialect: VaultNoteProjection["referenceDialect"];
}

export function vaultNoteProjectionOfMarkdown(args: {
  readonly vaultRoot: string;
  readonly notePath: string;
  readonly text: string;
}): VaultNoteProjection {
  const dataform = markdownDataform(args.text, { coordinate: args.notePath });
  const decodedReferences = referencesOfFrontmatter(dataform.frontmatter);
  const title = typeof dataform.frontmatter["title"] === "string" ? dataform.frontmatter["title"] : dataform.subject;
  return vaultNoteProjectionContract.assert({
    kind: "metroplat.knowledge-vault.note-projection" as const,
    vaultRoot: args.vaultRoot,
    notePath: args.notePath,
    title,
    format: dataform.format ?? "none",
    conformant: dataform.conformant,
    frontmatter: dataform.frontmatter,
    body: dataform.body,
    assertionCount: dataform.assertions.length,
    referenceDialect: decodedReferences.dialect,
    references: decodedReferences.items.map((item) => ({ ...item })),
    internalTargets: internalReferenceTargets(dataform.frontmatter).map((target) => ({ ...target })),
    citedReferenceIds: citedReferenceIds(dataform.body),
  }, "vault note projection") as VaultNoteProjection;
}

export function vaultNoteWriteMaterial(request: VaultNoteWriteRequest): VaultNoteWriteMaterial {
  const frontmatter: Record<string, JsonValue> = { ...(request.frontmatter as JsonRecord) };
  let decoded = decodeReferencesValue(frontmatter["references"]);
  if (request.normalizeReferences !== false && decoded.dialect !== "none") {
    frontmatter["references"] = referencesFrontmatterValue(decoded.items);
    decoded = Object.freeze({ dialect: "csl" as const, items: decoded.items });
  }
  return Object.freeze({
    text: createMarkdown({ ...frontmatter, body: request.body }, { semanticLineBreaks: true }),
    referenceCount: decoded.items.length,
    referenceDialect: decoded.dialect,
  });
}

function conformingVaultFiles(walked: Readonly<Record<string, string>>): {
  readonly files: VaultFiles;
  readonly nonConforming: readonly { readonly path: string; readonly error: string }[];
} {
  const files: Record<string, string> = {};
  const nonConforming: { path: string; error: string }[] = [];
  for (const [filePath, content] of Object.entries(walked)) {
    if (MARKDOWN_FILE.test(filePath)) {
      try {
        parseMarkdown(content);
      } catch (error) {
        nonConforming.push({ path: filePath, error: (error as Error).message });
        continue;
      }
    }
    files[filePath] = content;
  }
  return Object.freeze({
    files: Object.freeze(files),
    nonConforming: Object.freeze(nonConforming),
  });
}

/** Vault ingestion profile over an already-walked vault file map. */
export function vaultIngestionProfileOfFiles(
  vaultRoot: string,
  walked: Readonly<Record<string, string>>,
  contentPath?: string,
): VaultIngestionProfile {
  const { files, nonConforming } = conformingVaultFiles(walked);
  const ingestion = vaultToContent(files);
  const graph: DigitalGardenGraph = Object.freeze({
    kind: "metroplat.digital-garden.link-graph" as const,
    notes: ingestion.notes.map((note) => Object.freeze({ path: note.path, title: note.path, href: note.url })),
    links: ingestion.notes.flatMap((note) => note.links
      .filter((link) => link.path !== undefined)
      .map((link) => Object.freeze({ fromPath: note.path, toPath: link.path!, href: link.href, label: link.label }))),
    h1Rank: null,
    h1RankStatus: "measured:matter-topology-receipt" as const,
  });
  const matter = vaultLinkGraphMatter(graph);
  const links = ingestion.notes.reduce((count, note) => count + note.links.length, 0);
  const unresolvedLinks = ingestion.notes.reduce(
    (count, note) => count + note.links.filter((link) => link.unresolved === true).length,
    0,
  );
  return vaultIngestionProfileContract.assert({
    kind: "metroplat.knowledge-vault.ingestion-profile" as const,
    vaultRoot,
    ...(contentPath === undefined ? {} : { contentPath }),
    files: Object.keys(files).length,
    notes: ingestion.notes.length,
    articles: ingestion.articles.length,
    pages: ingestion.pages.length,
    links,
    unresolvedLinks,
    referenceItems: ingestion.notes.reduce((count, note) => count + note.references.length, 0),
    referencingNotes: ingestion.notes.filter((note) => note.references.length > 0).length,
    matter: JSON.parse(JSON.stringify(matter)) as Record<string, unknown>,
    notesIndex: ingestion.notes.map((note) => ({
      path: note.path,
      title: note.content.title,
      url: note.url,
      kind: note.kind,
      linkCount: note.links.length,
      unresolvedLinkCount: note.links.filter((link) => link.unresolved === true).length,
      referenceCount: note.references.length,
      referenceDialect: note.referenceDialect,
    })),
    nonConforming,
  }, "vault ingestion profile") as VaultIngestionProfile;
}

function matchesField(field: JsonValue, selector: string): boolean {
  return typeof field === "string" ? field === selector : canonicalBytes(field) === selector;
}

/** Query an already-walked vault as merged frontmatter EAVT plus body matches. */
export function vaultQueryResultOfFiles(
  request: VaultQueryRequest | VaultReadRequest,
  walked: Readonly<Record<string, string>>,
): VaultQueryResult {
  const logs: (readonly EAVTObject[])[] = [];
  const bodies: [string, string][] = [];
  const nonConforming: { path: string; error: string }[] = [];
  for (const [filePath, content] of Object.entries(walked)) {
    if (!MARKDOWN_FILE.test(filePath)) continue;
    try {
      const dataform = markdownDataform(content, { coordinate: filePath });
      logs.push(dataform.assertions);
      bodies.push([filePath, dataform.body]);
    } catch (error) {
      nonConforming.push({ path: filePath, error: (error as Error).message });
    }
  }
  const query = request as VaultQueryRequest;
  const rows = mergeEavtLogs(...logs);
  const needle = query.text?.toLowerCase();
  const matched = rows.filter((row) => {
    const [entity, attribute] = row;
    if (query.entity !== undefined && !matchesField(entity, query.entity)) return false;
    if (query.attribute !== undefined && !matchesField(attribute, query.attribute)) return false;
    if (needle !== undefined && !canonicalBytes([...row]).toLowerCase().includes(needle)) return false;
    return true;
  });
  const limit = query.limit ?? 200;
  const returned = matched.slice(0, limit);
  const attributes: Record<string, number> = {};
  for (const [, attribute] of matched) {
    const key = typeof attribute === "string" ? attribute : canonicalBytes(attribute);
    attributes[key] = (attributes[key] ?? 0) + 1;
  }
  const bodyMatches = needle === undefined ? [] : bodies
    .map(([notePath, body]) => ({ path: notePath, count: body.toLowerCase().split(needle).length - 1 }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
    .slice(0, limit);
  return vaultQueryResultContract.assert({
    kind: "metroplat.knowledge-vault.query-result" as const,
    vaultRoot: request.vaultRoot,
    ...(request.contentPath === undefined ? {} : { contentPath: request.contentPath }),
    notes: logs.length,
    rows: rows.length,
    matchedRows: matched.length,
    returnedRows: returned.length,
    attributes,
    results: returned.map(([e, a, v, t]) => ({ e, a, v, t })),
    bodyMatches,
    nonConforming,
  }, "vault query result") as VaultQueryResult;
}
