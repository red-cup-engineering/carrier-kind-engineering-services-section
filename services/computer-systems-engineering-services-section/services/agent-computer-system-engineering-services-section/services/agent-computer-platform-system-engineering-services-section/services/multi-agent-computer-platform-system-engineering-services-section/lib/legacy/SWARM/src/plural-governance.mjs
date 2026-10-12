import { asChargeValueName, chargeValue, chargeValueName, joinKnowledgeValue } from "@red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge";
// plural-governance.mjs — the three-regime coproduct made real: a swarm governs an action under
// SEVERAL governance objects AT ONCE, holding their verdicts side by side and never collapsing a
// disagreement to one answer.
//
// GROUND. The swarm-governance note (computer/docs/dev/notes/swarm-governance.md §2, lines 50-53) states
// that the 561 polity "holds three governance objects simultaneously" and records this as a THREE-PATTERN
// COPRODUCT: "S_561 = S_wolak ⊔ S_ship ⊔ S_Web — the polity holds three governance objects simultaneously
// with explicit compatibility-conditions on overlaps." §2 (lines 43-47) is emphatic that the kyriarchical
// SHIP regime and the tiyóšpaye (wolakȟota) regime "are two distinct objects of Gov" and that importing
// one onto the other "corrupts both": most acts of one "have no image under a structure-preserving
// translation" into the other. So the coproduct does NOT translate one regime's verdict into another's —
// it holds each verdict UNDER ITS OWN REGIME, in parallel.
//
// §3 identity-6 (lines 93-96) names what to DO with their disagreement: cross-tiyóšpaye disagreement
// "is recorded ... as ⊤-firings"; disagreement-pairs "live in ker(δ) (no federation-level H¹)". So this
// module READS the coproduct two ways, both grounded:
//   (1) the SECTION — each regime's verdict held distinctly, side by side (the coproduct itself: a
//       disjoint union, no collapse). This is S_wolak ⊔ S_ship ⊔ S_Web as data.
//   (2) the OVERLAP READING — the bilattice KNOWLEDGE-JOIN of the regime verdicts (judgment.mjs exports
//       it from @red-cup-engineering/metrologic/articulation/predicating/positing/bilattice-charge): where the regimes AGREE the join settles to their shared
//       value; where they DISAGREE on the truth axis it rises to held-⊤ — the ⊤-firing identity-6 records.
//       The join is the corpus's own settling operator (the kernel's knowledge-join, used everywhere a
//       collective model is formed); a federation-level disagreement is therefore a held-⊤, never a vote.
//
// This module authors NO new governance theory and NO Lakota content. It runs each regime's EXISTING
// admit rule (the OS REGIMES registry's admitUnder, plus SWARM's recognition pole) and folds the result
// with the kernel's existing knowledge-join. It is the coproduct OBJECT made addressable, nothing more.
//
// It is ADDITIVE and selectable: governAction is untouched (it still selects ONE regime by default);
// a caller that wants the plural reading calls governPlural explicitly. Kyriarchy stays the default
// single-regime path for every caller that does not opt in.

import { admitUnder, REGIMES, DEFAULT_REGIME } from "./regimes.mjs";
import { can, officeNameFor } from "./offices.mjs";

import { authorityFour, leaderJudgment } from "./recognition.mjs";

// RECOGNITION_REGIME is SWARM's own (it reads recognition cells off the trace, not the OS registry).
// It is named here so the coproduct can carry the recognition pole as one of its limbs without importing
// governance.mjs (which would be a cycle — governance.mjs may later import this).
export const RECOGNITION_REGIME = "recognition";

// The 561 coproduct's three named limbs, in the corpus's own terms (swarm-governance.md §2 lines 51-53):
//   S_ship  — the kyriarchical ship regime (captain / delegation chain / office capability).
//   S_wolak — the tiyóšpaye / wolakȟota regime (consensus-by-withdrawal: kin-relational settling).
//   S_Web   — the third governance object the coproduct names. The corpus DOES NOT derive a distinct
//             S_Web admit rule (it is named, not built — like the KNOWN_REGIME_FAMILIES catalogued for
//             honesty in distribution/governance.mjs). So the default coproduct carries the TWO derived
//             ship/wolak limbs PLUS the recognition pole (SWARM's own derived authority object), and
//             names S_Web as a declared-but-underived slot a caller may supply. We do NOT fabricate an
//             S_Web rule; an honest underived limb is recorded, never executed.
export const S_561_LIMBS = Object.freeze([
  Object.freeze({ tag: "S_ship", regime: "kyriarchical", derived: true,
    source: "swarm-governance.md §2 line 51 (S_ship)" }),
  Object.freeze({ tag: "S_wolak", regime: "consensus-by-withdrawal", derived: true,
    source: "swarm-governance.md §2 line 51 (S_wolak); tiyospaye §1.3-1.5" }),
  Object.freeze({ tag: "S_recognition", regime: RECOGNITION_REGIME, derived: true,
    source: "recognition.mjs (authority is the aggregate of recognition); swarm-governance.md §1" }),
  Object.freeze({ tag: "S_Web", regime: "", derived: false,
    source: "swarm-governance.md §2 line 52 (S_Web) — named, not derived" }),
]);

// run ONE limb's admit rule under its own regime, in its own vocabulary. The ship/wolak/advisory/
// contrarian limbs run the OS REGIMES registry (admitUnder); the recognition limb runs SWARM's
// recognition pole (it reads the trace's recognition cells, which the OS layer never touches). An
// underived limb (S_Web, no admit rule) yields a held ⊥ with an explicit "not-derived" reason — it is
// recorded in the section, never silently dropped and never fabricated.
function admitLimb(limb, ctx) {
  if (!limb.derived || !limb.regime) {
    return Object.freeze({
      tag: limb.tag,
      regime: limb.regime || limb.tag,
      derived: false,
      value: "absurd", // genuinely undecided: there is no rule to settle this limb
      reason: `${limb.tag} is named by the coproduct but not derived (${limb.source}); its verdict is undecided (⊥), not fabricated.`,
      source: limb.source,
    });
  }
  if (limb.regime === RECOGNITION_REGIME) {
    const { root, agent, action, options = {} } = ctx;
    const r = options.recognition ?? {};
    const decision = r.decision ?? action;
    const participant = r.participant ?? agent?.name;
    // a contradicted leadership (two participants at quorum) is itself a held-⊤ for whoever acts under it.
    const leader = leaderJudgment(root, decision, r);
    const verdict = leader.value === "stable"
      ? { value: "stable", reason: leader.reason }
      : authorityFour(root, decision, participant, r);
    return Object.freeze({
      tag: limb.tag, regime: RECOGNITION_REGIME, derived: true,
      value: asChargeValueName(verdict.value), reason: verdict.reason, source: limb.source,
    });
  }
  const decision = admitUnder(limb.regime, {
    agent: ctx.agent,
    action: ctx.action,
    target: ctx.target ?? {},
    options: ctx.options ?? {},
    officeName: officeNameFor(ctx.agent),
    can,
  });
  return Object.freeze({
    tag: limb.tag, regime: decision.regime, derived: true,
    value: asChargeValueName(decision.value), reason: decision.reason, jural: decision.jural, source: limb.source,
  });
}

// governPlural(root, agent, action, target, options) — govern an action under the WHOLE coproduct at
// once. Returns the SECTION (each limb's verdict, held distinctly — the disjoint union S_wolak ⊔ S_ship
// ⊔ S_recognition ⊔ S_Web) AND the OVERLAP reading (the knowledge-join of the derived limbs' verdicts).
//
// The two readings are kept apart, exactly as the corpus keeps the coproduct apart from its overlap
// content: the SECTION is the coproduct object (no collapse); the join is the federation-level overlap
// where agreement settles and disagreement FIRES held-⊤ (identity-6, ker(δ)). We NEVER admissibility-meet
// the limbs (that would pick the "worst obstruction" and discard the others — collapsing the plurality
// the coproduct exists to preserve). The join is the only fold applied, and it preserves ⊤.
//
// `options.webLimb` may supply a derived S_Web admit (a future caller's third governance object): pass
// `{ tag:'S_Web', regime:<name> }` to fill the underived slot with a real registry regime. Absent, S_Web
// stays the honest underived ⊥ limb.
export function governPlural(root, agent, action, target = {}, options = {}) {
  const ctx = { root, agent, action, target, options };
  const limbs = options.webLimb && REGIMES[options.webLimb.regime]
    ? S_561_LIMBS.map((l) => (l.tag === "S_Web" ? Object.freeze({ ...l, regime: options.webLimb.regime, derived: true, source: `${l.source} → supplied: ${options.webLimb.regime}` }) : l))
    : S_561_LIMBS;

  const section = limbs.map((limb) => admitLimb(limb, ctx));

  // the OVERLAP reading: the bilattice knowledge-join over the DERIVED limbs only (an underived ⊥ limb
  // carries no evidence and must not drag the join — ⊥ is the join's identity, so excluding it is the
  // same as including it; we exclude it for an honest reason string). Where derived limbs agree the join
  // is their shared value; where they disagree on the truth axis it rises to ⊤ — the ⊤-firing.
  const derived = section.filter((s) => s.derived);
  const overlap = derived.length
    ? derived.reduce((acc, s) => chargeValueName(joinKnowledgeValue(chargeValue(acc), chargeValue(s.value))), "absurd")
    : "absurd";

  // classify the overlap for the caller (and for a future ker(δ)/H¹ reader): a held-⊤ overlap is a
  // recorded disagreement (identity-6), not an error; an admitted overlap means every derived limb that
  // spoke agrees the act is permitted; ⊥ means no derived limb has settled.
  const contradicted = overlap === "stable";
  const admittedEverywhere = derived.length > 0 && derived.every((s) => (s.value === "potential"));

  return Object.freeze({
    kind: "swarm.governance.plural",
    action,
    actor: agent?.name ?? "",
    coproduct: "S_561 = S_wolak ⊔ S_ship ⊔ S_recognition ⊔ S_Web",
    // (1) the SECTION — the coproduct itself, each limb held distinctly, no collapse.
    section,
    // (2) the OVERLAP — the knowledge-join; ⊤ is a recorded federation-level disagreement (identity-6).
    overlap,
    contradicted,
    admittedEverywhere,
    // the disagreeing limbs, named — the ker(δ) disagreement-pair content a future H¹ reader folds.
    disagreement: contradicted
      ? derived.map((s) => ({ tag: s.tag, regime: s.regime, value: s.value })).filter((s) => s.value !== "absurd")
      : [],
    reason: contradicted
      ? `the regimes contradict on ${action}: held ⊤ (recorded, not collapsed) — ${derived.map((s) => `${s.tag}=${s.value}`).join(", ")}.`
      : admittedEverywhere
        ? `every derived regime admits ${action}: ${derived.map((s) => `${s.tag}=${s.value}`).join(", ")}.`
        : `the regimes have not jointly settled ${action}: overlap ${overlap} — ${derived.map((s) => `${s.tag}=${s.value}`).join(", ")}.`,
  });
}
