/**
 * character-agent — the CAPSTONE: the substrate character-agent the 561 corpus theorizes, made
 * executable on the ludic substrate (frontier register: skills-disciplines-and-the-character-agent).
 *
 * The corpus REJECTED the industry "character-agent = governed state machine" (a face with PersonaPolicy
 * + BehaviorPolicy + VoicePolicy + IdentitySpec stacked behind it, climbing a 6-level maturity ladder).
 * This module is the refutation as a constructed object. A character-agent is NOT a policy stack; it is a
 * bundle of:
 *   - PERSONAS — the masks it presents (designs; delocations of its plays),
 *   - DISCIPLINES — the practices it inhabits (behaviours),
 *   - SKILLS — its repertoire (typed reusable designs),
 *   - PLAYS — its performance history (chronicles),
 * and three readings that carry the corpus's thesis:
 *   - `practiced` — the disciplines it actually inhabits (some persona is admitted to the behaviour);
 *   - `repertoire` — its mastered skills and its QUIESCENCE: the fraction of its skills gone material
 *     in its disciplines. This is the wičozaní "becomes better" measure — maturity as honing toward
 *     quiescence, NOT a rung climbed by accreting policy modules;
 *   - `performedSelf` — its "self" reconstructed from the union of its plays. There is no doer behind the
 *     deeds (Butler / Girard §4.7); the self is performed, not pre-specified. No state machine behind it.
 *
 * On `@red-cup-engineering/gaming`'s `Mask`: it is the participant's HANDEDNESS (recv/send/actuate/observe) — the I/O
 * FACE the agent turns to an arena (what it shows on the Player side, what it takes on the Opponent
 * side), not a self. There is NO essence behind the masks (`performativity`
 * proves the doer-behind-the-deed does not exist), so the character is not a substance the masks hang off.
 * The character is the GLUING of its masks — a global section over the cover of its faces, coherent
 * exactly when the masks agree where they overlap, with IDENTITY DRIFT (the corpus's named failure mode)
 * as the obstruction to gluing (`identity`). This is the synchronic twin of `performedSelf`, the gluing
 * over plays (diachronic). It is a sheaf reading, not a fibration: faces and whether they cohere, no
 * substance beneath. Built in `playing` because all its ingredients live here (playing cannot import
 * gaming — the dependency runs the other way).
 *
 * Consumes `discipline`/`admits`, `skill`/`mastery`, the union-of-chronicles reconstruction, and
 * `superpose` (the ∨_k gluing); re-derives no ludics.
 */
import { cohomologyTerms } from "@red-cup-engineering/relating";
import { evaluateRunTerm } from "@red-cup-engineering/signcraft/primitives";
import { cell } from "@red-cup-engineering/signcell/cell";
import { rankVanishing } from "@red-cup-engineering/signgraph/cohomology";
import { admits } from "./discipline.mjs";
import { mastery } from "./skill.mjs";
import { superpose } from "./structuring/concurrent-game/with-symmetry/ludicizing/delocation.mjs";
import { designFromActionSet } from "./structuring/concurrent-game/with-symmetry/ludicizing/chronicle.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** The parts a character-agent is bundled from. */

  

/** A character-agent: a bundle of personas, disciplines, skills, and plays — not a policy stack. */

/** Bundle a character-agent from its name and parts. */
export function characterAgent(name, parts) {
  return Object.freeze({
    kind: "playing.character-agent",
    name,
    personas: Object.freeze([...parts.personas]),
    disciplines: Object.freeze([...parts.disciplines]),
    skills: Object.freeze([...parts.skills]),
    plays: Object.freeze([...parts.plays]),
  });
}

/** The disciplines the agent actually PRACTICES — those admitting at least one of its personas (some
 *  mask of the agent counts as a play of the practice). */
export function practiced(agent) {
  return Object.freeze(agent.disciplines.filter((d) => agent.personas.some((persona) => admits(d, persona))));
}

/** The repertoire reading: which skills are mastered, and the agent's quiescence. */

       

/**
 * repertoire — read the agent's mastered skills and its quiescence. A skill is mastered if it has gone
 * MATERIAL (incarnated, no ballast) in some discipline the agent practices. Quiescence is the mastered
 * fraction — the substrate measure of "becoming better" (wičozaní), which replaces the industry maturity
 * ladder: an agent matures by honing its skills to quiescence, not by accreting architecture.
 */
export function repertoire(agent) {
  const mastered = agent.skills.filter((s) => agent.disciplines.some((d) => mastery(s, d).mastered));
  const total = agent.skills.length;
  return Object.freeze({
    kind: "playing.repertoire",
    mastered: Object.freeze(mastered),
    total,
    quiescence: total > 0 ? mastered.length / total : 0,
  });
}

/** The performed-self reading: the agent's self as the union of its plays. */

  

  

/**
 * performedSelf — reconstruct the agent's "self" from the union of its plays (Butler's "no doer behind
 * the deed"; Girard's "a design is the union of its chronicles"). The self is performed, not a prior
 * IdentitySpec; there is no state machine behind the agent. An agent that has not yet played has only a
 * latent (empty) self — it becomes someone by performing.
 */
export function performedSelf(agent) {
  const actions = agent.plays.flatMap((c) => [...c.actions]);
  return Object.freeze({
    kind: "playing.performed-self",
    self: designFromActionSet(actions),
    plays: agent.plays.length,
    performed: agent.plays.length > 0,
    stateMachine: false,
  });
}

/** The identity reading: the character as the gluing of its masks (no essence beneath). */

    

    

    


const driftPredicate = "playing-identity-drift";
const locusToken = (locus) => locus;
const characterToken = (name) => name;
const stageOfDrift = (index) => {
  const ordinal = index === 0
    ? Object.freeze({ kind: "ordinal.closure.ordinal.zero" })
    : Object.freeze({ kind: "ordinal.closure.ordinal.successor", predecessor: Object.freeze({ kind: "ordinal.closure.ordinal.zero" }) });
  const stageOrdinal = Object.freeze({ kind: "predication.settling.stageOrdinal", ordinal });
  return Object.freeze({
    kind: index === 0 ? "predication.settling.stage.initial" : "predication.settling.stage.successor",
    ordinal: stageOrdinal,
  });
};

function driftCohomologyReceipt(name, driftLoci) {
  const driftCells = driftLoci.map((locus) => cell(characterToken(name), driftPredicate, locusToken(locus)));
  const rank = driftCells.length;
  const firstCohomology = Object.freeze({
    kind: "predication.settling.firstCohomology",
    generators: Object.freeze(driftCells.map((driftCell, index) => Object.freeze({
      kind: "predication.settling.firstCohomologyGenerator",
      stage: stageOfDrift(index),
      cell: driftCell,
    }))),
    rank,
    degree: 1,
    vanishing: rankVanishing(rank),
  });
  return Object.freeze({
    kind: "playing.identity.drift-cohomology",
    drift: driftCells.length,
    first: firstCohomology,
    vanishing: firstCohomology.vanishing,
  });
}

/**
 * identity — read a character's identity as the GLUING of its masks (personas), synchronically. The masks
 * are ∨_k-superposed into one global face-family; where two masks commit opposite readings at the same
 * locus the join lands on ⊤ — a contradiction between faces, i.e. IDENTITY DRIFT. A coherent character is
 * one whose masks glue with no drift; a drifting one shows, at some locus, what another of its faces
 * denies. There is no essence behind this — the character is exactly the glued family (cf. performedSelf,
 * the same gluing over plays rather than over masks).
 */
export function identity(agent) {
  const glued = superpose([...agent.personas]);
  const driftLoci = glued.entries.filter((e) => e.reading === "stable").map((e) => e.locusKey);
  return Object.freeze({
    kind: "playing.identity",
    glued,
    coherent: driftLoci.length === 0,
    drift: driftLoci.length,
    driftLoci: Object.freeze(driftLoci),
    cohomology: driftCohomologyReceipt(agent.name, driftLoci),
  });
}
