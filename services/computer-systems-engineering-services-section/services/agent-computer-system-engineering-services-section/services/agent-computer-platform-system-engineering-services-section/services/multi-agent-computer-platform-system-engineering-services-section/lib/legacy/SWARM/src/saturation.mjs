// saturation.mjs — cost-graph saturation awareness (the ~4-agent orchestration wall).
//
// The corpus's lead drone-swarm note (computer/docs/dev/notes/agentic-drone-swarm-systems.md §4) gives
// the two coordination regimes and their cost theorems:
//   • STIGMERGIC / swarm regime: per-step coordination cost O(N + |L|) — linear in agents N plus
//     environment size |L|, NO O(N²) term (status PROVED). swarm's stigmergy.mjs is this regime.
//   • ORCHESTRATED regime: coordination latency grows SUPERLINEARLY, ~quadratically in agent count
//     (empirical, MASFT 2025: ~200ms at 2 agents → >4000ms at 8+).
// The empirical consequence is a SATURATION THRESHOLD at ~4 agents (status proved, MASFT 2025):
// "performance gains from adding agents plateau at approximately four agents," beyond which overhead
// grows faster than capability and the system gets WORSE. The note's §4 [INFERENCE] names the design
// lesson: route coordination through the cheap stigmergic substrate (O(N+|L|)); reserve the expensive
// orchestrated regime for the sparse aim-frontier.
//
// This module is swarm's AWARENESS of that wall. It reads the cost graph (cost.mjs costGraphSummary)
// — whose office vertices are the orchestrated participants and whose work/dependency edges are the
// coordination load — and computes: the orchestrated agent count, the two regimes' cost on that count,
// the saturation verdict (a FOUR-style value: t below the knee, ⊥ at it, f past it), and the share of
// coordination that already rides the stigmergic substrate. It authors no new theory — it surfaces the
// corpus's proved thresholds against swarm's live ledger so dispatch can prefer the regime that scales.

import { costGraphSummary } from "./cost.mjs";

// the saturation threshold the corpus proves (MASFT 2025): performance plateaus at ~4 agents.
export const SATURATION_THRESHOLD = 4;

// orchestratedCost(n) — the orchestrated regime's ~quadratic coordination cost on n agents (the
// note's superlinear lower bound; we use n² as its representative growth). stigmergicCost(n, L) — the
// O(N + |L|) stigmergic cost. The contrast is the load-bearing distinction the note draws.
export function orchestratedCost(n) {
  return n * n;
}

export function stigmergicCost(n, environmentSize) {
  return n + environmentSize;
}

// agentSaturation(root, options) — read the cost graph and assess the orchestrated agent count against
// the saturation wall. The orchestrated agents are the OFFICE vertices (the participants the
// orchestrated regime coordinates); the environment size |L| is the work/trace vertex count (the
// stigmergic field's locations). Returns the FOUR-style verdict and both regimes' cost, so a caller
// can SEE when adding another orchestrated office crosses the knee and should instead route work
// through the stigmergic substrate.
export function agentSaturation(root, options = {}) {
  const cost = options.cost ?? costGraphSummary(root);
  const vertices = cost.graph.vertices ?? [];
  const offices = vertices.filter((v) => v.kind === "office");
  const works = vertices.filter((v) => v.kind === "work");
  const agentCount = options.agentCount ?? offices.length;
  const environmentSize = options.environmentSize ?? (works.length + (cost.dimensions.traceEvents ?? 0));

  // the FOUR-style saturation verdict: t below the knee (room to add an orchestrated agent), ⊥ AT the
  // knee (the plateau — adding agents stops helping), f past it (overhead outgrows capability — the
  // orchestrated regime is now a net loss; route through the stigmergic substrate instead).
  let value;
  if (agentCount < SATURATION_THRESHOLD) value = "potential";
  else if (agentCount === SATURATION_THRESHOLD) value = "absurd";
  else value = "active";

  const orchestrated = orchestratedCost(agentCount);
  const stigmergic = stigmergicCost(agentCount, environmentSize);

  return Object.freeze({
    kind: "swarm.saturation",
    agentCount,
    threshold: SATURATION_THRESHOLD,
    environmentSize,
    value,                                 // t under / ⊥ at / f past the saturation wall
    saturated: value === "active",
    atKnee: value === "absurd",
    orchestratedCost: orchestrated,        // ~N² — the regime that does NOT scale
    stigmergicCost: stigmergic,            // O(N+|L|) — the regime that does
    // the regime-cost ratio: how much cheaper the stigmergic substrate is at this scale. >1 means the
    // orchestrated regime is already paying more than the stigmergic one would for the same N.
    costRatio: stigmergic > 0 ? orchestrated / stigmergic : 0,
    reason: value === "potential"
      ? `${agentCount} orchestrated office(s) below the ~${SATURATION_THRESHOLD}-agent saturation knee; room to coordinate more.`
      : value === "absurd"
        ? `${agentCount} orchestrated office(s) AT the ~${SATURATION_THRESHOLD}-agent plateau; adding agents stops helping — route new work through the stigmergic substrate.`
        : `${agentCount} orchestrated office(s) PAST the saturation wall; orchestration overhead (~${orchestrated}) outgrows capability — prefer stigmergic coordination.`,
    // the structural bottlenecks the cost graph already names (cut-vertices / bridge-edges) — the
    // single points whose orchestration load is most likely to push the regime past the knee.
    cutVertices: cost.graph.cutVertices ?? [],
    bridgeEdges: cost.graph.bridgeEdges ?? [],
    bottlenecks: (cost.bottlenecks ?? []).slice(0, 8),
  });
}

// routingAdvice(root, options) — the ADVISORY regime read dispatch consults: given the saturation
// verdict, which coordination regime does the corpus's cost theorem recommend for the NEXT unit of
// work, and should that work prefer the stigmergic substrate over adding orchestrated load?
//
// ADVISORY DISCIPLINE (binding): SATURATION_THRESHOLD = 4 is an EMPIRICAL constant (MASFT 2025), not
// a derived one. So this advice is exactly that — advice. It NEVER gates dispatch (it returns no
// admit/deny), and a caller MUST NOT treat `preferStigmergic` as a hard switch derived from the
// substrate. It is a recommendation surfaced beside the decision, so a downstream router CAN prefer
// the cheap O(N+|L|) field once the orchestrated count crosses the empirical knee — and can ignore it.
// The verdict it reads is the FOUR-style value agentSaturation already computes; we do not re-derive.
export function routingAdvice(root, options = {}) {
  const saturation = options.saturation ?? agentSaturation(root, options);
  // past the knee (verdict f) the orchestrated regime is a net loss → advise the stigmergic field.
  // AT the knee (verdict ⊥) adding agents stops helping → also advise the stigmergic field for new
  // work. Below the knee (verdict t) the orchestrated regime still scales → no preference forced.
  const preferStigmergic = saturation.value === "active" || saturation.value === "absurd";
  const regime = preferStigmergic ? "stigmergic" : "orchestrated";
  return Object.freeze({
    kind: "swarm.saturation.routingAdvice",
    advisory: true,                          // NEVER a gate — the empirical constant is not derived.
    value: saturation.value,                 // the FOUR-style verdict this advice rides on.
    agentCount: saturation.agentCount,
    threshold: saturation.threshold,
    preferStigmergic,                         // a recommendation, not a switch the caller must obey.
    regime,                                   // the regime the cost theorem recommends for new work.
    costRatio: saturation.costRatio,
    reason: preferStigmergic
      ? `advisory: ${saturation.agentCount} orchestrated office(s) at/past the ~${saturation.threshold}-agent knee (empirical, not derived) — prefer routing new work through the stigmergic substrate (O(N+|L|)).`
      : `advisory: ${saturation.agentCount} orchestrated office(s) below the ~${saturation.threshold}-agent knee — the orchestrated regime still scales; no stigmergic preference forced.`,
    saturation,
  });
}
