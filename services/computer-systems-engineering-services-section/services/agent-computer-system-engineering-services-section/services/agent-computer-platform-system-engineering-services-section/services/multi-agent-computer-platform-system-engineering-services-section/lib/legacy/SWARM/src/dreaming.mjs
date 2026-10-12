// dreaming — a GENERATIVE re-settling of a memory window on the canonical sheaf surface.
//
// SWARM's trace field IS Lotman's semiosphere (docs/dev/notes/2026-06-04-swarm-spelled-out.md:23-24):
// a worker reads prior traces as the meaning-context for its next articulation. Dreaming is the move
// where a worker RE-READS its own settled memory under a relaxed regime to surface LATENT cells — cells
// the trace makes possible but has never been asked.
//
// GROUNDING — the four-dream regime tower (archive/2026/05/24/claude-code-harness/docs/dev/journal/
// 2026-05-28-dream-regime-tower.md:18-29): one dream per descent regime, ordered by generativity:
//   finite (k<w, RECOMBINES existing claims to LFP — invents nothing, network-free),
//   scott-continuous (k=w, CONSOLIDATES evidence to the directed-sup limit, network-free),
//   transfinite (w<k<w1, derives NEW PREDICATES from co-occurrence — grows relational vocabulary),
//   aperiodic (k>=w1, channels genuinely NEW content from OUTSIDE the fibers — the LLM; network).
// "the aperiodic regime has no internal fixed point; the new generators come from the enactor" (:28-29).
// This module realizes the THREE network-free corners as pure folds over the sheaf; the aperiodic
// corner is a hole left for an enactor (an `inert proposal` a caller may answer by an outside call).
//
// THE ⊥-OPENED DISCIPLINE (src/ontology.mjs:100-118). Dreaming emits openPotential-style cells: a
// proposal OPENS a (predicate,object) as a ⊥-OPENED QUESTION — "a held-open question, distinct from
// ⊥-ABSENT. Opening a cell is never a fifth value and never determines it — it is a SECOND fact (the
// cell was asked)" (ontology.mjs:101-103). So a dream produces INERT proposals: it reads, it never
// writes the trace. The proposals are what a governing pass MAY later articulate; the dream itself
// settles nothing. This keeps dreaming monotone and replayable (no history mutated), exactly as the
// archived finite dream was "deterministic, replayable -> Stop-hook-able" (dream.mjs:4).
//
// ON THE SUBSTRATE. The window is read through swarm-sheaf readAsOf — MEMORY-AS-OF is the prefix fold
// of the append-only log (swarm-sheaf.mjs:43-45). A relaxed regime is a relaxed asOf boundary: dream
// "as of" an earlier mark and the re-settling re-articulates the window as it stood then, surfacing
// cells the later trace overwrote. SOUNDNESS: readAsOf orders by String(t) and is sound only after the
// P0 monotone-`t` migration (swarm-sheaf.mjs:15-18); with id-valued `t` the boundary mis-orders, so the
// default window is the WHOLE log (asOf omitted == settledSection, swarm-sheaf.mjs:43) and an explicit
// asOf is opt-in for callers who already file a sortable `t`. Never gate on an assumed regime/κ value.

import { settledSection, readAsOf, witnessOf } from "./swarm-sheaf.mjs";
import { memoryRootOf } from "./memory.mjs";
import { stableId, tokenize } from "./cognition.mjs";

// scalarObjectsByPredicate(section) -> Map predicate -> [object,...] in append order (the canonical
// fold keeps distinct objects as distinct cells, swarm-sheaf.mjs:6-8). We read the surviving objects,
// not a last-writer scalar — a dream WANTS the held succession.
function objectsByPredicate(section) {
  const out = new Map();
  for (const { cell } of section.assignments) {
    const p = cell.predicate?.const ?? cell.predicate;
    if (typeof p !== "string") continue;
    const o = cell.object?.const ?? cell.object;
    const list = out.get(p) ?? [];
    list.push(o);
    out.set(p, list);
  }
  return out;
}

// recordTextOf(section) -> the dreamable text of a memory term: the scalar narrative predicates the
// cognition reader already treats as content (cognition.mjs:134-143), read off the section.
function recordTextOf(section) {
  const by = objectsByPredicate(section);
  const last = (p) => { const l = by.get(p); return l && l.length ? l[l.length - 1] : undefined; };
  const kw = by.get("keywords");
  const keywords = Array.isArray(kw?.[kw.length - 1]) ? kw[kw.length - 1].join(" ") : "";
  return [last("summary"), last("prompt"), last("reply"), last("topic"), last("insight"), keywords]
    .filter(Boolean).join(" ");
}

// readWindow(root, terms, opts) -> the re-settled window: each term's section, as-of the (optional)
// relaxed boundary. asOf default OMITTED (== settledSection over the whole log) — sound pre-P0.
export function readWindow(root, terms, opts = {}) {
  const memoryRoot = memoryRootOf(root);
  const asOf = opts.asOf;
  return terms.map((term) => {
    const section = asOf ? readAsOf(memoryRoot, term, { asOf }) : settledSection(memoryRoot, term);
    return { term, section };
  });
}

// FINITE corner (recombination, k<w): co-occurrence of topic tokens ACROSS terms in the window. A
// topic that appears in >= minSupport distinct terms but has NO memory of its own is a LATENT cell —
// the trace makes it possible, the trace has never asked it. This is recombination, not invention:
// every token comes from existing claims (dream-regime-tower.md:23 "RECOMBINES existing claims").
function latentTopics(window, minSupport) {
  const support = new Map(); // token -> Set(term)
  for (const { term, section } of window) {
    for (const token of tokenize(recordTextOf(section))) {
      const set = support.get(token) ?? new Set();
      set.add(term);
      support.set(token, set);
    }
  }
  return [...support.entries()]
    .filter(([, terms]) => terms.size >= minSupport)
    .map(([token, terms]) => ({ token, support: terms.size, witnesses: [...terms] }))
    .sort((a, b) => b.support - a.support || a.token.localeCompare(b.token));
}

// dreamWindow(root, agent, terms, opts) -> INERT proposals (the dream emits, it does NOT write).
// Each proposal is a ⊥-OPENED question (ontology.mjs:101-103): a (predicate=`open-question`, object)
// cell the dream OPENS over the agent, distinct from ⊥-ABSENT, never determined here. The proposal
// carries its witnesses (the terms whose co-occurrence raised it) — thick provenance, like witnessOf
// (swarm-sheaf.mjs:49-51). A governing pass MAY later articulate a proposal into the trace; the dream
// settles nothing, so it is monotone and replayable.
export function dreamWindow(root, agent, terms, opts = {}) {
  const minSupport = opts.minSupport ?? 2;
  const window = readWindow(root, terms, opts);
  const proposals = latentTopics(window, minSupport).map((topic) => ({
    kind: "swarm.dream.proposal",
    regime: "finite",                 // the network-free recombination corner of the tower
    agent: agent.name,
    subject: `agents/${agent.name}`,
    // ⊥-OPENED cell: the question is asked, not answered. predicate names the act of asking.
    cell: { predicate: "open-question", object: topic.token },
    support: topic.support,
    witnesses: topic.witnesses,        // the window terms whose co-occurrence surfaced this latent cell
    inert: true,                       // the dream NEVER writes the trace; this is a proposal only
    id: stableId([agent.name, "open-question", topic.token], "proposal"),
  }));
  return { window: window.map((w) => w.term), asOf: opts.asOf ?? null, minSupport, proposals };
}

export { witnessOf, recordTextOf, latentTopics, objectsByPredicate };
