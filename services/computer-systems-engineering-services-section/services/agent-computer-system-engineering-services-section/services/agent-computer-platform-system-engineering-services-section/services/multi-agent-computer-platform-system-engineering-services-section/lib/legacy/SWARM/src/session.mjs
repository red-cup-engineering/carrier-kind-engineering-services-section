// session.mjs — PERSISTENT CONVERSATION SESSIONS as first-class world objects.
//
// NORTH STAR (Wave 3): a session is a THING WITH PERSISTENT MEMORY. It is not a hidden mutable
// buffer; it is a TERM whose append-only EAVT log IS the conversation. The session HEAD doc lives
// under `sessions/<sessionId>`; each turn lives under `sessions/<sessionId>/turns/<turnId>`. A
// session is resumed by FOLDING those logs through the canonical knowledge-join (settledSection,
// swarm-sheaf.mjs:37) — exactly the cognition.mjs read path — never by replaying a side buffer.
//
// This is the seed of the MUD's sessions-as-worlds: a session carries its PARTICIPANTS (CGS player
// ids, players.mjs:9), its grounding BUDGET (the DERIVED context budget — see deriveContextBudget in
// context-compaction.mjs — stored on the HEAD doc so every turn grounds under the same governed
// bound, NOT minted here), and its PLACE (a term, for later FizzOS room nesting).
//
// SWARM SPINE (non-negotiable):
//   - Durable state is EAVT {e,a,v,t}. Reads settle through the knowledge-join (settledSection).
//   - A held-⊤ is NEVER collapsed to last-writer. If two writers settle ONE turn predicate to two
//     distinct objects (e.g. two replies for one turn), that succession is surfaced under a
//     non-enumerable `contested` map — mirroring cognition.mjs foldSectionToDoc (cognition.mjs:79-108),
//     never the last-writer hand-parse swarm-sheaf.mjs:7-8 removes.
//   - Authority is RECOGNITION, not office: participants only RECORD who plays; a session grants no
//     capability.
//   - NO model/tool call happens here. This module is PURE memory over EAVT, so it needs no
//     governed-tool gate — grounding/compaction/recall are the callers that pass the spine gate.
//
// DERIVATION DISCIPLINE: NO magic literal. Every bound is a NAMED default in SESSION_DEFAULTS (mirror
// DEFAULT_CONTEXT repo-context.mjs:34 / DEFAULT_INGEST repo-memory.mjs:41) or a DERIVED/declared
// parameter. Turn ORDER is the turn doc's integer `seq` (derived from the prior turn count), NOT `t`
// — `t` is id-valued pre-P0 and mis-orders, the exact lesson of cognition.mjs:65-78.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import write from "@561-group/computer/typed-term-memory-system/writing";

import { jsonSafe, stableId, tokenize } from "./cognition.mjs";
import { memoryRootOf } from "./memory.mjs";
import { playerIdFor } from "./players.mjs";
import { resolveSwarmRoot } from "./root.mjs";
import { settledSection, witnessOf } from "./swarm-sheaf.mjs";

// SESSION_DEFAULTS — the ONLY constants home. Every bound is NAMED, never a literal buried in a slice.
//   contextLimit  — max turns folded into a rendered sessionContext block (a turn-count cap, the peer
//                   of DEFAULT_CONTEXT.limit repo-context.mjs:34).
//   sessionListCap — max sessions listSessions enumerates (bounds a runaway world directory).
//   budget        — the DEFAULT grounding budget a session carries WHEN a caller supplies none. This is
//                   a documented fallback ONLY: the real budget is deriveContextBudget(agent).budget
//                   from context-compaction.mjs, passed in at openSession so every turn grounds under
//                   the governed window-derived bound. It is named here, never minted as a magic number.
//   label         — the section header sessionContext emits (infer.mjs:14 wraps it {role:'system'}).
export const SESSION_DEFAULTS = Object.freeze({
  contextLimit: 24,
  sessionListCap: 256,
  budget: 8000,
  label: "SESSION",
});

// ── term addressing (re-derive no addressing; mirror cognition.mjs / repo-context.mjs term shapes) ──

// the HEAD term of a session: its log holds the session doc (kind 'swarm.session', place, participants,
// budget, title, created). A session is a world object addressed by its id.
export function sessionTermOf(sessionId) {
  return `sessions/${sessionId}`;
}

// a turn term: an append-only log under the session HEAD. The turn id is content-addressed (idempotent).
export function turnTermOf(sessionId, turnId) {
  return `sessions/${sessionId}/turns/${turnId}`;
}

// the on-disk directory holding a session's turn logs — the prefix enumerateTurnTerms walks for `.jsonl`,
// EXACTLY the walkJsonl shape cognition.mjs:46-55 / enumerateRepoTerms repo-context.mjs:53-67.
function turnsDirOf(memoryRoot, sessionId) {
  return join(memoryRoot, "sessions", sessionId, "turns");
}

// Enumerate the turn TERMS under a session, by walking its turns dir for `.jsonl` logs and recovering
// each term as the directory (prefix) that holds the log — re-deriving no addressing, mirroring
// enumerateRepoTerms (repo-context.mjs:53-67). A test may inject opts.terms to bypass the disk walk.
function enumerateTurnTerms(memoryRoot, sessionId) {
  const dir = turnsDirOf(memoryRoot, sessionId);
  if (!existsSync(dir)) return [];
  const terms = new Set();
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const childPath = join(current, entry.name);
      if (entry.isDirectory()) walk(childPath, childPrefix);
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && prefix) {
        // the term is the directory holding the log: sessions/<id>/turns/<turnId>.
        terms.add(`sessions/${sessionId}/turns/${prefix}`);
      }
    }
  };
  walk(dir, "");
  return [...terms];
}

// ── the canonical fold (mirror cognition.mjs foldSectionToDoc, cognition.mjs:79-108) ──

const objectOf = (cell) => cell?.object?.const ?? cell?.object;

// Fold a settled section into a flat doc, append-order-last per Class-F predicate (the same fold
// cognition.mjs:79-108 performs), and surface ANY predicate that settles to >1 distinct object under a
// NON-ENUMERABLE `contested` map (predicate -> { objects, witnesses }). A held-⊤ across a turn
// predicate — two writers settling one turn to two distinct replies — is thus made AUDITABLE, never
// last-writer-collapsed (the swarm spine, cognition.mjs:95-101). Enumerable doc values stay SCALARS so
// downstream rendering/tokenize stays total.
function foldSectionToDoc(section, settled, root, term) {
  const doc = {};
  const contested = {};
  const cellsByPredicate = new Map();
  for (const assignment of section.assignments) {
    const key = assignment.cell?.predicate?.const;
    if (!key) continue;
    const object = objectOf(assignment.cell);
    doc[key] = object; // append-order-last (Class F)
    const cells = cellsByPredicate.get(key) ?? [];
    cells.push(assignment.cell);
    cellsByPredicate.set(key, cells);
  }
  for (const [key, cells] of cellsByPredicate) {
    // distinct objects only — a re-affirmation of the same object is ONE held object, not a succession.
    const objects = [];
    for (const cell of cells) {
      const v = objectOf(cell);
      if (!objects.some((o) => sameObject(o, v))) objects.push(v);
    }
    if (objects.length <= 1) continue;
    contested[key] = {
      objects,
      witnesses: cells.map((cell) => witnessOf(section, cell)),
    };
  }
  if (Object.keys(contested).length) {
    Object.defineProperty(doc, "contested", { value: contested, enumerable: false });
  }
  return doc;
}

// structural equality over JSON-safe objects (a turn's participants/learned may be arrays/objects).
function sameObject(a, b) {
  if (a === b) return true;
  return JSON.stringify(jsonSafe(a)) === JSON.stringify(jsonSafe(b));
}

// read one term's folded doc through the canonical section (injectable `settled` for tests).
function readDoc(root, term, settled) {
  const section = settled(memoryRootOf(root), term);
  return foldSectionToDoc(section, settled, root, term);
}

// ── openSession ──────────────────────────────────────────────────────────────────────────────────

// openSession(root, {place, participants, budget, title, now}?) -> { term, id, doc }
//
// Mint a session HEAD as a world object. The id is content-addressed over its defining fields
// (place + participants + title + created) so re-opening an identical session is IDEMPOTENT
// (content-address, cognition.mjs:32-38). participants are normalized to CGS player ids (playerIdFor,
// players.mjs:9): a string already shaped `player:*` rides as-is, otherwise it is read as an agent and
// turned into its player id — authority stays RECOGNITION-not-office; this only RECORDS who plays.
// The grounding BUDGET is stored on the HEAD doc so every turn grounds under one governed bound; it is
// the DERIVED budget the caller passes (deriveContextBudget(agent).budget, context-compaction.mjs),
// falling back to the NAMED SESSION_DEFAULTS.budget — never a magic literal minted here.
export function openSession(root, opts = {}) {
  const swarmRoot = resolveSwarmRoot({ root });
  const writeFn = opts.write ?? write;
  const now = opts.now ?? new Date().toISOString();
  const place = opts.place ?? null; // a TERM (for later FizzOS room nesting); null is "no place yet".
  const participants = normalizeParticipants(opts.participants);
  const budget = opts.budget ?? SESSION_DEFAULTS.budget;
  const title = opts.title ?? "";

  const id = stableId([place, participants, title, now], "session");
  const term = sessionTermOf(id);
  const doc = {
    kind: "swarm.session",
    id,
    place,
    participants,
    budget,
    title,
    created: now,
  };
  writeFn(memoryRootOf(swarmRoot), term, doc, { t: id });
  return { term, id, doc };
}

// participants -> CGS player ids. Accepts player ids, agent names, or agent objects {name}.
function normalizeParticipants(participants) {
  const list = Array.isArray(participants) ? participants : participants ? [participants] : [];
  const out = [];
  for (const p of list) {
    let pid;
    if (typeof p === "string") pid = p.startsWith("player:") ? p : playerIdFor({ name: p });
    else if (p && typeof p === "object" && p.name) pid = playerIdFor(p);
    else continue;
    if (!out.includes(pid)) out.push(pid);
  }
  return out;
}

// ── appendTurn ───────────────────────────────────────────────────────────────────────────────────

// appendTurn(root, sessionId, {role, speaker, prompt, reply, injectedContext, learned, t, now}?)
//   -> { term, turnTerm, count }
//
// Append ONE turn to the session as its own EAVT log. ORDER is the integer `seq` the writer DERIVES
// from the prior turn count (NOT t — t is id-valued pre-P0 and mis-orders, cognition.mjs:65-78). The
// turnId is content-addressed over [sessionId, seq, prompt, reply] (cognition.mjs:32-38). IDEMPOTENCY:
// before minting a NEW seq, the writer folds the existing turns and, if an identical (prompt, reply)
// turn already stands at some seq, RE-AFFIRMS that very term (same seq, same content-address) rather
// than forking a new seq — so a retried append does not duplicate the conversation atom. The turn doc
// records the atom: who spoke, the prompt, the reply, the context injected to ground it, what it
// learned — that append-only trace IS the conversation. `t` rides as provenance only; SEQ is the order.
export function appendTurn(root, sessionId, opts = {}) {
  const swarmRoot = resolveSwarmRoot({ root });
  const writeFn = opts.write ?? write;
  const settled = opts.settled ?? settledSection;
  const now = opts.now ?? new Date().toISOString();

  const existing = opts.terms ?? enumerateTurnTerms(memoryRootOf(swarmRoot), sessionId);

  const role = opts.role ?? "user";
  const speaker = opts.speaker ?? null;
  const prompt = opts.prompt ?? "";
  const reply = opts.reply ?? "";

  // IDEMPOTENT re-affirm: if an identical (prompt, reply) turn already stands, reuse its seq + term so a
  // retried append lands the SAME content-address (no duplicate conversation atom, no seq fork).
  const priorSeq = findIdenticalTurnSeq(swarmRoot, existing, settled, prompt, reply);
  const seq = priorSeq ?? existing.length; // else a NEW turn at the derived order (prior turn count).

  const turnId = stableId([sessionId, seq, prompt, reply], "turn");
  const turnTerm = turnTermOf(sessionId, turnId);
  const doc = {
    kind: "swarm.turn",
    session: sessionId,
    seq,
    role,
    speaker,
    prompt,
    reply,
    injectedContext: opts.injectedContext ?? "",
    learned: opts.learned ?? null,
    keywords: tokenize(`${prompt} ${reply}`),
    created: now,
  };
  // `t` is provenance (id-valued pre-P0); never the order key — seq is. Default t to the turnId so the
  // write is self-witnessing and an identical re-append lands the same coordinates (idempotent).
  writeFn(memoryRootOf(swarmRoot), turnTerm, doc, { t: opts.t ?? turnId });

  const count = seq + 1;
  return { term: sessionTermOf(sessionId), turnTerm, count };
}

// Fold the existing turn terms and return the seq of an already-standing turn whose (prompt, reply)
// matches — the content-identity of a conversation atom — or null. This makes a retried append idempotent
// WITHOUT minting a new seq: the same atom re-affirms its own term. Read-only fold (no last-writer
// collapse: it only reads the enumerable prompt/reply scalars of each settled turn).
function findIdenticalTurnSeq(swarmRoot, turnTerms, settled, prompt, reply) {
  for (const term of turnTerms) {
    const doc = readDoc(swarmRoot, term, settled);
    if (doc.kind !== "swarm.turn") continue;
    if ((doc.prompt ?? "") === prompt && (doc.reply ?? "") === reply) {
      const n = Number(doc.seq);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

// ── resumeSession ────────────────────────────────────────────────────────────────────────────────

// resumeSession(root, sessionId) -> { id, doc, turns, participants, place, budget }
//
// Resume a session by FOLDING its logs — never a side buffer. The HEAD doc is folded from the session
// term; each turn is enumerated (walk the turns dir, mirror enumerateRepoTerms) and folded through
// settledSection, then ORDERED by the integer `seq`. A turn whose predicate settled to >1 distinct
// object carries a non-enumerable `contested` (surfaced, never collapsed). The returned shape exposes
// the session's world fields the MUD reads: participants, place, budget.
export function resumeSession(root, sessionId, opts = {}) {
  const swarmRoot = resolveSwarmRoot({ root });
  const settled = opts.settled ?? settledSection;
  const memoryRoot = memoryRootOf(swarmRoot);

  const doc = readDoc(swarmRoot, sessionTermOf(sessionId), settled);
  const turnTerms = opts.terms ?? enumerateTurnTerms(memoryRoot, sessionId);
  const turns = turnTerms
    .map((term) => ({ term, doc: readDoc(swarmRoot, term, settled) }))
    .filter((t) => t.doc.kind === "swarm.turn")
    // ORDER BY seq (the derived integer), NOT t. A missing/NaN seq sorts last but stays present.
    .sort((a, b) => seqOf(a.doc) - seqOf(b.doc) || String(a.term).localeCompare(String(b.term)));

  return {
    id: sessionId,
    doc,
    turns,
    participants: Array.isArray(doc.participants) ? doc.participants : [],
    place: doc.place ?? null,
    budget: doc.budget ?? SESSION_DEFAULTS.budget,
  };
}

function seqOf(doc) {
  const n = Number(doc?.seq);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

// ── sessionContext ───────────────────────────────────────────────────────────────────────────────

// sessionContext(root, sessionId, {limit, budget}?) -> { context, turns, contested }
//
// Render the session's folded turns as a labeled {role:'system'} block (mirror renderCognitiveContext
// cognition.mjs:239 / renderRepoContext repo-context.mjs:210) feeding straight into infer
// (infer.mjs:13-14). The MOST RECENT `limit` turns are rendered (a long session does not overflow the
// window here; deeper-history compaction is context-compaction.mjs's job). Any held-⊤ across a turn
// predicate is surfaced under `contested` and rendered as a CALM CONTESTED: line — never collapsed.
export function sessionContext(root, sessionId, opts = {}) {
  const limit = opts.limit ?? SESSION_DEFAULTS.contextLimit;
  const label = opts.label ?? SESSION_DEFAULTS.label;
  const settled = opts.settled ?? settledSection;

  const resumed = resumeSession(root, sessionId, { ...opts, settled });
  // the budget a session grounds under: caller-supplied, else the HEAD doc's stored (governed) budget.
  const budget = opts.budget ?? resumed.budget ?? SESSION_DEFAULTS.budget;

  // keep the MOST RECENT `limit` turns, in order.
  const ordered = resumed.turns;
  const kept = ordered.slice(Math.max(0, ordered.length - limit));

  const contested = [];
  for (const turn of kept) {
    const c = turn.doc.contested; // non-enumerable; present only on a held succession.
    if (!c) continue;
    for (const [predicate, held] of Object.entries(c)) {
      contested.push({ term: turn.term, seq: turn.doc.seq, predicate, objects: held.objects, witnesses: held.witnesses });
    }
  }

  const context = renderSessionContext({ turns: kept, contested, label, budget });
  return { context, turns: kept, contested };
}

// the single source of truth for a turn's rendered line — measured by the budget gate AND emitted.
function turnLine(doc) {
  const speaker = doc.speaker ?? doc.role ?? "?";
  const prompt = String(doc.prompt ?? "").replace(/\s+/g, " ").trim();
  const reply = String(doc.reply ?? "").replace(/\s+/g, " ").trim();
  return `- [${doc.seq}] ${speaker}: ${prompt}${reply ? ` -> ${reply}` : ""}`;
}

// renderSessionContext({turns, contested, label, budget}) -> string
//
// A labeled block of turn lines then a CALM CONTESTED: subsection, mirroring renderRepoContext
// (repo-context.mjs:210). An EMPTY turn set renders "" so it composes with cognition/repo context
// without injecting an empty section. `budget` is a CHAR cap over the rendered block: older turn lines
// are dropped FIRST (kept newest), but at least one turn always stands so a live session is never
// answered with an empty block.
export function renderSessionContext({ turns = [], contested = [], label = SESSION_DEFAULTS.label, budget = SESSION_DEFAULTS.budget } = {}) {
  if (!turns.length) return "";
  // budget the turn lines newest-first, then restore chronological order for the render.
  const reversed = [...turns].reverse();
  const admitted = [];
  let used = `${label}:`.length + 1;
  for (const turn of reversed) {
    const line = turnLine(turn.doc);
    if (admitted.length > 0 && used + line.length + 1 > budget) break;
    used += line.length + 1;
    admitted.push(turn);
  }
  admitted.reverse();

  const lines = [`${label}:`];
  for (const turn of admitted) lines.push(turnLine(turn.doc));
  if (contested.length) {
    lines.push("CONTESTED:");
    for (const item of contested) {
      lines.push(`- turn[${item.seq}] [${item.predicate}]: held-⊤ across objects ${JSON.stringify(item.objects)}`);
    }
  }
  return lines.join("\n");
}

// ── listSessions ─────────────────────────────────────────────────────────────────────────────────

// listSessions(root) -> [{ term, id, doc }]
//
// Enumerate every session HEAD as a world object: walk the sessions dir for the HEAD `.jsonl` logs (the
// logs directly under `sessions/<id>/`, NOT the turn logs under `.../turns/`), fold each through the
// canonical section. Capped by the NAMED SESSION_DEFAULTS.sessionListCap. Ordered by created (the doc's
// own clock) then id, so the listing is stable.
export function listSessions(root, opts = {}) {
  const swarmRoot = resolveSwarmRoot({ root });
  const settled = opts.settled ?? settledSection;
  const memoryRoot = memoryRootOf(swarmRoot);

  const ids = opts.ids ?? enumerateSessionIds(memoryRoot);
  const out = ids
    .map((id) => ({ term: sessionTermOf(id), id, doc: readDoc(swarmRoot, sessionTermOf(id), settled) }))
    .filter((s) => s.doc.kind === "swarm.session")
    .sort((a, b) => String(a.doc.created ?? "").localeCompare(String(b.doc.created ?? "")) || String(a.id).localeCompare(String(b.id)))
    .slice(0, opts.cap ?? SESSION_DEFAULTS.sessionListCap);
  return out;
}

// Enumerate session ids: a directory `sessions/<id>/` holding a HEAD `.jsonl` log directly (its turns
// live one level deeper under `turns/`). Mirror enumerateRepoTerms (repo-context.mjs:53-67): a HEAD log
// is a `.jsonl` file whose PARENT directory is the session id (prefix has no `/`), distinguishing it
// from the per-turn logs nested under `turns/`.
function enumerateSessionIds(memoryRoot) {
  const base = join(memoryRoot, "sessions");
  if (!existsSync(base)) return [];
  const ids = new Set();
  const walk = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const childPath = join(current, entry.name);
      if (entry.isDirectory()) walk(childPath, childPrefix);
      // a HEAD log sits DIRECTLY under sessions/<id>/ : its prefix is exactly the id (no nested slash).
      else if (entry.isFile() && entry.name.endsWith(".jsonl") && prefix && !prefix.includes("/")) {
        ids.add(prefix);
      }
    }
  };
  walk(base, "");
  return [...ids];
}
