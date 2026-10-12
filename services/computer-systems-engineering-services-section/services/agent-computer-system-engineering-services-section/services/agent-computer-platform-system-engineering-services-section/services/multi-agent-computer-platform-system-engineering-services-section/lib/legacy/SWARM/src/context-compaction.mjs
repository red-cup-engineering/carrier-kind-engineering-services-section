// context-compaction.mjs — GOVERNED in-conversation context COMPACTION.
//
// NORTH STAR (Wave 3): a long session must stay GROUNDED without overflowing the model's context
// window. When a session's assembled context exceeds a DERIVED budget, the OLDER turns are summarized
// (through a governed summarize tool) into ONE compacted memory cell, while the most-recent turns are
// kept VERBATIM — the live conversation never lies behind a lossy summary. A turn carrying a held-⊤
// (a contested predicate) is STRUCTURALLY BARRED from the lossy path: a contradiction survives
// compaction, surfaced calmly, never collapsed by summarization.
//
// THE BUDGET IS DERIVED — the canonical "no magic literal" discipline of this repo:
//   budget = floor(window * reserveRatio * charsPerToken)
// where `window` is the agent's LLM context WINDOW. character.mjs:52,60,72 names recvBound as exactly
// that — the recv coordinate's bound is "the context window" (character.mjs:6-8,52). We read the window
// in this order, each a NAMED/DERIVED source, never a buried literal:
//   1. opts.window               — an explicit override (a caller that already knows the window).
//   2. the character recv bound  — character(agent).coordinates.recv.bound (character.mjs:72), when the
//                                  agent records a numeric recvBound. The substrate record of the window.
//   3. CONTEXT_WINDOWS[model]     — a GOVERNED model->window table (declared default, flagged below).
//   4. COMPACTION_DEFAULTS.window — the declared FALLBACK window for a model not in the table.
// reserveRatio (leave headroom for the reply) and charsPerToken (~4, a DECLARED token≈chars estimate,
// flagged as an approximation NOT a structural truth) are the ONLY named knobs; the budget itself is
// COMPUTED. The compaction TRIGGER derives from the budget too: needsCompaction(context, budget) =
// context.length > budget — the budget IS the gate, there is no separate magic threshold.
//
// THE SWARM-Y SPINE IS NON-NEGOTIABLE. The summarize call is a MODEL call (a real provider egress), so
// it does NOT call a provider directly: it runs THROUGH runGovernedTool (governed-tool-runner.mjs:40)
// as a governed tool named 'memory.summarize', supplied as an extraActuator (actuators.mjs:108-119) so
// it passes tool-policy admission -> the Gov regime -> the held-⊤ safety gate before a single byte
// leaves the process. A test injects a FAKE deterministic summarizer (govern:false, a pure read-path
// fold with the injected stand-in, OR the governed path with the fake as the extraActuator), so the
// gate is real and NO live key / network is touched. (tool-policy.mjs needs a 'memory.summarize' policy
// — a provider egress like network.fetch — see neededExistingEdits; until then the GOVERNED path
// refuses cleanly, exactly as semantic-recall's 'memory.embed' does, never fabricating a summary.)
//
// CONTENT-ADDRESSED IDEMPOTENCE (repo-memory.mjs:104-123). The compacted cell is written under a
// stableId over [sessionId, oldestSeq, newestSeq] (cognition.mjs:32-38), so re-compacting the SAME span
// writes the SAME term — the second compaction is a re-affirmation, not a new cell. Re-compaction does
// not grow the compaction count.

import write from "@561-group/computer/typed-term-memory-system/writing";

import { character } from "./character.mjs";
import { stableId } from "./cognition.mjs";
import { runGovernedTool } from "./governed-tool-runner.mjs";
import { memoryRootOf } from "./memory.mjs";
import { resolveSwarmRoot } from "./root.mjs";
import { SESSION_DEFAULTS, resumeSession } from "./session.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

// CONTEXT_WINDOWS — a GOVERNED model -> context-window (in TOKENS) table. DECLARED, not derived: a
// deployment overrides it. Every entry is the published context window of that model family; a model
// NOT in the table falls back to COMPACTION_DEFAULTS.window (the declared fallback, flagged below). This
// is the ONE place a window literal lives, and it is named + governed, never inlined into the budget math.
export const CONTEXT_WINDOWS = Object.freeze({
  // Groq / OpenAI-compatible chat models (providers.mjs:1-14 names groq/nim/cerebras).
  "llama-3.1-8b-instant": 131072,
  "llama-3.3-70b-versatile": 131072,
  "llama-3.1-70b-versatile": 131072,
  "mixtral-8x7b-32768": 32768,
  "gemma2-9b-it": 8192,
  // NVIDIA NIM defaults.
  "meta/llama-3.1-8b-instruct": 131072,
  "meta/llama-3.1-70b-instruct": 131072,
  // a local office model has no live window; it grounds under the declared fallback.
  "swarm-office-v0": 8192,
});

// COMPACTION_DEFAULTS — every bound a DERIVED-or-GOVERNED named default, NEVER a magic literal:
//   window        — the DECLARED FALLBACK context window (in tokens) for a model not in CONTEXT_WINDOWS.
//                   A conservative floor so an unknown model still grounds; overridable.
//   reserveRatio  — GOVERNED headroom: the fraction of the window the assembled context may fill, leaving
//                   the rest for the REPLY. ~0.6 leaves ~40% for generation. Declared, overridable.
//   charsPerToken — a DECLARED ESTIMATE (~4 chars/token), used to convert a token window into a CHARACTER
//                   budget (the assembled context is measured in characters). This is an APPROXIMATION,
//                   NOT a structural truth — flagged as such; a deployment with a real tokenizer overrides it.
//   keptTailRatio — GOVERNED: the fraction of the budget reserved for the VERBATIM recent turns (the
//                   kept tail is never summarized). The older turns above the tail are the lossy summary's input.
//   label         — the section header the rebuilt context emits (mirrors SESSION_DEFAULTS.label).
export const COMPACTION_DEFAULTS = Object.freeze({
  window: 8192,
  reserveRatio: 0.6,
  charsPerToken: 4, // DECLARED estimate (token≈4 chars), an approximation, NOT a structural law.
  keptTailRatio: 0.5,
  label: "SESSION",
});

// compactionTermOf(sessionId, id) — the term of a session's compacted memory cell. A compaction is a
// world object under the session, addressed by a content-hash id (idempotent re-compaction).
export function compactionTermOf(sessionId, id) {
  return `sessions/${sessionId}/compactions/${id}`;
}

// resolve the agent's context WINDOW (in tokens) — the substrate record of the recv coordinate. Each
// source is NAMED/DERIVED, in priority order; never a literal inlined into the budget math.
function resolveWindow(agent, opts = {}) {
  // 1. explicit override.
  if (Number.isFinite(Number(opts.window)) && Number(opts.window) > 0) return Number(opts.window);
  // 2. the character recv bound (character.mjs:72) — the substrate record of the LLM context window.
  if (agent) {
    try {
      const recvBound = character(agent).coordinates?.recv?.bound;
      if (Number.isFinite(Number(recvBound)) && Number(recvBound) > 0) return Number(recvBound);
    } catch {
      // a malformed agent has no character; fall through to the model table / fallback (never throw here).
    }
  }
  // 3. the GOVERNED model->window table.
  const model = agent?.model;
  if (model && Number.isFinite(Number(CONTEXT_WINDOWS[model]))) return Number(CONTEXT_WINDOWS[model]);
  // 4. the declared fallback window.
  return COMPACTION_DEFAULTS.window;
}

// deriveContextBudget(agent, {window, reserveRatio}?) -> { budget, window, reserveRatio, model }
//
// THE DERIVATION. budget = floor(window * reserveRatio * charsPerToken). The window is resolved from the
// agent's recv coordinate / the governed table / the declared fallback (NEVER a literal); reserveRatio
// and charsPerToken are the named knobs. The returned budget is a CHARACTER cap (the assembled context
// is measured in characters), COMPUTED — there is no budget literal anywhere.
export function deriveContextBudget(agent, opts = {}) {
  const window = resolveWindow(agent, opts);
  const reserveRatio = Number.isFinite(Number(opts.reserveRatio)) ? Number(opts.reserveRatio) : COMPACTION_DEFAULTS.reserveRatio;
  const charsPerToken = Number.isFinite(Number(opts.charsPerToken)) ? Number(opts.charsPerToken) : COMPACTION_DEFAULTS.charsPerToken;
  // the budget is COMPUTED from the window — the canonical "derive from the model context window".
  const budget = Math.floor(window * reserveRatio * charsPerToken);
  return { budget, window, reserveRatio, model: agent?.model ?? null };
}

// needsCompaction(context, budget) -> boolean. The TRIGGER DERIVES from the budget: the assembled
// context overflows iff its character length exceeds the budget. The budget IS the gate — there is no
// separate magic threshold. A null/empty context never needs compaction.
export function needsCompaction(context, budget) {
  return String(context ?? "").length > Number(budget);
}

// the single source of truth for a turn's rendered line — measured by the budget AND emitted into the
// rebuilt context. Mirrors session.mjs turnLine (session.mjs:345-350) / renderRepoContext's line shape
// (repo-context.mjs:199-202) so the rebuilt block is the same {role:'system'} shape infer packs.
function turnLine(doc) {
  const speaker = doc.speaker ?? doc.role ?? "?";
  const prompt = String(doc.prompt ?? "").replace(/\s+/g, " ").trim();
  const reply = String(doc.reply ?? "").replace(/\s+/g, " ").trim();
  return `- [${doc.seq}] ${speaker}: ${prompt}${reply ? ` -> ${reply}` : ""}`;
}

// the text fed to the summarizer for one OLDER turn (the lossy input). Same field choice as the rendered
// line, but without the budget framing — it is raw conversation text to compress.
function turnText(doc) {
  const speaker = doc.speaker ?? doc.role ?? "?";
  const prompt = String(doc.prompt ?? "").trim();
  const reply = String(doc.reply ?? "").trim();
  return `${speaker}: ${prompt}${reply ? `\n  -> ${reply}` : ""}`;
}

// the GOVERNED summarize seam. The live summarize is a real model egress, so it MUST pass the swarm-y
// spine: it runs as the 'memory.summarize' governed tool through runGovernedTool, supplied as the
// extraActuator so it passes tool-policy admission -> the Gov regime -> the held-⊤ safety gate before the
// provider egress. Mirrors semantic-recall.mjs governedEmbedder (semantic-recall.mjs:223-258) verbatim
// in shape. A read-path caller with NO effect to gate (a pure fold with an injected deterministic
// summarizer) passes `opts.govern === false` (or supplies no agent) to run the summarizer UNGOVERNED.
function governedSummarizer(root, agent, opts = {}) {
  const baseSummarize = opts.summarize;
  // ungoverned read-path: a pure fold with the injected deterministic stand-in, no live effect to gate.
  if (!agent || opts.govern === false) {
    return async (text) => (typeof baseSummarize === "function" ? baseSummarize(text) : "");
  }
  // governed path: the summarizer runs as the 'memory.summarize' extraActuator through the spine.
  const summarizeActuator = async (_root, args) => {
    try {
      const summary = typeof baseSummarize === "function" ? await baseSummarize(args?.text ?? "") : "";
      return {
        ok: true,
        tool: "memory.summarize",
        scope: "read",
        value: { summary, digest: stableId([args?.text ?? ""]) },
        trace: { predicate: "memory.summarize", object: stableId([args?.text ?? ""]), kind: "swarm.actuator.summarize" },
      };
    } catch (error) {
      return {
        ok: false,
        tool: "memory.summarize",
        scope: "read",
        error: error?.message ?? "summarize-failed",
        value: null,
        trace: { predicate: "memory.summarize", object: "", kind: "swarm.actuator.refused" },
      };
    }
  };
  return async (text) => {
    const run = await runGovernedTool(
      root,
      agent,
      { id: stableId([agent.name, "memory.summarize", text], "sumcall"), name: "memory.summarize", arguments: { text } },
      { ...opts.governance, now: opts.now, extraActuators: { "memory.summarize": summarizeActuator } },
    );
    if (run.ran && run.result?.ok === true) return run.result.value.summary;
    // the gate refused / held / unsettled: surface the verdict, never fabricate a summary.
    throw new Error(`memory.summarize gate did not admit: ${run.outcome} (${run.reason}) at gate ${run.gate}`);
  };
}

// render the rebuilt context: the COMPACTION block (the summary of older turns) + the kept-tail turn
// lines (verbatim) + a calm CONTESTED: subsection. Mirrors renderRepoContext (repo-context.mjs:210-227)
// and renderSessionContext (session.mjs:359-382). An empty rebuild renders "" so it composes.
function renderCompactedContext({ summary, keptTurns, contested, label, coversSeqs }) {
  const lines = [];
  if (summary) {
    lines.push(`${label}:`);
    const span = coversSeqs && coversSeqs.length
      ? ` (turns ${coversSeqs[0]}..${coversSeqs[coversSeqs.length - 1]})`
      : "";
    lines.push(`- [compacted summary${span}] ${String(summary).replace(/\s+/g, " ").trim()}`);
  } else if (keptTurns.length) {
    lines.push(`${label}:`);
  }
  for (const turn of keptTurns) lines.push(turnLine(turn.doc));
  if (contested && contested.length) {
    lines.push("CONTESTED:");
    for (const item of contested) {
      lines.push(`- turn[${item.seq}] [${item.predicate}]: held-⊤ across objects ${JSON.stringify(item.objects)}`);
    }
  }
  return lines.length ? lines.join("\n") : "";
}

// compactContext(root, agent, sessionId, {summarize, budget, now, settled, write, govern, label,
//   keptTailRatio}?) -> { context, compacted, kept, contested, budget }
//
// Fold the session's turns (resumeSession, session.mjs:281 — never a side buffer), split them at a
// kept-tail boundary, summarize the OLDER turns through the governed seam, write ONE content-addressed
// compaction cell, and return the rebuilt context (summary block + verbatim kept tail + contested).
//
//   • budget: the DERIVED budget (deriveContextBudget(agent).budget), OVERRIDABLE via opts.budget so a
//     test can FORCE compaction with tiny content. Never a literal.
//   • kept tail: the most-recent turns whose rendered length fits keptTailRatio*budget — kept VERBATIM,
//     never summarized, so the live conversation stays exact. At least the newest turn is always kept.
//   • HELD-⊤ NEVER DROPPED: a turn carrying a contested predicate (the session fold's non-enumerable
//     `contested`) is STRUCTURALLY BARRED from the lossy summary — it is carried into `contested` and
//     rendered under a calm CONTESTED: line, so a contradiction survives compaction (the spine).
//   • idempotent: the compaction cell's id is content-addressed over [sessionId, oldestSeq, newestSeq],
//     so re-compacting the same span re-affirms the same term — the count does not grow.
export async function compactContext(root, agent, sessionId, opts = {}) {
  const swarmRoot = resolveSwarmRoot({ root });
  const writeFn = opts.write ?? write;
  const settled = opts.settled ?? settledSection;
  const now = opts.now ?? new Date().toISOString();
  const label = opts.label ?? COMPACTION_DEFAULTS.label;
  const keptTailRatio = Number.isFinite(Number(opts.keptTailRatio)) ? Number(opts.keptTailRatio) : COMPACTION_DEFAULTS.keptTailRatio;

  // the budget: the DERIVED budget unless the caller overrides (a test forcing compaction). Never literal.
  const budget = opts.budget ?? deriveContextBudget(agent, opts).budget;

  // FOLD the session's turns through the canonical read (resumeSession) — ordered by the derived seq.
  const resumed = resumeSession(swarmRoot, sessionId, { settled });
  const turns = resumed.turns;

  // partition: a turn carrying a held succession (its non-enumerable `contested`) is BARRED from the
  // lossy path; it is surfaced under `contested` and (its line) is NEVER fed to the summarizer.
  const contested = [];
  const contestedSeqs = new Set();
  for (const turn of turns) {
    const c = turn.doc.contested; // non-enumerable; present only on a held succession.
    if (!c) continue;
    for (const [predicate, held] of Object.entries(c)) {
      contested.push({ term: turn.term, seq: turn.doc.seq, predicate, objects: held.objects, witnesses: held.witnesses });
    }
    contestedSeqs.add(turn.doc.seq);
  }

  // the KEPT TAIL: the most-recent turns whose rendered lines fit keptTailRatio*budget, kept VERBATIM.
  // Always keep at least the newest turn so a live session is never answered with an empty block.
  const tailBudget = Math.max(0, Math.floor(budget * keptTailRatio));
  const keptReversed = [];
  let used = `${label}:`.length + 1;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i];
    const line = turnLine(turn.doc);
    if (keptReversed.length > 0 && used + line.length + 1 > tailBudget) break;
    used += line.length + 1;
    keptReversed.push(turn);
  }
  const kept = keptReversed.reverse();
  const keptTerms = new Set(kept.map((t) => t.term));

  // the OLDER turns (above the kept tail) that are NOT contested are the lossy summary's input.
  const older = turns.filter((t) => !keptTerms.has(t.term) && !contestedSeqs.has(t.doc.seq));

  let compacted = null;
  let summary = "";
  let coversSeqs = [];
  if (older.length) {
    coversSeqs = older.map((t) => Number(t.doc.seq)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
    const oldestSeq = coversSeqs.length ? coversSeqs[0] : null;
    const newestSeq = coversSeqs.length ? coversSeqs[coversSeqs.length - 1] : null;
    const olderText = older.map((t) => turnText(t.doc)).join("\n");

    // the GOVERNED summarize — through the spine when an agent is supplied (unless opts.govern===false).
    const summarize = governedSummarizer(swarmRoot, agent, { ...opts, now });
    summary = await summarize(olderText);

    // write ONE compacted cell, content-addressed over the covered span -> idempotent re-compaction.
    const id = stableId([sessionId, oldestSeq, newestSeq], "compact");
    const term = compactionTermOf(sessionId, id);
    const doc = {
      kind: "swarm.compaction",
      sessionId,
      summary,
      coversTurns: coversSeqs,
      created: now,
    };
    writeFn(memoryRootOf(swarmRoot), term, doc, { t: id });
    compacted = { term, id, summary, coversTurns: coversSeqs };
  }

  // the rebuilt context: the compaction block + the verbatim kept tail + the calm CONTESTED: subsection.
  const context = renderCompactedContext({ summary, keptTurns: kept, contested, label, coversSeqs });
  return { context, compacted, kept, contested, budget };
}
