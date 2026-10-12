/**
 * Pure vault computations for markdown-backed knowledge vaults.
 *
 * Filesystem service modules pass file contents in; this module performs the
 * reusable note projection, vault ingestion, and vault query reads over that
 * material. Projectors and services share these functions so a vault is read
 * the same way whether it arrived as a directory manifest or a direct
 * filesystem request.
 */
import { markdownDataform } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
import { readMarkdownFrontmatter } from "@red-cup-engineering/markdown-engineering-services-section/read-markdown-frontmatter";
import { canonicalJson } from "@red-cup-engineering/json-services-section";
import {
  citedReferenceIds,
  decodeReferencesValue,
  internalReferenceTargets,
  referencesFrontmatterValue,
  referencesOfFrontmatter,
} from "@red-cup-engineering/csl-json-services-section/csl-references";
import { } from "@red-cup-engineering/json-services-section";

import {
  vaultIngestionProfileContract,
  vaultNoteProjectionContract,
  vaultQueryResultContract,

} from "@red-cup-engineering/markdown-engineering-services-section/vault/note";
import { vaultLinkGraphMatter, vaultToContent } from "./wikilinks.mjs";
import { mergeEavtLogs } from "@red-cup-engineering/eavt/row";

export const MARKDOWN_FILE = /\.(?:md|markdown)$/iu;

export function vaultNoteProjectionOfMarkdown(args

) {
  const dataform = markdownDataform(args.text, { coordinate: args.notePath });
  const decodedReferences = referencesOfFrontmatter(dataform.frontmatter);
  const title = typeof dataform.frontmatter["title"] === "string" ? dataform.frontmatter["title"] : dataform.subject;
  return vaultNoteProjectionContract.assert({
    kind: "metroplat.knowledge-vault.note-projection",
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
  }, "vault note projection");
}

export function vaultNoteWriteMaterial(request) {
  const frontmatter = { ...(request.frontmatter) };
  let decoded = decodeReferencesValue(frontmatter["references"]);
  if (request.normalizeReferences !== false && decoded.dialect !== "none") {
    frontmatter["references"] = referencesFrontmatterValue(decoded.items);
    decoded = Object.freeze({ dialect: "csl", items: decoded.items });
  }
  return Object.freeze({
    text: createMarkdownDocument({ ...frontmatter, body: request.body }),
    referenceCount: decoded.items.length,
    referenceDialect: decoded.dialect,
  });
}

function conformingVaultFiles(walked)

 {
  const files = {};
  const nonConforming = [];
  for (const [filePath, content] of Object.entries(walked)) {
    if (MARKDOWN_FILE.test(filePath)) {
      try {
        readMarkdownFrontmatter(content);
      } catch (error) {
        nonConforming.push({ path: filePath, error: (error).message });
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
  vaultRoot,
  walked,
  contentPath,
) {
  const { files, nonConforming } = conformingVaultFiles(walked);
  const ingestion = vaultToContent(files);
  const graph = Object.freeze({
    kind: "metroplat.digital-garden.link-graph",
    notes: ingestion.notes.map((note) => Object.freeze({ path: note.path, title: note.path, href: note.url })),
    links: ingestion.notes.flatMap((note) => note.links
      .filter((link) => link.path !== undefined)
      .map((link) => Object.freeze({ fromPath: note.path, toPath: link.path, href: link.href, label: link.label }))),
    h1Rank: null,
    h1RankStatus: "measured:matter-topology-receipt",
  });
  const matter = vaultLinkGraphMatter(graph);
  const links = ingestion.notes.reduce((count, note) => count + note.links.length, 0);
  const unresolvedLinks = ingestion.notes.reduce(
    (count, note) => count + note.links.filter((link) => link.unresolved === true).length,
    0,
  );
  return vaultIngestionProfileContract.assert({
    kind: "metroplat.knowledge-vault.ingestion-profile",
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
    matter: JSON.parse(JSON.stringify(matter)),
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
  }, "vault ingestion profile");
}

function matchesField(field, selector) {
  return typeof field === "string" ? field === selector : canonicalJson(field) === selector;
}

/** Query an already-walked vault as merged frontmatter EAVT plus body matches. */
export function vaultQueryResultOfFiles(
  request,
  walked,
) {
  const logs = [];
  const bodies = [];
  const nonConforming = [];
  for (const [filePath, content] of Object.entries(walked)) {
    if (!MARKDOWN_FILE.test(filePath)) continue;
    try {
      const dataform = markdownDataform(content, { coordinate: filePath });
      logs.push(dataform.assertions);
      bodies.push([filePath, dataform.body]);
    } catch (error) {
      nonConforming.push({ path: filePath, error: (error).message });
    }
  }
  const query = request;
  const rows = mergeEavtLogs(...logs);
  const needle = query.text?.toLowerCase();
  const matched = rows.filter((row) => {
    const [entity, attribute] = row;
    if (query.entity !== undefined && !matchesField(entity, query.entity)) return false;
    if (query.attribute !== undefined && !matchesField(attribute, query.attribute)) return false;
    if (needle !== undefined && !canonicalJson([...row]).toLowerCase().includes(needle)) return false;
    return true;
  });
  const limit = query.limit ?? 200;
  const returned = matched.slice(0, limit);
  const attributes = {};
  for (const [, attribute] of matched) {
    const key = typeof attribute === "string" ? attribute : canonicalJson(attribute);
    attributes[key] = (attributes[key] ?? 0) + 1;
  }
  const bodyMatches = needle === undefined ? [] : bodies
    .map(([notePath, body]) => ({ path: notePath, count: body.toLowerCase().split(needle).length - 1 }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path))
    .slice(0, limit);
  return vaultQueryResultContract.assert({
    kind: "metroplat.knowledge-vault.query-result",
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
  }, "vault query result");
}
