// loop-ledger.mjs — the read/fold surface over the Phase-1 agent loop's own durable cells.
//
// runAgentLoop (agent-loop.mjs) writes two append-only EAVT trace families and NOTHING reads them:
//   loops/<runId>/steps/<step>  — one cell per model turn (assistantContent, toolCalls, toolRuns, usage).
//   ledger/tool-runs/<id>       — one cell per governed tool run (runGovernedTool, agent-loop.mjs:96 /
//                                 governed-tool-runner.mjs:58), the gate witnesses + the FOUR value.
// This module folds those cells into a summary surface. It owns NO write path — it is a pure read over
// the append-only trace — so it cannot bypass any gate; every effect was already gated by runGovernedTool
// when the cell was laid. It does NOT call writeProviderLedgerEntry (that would double-count the loop's
// provider calls, already laid as step usage); it folds the cells the loop ALREADY wrote.
//
// HELD-⊤ DISCIPLINE: a contested tool run (run.value === "stable", stored as the string "stable") is the
// loop's terminal held state, never a failure. listGovernedToolRuns keys runs by outcome and reports a
// contested run AS "stable" (held ⊤), never collapsed to "failed". loopLedgerSummary counts contested
// steps separately (contestedCount) — the held ⊤ is surfaced in the fold, not silently dropped.
//
// READ PATTERN: the established replicated pattern (ledger.mjs:744 listLedgerEntries / events.mjs:338
// listEvents) — walk <family>/**/*.jsonl, recover the term off rows[0].e, then FOLD the canonical
// settled section (settledSection) so distinct objects stay distinct and a held-⊤ cell survives, rather
// than the readFileSync().split().map(JSON.parse) + doc[a]=v last-writer collapse. walkJsonl/rowsAt are
// replicated here exactly as both sibling readers replicate them (neither exports them).

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { memoryRootOf } from "./memory.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";


// walkJsonl — recurse a directory for *.jsonl leaf logs (ledger.mjs:12 / events.mjs:81, verbatim).
function walkJsonl(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonl(path));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) out.push(path);
  }
  return out;
}

// rowsAt — the raw EAVT rows of one log, read ONLY to recover the term (rows[0].e); values are folded
// from the settled section, never from doc[row.a]=row.v (ledger.mjs:23 / events.mjs:92, verbatim).
function rowsAt(path) {
  try {
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

// TTMS stores a scalar/array cell coordinate as {const: v} and rides a plain object/boolean bare
// (swarm-sheaf.mjs:28-32 / ledger.mjs:33). Mirror that so doc[a] is the value the writer wrote.
function cellValue(object) {
  return object !== null && typeof object === "object" && !Array.isArray(object) && "const" in object
    ? object.const
    : object;
}

// A cell whose charge carries BOTH the positive and the negative bit is a held ⊤ (swarm-sheaf charge
// {pos,neg}; ledger.mjs:42). It is NEVER silently last-writer-collapsed — it is surfaced as held.
function isContradicted(charge) {
  return Boolean(charge?.value?.[0]) && Boolean(charge?.value?.[1]);
}

// docFromSection — the canonical fold over settledSection (ledger.mjs:52). A held-⊤ cell is kept held
// (surfaced as { contradicted, charges, witnesses }), not collapsed; every other cell takes its value.
function docFromSection(section) {
  const doc = {};
  for (const { cell, charge } of section.assignments) {
    const a = cellValue(cell.predicate);
    if (a === undefined) continue;
    if (isContradicted(charge)) {
      doc[a] = { contradicted: true, charges: [charge], witnesses: witnessOf(section, cell) };
      continue;
    }
    doc[a] = cellValue(cell.object);
  }
  return doc;
}

// foldFamily — the one read primitive: walk a trace family under memory/, fold each leaf log's canonical
// settled section into a doc, drop logs that carry no recoverable term. No bound, no literal — the fold
// is over exactly the cells that exist on disk.
function foldFamily(root, family) {
  const memoryRoot = memoryRootOf(root);
  const base = join(memoryRoot, family);
  return walkJsonl(base)
    .map((path) => {
      const rows = rowsAt(path);
      const term = rows[0]?.e;
      if (!term) return null;
      const doc = docFromSection(settledSection(memoryRoot, term));
      return { path, term, doc };
    })
    .filter(Boolean);
}

// numeric coercion that keeps an unknown (non-finite) usage value at 0 contribution rather than NaN —
// mirrors the loop's own off-the-usage-block accumulation (agent-loop.mjs:120-122).
function asTokens(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// usageOf — the loop step records the provider usage block verbatim (agent-loop.mjs:102, usage:
// utterance[0].usage). Recover { prompt_tokens, completion_tokens } off whatever shape was stored.
function usageOf(doc) {
  const usage = doc?.usage;
  if (!usage || typeof usage !== "object") return { prompt: 0, completion: 0 };
  return { prompt: asTokens(usage.prompt_tokens), completion: asTokens(usage.completion_tokens) };
}

// a stored toolRun's value (agent-loop.mjs:96-100) is the FOUR member serialized — "stable" === "stable".
// A step is contested when any of its toolRuns is held ⊤. Held ⊤ is surfaced, never collapsed.
function stepIsContested(doc) {
  const runs = Array.isArray(doc?.toolRuns) ? doc.toolRuns : [];
  return runs.some((run) => run?.value === "stable");
}

// listLoopRuns(root, options) — the folded step cells, grouped by runId, sorted within a run by step.
// options.runId / options.agent narrow the fold. Each entry is { runId, agent, steps:[{path,term,doc}] }.
export function listLoopRuns(root, options = {}) {
  const records = foldFamily(root, "loops")
    .filter((record) => record.doc.kind === "swarm.loop.step")
    .filter((record) => (options.runId ? record.doc.runId === options.runId : true))
    .filter((record) => (options.agent ? record.doc.agent === options.agent : true));

  const byRun = new Map();
  for (const record of records) {
    const runId = record.doc.runId;
    if (!byRun.has(runId)) byRun.set(runId, { runId, agent: record.doc.agent, steps: [] });
    byRun.get(runId).steps.push(record);
  }
  for (const run of byRun.values()) {
    run.steps.sort((a, b) => Number(a.doc.step) - Number(b.doc.step));
    run.agent = run.steps[0]?.doc.agent ?? run.agent;
  }
  return [...byRun.values()].sort((a, b) => String(a.runId).localeCompare(String(b.runId)));
}

// loopLedgerSummary(root) — fold the loop's step cells into one row per run. The token totals are the
// SUM of each step's recorded provider usage (the loop's own durable cells), so a reader recovers the
// loop's cost WITHOUT re-laying a provider ledger entry (no double-count). contestedCount counts the
// steps whose toolRuns surfaced a held ⊤ — the held ⊤ is reported, never collapsed to a stop word.
export function loopLedgerSummary(root, options = {}) {
  const runs = listLoopRuns(root, options);
  const rows = runs.map((run) => {
    let providerCalls = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let contestedCount = 0;
    let stop = "";
    for (const { doc } of run.steps) {
      providerCalls += 1; // one provider call per recorded step (agent-loop.mjs:119, one infer per turn).
      const usage = usageOf(doc);
      promptTokens += usage.prompt;
      completionTokens += usage.completion;
      if (stepIsContested(doc)) contestedCount += 1;
      if (doc.stop) stop = doc.stop; // the terminal stop word rides the breaking step's cell.
    }
    return {
      runId: run.runId,
      agent: run.agent,
      stepCount: run.steps.length,
      providerCalls,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      stop,
      contestedCount,
    };
  });

  return {
    kind: "swarm.loop.ledger.fold",
    evidence:
      "the agent loop writes loops/<runId>/steps/* durably; this fold reads them so the loop's own cost and held-⊤ contests become a summary surface, without re-laying any provider ledger entry",
    runCount: rows.length,
    runs: rows,
  };
}

// listGovernedToolRuns(root, options) — fold ledger/tool-runs/* (every governed tool run, agent-loop.mjs:
// 96 / governed-tool-runner.mjs:58), keyed by outcome. The four outcome buckets mirror the FOUR-valued
// verdict (outcomeOf, governed-tool-runner.mjs:33): ok=T, refused=F, unsettled=⊥, contested=⊤. A
// contested run is surfaced WITH its held-⊤ value ("stable"), never collapsed to failed.
export function listGovernedToolRuns(root, options = {}) {
  const records = foldFamily(root, "ledger/tool-runs")
    .filter((record) => record.doc.kind === "swarm.tool_run")
    .filter((record) => (options.agent ? record.doc.agent === options.agent : true))
    .filter((record) => (options.tool ? record.doc.tool === options.tool : true))
    .sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")));

  const runs = records.map((record) => {
    const doc = record.doc;
    const held = doc.value === "stable"; // held ⊤ — surfaced as the loop's terminal contested state.
    return {
      path: record.path,
      term: record.term,
      id: doc.id,
      agent: doc.agent,
      tool: doc.tool,
      value: doc.value, // the FOUR member as stored; held ⊤ stays "stable", never collapsed to failed.
      gate: doc.gate,
      outcome: doc.outcome,
      reason: doc.reason,
      held,
    };
  });

  const byOutcome = { ok: [], refused: [], unsettled: [], contested: [] };
  for (const run of runs) {
    const bucket = byOutcome[run.outcome] ? run.outcome : "refused"; // unknown outcome is fail-closed.
    byOutcome[bucket].push(run);
  }

  return {
    kind: "swarm.tool_run.fold",
    evidence:
      "every governed tool run leaves one auditable EAVT row (governed-tool-runner.mjs); this fold reads them keyed by the FOUR-valued outcome, surfacing a contested run as held ⊤ (stable), never collapsed to failed",
    runs,
    byOutcome,
    counts: {
      ok: byOutcome.ok.length,
      refused: byOutcome.refused.length,
      unsettled: byOutcome.unsettled.length,
      contested: byOutcome.contested.length,
    },
    // the held-⊤ surface: the contested runs, carried explicitly with their "stable" value intact.
    contested: byOutcome.contested,
  };
}
