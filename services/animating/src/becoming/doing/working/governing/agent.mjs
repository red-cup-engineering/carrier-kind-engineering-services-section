/**
 * agent — the interior agent: the bottom codomain of the agency descent, and the
 * perceive(input) → act(output) loop it is.
 *
 * The corpus defines an agent as `made-of: [perception, action, goal]` — a
 * perceive→act loop. This module builds that interior product from a settled
 * `DescentState`: the agent IS the glued individual sheaf the descent settles to
 * (`individuate`), read at its knowledge-least section as a membrane with an
 * inbound (perceive) side and an outbound (act) side, polarized by `handedness`.
 * The agent is the first concrete instance of the standing goal "derive
 * organizational state as a bilattice network sheaf": its `goal` is a
 * bilattice-valued target over that sheaf.
 *
 * The loop and the spiral:
 *   - `perceive(input)` folds an input membrane into the agent and re-individuates
 *     it — the inbound leg; threading prior membrane gives the agent memory
 *     (append-only, as the corpus's logs are).
 *   - `act(agent)` reads the open cells at the agent's outbound membrane as the
 *     commitments it can make — the outbound leg.
 *   - `reseed(agent)` re-poses the settled individual ("settled below, open above")
 *     as the seed of the next-scale descent — the spiral re-entry. The cycle is
 *     CLOSED by the sibling `playing` faculty (becoming → … → play → becoming);
 *     animating provides the re-seed; playing closes it.
 */

import { claimValue, knowledgeReading, sidesOf, tokenValue } from "@red-cup-engineering/signcell/cell";
import { denialOf, tellMembrane } from "@red-cup-engineering/signcraft/membrane";

import { bigradedCohomology } from "@red-cup-engineering/metrologic/articulation/predicating/positing/settling/bigraded-cohomology";
import { communicatingFace } from "@red-cup-engineering/communicating";
import { knowingFace } from "@red-cup-engineering/knowing/face";
import { spineCoordinates } from "../../../spine.mjs";
import { contextualityOf } from "@red-cup-engineering/knowing/cognizing/contextuality";
import { playingFace } from "@red-cup-engineering/playing/face";
import { admitSeed, descend } from "../../../descending.mjs";
import { individuate } from "./individuate.mjs";
import { classifySkillfulWork } from "./skillful-work.mjs";
import { peerHandedness } from "../../embodying/handedness.mjs";
import { predicateMatches } from "../../embodying/boundary/relation-boundary.mjs";
import { census as fourCensus, knowledgeJoinOfCensus, knowledgeJoinReading } from "@red-cup-engineering/computer-data-engineering-services-section/four";

/** The boundary direction of each faculty: where it acts relative to the agent's boundary. */
const FACE_DIRECTION = Object.freeze({
  communicating: "across",
  knowing: "inside",
  playing: "outside",
});

/** The agentive-triad bilattice axis each face faculty works (the three transverse
 *  Avron axes): communicating across→TRUTH, knowing inside→KNOWLEDGE, playing
 *  outside→EVIDENCE. */
const FACE_AXIS = Object.freeze({
  communicating: "truth",
  knowing: "knowledge",
  playing: "evidence",
});

/** The local-section reading each sibling face exposes on its agentive-triad axis: the
 *  thin trio { cover, held, contested } PLUS the thick `belnap` FOUR census the trio is
 *  read from (told-nothing ⊥ / told-true t / told-false f / told-both ⊤ on that axis —
 *  content/…/four-bilattice.md). The bulk consumes both and re-types them with the face's
 *  direction/axis — it no longer settles the face itself (no generic descend-then-count),
 *  and it no longer DISCARDS the four-valued census the faculty computed: it consolidates
 *  each transverse axis's own reading. The three faculty face shapes (CommunicatingFace,
 *  KnowingFace, PlayingFace) are each structurally assignable here. */

/** The real face reading for each faculty: the sibling faculty's OWN exported face on
 *  its membrane (a readonly UtteranceCarrier[] log). communicating reads TRUTH (≤_t,
 *  the across face), knowing reads KNOWLEDGE (≤_k, the inside face), playing reads
 *  EVIDENCE (⟨a₊,a₋⟩, the outside face). The bulk imports the three faces (bulk →
 *  faces); the faces never import the bulk (the DAG). */
const FACE_READING =
  Object.freeze({
    communicating: communicatingFace,
    knowing: knowingFace,
    playing: playingFace,
  });

/** The empty four-valued census — a cover with nothing told on any FOUR corner. */
const EMPTY_BELNAP = Object.freeze({ absurd: 0, potential: 0, active: 0, stable: 0 });

/** The face's collective standing — PARAMETERIZED from relating's proof-tree ∨_k math
 *  (`knowledgeJoinOfCensus`, SignChain): the KNOWLEDGE-order join over
 *  the face's whole cover ("the fixed point settling reaches is a join"). The aggregation LAW
 *  lives in relating; the bulk only supplies its census. This equals knowing's own `aggregate`
 *  (its joinK over per-cell standings) by associativity. */
const aggregateOf = (belnap) => knowledgeJoinOfCensus(belnap);

/** The BIGRADED decomposition of a FOUR census, PARAMETERIZED from relating's proof-tree
 *  math (`bigradedCohomology`, settling/bigraded-cohomology): the bulk supplies the face's
 *  census and re-types relating's F^(k) ≅ F^(t) ⊕ F^(⊤) carrier into the Face's `bigrade`.
 *  The decomposition LAW lives in relating; animating only parameterizes it. */
const bigradeOf = (belnap) => {
  const decomposition = bigradedCohomology(belnap);
  return {
    truth: decomposition.truth,
    contradiction: decomposition.contradiction,
    collapsed: decomposition.collapse.kind === "predication.bigradedCohomology.collapse:witness",
  };
};

/** The empty face of a faculty: a cover with no local section yet (nothing told). */
const emptyFaceOf = (faculty) =>
  ({ kind: "animating.face", faculty, direction: FACE_DIRECTION[faculty], axis: FACE_AXIS[faculty], cover: 0, held: 0, contested: 0, belnap: EMPTY_BELNAP, aggregate: "absurd", bigrade: { truth: 0, contradiction: 0, collapsed: true } });

/** Re-type a sibling face's reading as animating's axis-typed local section, carrying
 *  through the thick `belnap` FOUR census the faculty read on its axis (the bulk
 *  consolidates it rather than collapsing to the thin trio). */
const asFace = (faculty, trio) => ({
  kind: "animating.face",
  faculty,
  direction: FACE_DIRECTION[faculty],
  axis: FACE_AXIS[faculty],
  cover: trio.cover,
  held: trio.held,
  contested: trio.contested,
  belnap: { absurd: trio.belnap.absurd, potential: trio.belnap.potential, active: trio.belnap.active, stable: trio.belnap.stable },
  aggregate: aggregateOf(trio.belnap),
  bigrade: bigradeOf(trio.belnap),
});

/** A goal request: the predicate the agent aims toward and the reading it targets. */

/** Options for building an agent: its identity, polarity, and goal. */

/** The committed output of one `act` — the agent's outbound (Player-side) leg. */

/** Render a settled cell as a `subject|predicate` label. */
const cellLabel = (cell) => `${String(cell.subject)}|${String(cell.predicate)}`;

/** The open (stable or absurd) cells of a section — the cells still acted upon. */
const openEntries = (section) =>
  section.filter((cell) => knowledgeReading(cell) === "stable" || knowledgeReading(cell) === "absurd");

const openCommitmentsOf = (pooled) =>
  Object.freeze([...pooled.entries()]
    .filter(([, value]) => value === "stable" || value === "absurd")
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right)));

/** The agent's identity: the option, else the first membrane utterance's token, else "agent". */
function agentIdentity(state, options) {
  if (options.identity !== undefined && options.identity.trim() !== "") return options.identity.trim();
  const first = state.utterances[0];
  return first === undefined ? "agent" : String(tokenValue(first));
}

/** Build the bilattice-valued goal: the predicate (default the first claim), the
 *  target reading (default potential), and whether the settled section already
 *  carries that predicate truth-present. */
function buildGoal(state, section, input, pooled) {
  const fallbackPredicate = state.utterances[0] === undefined ? "settled" : String(claimValue(state.utterances[0]));
  const predicate = input?.predicate !== undefined && input.predicate.trim() !== "" ? input.predicate.trim() : fallbackPredicate;
  const reading = input?.reading ?? "potential";
  const satisfied = section.some((cell) => predicateMatches(cell.predicate, predicate) && sidesOf(cell)[0]);
  // the goal's negation-aware HELD reading (⊤ when the goal predicate is both asserted and denied).
  const held = goalHeld(pooled, predicate);
  return { kind: "animating.agent.goal", predicate, reading, satisfied, held };
}

/** Read the agent's CHARACTER (ēthos) off its three boundary FACES — the dispositional nucleus
 *  χ and its behavioral space F_χ=Fix(χ) (content/…/agent/persisting/content/character.md). Read
 *  off the faces (not the all-positive bulk section): each face's `belnap` is its faculty's OWN
 *  polarity-detecting census, so the agent's combined census carries real for/against/contested
 *  variation across its three transverse axes. The `signature` is the characteristic ≤_k standing
 *  the agent's disposition leans to (the ∨_k aggregate of the combined census, from relating's
 *  `knowledgeAggregateOfCensus`); F_χ is the cells AT that standing (what the agent
 *  characteristically endorses). `constrains` (F_χ ⊊ H — the agent does NOT endorse all its cells
 *  alike, a selective disposition) and `coherent` (F_χ ≠ ∅, signature ≠ ⊥) are the non-degeneracy
 *  invariants. `inCharacter` is whether the agent's GOAL lies in F_χ. */
function characterOf(faces, goalReading) {
  const census = { absurd: 0, potential: 0, active: 0, stable: 0 };
  for (const face of faces) {
    census.absurd += face.belnap.absurd;
    census.potential += face.belnap.potential;
    census.active += face.belnap.active;
    census.stable += face.belnap.stable;
  }
  const total = census.absurd + census.potential + census.active + census.stable;
  const signature = knowledgeJoinOfCensus(census);
  const behavioralSpace = census[signature]; // |F_χ| — cells at the characteristic standing
  return {
    kind: "animating.agent.character",
    signature,
    behavioralSpace,
    constrains: behavioralSpace < total, // F_χ ⊊ H — a real, selective disposition (not endorsing all alike)
    coherent: behavioralSpace > 0 && signature !== "absurd", // F_χ ≠ ∅ — endorses something
    inCharacter: goalReading === signature, // the agent's aim is its characteristic disposition
  };
}

/** Read one boundary face from a faculty's membrane: the sibling faculty's OWN
 *  local-section reading over that membrane (a readonly UtteranceCarrier[] log), on
 *  its agentive-triad axis, re-typed into animating's Face. An empty membrane yields
 *  the empty face. */
export function faceOfMembrane(faculty, membrane) {
  if (membrane.length === 0) return emptyFaceOf(faculty);
  return asFace(faculty, FACE_READING[faculty](membrane));
}

/** Read one boundary face off a settled descent state: the sibling faculty's OWN
 *  local-section reading over that state's membrane (no generic descend-then-count). */
export function faceOf(faculty, state) {
  return faceOfMembrane(faculty, state.utterances);
}

/** The membrane read negation-aware: relating's membrane (a denial tells the claim's cell against), one
 *  knowledge reading per `subject|claim`, so an assertion and its denial read ⊤ (told-both) there. The shared substrate of every
 *  interior negation-aware reading. */
function pooledMembrane(membrane) {
  const pooled = new Map();
  for (const told of tellMembrane(membrane)) pooled.set(`${String(told.subject)}|${String(told.predicate)}`, knowledgeReading(told));
  return pooled;
}

/** The negation-aware perceptual reading of the agent's whole membrane — the interior bulk
 *  read with the bilattice negation INVOLUTION (~⟨a₊,a₋⟩ = ⟨a₋,a₊⟩-swap; content/…/negation.md),
 *  NOT the all-positive generic descent. A held contradiction (⊤) is genuinely reachable.
 *  One pass over the UNION membrane (no triple-count of the co-incident single-cover faces). */
function perceptualReadingOf(pooled)

 {
  const census = fourCensus([...pooled.values()]);
  return {
    held: census.potential + census.active + census.stable, // cells holding a settled direction
    contested: census.stable, // ⊤ told-both — the held contradictions (now genuinely reachable)
    affordances: census.absurd + census.stable, // open cells: told-nothing ⊥ or told-both ⊤
    cover: pooled.size,
  };
}

/** The goal predicate's negation-aware HELD reading: the ≤_k join over the pooled membrane cells
 *  whose bare label matches the goal predicate (any subject). ⊥ absurd when the goal is unmentioned;
 *  ⊤ stable when it was both asserted and denied — the held contradiction about the goal itself. */
function goalHeld(pooled, predicate) {
  const target = denialOf(predicate).label;
  let held;
  for (const [key, value] of pooled) {
    if (key.slice(key.indexOf("|") + 1) === target) held = held === undefined ? value : knowledgeJoinReading(held, value);
  }
  return held === undefined ? "absurd" : held;
}

const POSITIVE_SENTIMENT = /^(?:likes?|loves?|trusts?|befriends?|admires?|supports?|allies?(?:-with)?)\b/i;
const NEGATIVE_SENTIMENT = /^(?:dislikes?|hates?|distrusts?|opposes?|fears?|rejects?|betrays?)\b/i;

/** Read the agent's COHERENCE: parse its membrane's SENTIMENT ties (likes/trusts = +, dislikes/
 *  distrusts = −) into a signed belief graph and judge Heider structural balance via knowing's
 *  `contextuality` (signed-graph balance = Heider balance = the Z₂/H¹ obstruction). Non-sentiment
 *  claims contribute no tie. `balanced` ⟺ the agent's social world splits into two consistent camps. */
function coherenceReadingOf(membrane) {
  const constraints = [];
  for (const carrier of membrane) {
    const subject = String(tokenValue(carrier)).trim();
    const claim = String(claimValue(carrier)).trim();
    const match = POSITIVE_SENTIMENT.exec(claim) ?? NEGATIVE_SENTIMENT.exec(claim);
    if (match === null) continue;
    const positive = POSITIVE_SENTIMENT.test(claim);
    const target = claim.slice(match[0].length).replace(/^[\s-]+/, "").trim(); // strip the verb + separator
    if (subject === "" || target === "" || subject === target) continue;
    constraints.push(`${subject}${positive ? "=" : "!="}${target}`); // + ⇒ same camp, − ⇒ opposite
  }
  const verdict = contextualityOf(constraints);
  return { balanced: verdict.globalSection, dissonance: verdict.frustration, ties: constraints.length };
}

/** Build the interior agent: the global section glued from its three boundary faces.
 *  `state` is the settled union of the faces' logs (the interior bulk); `faces` are
 *  the three boundary covers it is seen through; `glued` (H¹=0) follows from the
 *  union's settlement. */
export function buildAgent(state, faces, options = {}) {
  const section = state.section;
  const governing = individuate(state);
  const hand = options.handedness ?? peerHandedness();
  // The agent's INTERIOR readings are negation-aware (the bilattice involution `negate`), so a
  // held contradiction (⊤) is genuinely reachable — unlike the all-positive generic descent.
  const pooled = pooledMembrane(state.utterances);
  const perceptual = perceptualReadingOf(pooled);
  // CONSOLIDATE the knowing (inside/knowledge) face's settling regime: does the agent's interior
  // knowledge converge (reflecting/recallable) or ruminate aperiodically? (knowing's gauge faculty).
  const knowingRegime = knowingFace(state.utterances).regime;
  // CONSOLIDATE the communicating (across/truth) face's LEAN: which way the agent leans on the
  // bilattice TRUTH order ≤_t (∨_t, negation-antitone) — the dual axis to the ≤_k cognition/character.
  const truthLean = communicatingFace(state.utterances).lean;
  // CONSOLIDATE knowing's `contextuality` as the agent's Heider structural balance (coherence).
  const coherenceReading = coherenceReadingOf(state.utterances);
  // the associated milieu (Simondon): the residual pre-individual potential — cells not yet at
  // the knowledge-top (held but not contested ⊤), what the settled individual carries and re-seeds.
  const milieu = perceptual.held - perceptual.contested;
  const goal = buildGoal(state, section, options.goal, pooled);
  // CONSOLIDATE the agent's WORK type: the (σ, Δ) nuclear quartet read off its two
  // non-communicating faces — σ (meaning-closure) = the inside/knowing face settled
  // (`cognition.reflects`), Δ (execution-closure) = the outside/playing face settled
  // (no open affordances). Inquiry/Procedure/Derivation/Process, ordered on relating's ≤_k.
  const work = classifySkillfulWork({
    operation: knowingRegime.reflects ? "settled" : "open",
    inputsAndPath: perceptual.affordances === 0 ? "settled" : "open",
  });
  const result = {
    kind: "animating.agent",
    identity: agentIdentity(state, options),
    loop: "perceive->act",
    faces: [...faces],
    glued: governing.glued,
    perception: {
      kind: "animating.agent.perception",
      recv: hand.recv,
      observe: hand.observe,
      held: perceptual.held,
      contested: perceptual.contested,
    },
    action: {
      kind: "animating.agent.action",
      send: hand.send,
      actuate: hand.actuate,
      affordances: perceptual.affordances,
    },
    stance: {
      kind: "animating.agent.stance",
      lean: truthLean,
    },
    cognition: {
      kind: "animating.agent.cognition",
      regime: knowingRegime.regime,
      reflects: knowingRegime.reflects,
    },
    coherence: {
      kind: "animating.agent.coherence",
      balanced: coherenceReading.balanced,
      dissonance: coherenceReading.dissonance,
      ties: coherenceReading.ties,
    },
    goal,
    governing,
    handedness: { kind: "animating.agent.handedness", recv: hand.recv, send: hand.send, actuate: hand.actuate, observe: hand.observe },
    settledBelow: true,
    openAbove: true,
    milieu,
    character: characterOf(faces, goal.reading),
    work,
  };
  return result;
}

/** The three boundary faces read off a single settled state — the degenerate
 *  single-cover case where the three faculties share one membrane. The
 *  three-cover gluing proper is `glue` (../../../../gluing). */
export function facesOf(state) {
  return [faceOf("communicating", state), faceOf("knowing", state), faceOf("playing", state)];
}

/** Animate a seed into the interior agent — the spine: descend, read its three
 *  (here co-incident) faces, then glue the interior. */
export function agent(seed, options = {}) {
  const state = descend(admitSeed(seed));
  return buildAgent(state, facesOf(state), options);
}

/**
 * perceive — the inbound loop leg. Fold an input membrane into a prior membrane
 * (memory, append-only) and re-individuate the agent over the union. With empty
 * memory it is exactly `agent` over the input.
 */
export function perceive(input, memory, options = {}) {
  const inbound = admitSeed(input);
  const prior = memory === undefined ? [] : admitSeed(memory);
  const state = descend([...prior, ...inbound]);
  return buildAgent(state, facesOf(state), options);
}

/**
 * act — the outbound loop leg. Read the open cells at the agent's membrane as the
 * commitments it can act on, carried with its Player-side polarity. Pure over the
 * settled descent; the membrane is re-derived from the seed.
 */
export function act(seed, options = {}) {
  const state = descend(admitSeed(seed));
  const built = buildAgent(state, facesOf(state), options);
  const pooled = pooledMembrane(state.utterances);
  const commitments = openCommitmentsOf(pooled);
  const sectionCommitments = commitments.length === 0
    ? openEntries(state.section).map(cellLabel)
    : [];
  return {
    kind: "animating.agent.act",
    identity: built.identity,
    send: built.action.send,
    actuate: built.action.actuate,
    commitments: commitments.length === 0 ? sectionCommitments : commitments,
  };
}

/**
 * reseed — the spiral re-entry. The settled individual ("settled below, open
 * above") re-poses itself as the seed of the next-scale descent. Simondon supplies
 * the mechanism: the individuated being is never exhausted by its individuation; it
 * carries a reading of pre-individual potential — its associated `milieu` — that
 * drives further individuation. So the settled self, full of residual potential,
 * re-enters as the seed of a fresh four-fold descent now AMONG OTHER SELVES
 * (individual → relating → community → institution — the social descent that
 * @red-cup-engineering/organizing settles). The cycle is closed by the sibling `playing` faculty;
 * this provides the re-seed it closes over.
 */
export function reseed(seed, options = {}) {
  const built = agent(seed, options);
  const reposed = `${built.identity}|individuated`;
  const result = {
    kind: "animating.becoming",
    ...spineCoordinates("articulating"),
    face: "animate",
    epistemic: "question",
    seed: [reposed],
    cells: 1,
    openAbove: true,
  };
  return result;
}

