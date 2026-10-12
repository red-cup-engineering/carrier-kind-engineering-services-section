// token-economics.mjs — the aim-frontier ratio as a COST-GRAPH READ; a budget-aware dispatch advisory.
//
// THE FINDING this module surfaces (computer/docs/dev/notes/agentic-drone-swarm-systems.md §3,
// lines 116-138): the polity's commitment to a function that NEVER FINISHES is what makes its agentic
// swarm computationally tractable. Per-step cost decomposes into two ADDITIVE terms (§3:124-126):
//   • substrate-coordination at MALL-level     O(N + |L|)         — cheap, monotone closure;
//   • agent-consultation  at LL-level           O(N · c_LL)        — c_LL ≈ 10^10–10^12 FLOPs / LLM call.
// They are additive "because no inter-agent operation lives at the substrate layer" (§3:126). The LLM
// cost "amortizes across the substrate's autonomous closure work IFF the consultation rate stays under
// the aim-frontier ratio" (§3:127-128). A strict-regime polity (whose function finishes) saturates and
// becomes inference-bound; the 561 polity is viable as a swarm PRECISELY BECAUSE its function never
// finishes (§3:128-130). The slogan: "The math is the politics. The aperiodicity is the moral content."
//
// THE SCHEDULING PRINCIPLE the note's §3:135-138 [INFERENCE] names: "don't invoke a model per closure
// step; invoke it to set new aims, then let monotone settling run." Keep the heavy (LLM) consultation
// at the AIM-FRONTIER and let the cheap substrate closure do many steps between consultations.
//
// THIS MODULE is swarm's READ of that ratio. It is DISTINCT from saturation.mjs: saturation reads the
// AGENT-COUNT axis (the ~4-agent N² orchestration wall); token-economics reads the CONSULTATION-RATE
// axis (LLM cost vs amortizing substrate closure). The two are the §3 ADDITIVE decomposition's two
// terms. This module owns no theory and SETTLES nothing — it folds the cost graph swarm already builds
// (cost.mjs costGraphSummary, whose evidence names cost as "a quantale spanning tokens, time, risk,
// context, and human attention", cost.mjs:532) and reports the consultation-rate ratio so a downstream
// router CAN keep consultation at the frontier — and can ignore it.
//
// ADVISORY DISCIPLINE (binding, inherited from saturation.mjs's discipline): the aim-frontier ratio is
// read off LIVE ledger counts, but the THRESHOLD it is compared against is a POLICY knob, not a derived
// constant. So this advice is exactly that — advice. It carries NO admit/deny; it NEVER gates dispatch;
// a caller MUST NOT treat `preferSubstrateClosure` as a hard switch derived from the substrate. The
// aperiodicity that makes the ratio meaningful is the moral content, not a gate (§3:131).

import { costGraphSummary } from "./cost.mjs";

// The aim-frontier ratio policy knob: the share of per-step cost the note permits to ride LLM
// consultation before the swarm risks becoming inference-bound. NOT derived — a policy default the
// caller overrides via options.frontierRatio. Named so the doc reads it as the §3:127-128 condition
// "the consultation rate stays under the aim-frontier ratio". The value 0.5 is a conservative default:
// at most half of per-step cost on consultation, the rest amortized by substrate closure.
export const AIM_FRONTIER_RATIO = 0.5;

// consultationCost / substrateClosureCost — the §3:124-126 additive decomposition read off the cost
// graph dimensions. The consultation term is the LLM provider work (providerCalls scaled by the
// per-call constant c_LL the note gives, §3:124); the substrate term is the O(N+|L|) monotone-closure
// work the trace already did (the trace events + work records the cheap layer settled). We do NOT
// invent FLOP counts: the ratio is computed in the SAME UNIT (a representative weighted count), so the
// per-call weight is a knob (options.cLL), defaulting to a representative 1 so the raw ratio is
// provider-calls-vs-substrate-steps — the rate the §3 condition is about.
export function consultationCost(dimensions, cLL = 1) {
  const calls = Number(dimensions.providerCalls) || 0;
  return calls * cLL; // O(N · c_LL) — the agent-consultation term (§3:124).
}

export function substrateClosureCost(dimensions) {
  // O(N + |L|): the cheap monotone-closure work the substrate did between consultations. |L| is the
  // environment/trace size (the stigmergic field's locations) plus the work the closure settled — the
  // same dimensions saturation.mjs reads as environmentSize. A floor of 1 keeps the ratio finite when
  // the trace is empty (no closure yet ⇒ every cost is consultation cost).
  const traceEvents = Number(dimensions.traceEvents) || 0;
  const workRecords = Number(dimensions.workRecords) || 0;
  const readiness = Number(dimensions.readinessWitnesses) || 0;
  return Math.max(1, traceEvents + workRecords + readiness);
}

// aimFrontierRead(root, options) — the consultation-rate ratio as a cost-graph read. Returns the §3
// additive decomposition's two terms, their ratio (the share of cost on consultation), and a
// FOUR-style verdict against the frontier policy:
//   t   under the frontier — consultation is well-amortized by substrate closure; room to consult.
//   ⊥   AT the frontier — consultation is exactly at the amortization edge; the next call is marginal.
//   f   OVER the frontier — consultation is outrunning closure; the swarm risks inference-binding,
//       the strict-regime failure mode (§3:128-130). Set new aims and let monotone settling run.
// The ⊤ (held) reading is reserved for when the cost is genuinely contradictory (unknown-token rows
// present AND nonzero spend) — the cost cannot be settled either way, so it is HELD, never collapsed.
export function aimFrontierRead(root, options = {}) {
  const cost = options.cost ?? costGraphSummary(root);
  const dimensions = cost.dimensions ?? {};
  const frontierRatio = Number.isFinite(options.frontierRatio) ? options.frontierRatio : AIM_FRONTIER_RATIO;
  const cLL = Number.isFinite(options.cLL) ? options.cLL : 1;

  const consultation = consultationCost(dimensions, cLL);
  const closure = substrateClosureCost(dimensions);
  const total = consultation + closure;
  // the consultation SHARE of per-step cost — the rate the §3:127-128 condition bounds.
  const consultationShare = total > 0 ? consultation / total : 0;

  // a held-⊤ cost: unknown-token provider rows alongside nonzero settled work means the cost graph
  // carries BOTH "we spent" and "we cannot say how much" — a contradiction the read HOLDS rather than
  // collapsing to a number. (This mirrors the refounding's held-⊤ discipline: surface, never silence.)
  const unknownTokens = Number(dimensions.unknownTokenRows) || 0;
  const heldContradiction = unknownTokens > 0 && consultation > 0;

  let value;
  if (heldContradiction) value = "stable";
  else if (consultationShare < frontierRatio) value = "potential";
  else if (consultationShare === frontierRatio) value = "absurd";
  else value = "active";

  return Object.freeze({
    kind: "swarm.token-economics.aimFrontier",
    advisory: true,                       // NEVER a gate — the frontier ratio is policy, not derived.
    value,                                // FOUR-style: t under / ⊥ at / f over / ⊤ held-contradictory.
    consultationCost: consultation,       // O(N · c_LL) — the agent-consultation term (§3:124).
    substrateClosureCost: closure,        // O(N + |L|) — the monotone-closure term (§3:124, 126).
    consultationShare,                    // the rate the §3:127-128 amortization condition bounds.
    frontierRatio,                        // the policy knob the share is compared against.
    unknownTokenRows: unknownTokens,
    heldContradiction,
    reason: heldContradiction
      ? `held ⊤: ${unknownTokens} provider row(s) report unknown token usage alongside nonzero consultation — the cost cannot be settled and is HELD, not collapsed to a figure.`
      : value === "potential"
        ? `consultation share ${consultationShare.toFixed(3)} is under the aim-frontier ratio ${frontierRatio}; LLM cost is amortized by substrate closure (§3) — room to consult.`
        : value === "absurd"
          ? `consultation share ${consultationShare.toFixed(3)} is AT the aim-frontier ratio ${frontierRatio}; the next consultation is marginal — prefer setting an aim and letting monotone closure run.`
          : `consultation share ${consultationShare.toFixed(3)} is OVER the aim-frontier ratio ${frontierRatio}; consultation is outrunning substrate closure — the swarm risks inference-binding (§3:128-130). Set new aims; let settling amortize.`,
  });
}

// budgetAwareRoutingAdvice(root, options) — the advisory a budget-aware dispatcher consults: given the
// aim-frontier read, should the NEXT unit of work prefer cheap substrate closure (let monotone settling
// run) over an LLM consultation? This is the CONSULTATION-RATE companion to saturation.mjs's
// AGENT-COUNT routingAdvice — together they are the §3 additive decomposition's two terms read as
// routing advice. ADVISORY ONLY: no admit/deny, never a gate.
export function budgetAwareRoutingAdvice(root, options = {}) {
  const frontier = options.frontier ?? aimFrontierRead(root, options);
  // OVER the frontier (f) or AT it (⊥): consultation is at/over the amortization edge — advise routing
  // the next step through cheap substrate closure (set aims, let settling run) rather than consulting.
  // A held-⊤ cost (⊤) is genuinely undecided — advise caution (prefer closure) but flag it as HELD, not
  // a settled "over budget". UNDER the frontier (t): consultation is amortized — no preference forced.
  const preferSubstrateClosure = frontier.value === "active" || frontier.value === "absurd" || frontier.value === "stable";
  const route = preferSubstrateClosure ? "substrate-closure" : "llm-consultation";
  return Object.freeze({
    kind: "swarm.token-economics.budgetAwareRoutingAdvice",
    advisory: true,                       // NEVER a gate — the frontier ratio is policy, not derived.
    value: frontier.value,                // the FOUR-style verdict this advice rides on.
    preferSubstrateClosure,               // a recommendation, not a switch the caller must obey.
    route,                                // the layer the §3 scheduling principle recommends next.
    consultationShare: frontier.consultationShare,
    frontierRatio: frontier.frontierRatio,
    held: frontier.value === "stable",       // the cost is held-contradictory; the advice is cautionary.
    reason: frontier.value === "stable"
      ? `advisory (held ⊤): the cost cannot be settled (${frontier.unknownTokenRows} unknown-token row(s)) — prefer cheap substrate closure until the token usage is witnessed; the read is HELD, not a settled over-budget.`
      : preferSubstrateClosure
        ? `advisory: consultation share ${frontier.consultationShare.toFixed(3)} at/over the aim-frontier ratio ${frontier.frontierRatio} — keep LLM consultation at the aim-frontier (§3); route the next step through cheap substrate closure (let monotone settling run).`
        : `advisory: consultation share ${frontier.consultationShare.toFixed(3)} under the aim-frontier ratio ${frontier.frontierRatio} — consultation is amortized by substrate closure; no substrate-closure preference forced.`,
    frontier,
  });
}
