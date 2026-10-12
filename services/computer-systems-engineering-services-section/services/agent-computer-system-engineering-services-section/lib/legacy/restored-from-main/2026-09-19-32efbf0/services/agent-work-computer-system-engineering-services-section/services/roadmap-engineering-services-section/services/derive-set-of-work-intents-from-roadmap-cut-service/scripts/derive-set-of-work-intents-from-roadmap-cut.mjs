#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readBcp14Requirements } from "@red-cup-engineering/read-bcp-14-requirements-service";
import { STRUCTURED_WORK_INTENT_TYPE, assertStructuredWorkIntent } from "@red-cup-engineering/agent-work-computer-system-engineering-services-section/structured-work-intent";
import { runJavascriptNodeOperation } from "@red-cup-engineering/javascript-node-services-section/operation";

const ENDEAVOR_CELL = "endeavor:ops-561-group";
const SOURCE_ID = "roadmap-cut";

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9-]+/gu, "-").replace(/-+/gu, "-").replace(/^-|-$/gu, "");
}

function digestOf(text) {
  return createHash("sha256").update(text).digest("hex").slice(0, 8);
}

function cutDateOf(recordedAt) {
  const datePart = recordedAt.slice(0, 10);
  const timeMatch = /T(\d{2}):(\d{2})/u.exec(recordedAt);
  return timeMatch ? `${datePart}-${timeMatch[1]}${timeMatch[2]}` : datePart;
}

function lineOf(sourceText, needle) {
  if (typeof sourceText !== "string" || sourceText === "" || needle === "") return null;
  const escaped = JSON.stringify(needle).slice(1, -1);
  const lines = sourceText.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].includes(escaped)) return index + 1;
  }
  return null;
}

// provenance.source must reference a sources[].id (the rail's own admission
// contract), never the raw path; the path lives only in sources[].locator.
function provenanceFor(sourceText, text) {
  const line = lineOf(sourceText, text);
  return line === null ? [{ source: SOURCE_ID }] : [{ source: SOURCE_ID, start: line, end: line, unit: "line" }];
}

function forceEvidenceFor({ text, source, ts, cell, refusals }) {
  const read = readBcp14Requirements({ text });
  const requirement = read.requirements[0];
  if (!requirement) {
    refusals.push({ cell, text: text.slice(0, 160), reason: "no-bcp-14-force" });
    return [];
  }
  const modality = { "MUST": "necessary", "SHALL": "necessary", "REQUIRED": "necessary", "MUST NOT": "determined", "SHALL NOT": "determined", "SHOULD": "possible", "RECOMMENDED": "possible", "SHOULD NOT": "possible", "NOT RECOMMENDED": "possible", "MAY": "impossible-now", "OPTIONAL": "impossible-now" }[requirement.force] ?? "impossible-now";
  const horizon = { determined: "now", necessary: "soon", possible: "later", "impossible-now": "eventually" }[modality];
  return [`force:${requirement.force} modality:${modality} horizon:${horizon} (read-bcp-14-requirements)`];
}

function repeatedCountOf(evidence) {
  const line = evidence.find((entry) => /^repeated:\d+$/u.test(entry));
  return line ? Number(line.split(":")[1]) : 1;
}

// A task cell is cut-dated by construction, so an identical next-edge text
// repeated in a later cut is folded onto its first cell rather than minted
// again; a project cell needs no fold since its slug alone is deterministic.
function foldOrMint({ text, mintCell, parent, evidence, provenance, priorItems }) {
  const prior = priorItems.find((item) => item?.text === text) ?? null;
  const deduped = [...new Set(evidence)];
  if (prior === null) return { cell: mintCell, parent, text, evidence: deduped, provenance };
  const nextCount = repeatedCountOf(prior.evidence ?? []) + 1;
  const keptEvidence = (prior.evidence ?? []).filter((entry) => !/^repeated:\d+$/u.test(entry));
  return {
    cell: prior.cell,
    // The current cut supplies the lawful immediate parent.  Older records
    // may predate the plan spine and therefore cannot dictate a direct
    // project-to-task edge into this canonical cut.
    parent,
    text,
    evidence: [...new Set([...keptEvidence, ...deduped, `repeated:${nextCount}`])],
    provenance: [...(prior.provenance ?? []), ...provenance],
  };
}

/**
 * Derives one shared `agent-work.structured-intent` record from a hand-written
 * goal-stack roadmap cut: the cut's thread becomes one project item under
 * `endeavor:ops-561-group`, each nextEdge and shipped entry becomes a task
 * item under that project (folding a text repeated verbatim across cuts
 * onto its first cell via `priorItems`, with the repetition count carried
 * as evidence), brokenEdge and findings become project evidence, and
 * force/modality/horizon are read per task text by composing
 * read-bcp-14-requirements rather than guessed.
 * @param {object} request The cut's own fields (recordedAt, thread?, goal?,
 *   brokenEdge?, nextEdges?, findings?, state?) plus `source` (the cut's repo
 *   path), `sourceText` (the cut file's raw text, for line provenance),
 *   optional `priorItems` (previously emitted items, for cross-cut dedupe),
 *   `id`, `producerId`, and `producerRevision`.
 * @returns {object} `{kind: "agent-work.structured-intent", id, producer,
 *   sources, items, refusals}`. `refusals` is caller metadata, not part of
 *   the schema `structured-work-intent-admit` admits; strip it before admitting.
 * @throws {TypeError} When `source` or `recordedAt` is missing.
 */
export function deriveSetOfWorkIntentsFromRoadmapCut(request) {
  const cut = request ?? {};
  if (typeof cut.source !== "string" || cut.source === "") throw new TypeError("source is required");
  if (typeof cut.recordedAt !== "string" || cut.recordedAt === "") throw new TypeError("recordedAt is required");
  const source = cut.source;
  const sourceText = typeof cut.sourceText === "string" ? cut.sourceText : "";
  const priorItems = Array.isArray(cut.priorItems) ? cut.priorItems : [];
  const cutDate = cutDateOf(cut.recordedAt);
  const threadText = typeof cut.thread === "string" && cut.thread !== ""
    ? cut.thread
    : (cut.goal?.what ?? cut.goal?.name ?? `roadmap cut ${cutDate}`);
  const refusals = [];

  const projectSlug = slugify(threadText).slice(0, 60).replace(/-$/u, "") || cutDate;
  const projectEvidence = [];
  if (typeof cut.brokenEdge === "string" && cut.brokenEdge !== "") projectEvidence.push(`brokenEdge: ${cut.brokenEdge}`);
  for (const finding of Array.isArray(cut.findings) ? cut.findings : []) {
    if (typeof finding === "string" && finding !== "") projectEvidence.push(`finding: ${finding}`);
  }
  if (projectEvidence.length === 0) projectEvidence.push(`cut: ${source}`);
  const projectItem = foldOrMint({
    text: threadText,
    mintCell: `project:${projectSlug}`,
    parent: ENDEAVOR_CELL,
    evidence: projectEvidence,
    provenance: provenanceFor(sourceText, threadText),
    priorItems,
  });
  const items = [projectItem];
  // A roadmap cut is one plan under its project.  Do not skip the work spine
  // by placing tasks directly beneath a project.
  const planItem = foldOrMint({
    text: `Roadmap cut ${cutDate} for ${threadText}`,
    mintCell: `plan:${cutDate}-${projectSlug}`,
    parent: projectItem.cell,
    evidence: [`cut: ${source}`],
    provenance: provenanceFor(sourceText, threadText),
    priorItems,
  });
  items.push(planItem);

  for (const edgeText of Array.isArray(cut.nextEdges) ? cut.nextEdges : []) {
    if (typeof edgeText !== "string" || edgeText === "") continue;
    const slug = slugify(edgeText).slice(0, 60).replace(/-$/u, "");
    const mintCell = `task:${cutDate}-${slug}-${digestOf(`${cutDate}\n${edgeText}`)}`;
    const evidence = [`nextEdge: ${source}`, ...forceEvidenceFor({ text: edgeText, source, ts: cut.recordedAt, cell: mintCell, refusals })];
    items.push(foldOrMint({ text: edgeText, mintCell, parent: planItem.cell, evidence, provenance: provenanceFor(sourceText, edgeText), priorItems }));
  }

  for (const shippedText of Array.isArray(cut.state?.shipped) ? cut.state.shipped : []) {
    if (typeof shippedText !== "string" || shippedText === "") continue;
    const slug = slugify(shippedText).slice(0, 60).replace(/-$/u, "");
    const mintCell = `task:${cutDate}-shipped-${slug}-${digestOf(`${cutDate}\nshipped\n${shippedText}`)}`;
    const evidence = [`shipped:${cut.recordedAt}`, ...forceEvidenceFor({ text: shippedText, source, ts: cut.recordedAt, cell: mintCell, refusals })];
    items.push(foldOrMint({ text: shippedText, mintCell, parent: planItem.cell, evidence, provenance: provenanceFor(sourceText, shippedText), priorItems }));
  }

  const id = typeof cut.id === "string" && cut.id !== "" ? cut.id : `roadmap-cut-${cutDate}`;
  const producerId = typeof cut.producerId === "string" && cut.producerId !== "" ? cut.producerId : "roadmap-engineering-services-section:derive-set-of-work-intents-from-roadmap-cut";
  const producerRevision = typeof cut.producerRevision === "string" && cut.producerRevision !== "" ? cut.producerRevision : "0.1.0";
  const result = {
    kind: STRUCTURED_WORK_INTENT_TYPE,
    id,
    producer: { id: producerId, revision: producerRevision },
    sources: [{ id: SOURCE_ID, kind: "roadmap-cut", locator: source }],
    items,
    refusals,
  };
  assertStructuredWorkIntent(result);
  return result;
}

if (import.meta.main) {
  const result = await runJavascriptNodeOperation({ name: "derive-set-of-work-intents-from-roadmap-cut", description: "Derives one shared `agent-work.structured-intent` record from a hand-written goal-stack roadmap cut: the cut's thread becomes one project item under `endeavor:ops-561-group`, each nextEdge and shipped entry becomes a task item under that project (folding a text repeated verbatim across cuts onto its first cell via `priorItems`, with the repetition count carried as evidence), brokenEdge and findings become project evidence, and force/modality/horizon are read per task text by composing read-bcp-14-requirements rather than guessed.", operation: deriveSetOfWorkIntentsFromRoadmapCut }, { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout });
  process.exitCode = result.exitCode;
}
