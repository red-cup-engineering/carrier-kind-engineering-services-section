/**
 * computing — the agent-morphism surface of Eff = Kl(!): computing OVER enriched agents.
 *
 * computing is to the AGENT carrier what communicating is to the meme carrier: every
 * operation admits a full @red-cup-engineering/animating agent (`animating/becoming/doing/working/
 * governing/agent`) — never bare data — and is a carrier→carrier morphism with a
 * declared domain/codomain. It is multi-agent precisely because animating supplies that
 * enriched carrier (cf. communicating's meme, playing's multi-meme designs).
 *
 * The corpus's identity "computation = settling" is taken literally: an agent IS a
 * settled computation (animating settles its perceive→act loop to a glued individual),
 * so `compute` READS the agent's computational truth as one of FOUR rather than running
 * a bare realizer. The Kleisli structure is over agents: `compose` relays two agents
 * into one composite agent (the multiplication), `relay` settles a SOCIETY of agents to
 * its collective knowledge (the ≤_k join — knowing's comonad over the agents). The
 * faculty edges are real: knowing = the ≤_k aggregate (`joinKnowledge`), communicating =
 * the agent's act as a transport (`transport`), playing = the ! exponential witnessing
 * the agent reusable (`bang`). relating is the substrate (marks, FOUR).
 */
import { cell } from "@red-cup-engineering/signcell/cell";
import { cohomologyReceiptOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { receipt } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/chromatic-lorentzian";
import { members, intZero, intOne, intNegate, intIsZero as intIsZero_2, isNegative, magnitude, toCount } from "@red-cup-engineering/exact-number-data-service/exact-number";
import { isHarmonicOfWeights, hodgeDecompositionOfWeights, diffusionDirections, weightsOfEdges, graphSpectrum } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/analysis/laplacian";
import { agent } from "@red-cup-engineering/animating/becoming/doing/working/governing/agent";
import { admitCommunicationAction } from "@red-cup-engineering/communicating/communicate/morphisms/illocute";
import { ofCourse, atom } from "@red-cup-engineering/playing/structuring/concurrent-game/with-symmetry/ludicizing/proving/proposition";
import { positive } from "@red-cup-engineering/playing/structuring/polarity";
import { knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The carrier `$id`s the surface references. computing operates over the AGENT carrier. */
export const AGENT_CARRIER_ID = "animating/becoming/doing/working/governing/agent";

/** The settled-governing facet of an agent (the Agent carrier's `governing` is `unknown`
 *  in the published type surface; at runtime it is the animating governing carrier). */

const governingOf = (a) => a.governing;

/** Admit a full agent carrier from the wire, refusing bare data at the boundary. */
export function admitAgent(input, verb) {
  if (input !== null && typeof input === "object" && !Array.isArray(input) && (input).kind === "animating.agent") {
    return input;
  }
  throw new TypeError(`${verb}: expected an @red-cup-engineering/animating agent carrier (animating.agent), not bare data`);
}

/**
 * standingOfAgent — read an agent's computational truth as one of FOUR (computation =
 * settling). ⊤ when the goal reading is a held contradiction (stable / both); ⊥ when the
 * agent never settled (its governing is not glued, cohomologyRank > 0 — the halting /
 * Rice boundary made structural); t when the settled individual carries its goal; f when
 * it settled without carrying it.
 */
export function standingOfAgent(a) {
  // read the goal's NEGATION-AWARE held reading (the bilattice involution): ⊤ told-both about the
  // goal is a held contradiction — the society told BOTH for and against it. This is what makes
  // the inside/knowledge face see disagreement; the all-positive descent (goal.reading/satisfied
  // alone) never could. ⊥ when the agent never settled (the Rice/halting boundary, structural).
  if (a.goal.held === "stable" || a.goal.reading === "stable") return "stable"; // ⊤ by held evidence OR explicit target
  if (!a.glued) return "absurd";
  if (a.goal.held === "active") return "active"; // the goal was DENIED (against-evidence accumulated)
  return (a.goal.satisfied ? "potential" : "active");
}

/** Build a computation carrier embedding the (enriched) agent and its settled truth. */
function computationOf(a, members, standing, aggregate) {
  const governing = governingOf(a);
  return Object.freeze({
    kind: "computing.computation",
    agent: a,
    members,
    halted: a.glued,
    steps: governing.cells,
    standing,
    aggregate,
  });
}

/**
 * compute — read an agent's computation: its settling, as one of FOUR. The agent is the
 * enriched carrier (admitted, never bare); the computation embeds it. This is the
 * single-agent case: `aggregate` = `standing`.
 */
export function compute(a) {
  const standing = standingOfAgent(a);
  return computationOf(a, 1, standing, standing);
}

/**
 * compose — the Kleisli multiplication over agents: relay two agents into one composite
 * agent (b ∘ a). The composite is a genuine animating agent whose membrane carries both
 * agents' standing concerns (id|goal) and whose goal is b's — b perceives what a brings.
 * Domain = codomain = the agent carrier (an agent endomorphism, like communicating's
 * `compose` on the meme). Built through animating, so no bare data crosses the boundary.
 */
export function compose(a, b) {
  const seed = `${a.identity}|${a.goal.predicate}\n${b.identity}|${b.goal.predicate}`;
  return agent(seed, { identity: `${b.identity}∘${a.identity}`, goal: { predicate: b.goal.predicate, reading: b.goal.reading } });
}

/**
 * relay — settle a SOCIETY of agents to its collective knowledge: the multi-agent
 * computation. Each agent contributes its settled truth; the society's `aggregate` is the
 * ≤_k join (knowing's comonad over the agents) — a society where one agent verifies and
 * another refutes aggregates to ⊤ ("told both"). `standing` is the lead agent's result.
 */
export function relay(lead, rest) {
  const standing = standingOfAgent(lead);
  let aggregate = standing;
  for (const member of rest) aggregate = knowledgeJoinReading(aggregate, standingOfAgent(member));
  return computationOf(lead, 1 + rest.length, standing, aggregate);
}

/** The von Neumann cardinality of a `Natural` (its member set's size IS the number). */

/** The complete comparison graph on `n` agents (every pair compared). */
function completeAgentPairs(n) {
  const pairs = [];
  for (let left = 0; left < n; left += 1) for (let right = left + 1; right < n; right += 1) pairs.push([left, right]);
  return pairs;
}

/** Two agent standings in direct knowledge-conflict: one verified (t), the other refuted (f) — the
 *  ⊤ "told-both" disagreement loci. ⊥/⊤ standings are never opposed (no definite direction). */
const opposedStanding = (left, right) =>
  (left === "potential" && right === "active") || (left === "active" && right === "potential");

/** An agent standing's KNOWLEDGE-LEAN as an exact integer: +1 verified (t), −1 refuted (f), 0 for
 *  undecidable (⊥) / contradictory (⊤). The observable whose harmonicity on the comparison graph IS
 *  the society's coordination-free consensus equilibrium (CALM). */
const standingLean = (standing) =>
  standing === "potential" ? intOne : standing === "active" ? intNegate(intOne) : intZero;

const agreementPredicate = "computing-agreement";
const agentVertex = (index) => `agent:${index}`;

function agreementCohomologyReceipt(agentCount, clusters, agreement) {
  const cells = agreement.map(([left, right]) => cell(agentVertex(left), agreementPredicate, agentVertex(right)));
  const receipt = cohomologyReceiptOfCells(cells);
  return Object.freeze({
    kind: "computing.spectral-society.cohomology",
    agents: agentCount,
    edges: agreement.length,
    clusters,
    supportH0: receipt.h0,
    h1: receipt.h1,
    vanishing: receipt.vanishing,
    laplacian: receipt.laplacian,
  });
}

/**
 * spectralSociety — the agent society read through the substrate graph Laplacian
 * (`@red-cup-engineering/relating` analysis.laplacian). Where `relay` folds the society's ≤_k aggregate, this reads
 * the structural resilience of its CONSENSUS: the AGREEMENT graph is the comparison edges whose agent
 * standings are not in direct (verified-vs-refuted) conflict.
 *   • clusters = the connected-component count H⁰ (the Laplacian's zero-eigenvalue multiplicity) — the
 *     number of independent agent consensus communities (isolated agents counted).
 *   • societyTrees = the Matrix-Tree spanning-tree count — the society's CONSENSUS ROBUSTNESS: `0` the
 *     society fragments, `1` a single fragile agreement thread, `> 1` redundant agreement paths (a
 *     CALM-resilient society where coordination-free convergence survives a few disagreements).
 * The contested (⊤) concerns remain the FLP-hard loci `relay` already surfaces; this reads the
 * coordination-free skeleton around them.
 */

  

  

      

  

         

/** Read a society's consensus resilience through the substrate graph Laplacian: the agreement graph's
 *  component count (H⁰) and spanning-tree robustness. The comparison graph defaults to complete. */
export function spectralSociety(agents, edges) {
  const comparison = edges ?? completeAgentPairs(agents.length);
  const standings = agents.map(standingOfAgent);
  const agreement = comparison.filter(([left, right]) => !opposedStanding(standings[left], standings[right]));
  const spectrum = graphSpectrum(agents.length, agreement.map(([left, right]) => [left, right]));
  const clusters = toCount(spectrum.components);
  const societyTrees = toCount(magnitude(spectrum.spanningTrees));
  const comparisonWeights = weightsOfEdges(agents.length, comparison.map(([left, right]) => [left, right]));
  const atEquilibrium = isHarmonicOfWeights(comparisonWeights, standings.map(standingLean));
  const hodge = hodgeDecompositionOfWeights(weightsOfEdges(agents.length, agreement.map(([left, right]) => [left, right])));
  const cohomology = agreementCohomologyReceipt(agents.length, clusters, agreement);
  return Object.freeze({
    kind: "computing.spectral-society",
    agents: agents.length,
    clusters,
    unified: clusters === 1,
    societyTrees,
    robust: societyTrees > 1,
    fragile: societyTrees === 1,
    derivable: toCount(hodge.exact),
    irreducible: toCount(hodge.harmonic),
    atEquilibrium,
    cohomology,
  });
}

/** The diffusion endpoint of a society's standings: where each agent's agreement-community settles. */

  

  

/**
 * diffusedSociety — diffuse the society's standings to consensus. Each agent relaxes to the net
 * knowledge-DIRECTION of its agreement-community (`sign` of the harmonic projection `lim_{t→∞} e^{−tL}`
 * onto `ker L` — the per-community mean standing), read through the substrate `diffusionDirections`.
 * Where `spectralSociety.atEquilibrium` asks WHETHER the standings are already harmonic, this reads what
 * the society settles TO: how many agents land for / against / balanced once consensus diffuses.
 */
export function diffusedSociety(agents, edges) {
  const comparison = edges ?? completeAgentPairs(agents.length);
  const standings = agents.map(standingOfAgent);
  const agreement = comparison.filter(([left, right]) => !opposedStanding(standings[left], standings[right]));
  const weights = weightsOfEdges(agents.length, agreement.map(([left, right]) => [left, right]));
  const directions = diffusionDirections(weights, standings.map(standingLean));
  let leansFor = 0;
  let leansAgainst = 0;
  let balanced = 0;
  for (const direction of directions) {
    if (intIsZero_2(direction)) balanced += 1;
    else if (isNegative(direction)) leansAgainst += 1;
    else leansFor += 1;
  }
  return Object.freeze({ kind: "computing.diffused-society", agents: agents.length, leansFor, leansAgainst, balanced });
}

/**
 * transport — read an agent's outward act as a communicating transport (meme out): the
 * agent communicating its identity asserting its goal. The communicating faculty edge.
 */
export function transport(a) {
  return admitCommunicationAction({ action: "communicating.admit", actor: a.identity, claim: a.goal.predicate, force: "assertion" });
}

/**
 * bang — witness an agent as the ! exponential !A (the reusable Kleisli domain), via
 * playing's of-course. The playing faculty edge: "a computer is a game made repeatable".
 */
export function bang(a) {
  return ofCourse(atom(a.identity, positive()));
}

