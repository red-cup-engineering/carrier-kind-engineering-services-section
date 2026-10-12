// repo-context.mjs — the GOVERNED context-assembly over the repo fact-manifold.
//
// The swarm's settled memory holds the repo as `repo.file` predication cells (one term per file,
// written by repo-memory.mjs through @561-group/computer posix-holography). This module answers the
// question the user named explicitly: given a freeform prompt, WHICH of those settled cells should
// be fed to the LLM as grounding context? It is a relevance fold over the manifold, never a
// retrieval that invents content.
//
// It is the repo-memory peer of cognition.mjs: where cognition.mjs ranks an AGENT's own memory
// traces (memories/dreams/plans/messages) by token overlap and renders SWARM MEMORY:, this ranks the
// REPO's file cells and renders a REPO MEMORY: block. The relevance machinery (tokenize, overlapScore)
// is REUSED from cognition.mjs verbatim — this module re-derives no algebra.
//
// HELD-⊤ DISCIPLINE (the swarm spine). A reader never collapses a contested cell to last-writer. Two
// kinds of held-contradiction are surfaced here, CALMLY, never hidden and never resolved:
//   (1) A genuinely ⊤-valued cell — charge pos AND neg — by @red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge isTop.
//   (2) A SUCCESSION: one (subject,predicate) carrying >1 DISTINCT object in the settled section. In
//       the affirm-only write world the eavt reader charges every cell [true,false], so a file whose
//       bytes changed writes a NEW `content-hash` (and `text`) cell BESIDE the old one — both stand
//       (swarm-sheaf.mjs:7-8; repo-memory's "held-⊤ on content-hash, the CORRECT held-contradiction").
//       This is exactly the >1-distinct-object held succession cognition.mjs foldSectionToDoc reads as
//       `contested`. We mirror that test (cognition.mjs:95-101), never the last-writer collapse.
// A contested cell is reported under `contested` and rendered as a calm `CONTESTED:` line. We NEVER
// invent a value for a ⊥/undetermined cell and NEVER pick a winner among the held objects.

import { tokenize } from "./cognition.mjs";
import { memoryRootOf } from "./memory.mjs";
import { settledSection } from "./swarm-sheaf.mjs";
import { isTop } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";

// Every bound a NAMED default — no magic literal buried in the slice. limit caps the number of cells
// fed; budget caps the rendered string's characters (the context budget the survey named); label is
// the section header the renderer emits and infer.mjs:14 wraps as a {role:'system'} message.
export const DEFAULT_CONTEXT = { limit: 12, budget: 8000, label: "REPO MEMORY" };

// The repo memory root: a sibling of the agent memory roots under the swarm memory root. Mirrors
// repo-memory.mjs's repoMemoryRootOf (join(memoryRootOf(swarmRoot), 'repo')) so the two agree on
// where repo cells live, WITHOUT importing repo-memory.mjs (which carries the posix-holography
// ingest weight this read path does not need). Reuses memory.mjs memoryRootOf so the path is one
// source of truth.
import { join } from "node:path";
export function repoMemoryRootOf(swarmRoot) {
  return join(memoryRootOf(swarmRoot), "repo");
}

import { existsSync, readdirSync } from "node:fs";

// Enumerate the terms under the repo memory root: each settled file is a term whose log lives on disk
// as `<repoMemRoot>/<term>/<basename>.jsonl` (TFAS addressing — the term is a DIRECTORY holding its
// `.jsonl` log, confirmed by probing memory.mjs logPath/address). So a term is the directory path,
// relative to the root, that contains a `.jsonl` log. Walk the root for `.jsonl` logs, exactly as
// cognition.mjs walkJsonl does for agent collections — re-deriving no addressing.
function enumerateRepoTerms(repoMemRoot) {
  if (!existsSync(repoMemRoot)) return [];
  const terms = new Set();
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const childPath = join(dir, entry.name);
      if (entry.isDirectory()) walk(childPath, childPrefix);
      // the term is the DIRECTORY holding the log — the prefix up to (not including) the .jsonl file.
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && prefix) terms.add(prefix);
    }
  };
  walk(repoMemRoot, "");
  return [...terms];
}

// Token overlap between a query and a record's tokens — REUSED shape from cognition.mjs overlapScore
// (cognition.mjs:127): how many distinct query tokens appear in the haystack. Mirrored here (it is a
// module-private helper there) so this module needs only the public tokenize export.
function overlapScoreDefault(queryTokens, recordTokens) {
  const haystack = new Set(recordTokens);
  let score = 0;
  for (const token of queryTokens) if (haystack.has(token)) score += 1;
  return score;
}

// The scalar object of a cell, in the same {const:v}|bare reading swarm-sheaf uses (cognition.mjs:86).
const objectOf = (cell) => cell.object?.const ?? cell.object;

// Read one repo file's settled section into the shape this module ranks and renders. We DO NOT fold to
// last-writer: we keep the held data. `cells` is the predicate -> [distinct objects] map (a succession
// of >1 is a held-⊤, surfaced not collapsed). `topCells` are any genuinely ⊤-valued cells (isTop).
function settledFileCell(repoMemRoot, term, settled) {
  const section = settled(repoMemRoot, term);
  const objectsByPredicate = new Map();
  const topCells = [];
  for (const { cell, charge } of section.assignments) {
    const predicate = cell.predicate?.const;
    if (!predicate) continue;
    const value = objectOf(cell);
    const objects = objectsByPredicate.get(predicate) ?? [];
    // distinct objects only — a re-affirmation of the same value is one held object, not a succession.
    if (!objects.some((o) => o === value)) objects.push(value);
    objectsByPredicate.set(predicate, objects);
    if (isTop(charge)) topCells.push({ predicate, value, charge });
  }
  // the file's display path: the `path` predicate the ingest wrote, falling back to the term itself.
  const pathObjects = objectsByPredicate.get("path") ?? [];
  const path = pathObjects[0] ?? term;
  // the file's excerpt text: the `text` predicate (the bytes the ingest sliced to its excerpt budget).
  const textObjects = objectsByPredicate.get("text") ?? [];
  // a succession (>1 distinct object for ONE predicate) is the affirm-only held-⊤; collect those, plus
  // any genuinely ⊤-valued cell. Never collapse to a winner — keep every held object.
  const contestedPredicates = [];
  for (const [predicate, objects] of objectsByPredicate) {
    if (objects.length > 1) contestedPredicates.push({ predicate, objects });
  }
  return { term, path, texts: textObjects, objectsByPredicate, topCells, contestedPredicates };
}

// The relevance text of a file cell: its path plus its excerpt text — both fields are ranked so a
// prompt naming a path OR a phrase inside the file scores. (Mirrors cognition.mjs recordText, which
// ranks the readable fields of an agent record.)
function fileText(fileCell) {
  return [fileCell.path, ...fileCell.texts].filter(Boolean).join(" ");
}

// selectRepoContext(swarmRoot, prompt, opts) -> { context, selected, contested }
//
// Enumerate every repo term, settle each, score by prompt/path+text token overlap, sort desc, slice
// to BOTH limit (max cells) and budget (max rendered chars). For each selected file, any held-⊤
// (succession or isTop) is pushed to `contested` and rendered as a calm CONTESTED: line. `context` is
// the string that drops straight into infer(...,{context}) (infer.mjs:14). `selected`/`contested` are
// the structured form the watchable GUI lifts. Every collaborator is INJECTABLE so a test passes a
// temp memory root + fake clock and needs no network/port/key.
export function selectRepoContext(swarmRoot, prompt, opts = {}) {
  const limit = opts.limit ?? DEFAULT_CONTEXT.limit;
  const budget = opts.budget ?? DEFAULT_CONTEXT.budget;
  const label = opts.label ?? DEFAULT_CONTEXT.label;
  const tokenizeFn = opts.tokenize ?? tokenize;
  const overlapScore = opts.overlapScore ?? overlapScoreDefault;
  const settled = opts.settled ?? settledSection;

  const repoMemRoot = repoMemoryRootOf(swarmRoot);
  const terms = opts.terms ?? enumerateRepoTerms(repoMemRoot);
  const queryTokens = tokenizeFn(prompt);

  const ranked = terms
    .map((term) => settledFileCell(repoMemRoot, term, settled))
    .map((fileCell) => ({
      fileCell,
      score: overlapScore(queryTokens, tokenizeFn(fileText(fileCell))),
    }))
    // a 0-overlap file is not grounding for THIS prompt — never feed an irrelevant cell as context.
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || String(a.fileCell.path).localeCompare(String(b.fileCell.path)));

  const selected = [];
  const contested = [];
  let used = 0;
  for (const { fileCell, score } of ranked) {
    if (selected.length >= limit) break;
    const summary = fileCellSummary(fileCell);
    // measure the EXACT line renderRepoContext will emit (same normalize) so the budget gate is honest.
    const line = repoContextLine(summary);
    // budget is a CHAR budget over the rendered block: stop before a line would overflow it (but always
    // admit at least one selected cell so a relevant prompt is never answered with an empty manifold).
    if (selected.length > 0 && used + line.length + 1 > budget) break;
    used += line.length + 1;

    // the cell's headline charge: the path cell's charge (the file's existence assertion). Reported in
    // the struct so the GUI can show the cell's bilattice value beside its score.
    const charge = chargeOfPath(repoMemRoot, fileCell.term, settled);
    selected.push({ term: fileCell.term, cell: summary, charge, score });

    // surface every held-⊤ in this selected file — a succession (>1 distinct object) OR a genuine ⊤
    // cell — CALMLY, never collapsed, never resolved to a winner.
    for (const { predicate, objects } of fileCell.contestedPredicates) {
      contested.push({ term: fileCell.term, cell: { predicate, objects, path: fileCell.path } });
    }
    for (const top of fileCell.topCells) {
      contested.push({ term: fileCell.term, cell: { predicate: top.predicate, value: top.value, path: fileCell.path, top: true } });
    }
  }

  const context = renderRepoContext({ selected, contested, label });
  return { context, selected, contested };
}

// the path cell's charge — the file's existence assertion in the section. Read-only; never fabricated.
function chargeOfPath(repoMemRoot, term, settled) {
  for (const { cell, charge } of settled(repoMemRoot, term).assignments) {
    if (cell.predicate?.const === "path") return charge;
  }
  return undefined;
}

// a compact, JSON-safe summary of the file cell for the struct the GUI consumes (the full section is
// not serialized into the wire frame — the path/excerpt/held predicates are what the GUI shows).
function fileCellSummary(fileCell) {
  const excerpt = (fileCell.texts[0] ?? "").slice(0, 240);
  return { kind: "repo.file", path: fileCell.path, excerpt };
}

// the single source of truth for a selected cell's rendered line — used BOTH by the budget gate in
// selectRepoContext and by renderRepoContext, so the bytes measured are the bytes emitted.
function repoContextLine(cell) {
  const excerpt = (cell?.excerpt ?? "").replace(/\s+/g, " ").trim();
  return `- ${cell?.path ?? ""} — ${excerpt}`;
}

// renderRepoContext({selected, contested, label}) -> string
//
// Mirrors cognition.mjs renderCognitiveContext (cognition.mjs:239): a labeled block of 'path — excerpt'
// lines, then a CONTESTED: subsection naming each held-⊤ cell. This is the exact string infer's
// packPrompt turns into a {role:'system'} message (infer.mjs:14). An empty selection renders to "" so
// it composes with cognition.context without injecting an empty section.
export function renderRepoContext({ selected, contested, label } = {}) {
  const header = label ?? DEFAULT_CONTEXT.label;
  if (!selected || selected.length === 0) return "";
  const lines = [`${header}:`];
  for (const item of selected) lines.push(repoContextLine(item.cell ?? { path: item.term }));
  if (contested && contested.length) {
    lines.push("CONTESTED:");
    for (const item of contested) {
      // CALM render: name the held cell and its held objects/value; never pick a winner, never invent.
      const c = item.cell ?? {};
      const held = c.top
        ? `held-⊤ value ${JSON.stringify(c.value)}`
        : `held-⊤ across objects ${JSON.stringify(c.objects ?? [])}`;
      lines.push(`- ${c.path ?? item.term} [${c.predicate}]: ${held}`);
    }
  }
  return lines.join("\n");
}
