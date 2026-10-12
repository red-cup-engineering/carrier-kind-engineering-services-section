// self-improve — the PROPOSE-ONLY self-improvement loop. An agent reads its OWN usage trace + audit
// (where it settled to ⊤ or ⊥ — the DIAGNOSABLE events) and PROPOSES closure-rule additions as DATA,
// in the exact (rule-id, "closure-rule", {when, then}) shape TAB's working engine reads. The
// proposals are appended as PROPOSALS ONLY — never auto-applied, never mutating history, never
// overwriting a prior settlement. This is the self-improving-from-the-audit idea, kept SAFE: propose,
// don't self-modify.
//
// THE LAW it keeps:
//   - APPEND-ONLY. A proposal is a fresh row of kind "closure-rule-proposal"; it never edits or
//     overwrites an existing rule, cell, or trace row. proposeImprovements RETURNS data; it writes
//     nothing and applies nothing.
//   - NEVER AUTO-APPLIED. A proposal carries predicate "closure-rule-proposal", NOT "closure-rule".
//     TAB's readRules reads ONLY "closure-rule" cells, so a proposal is INERT to the closure engine
//     until a human (or a governed promotion step) re-files it under "closure-rule". `promoteProposal`
//     makes the promotion EXPLICIT and is the only path from proposal to live rule.
//   - ⊥ NEVER HALLUCINATED. A proposal cites the diagnosable EVENT it came from (a real ⊤ or ⊥ in the
//     trace). It never invents evidence; the `why` is the actual settled status it observed.
//
// EXPORTS:
//   diagnose(agentTrace)             -> { contradictions:[...], gaps:[...] }   the diagnosable events
//   proposeImprovements(agentTrace)  -> [{ e, a:"closure-rule-proposal", v:{ rule, when, then, why }, t }]
//   PROPOSAL_PREDICATE               "closure-rule-proposal"  (NOT "closure-rule" — inert to readRules)
//   promoteProposal(proposalRow, t?) -> { e, a:"closure-rule", v:{ rule, when, then }, t }  (EXPLICIT)

import being from "@561-group/tab/being";
import { invertConverse } from "./prose.mjs";
import { isTop, isDetermined, glyph } from "@561-group/tab/value";

// the predicate proposals are filed under. DELIBERATELY not "closure-rule": TAB's readRules ignores
// it, so a proposal can never fire as a rule until something EXPLICITLY promotes it.
export const PROPOSAL_PREDICATE = "closure-rule-proposal";

// normalizeRows — accept an agentTrace in either shape: a settled fiber ({ entity, fiber }), a flat
// EAVT row array ({ e, a, v, t }), or an object carrying `{ subject, rows }`. Returns { subject, rows,
// fiber } without mutating the input.
function normalizeTrace(agentTrace) {
  if (agentTrace && Array.isArray(agentTrace.fiber) && agentTrace.entity) {
    return { subject: agentTrace.entity, rows: null, fiber: agentTrace.fiber };
  }
  if (Array.isArray(agentTrace)) {
    const subject = agentTrace[0]?.e ?? "agent";
    return { subject, rows: agentTrace, fiber: being(subject, agentTrace).fiber };
  }
  if (agentTrace && Array.isArray(agentTrace.rows)) {
    const subject = agentTrace.subject ?? agentTrace.rows[0]?.e ?? "agent";
    // the converse map is the swarm-facing POSITIVE -> CONVERSE map; being's fold reads CONVERSE ->
    // POSITIVE, so invert it before folding (else the ⊤ lands on `not-P`, not the real predicate P).
    const converse = agentTrace.converse ? invertConverse(agentTrace.converse) : null;
    return { subject, rows: agentTrace.rows, fiber: being(subject, agentTrace.rows, converse ? { converse } : {}).fiber };
  }
  throw new TypeError("self-improve: agentTrace must be a settled fiber, an EAVT row array, or { subject, rows }");
}

// diagnose — read an agent's settled fiber for the DIAGNOSABLE events: the cells that settled to ⊤
// (contradictions — both faces asserted) and the cells that settled to ⊥ DESPITE being articulated
// (opened questions left undetermined — the named gaps). These are the real, witnessed events a
// proposal may cite. We never invent a ⊥: a gap counts only if the trace OPENED it (an `articulating`
// row), so an absent (never-raised) cell produces no proposal.
export function diagnose(agentTrace) {
  const { fiber } = normalizeTrace(agentTrace);
  const contradictions = [];
  const gaps = [];

  // ⊤ cells: contradictions held in the fiber — diagnosable, never repaired.
  for (const c of fiber) {
    if (c.predicate === "articulating" || c.predicate === PROPOSAL_PREDICATE || c.predicate === "closure-rule") continue;
    if (isTop(c.value)) contradictions.push({ predicate: c.predicate, object: c.object, status: "⊤" });
  }

  // ⊥-opened gaps: an `articulating` cell whose target predicate is still undetermined.
  const opened = fiber.filter((c) => c.predicate === "articulating" && c.value && c.value.pos === 1);
  for (const a of opened) {
    const spec = a.object;
    if (!spec || typeof spec !== "object" || typeof spec.predicate !== "string") continue;
    const answered = fiber.some(
      (c) => c.predicate === spec.predicate
        && (spec.object === undefined || c.object === spec.object)
        && isDetermined(c.value),
    );
    if (!answered) gaps.push({ predicate: spec.predicate, object: spec.object, status: "⊥" });
  }

  return { contradictions, gaps };
}

// proposeImprovements — read the agent's own trace + audit and PROPOSE closure-rule additions as
// append-only DATA. For each diagnosable event it emits one proposal row:
//   - a ⊤ contradiction on (P, O) proposes a rule that, when (P, O) holds, OPENS a review question
//     (a `then` that articulates "review-contradiction" on the cell) — so the next close surfaces the
//     ⊤ for governance instead of leaving it silent. It never proposes to DELETE or repair the ⊤.
//   - a ⊥-opened gap on (P, O) proposes a rule that, when the agent re-encounters the opening's
//     trigger, RE-OPENS the question — so the gap is not forgotten. It never invents an answer.
// Each proposal carries the `why`: the exact event (predicate, object, settled status) it cites.
//
// The returned rows are filed under PROPOSAL_PREDICATE ("closure-rule-proposal") — INERT to TAB's
// readRules. They are RETURNED ONLY; this function writes nothing and applies nothing.
export function proposeImprovements(agentTrace, opts = {}) {
  const { subject } = normalizeTrace(agentTrace);
  const { contradictions, gaps } = diagnose(agentTrace);
  const t = opts.t ?? "propose";
  const proposals = [];
  let seq = 0;

  for (const c of contradictions) {
    const ruleId = `propose:review-contradiction:${c.predicate}:${String(c.object)}`;
    proposals.push({
      e: subject,
      a: PROPOSAL_PREDICATE,
      v: {
        rule: ruleId,
        when: [{ predicate: c.predicate, object: c.object }],
        then: { predicate: "articulating", object: { predicate: "review-contradiction", object: c.object } },
        why: {
          cites: { predicate: c.predicate, object: c.object, status: "⊤" },
          reason: "the agent settled this cell to ⊤ (a held contradiction); propose a rule that opens a review question on it, never repairing the ⊤",
        },
      },
      t: `${t}:${String(++seq).padStart(4, "0")}`,
    });
  }

  for (const g of gaps) {
    const ruleId = `propose:reopen-gap:${g.predicate}:${String(g.object)}`;
    proposals.push({
      e: subject,
      a: PROPOSAL_PREDICATE,
      v: {
        rule: ruleId,
        when: [{ predicate: "articulating", object: { predicate: g.predicate, object: g.object } }],
        then: { predicate: "articulating", object: { predicate: g.predicate, object: g.object } },
        why: {
          cites: { predicate: g.predicate, object: g.object, status: "⊥" },
          reason: "the agent opened this question but left it ⊥ (a named gap); propose a rule that re-opens it so the gap is not forgotten, never inventing an answer",
        },
      },
      t: `${t}:${String(++seq).padStart(4, "0")}`,
    });
  }

  return proposals;
}

// promoteProposal — the ONLY path from a proposal to a LIVE closure rule, and it is EXPLICIT. Given a
// proposal row (filed under PROPOSAL_PREDICATE), emit the live (rule-id, "closure-rule", {when, then})
// row TAB's readRules reads. This is APPEND-ONLY (a fresh row; the proposal stays in history) and is
// NEVER called by proposeImprovements or the orchestration — a human or a governed promotion step
// calls it deliberately. The `why` is dropped from the live rule (TAB's readRules ignores extra keys
// anyway) but remains recoverable in the original proposal row.
export function promoteProposal(proposalRow, t) {
  if (!proposalRow || proposalRow.a !== PROPOSAL_PREDICATE || !proposalRow.v) {
    throw new TypeError(`promoteProposal: expected a row with a:"${PROPOSAL_PREDICATE}"`);
  }
  const spec = proposalRow.v;
  if (!spec.then || typeof spec.then.predicate !== "string") {
    throw new TypeError("promoteProposal: proposal must carry a then:{predicate, object}");
  }
  return {
    e: proposalRow.e,
    a: "closure-rule",
    v: {
      rule: spec.rule,
      when: Array.isArray(spec.when) ? spec.when : [],
      then: { predicate: spec.then.predicate, object: spec.then.object },
    },
    t: t ?? `promote:${proposalRow.t ?? "0001"}`,
  };
}
