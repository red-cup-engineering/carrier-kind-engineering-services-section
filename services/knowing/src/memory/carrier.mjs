import { createMarkdownDocument } from "@red-cup-engineering/markdown-engineering-services-section/create-markdown-document";
/**
 * memory/carrier — the agent's memory as a directed-relational carrier, DERIVED
 * from upstream, not reimplemented.
 *
 * Memory is the settled, accumulated body of knowledge an agent holds: the
 * codomain of learning, accumulated along the knowledge order. knowing reads it
 * as a memorystore carrier; downstream packages own concrete filepath admission.
 *
 * It depends on no package but `@red-cup-engineering/relating`: document parsing
 * comes from relating's markdown codec (`parseMarkdown`), and settlement from
 * `induceRelation` + `relateRelations`. The genre, frontmatter-legibility
 * conformance, and internal-reference helpers are ported into knowing (below) — the
 * capability lives here. knowing writes no settlement engine.
 *
 * Memory is settled by directed relational research: each document's
 * (path → claim) relation is induced to its own SettlementFiltration and the
 * relations are folded into one settled topology, whose closure regime is the
 * memory's certification (relating-experimental has no `settleUtterances` shortcut).
 */
import { articulate, cell, utterance } from "@red-cup-engineering/signcell/cell";
import { site, transportRules } from "@red-cup-engineering/signgraph/site";
import { posit } from "@red-cup-engineering/signgraph/valuation";
import { classify, settle } from "@red-cup-engineering/signcraft/settle";
import { cohomologyReceiptOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions } from "@red-cup-engineering/markdown-engineering-services-section/markdown-projector";
import { jsonResource } from "@red-cup-engineering/json-services-section";
import { readingOfSides } from "@red-cup-engineering/computer-data-engineering-services-section/four";
const markdown = Object.freeze({ createMarkdownDocument, parseMarkdown, frontmatterConformance, markdownDataform, documentTypeFragment, documentTypeAssertions, allDocumentTypeAssertions, DOC_TYPE_STAMP, markdownProjector, markdownDocumentSchemaFragment, documentTypeDefinitions });

// The memory readings are interface-first derived producers for now; their generated
// schema mirrors were retired in the FromSchema migration. The spine carriers — term,
// fact, typing, proof — are the EAVT-over-predication grain memory holds: facts
// (valued cells) about terms (entities), typed (predicate/sort), certified by proofs
// (the settling derivation).

// ── conformance vocabulary, ported into knowing (no @emsenn/content dependency) ──
// knowing reads markdown frontmatter through relating's markdown codec and applies
// its own legibility conformance, genre, and internal-reference helpers — the
// capability lives here, depending on no package but @red-cup-engineering/relating.

/** A frontmatter record: relating's markdown codec frontmatter shape. */

/** A document's genre: a single classifying facet, or null when unstated. */

/** One conformance finding against a document's frontmatter legibility. */

/** A folded conformance summary: finding counts by severity. */

/** The document's genre facet: its `genre`, else `type`, else null (a projection of the decoded frontmatter). */
function genreFacet(frontMatter) {
  const genre = frontMatter["genre"] ?? frontMatter["type"];
  return Object.freeze({ value: typeof genre === "string" && genre.trim() !== "" ? genre.trim() : null });
}

/**
 * Read a document's conformance findings from relating's markdown codec verdict —
 * the codec's `frontmatterConformance`, not a hand-rolled title check. A failed MUST
 * (non-conformant frontmatter) is an error; each SHOULD note is a warning; a missing
 * frontmatter title is the one knowing-specific legibility warning.
 */
function conformanceFindings(path, verdict, frontMatter) {
  const findings = [];
  if (!verdict.conformant) findings.push(Object.freeze({ path, rule: "non-conformant-frontmatter", severity: "error", message: "frontmatter does not satisfy a MUST (codec verdict)" }));
  for (const note of verdict.notes) findings.push(Object.freeze({ path, rule: "frontmatter-should", severity: "warning", message: note }));
  const title = frontMatter["title"];
  if (!(typeof title === "string" && title.trim() !== "")) findings.push(Object.freeze({ path, rule: "missing-title", severity: "warning", message: "document has no frontmatter title" }));
  return Object.freeze(findings);
}

/** Fold findings into a conformance summary by severity. */
function summarizeFindings(findings) {
  return Object.freeze({
    total: findings.length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    info: findings.filter((f) => f.severity === "info").length,
  });
}

/** Slugify a reference value for memorystore addressing. */
function referenceSlug(value) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

/** The internal references a document's frontmatter asserts: the string (or array)
 *  values of its reference-bearing fields. */
function internalReferenceTargets(frontMatter) {
  const fields = ["aliases", "related", "references", "see-also", "links"];
  const targets = [];
  for (const field of fields) {
    const value = frontMatter[field];
    if (typeof value === "string" && value.trim() !== "") targets.push(Object.freeze({ field, value }));
    else if (Array.isArray(value)) for (const item of value) if (typeof item === "string" && item.trim() !== "") targets.push(Object.freeze({ field, value: item }));
  }
  return Object.freeze(targets);
}

// ── the spine grains: term / fact / typing (the EAVT-over-predication of memory) ──
// Each is mirrored by a schema (`knowing/memory/{term,fact,typing}`); the interfaces
// here are the producers. A FACT is a valued predication cell (subject·predicate·
// object + standing over FOUR) — the truth-bearer; a TERM is the entity a fact is
// about (not a truth-bearer); a TYPING assigns a term the predicate-type it inhabits.

/** A fact: a valued predication cell admitted from a document (the truth-bearer). */

  

/** A typing: a term inhabits a predicate-type (the predication's predicate/sort). */

/** The knowledge standing of a codec reading value `[positive, negative]`. */
const standingOf = (value) => readingOfSides("knowledge", Boolean(value[0]), Boolean(value[1]));

/**
 * Admit one memorystore resource as a memory document, decoding it through relating's
 * markdown codec (`markdownDataform`). The codec read gives the document's TERM (its
 * subject), its FACTS (the valued predication cells), its TYPINGS (the predicates
 * those facts assert), and the conformance verdict — never a hand-rolled parse.
 */
export function admitDocument(root, resource) {
  const term = `knowing.memory.document.${root}:${resource.path}`;
  let dataform;
  try {
    dataform = markdown.markdownDataform(resource.content, { coordinate: term });
  } catch (cause) {
    // A resource the codec cannot decode (malformed frontmatter) is admitted as a
    // fact-less document carrying a broken-frontmatter finding — never an abort of the
    // whole memory. The codec is the law; this records its refusal as an active fact.
    const message = cause instanceof Error ? cause.message : String(cause);
    return Object.freeze({
      kind: "knowing.memory.document",
      term,
      path: resource.path,
      hadFrontMatter: true,
      frontMatter: Object.freeze({}),
      body: resource.content,
      genre: Object.freeze({ value: null }),
      findings: Object.freeze([Object.freeze({ path: resource.path, rule: "broken-frontmatter", severity: "error", message: `frontmatter could not be decoded: ${message}` })]),
      facts: Object.freeze([]),
      typings: Object.freeze([]),
      utterances: Object.freeze([]),
    });
  }
  const frontMatter = dataform.frontmatter;
  const body = dataform.body;
  const hadFrontMatter = dataform.format !== null;
  const genre = genreFacet(frontMatter);
  const findings = conformanceFindings(resource.path, dataform.verdict, frontMatter);
  const facts = Object.freeze(dataform.cells.map((c) => Object.freeze({
    kind: "knowing.memory.fact",
    subject: c.subject,
    predicate: c.predicate,
    object: c.object,
    standing: standingOf(c.reading.value),
  })));
  const seenPredicates = new Set();
  const typings = [];
  for (const f of facts) {
    if (seenPredicates.has(f.predicate)) continue;
    seenPredicates.add(f.predicate);
    typings.push(Object.freeze({ kind: "knowing.memory.typing", term, predicate: f.predicate }));
  }
  const utterances = Object.freeze(
    facts.map((f) => utterance({ subject: f.subject, object: f.object }, f.predicate)),
  );
  return Object.freeze({
    kind: "knowing.memory.document",
    term,
    path: resource.path,
    hadFrontMatter,
    frontMatter,
    body,
    genre,
    findings,
    facts,
    typings: Object.freeze(typings),
    utterances,
  });
}

/** Admit a finite memory from already-gathered memorystore resources (callers own discovery). */
export function admitMemory(root, resources) {
  const admitted = resources.map((resource) => admitDocument(root, resource));
  return Object.freeze({
    kind: "knowing.memory",
    root,
    documents: Object.freeze(admitted),
    utterances: Object.freeze(admitted.flatMap((document) => document.utterances)),
  });
}

/**
 * A PROOF: the settling derivation that certifies memory's facts — the closure of
 * directed relational research over the held facts-about-terms. This is the shared
 * carrier the spine turns on: DRR (`research`/`settle-memory`) BUILDS it; neuro-
 * reflexivity (`reflect`/`ruminate`/`gauge`) READS its convergence. Its regime is
 * relating-experimental's closure-regime witness; `certified`/`onShell` is whether
 * the orbit settles (converges, `reflect`) rather than ruminates (aperiodic).
 */

  

  

function claimOf(document) {
  const title = document.frontMatter["title"];
  if (typeof title === "string" && title.trim() !== "") return title;
  const line = document.body.split("\n").map((l) => l.trim()).find((l) => l !== "" && !l.startsWith("#"));
  return line ?? document.path;
}

/**
 * Settle memory: each document articulates its (path → claim) cell, told for by its path, and the cells
 * settle together over the site they generate (SignCraft). The settlement is what downstream agency
 * morphisms admit. Null only for empty memory.
 */
export function settleMemoryFiltration(memory) {
  if (memory.documents.length === 0) return null;
  const told = memory.documents.map((document) => articulate(document.path, claimOf(document)));
  const at = site(told);
  return settle(posit(at, told), transportRules(at));
}

/**
 * settle-memory: build the PROOF — settle the held facts-about-terms by directed
 * relational research and read the folded derivation's regime + convergence. This is
 * the proof the neuroreflexivity readings (reflect/ruminate/gauge) judge for settling.
 */
export function settleMemory(memory) {
  const folded = settleMemoryFiltration(memory);
  const regime = folded === null ? null : classify(folded).regime;
  const onShell = regime !== null && regime !== "aperiodic";
  return Object.freeze({
    kind: "knowing.memory.proof",
    documents: memory.documents.length,
    facts: memory.documents.reduce((n, d) => n + d.facts.length, 0),
    relationsFolded: memory.documents.length,
    regime,
    onShell,
    certified: onShell,
  });
}

  

  

/**
 * Observe memory as a polarized arena of signs.
 *
 * Each memory sign is a labeled finite outcome: ordinary signs (path, frontmatter
 * keys, genre) are Player commitments (`potential`); conformance findings are
 * Opponent challenges (`active`). Each labeled sign is one arena event — the
 * polarized observation map over knowing's memory. The fuller concurrent-game arena
 * (move trees, strategies) is playing's domain; this records the polarization on the
 * bilattice reading directly, depending on no package but @red-cup-engineering/relating.
 */
export function observeMemory(memory) {
  const inputs = [];
  for (const document of memory.documents) {
    inputs.push({ id: `${document.term}:path`, reading: "potential", predicate: "knowing.memory.sign.path", object: document.path });
    for (const key of Object.keys(document.frontMatter)) {
      inputs.push({ id: `${document.term}:fm:${key}`, reading: "potential", predicate: "knowing.memory.sign.frontmatter", object: key });
    }
    if (document.genre.value !== null) {
      inputs.push({ id: `${document.term}:genre`, reading: "potential", predicate: "knowing.memory.sign.genre", object: String(document.genre.value) });
    }
    for (const finding of document.findings) {
      inputs.push({ id: `${document.term}:finding:${finding.rule}`, reading: "active", predicate: "knowing.memory.sign.finding", object: finding.rule });
    }
  }
  return Object.freeze({
    kind: "knowing.memory.observation",
    documents: memory.documents.length,
    signs: inputs.length,
    commitments: inputs.filter((i) => i.reading === "potential").length,
    challenges: inputs.filter((i) => i.reading === "active").length,
    // each polarized sign is one arena event (the move-tree arena itself is playing's domain).
    events: inputs.length,
  });
}

/** Slugify a topic the way the research server does — lowercase alnum runs joined by `-`. */
function slugifyTopic(value) {
  return (value.toLowerCase().match(/[a-z0-9]+/g) ?? []).join("-");
}

/**
 * Inspect a topic across memory — DERIVED reading, faithful to the research
 * server's role classification. Each document is a concept-home (title or
 * basename slug matches the topic, outside an archive), an exact-title match, a
 * path match, or merely supporting. The gaps name what is missing for the topic
 * to have a settled home.
 */
export function inspectMemoryTopic(memory, topic) {
  const slug = slugifyTopic(topic);
  const conceptHomes = [];
  const exactTitleMatches = [];
  const pathMatches = [];
  let supporting = 0;
  let unreadable = 0;
  for (const document of memory.documents) {
    const titleValue = document.frontMatter["title"];
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    const extensionless = document.path.replace(/\.[^.]+$/, "");
    const basename = extensionless.split("/").at(-1) ?? "";
    const titleExact = title !== "" && slugifyTopic(title) === slug;
    const basenameExact = slugifyTopic(basename) === slug;
    const pathContainsTopic = slug.length > 0 && slugifyTopic(extensionless).includes(slug);
    if (document.findings.some((f) => f.rule === "broken-internal-reference" && f.severity === "error")) unreadable += 1;
    if ((titleExact || basenameExact) && !document.path.includes("/archive/")) conceptHomes.push(document.path);
    else if (titleExact) exactTitleMatches.push(document.path);
    else if (pathContainsTopic) pathMatches.push(document.path);
    else supporting += 1;
  }
  const gaps = [
    ...(conceptHomes.length === 0 ? ["no concept-home document for this topic in the inspected region"] : []),
    ...(exactTitleMatches.length === 0 && conceptHomes.length === 0 ? ["no exact-title match in the inspected region"] : []),
    ...(pathMatches.length === 0 && conceptHomes.length === 0 ? ["no path match in the inspected region"] : []),
    ...(unreadable > 0 ? [`${unreadable} inspected document(s) have unreadable frontmatter`] : []),
  ];
  return Object.freeze({
    kind: "knowing.memory.topic-inspection",
    topic,
    slug,
    documentsInspected: memory.documents.length,
    conceptHomes: Object.freeze(conceptHomes),
    exactTitleMatches: Object.freeze(exactTitleMatches),
    pathMatches: Object.freeze(pathMatches),
    supporting,
    gaps: Object.freeze(gaps),
  });
}

/** Read memory's health — frontmatter legibility via knowing's conformance summary. */
export function inspectMemoryHealth(memory) {
  let withFrontMatter = 0;
  let withTitle = 0;
  const allFindings = [];
  for (const document of memory.documents) {
    if (document.hadFrontMatter) withFrontMatter += 1;
    const title = document.frontMatter["title"];
    if (typeof title === "string" && title.trim() !== "") withTitle += 1;
    allFindings.push(...document.findings);
  }
  return Object.freeze({
    kind: "knowing.memory.health",
    documents: memory.documents.length,
    withFrontMatter,
    withTitle,
    conformance: summarizeFindings(allFindings),
  });
}

  

function conceptEdgeCell(edge) {
  return cell(edge.from, edge.field, edge.to);
}

function conceptMapCohomologyReceipt(nodes, edges) {
  const cells = edges.map(conceptEdgeCell);
  const receipt = cohomologyReceiptOfCells(cells);
  return Object.freeze({
    kind: "knowing.memory.concept-map.cohomology",
    nodes,
    edges: edges.length,
    h0: receipt.h0,
    h1: receipt.h1,
    vanishing: receipt.vanishing,
    laplacian: receipt.laplacian,
  });
}

/**
 * Map the concepts around a topic — DERIVED. The nodes are the documents matching
 * the topic (via topic inspection); the edges are the internal cross-references
 * those documents assert in their frontmatter, extracted by
 * knowing's `internalReferenceTargets` (ported) and resolved to slugs by
 * `referenceSlug`. The directed-relation neighborhood of a concept.
 */
export function conceptMapMemory(memory, topic) {
  const inspection = inspectMemoryTopic(memory, topic);
  const matched = new Set([...inspection.conceptHomes, ...inspection.exactTitleMatches, ...inspection.pathMatches]);
  const nodes = [];
  const edges = [];
  for (const document of memory.documents) {
    if (!matched.has(document.path)) continue;
    const fromSlug = document.path.replace(/\.[^.]+$/, "").split("/").at(-1) ?? document.path;
    nodes.push(document.path);
    for (const target of internalReferenceTargets(document.frontMatter)) {
      edges.push(Object.freeze({ from: fromSlug, to: referenceSlug(target.value), field: target.field }));
    }
  }
  return Object.freeze({
    kind: "knowing.memory.concept-map",
    topic: inspection.topic,
    slug: inspection.slug,
    nodes: Object.freeze(nodes),
    edgeCount: edges.length,
    edges: Object.freeze(edges.slice(0, 100)),
    cohomology: conceptMapCohomologyReceipt(nodes.length, edges),
  });
}

/**
 * Measure the gap for a topic across memory — DERIVED by composing the topic
 * inspection and the conformance health into graded axes. Coverage is settled
 * when a concept-home exists, partial when only path-matches do, a gap otherwise;
 * frontmatter-legibility grades how much of the region carries usable titles.
 */
export function measureMemoryGap(memory, topic) {
  const inspection = inspectMemoryTopic(memory, topic);
  const health = inspectMemoryHealth(memory);
  const coverage = inspection.conceptHomes.length > 0 ? "settled" : inspection.pathMatches.length > 0 ? "partial" : "gap";
  const legibility = health.documents > 0 && health.withTitle === health.documents ? "settled" : health.withTitle > 0 ? "partial" : "gap";
  return Object.freeze({
    kind: "knowing.memory.gap",
    topic: inspection.topic,
    slug: inspection.slug,
    documentsInspected: inspection.documentsInspected,
    axes: Object.freeze([
      Object.freeze({ axis: "coverage", status: coverage }),
      Object.freeze({ axis: "frontmatter-legibility", status: legibility }),
    ]),
    conceptHomes: inspection.conceptHomes.length,
    gaps: inspection.gaps,
    conformance: health.conformance,
  });
}
