/**
 * integrity — the STRUCTURAL-cluster detectors of the californication note (§9, structural battery):
 * the audits that watch the EXIT and the coagulation of power. Per the note's Proposition 2 these are
 * INDEPENDENT of the affective battery and must be kept distinct — a polity can pass every audit here
 * and still be californicated. Nothing in this module reads the affective register; that is the point.
 *
 *   coagulationGuard  — the dual of the kyriarchy detector: flag an EMERGING dominator (before full
 *                       capture) and name the Clastrean antidotes (rotate / strip-power / secede / refuse).
 *   foreclosureWatch  — structural foreclosure: the coalition lattice loses its BOTTOM (the
 *                       belong-to-nothing standpoint) exactly when one agent holds EVERY capability;
 *                       then there is no position from which to refuse.
 *   racketIndex       — Camatte's organization-as-racket: self-amendment acts (collective-choice +
 *                       constitutional) outweighing mission acts (operational).
 *   vitalityReading   — non-convergence-as-vitality: distinguish a CALCIFIED polity (converged,
 *                       concentrated, exit closed) from a LIVE one (exit open, decentralized, or
 *                       perpetually unsettled).
 *   secede            — fission as a first-class healthy move: a bloc withdraws into its own Social
 *                       Field carrying its meme stalk (Clastres' fission, Hirschman's exit, omníčiye
 *                       consensus-by-withdrawal).
 *
 * Consumes the jural relations of ./govern.mts, the work-carrier levels of ./deciding.mts, the FCA
 * holdings of ./coalition.mts, and the Social Field of ./field.mts; re-derives none of them.
 */

import {
  completeTranslations,
  ungroundedSection,

} from "./field.mjs";
import { coordinationFreeByRegime } from "./regime.mjs";

const held = (relation) =>
  relation.standing === "potential" || relation.standing === "stable";

const agentsOf = (relations) =>
  [...new Set(relations.flatMap((relation) => [relation.active, relation.passive]))];

// ── coagulationGuard: the kyriarchy PREVENTER (Clastres) ──

/** A watch for an emerging dominator and the antidotes that would break it before capture completes. */

  

      

/**
 * coagulationGuard — the dual of the kyriarchy classifier: rather than label a finished kyriarchy, it
 * flags power BEGINNING to coalesce (a holder commanding a strict majority of the others) and names the
 * Clastrean antidotes — rotate the dominator's offices, convert it to a Clastrean office (strip the
 * power, keep the duty), secede, or refuse the binding. The affirmative instrument of a
 * society-against-the-state.
 */
export function coagulationGuard(relations) {
  const powers = relations.filter((relation) => relation.kind === "power" && held(relation));
  const dominionOf = new Map();
  for (const power of powers) {
    const reach = dominionOf.get(power.active) ?? new Set();
    reach.add(power.passive);
    dominionOf.set(power.active, reach);
  }
  let dominator = "";
  let dominion = 0;
  for (const [holder, reach] of dominionOf) {
    if (reach.size > dominion) { dominion = reach.size; dominator = holder; }
  }
  const observers = agentsOf(relations).length;
  const concentration = observers > 1 ? dominion / (observers - 1) : 0;
  // an APEX: the dominator is commanded by no one (no held power points back at it). Mutual or
  // reciprocal power (everyone commands everyone) is balance, not coagulation — only an uncommanded
  // dominator over a strict majority is power beginning to coalesce.
  const commanded = new Set(powers.map((power) => power.passive));
  const apex = dominator !== "" && !commanded.has(dominator);
  const coagulating = observers >= 2 && apex && dominion > (observers - 1) / 2;
  return Object.freeze({
    kind: "socializing.coagulation-guard",
    dominator,
    dominion,
    concentration,
    observers,
    coagulating,
    antidotes: Object.freeze(coagulating
      ? ["rotate", "clastrean-conversion", "secede", "refuse"]
      : []),
  });
}

// ── foreclosureWatch: STRUCTURAL foreclosure of the exit (At Daggers Drawn) ──

/** A watch for whether the polity still has a standpoint of refusal (the coalition lattice's bottom). */

  

  

  

/**
 * foreclosureWatch — structural foreclosure of the exit. The coalition lattice keeps its bottom (the
 * belong-to-nothing standpoint from which a bloc may refuse) exactly while no single agent holds every
 * capability; a monopolist over all capabilities collapses that bottom into themselves, leaving no
 * position outside all mandates. This is only HALF the audit: the note's Proposition 2 shows the exit
 * can be affectively foreclosed while structurally wide open, and that half lives in the affective cluster.
 */
export function foreclosureWatch(holdings) {
  const agents = [...new Set(holdings.map((holding) => holding.agent))];
  const capabilities = [...new Set(holdings.map((holding) => holding.capability))];
  const heldBy = new Map();
  for (const holding of holdings) {
    const caps = heldBy.get(holding.agent) ?? new Set();
    caps.add(holding.capability);
    heldBy.set(holding.agent, caps);
  }
  const monopolist = capabilities.length > 0
    ? (agents.find((agent) => (heldBy.get(agent)?.size ?? 0) === capabilities.length) ?? null)
    : null;
  return Object.freeze({
    kind: "socializing.foreclosure-watch",
    agents: agents.length,
    capabilities: capabilities.length,
    monopolist,
    exitBottomPresent: monopolist === null,
    foreclosed: monopolist !== null,
  });
}

// ── racketIndex: the organization-as-racket (Camatte) ──

/** The racket reading over a governance's acts, classified by the level each operates at. */

    

/**
 * racketIndex — Camatte's organization-as-racket made measurable: classify a governance's acts by the
 * Hart/Ostrom level each operates at and compare apparatus-amending acts (collective-choice +
 * constitutional) against mission acts (operational). When the former outweigh the latter, the
 * organization has begun to exist for itself.
 */
export function racketIndex(actLevels) {
  const operational = actLevels.filter((level) => level === "operational").length;
  const collectiveChoice = actLevels.filter((level) => level === "collective-choice").length;
  const constitutional = actLevels.filter((level) => level === "constitutional").length;
  const selfReferential = collectiveChoice + constitutional;
  const total = actLevels.length;
  return Object.freeze({
    kind: "socializing.racket-index",
    operational,
    collectiveChoice,
    constitutional,
    selfReferential,
    total,
    ratio: total > 0 ? selfReferential / total : 0,
    racket: selfReferential > operational,
  });
}

// ── vitalityReading: non-convergence-as-vitality ──

/** Whether a polity is alive (open, decentralized, or perpetually unsettled) or calcified. */

  

/**
 * vitalityReading — read whether a polity is alive or calcified, treating non-convergence as health.
 * A polity is `alive` when its exit is open and it is either perpetually unsettled (the aperiodic /
 * transfinite-bounded regime, where the settling sheaf's H¹ need not vanish, that never finishes becoming the defended Existent) or genuinely decentralized;
 * `calcified` when it has converged, concentrated power, AND closed the exit — the finished order the
 * next generation must take a hammer to. Composes the regime (from governanceConvergence), a
 * concentration measure (from coagulationGuard), and an exit flag (from foreclosureWatch).
 */
export function vitalityReading(regime, concentration, exitOpen) {
  const nonConvergent = !coordinationFreeByRegime(regime);
  const converged = !nonConvergent;
  const verdict = exitOpen && (nonConvergent || concentration <= 0.5)
    ? "alive"
    : converged && concentration > 0.5 && !exitOpen
      ? "calcified"
      : "settling";
  return Object.freeze({
    kind: "socializing.vitality",
    regime,
    concentration,
    exitOpen,
    nonConvergent,
    verdict,
  });
}

// ── secede: fission as a first-class healthy move ──

const memberName = (member) =>
  String((member.agent).name ?? "");

const fieldOf = (members) => Object.freeze({
  kind: "socializing.social-field",
  members: Object.freeze([...members]),
  base: Object.freeze({ kind: "socializing.social-base", translations: completeTranslations(members.length) }),
  section: ungroundedSection(),
});

/** The result of a secession: the two Social Fields the original splits into, each carrying its members'
 *  stalks intact. */

  

/**
 * secede — fission as a FIRST-CLASS healthy operation, not a failure: the named agents withdraw from a
 * Social Field into their OWN field, carrying their meme stalk with them, and the remainder re-forms
 * without them. Each side gets a fresh, maximally-connected observer category over its own members and
 * an ungrounded section to be re-converged. The constructive counterpart to `refuse` (deny a binding) —
 * here you leave the polity entirely. The real "leave" arrow at the bottom of the coalition lattice.
 */
export function secede(field, secedingNames) {
  const seceding = new Set(secedingNames);
  const remainedMembers = field.members.filter((member) => !seceding.has(memberName(member)));
  const secededMembers = field.members.filter((member) => seceding.has(memberName(member)));
  return Object.freeze({
    kind: "socializing.secession",
    remained: fieldOf(remainedMembers),
    seceded: fieldOf(secededMembers),
  });
}
