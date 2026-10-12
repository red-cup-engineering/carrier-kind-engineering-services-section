/**
 * socialize/converge — ground↑: the social-settling toward the apex.
 *
 * converge is endomorphic on the Social Field (field → field): it (re)computes the
 * glued common-ground `section` over the WHOLE sheaf. Each member contributes a
 * representative evidence `cᵢ` — the knowledge-join (`joinKnowledge`) of that member's
 * local memes' evidence (a memeless member contributes ⊥ = absurd, the
 * knowledge-bottom). The network-sheaf consensus is then read over the comparison
 * graph forgotten from the observer category `O`'s translations (`comparisonEdges`)
 * and projected into `CommonGround`.
 *
 * The H¹/consensus law lives in socializing's own `consensus` module: converge calls
 * `sheafEvidence` from `./consensus.mjs` — the corpus's bilattice-network-sheaf-consensus
 * computation, socializing's domain (per-pair grounding is communicating's
 * groundAction / relating's joinKnowledge+meetKnowledge, which sheafEvidence composes
 * as pooled = ⋀_k, common = ⋁_k; the obstruction is the H¹ of the opposition
 * subgraph). socializing thereby inherits the theorem:
 *
 *   section.glued = true  ⟺  section.obstruction = 0  ⟺  the agents' memes glue.
 *
 *   obstruction = 0 (consensus): the local meme-sections extend to a single glued
 *     global section — common ground exists; coordinationFree = true (H¹ = 0). A
 *     held contradiction over a TREE of edges (no cycle) still glues, with the
 *     component pooled to `stable` — disagreement that does not cycle is both-
 *     witnessed common ground.
 *   obstruction > 0 (standing disagreement): a CYCLE of opposed edges; the local
 *     sections do not glue. Consensus is held, paraconsistent, not exploded — a
 *     held contradiction settles `stable` (merged witnesses), never `absurd`. This
 *     is H¹ ≠ 0, the bilattice-network-sheaf made social.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import {
  sheafEvidence,

} from "./consensus.mjs";

import {
  admitField,
  comparisonEdges,
  representativeEvidence,
  coverSubgraph,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import {
  jointRegime,
  coordinationFreeByRegime,
  federationDiscipline,
  observerRegime,
} from "./regime.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** converge — knowledge-join across the sheaf (or a replica-cover); write the
 *  H¹/consensus section. */
export const convergeAction = operation({
  verb: "converge",
  inputFormat: "json",
  outputFormat: "json",
  options: ["edges", "cover"],
  summary: "ground↑: settle the field toward its apex — the consensus limit, its opposition-H¹ (over the whole graph or a given replica-cover), AND the regime stratification.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Writes the section on TWO orthogonal axes. STATIC opinion axis: each observer contributes a representative evidence (knowledge-join of its memes' evidence; ⊥ if none); sheafEvidence reads the network-sheaf consensus over the comparison graph forgotten from the observer category O's translations — section.common is the consensus limit (lim_O V, the knowledge-meet), section.glued ⟺ obstruction = 0 ⟺ the observers' opinions glue, coordinationFree = (obstruction = 0). options.cover restricts the reading to the REPLICA-COVER of that observer (its covering family + the induced Čech nerve), tying H¹ to that cover; options.edges overrides the whole-graph edges otherwise. DYNAMIC regime axis: regime = the costliest closure regime among the observers' knowledge orbits (each agent's cognition regime); regimeCoordinationFree = the settling sheaf's H¹ vanishes in that regime (strict/scott); federationDiscipline = endpoint-state (strict/scott) or trajectory (transfinite-bounded/aperiodic).",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "converge");

    // The members and comparison edges the consensus reads: the whole observer graph,
    // or — when options.cover names a target — the induced Čech nerve of that observer's
    // replica-cover (so H¹ is the obstruction to gluing THAT cover).
    const covering = args.cover === undefined || args.cover === null ? null : coverSubgraph(field, Number(args.cover));
    const memberIndices = covering
      ? covering.members
      : field.members.map((_, index) => index);
    const evidence = covering
      ? covering.evidence
      : field.members.map((member) => representativeEvidence(member.memes));
    const edges = covering
      ? covering.edges
      : Array.isArray(args.edges)
        ? (args.edges).map((pair) => {
            const [left, right] = pair;
            return [Number(left), Number(right)];
          })
        : comparisonEdges(field.base);

    const consensus = sheafEvidence(evidence, edges);

    // component members come back as local indices into `evidence`; remap to the field's
    // original observer indices (identity in the whole-graph case).
    const components = consensus.componentConsensus.map((component) => Object.freeze({
      members: Object.freeze(component.members.map((local) => memberIndices[local])),
      pooled: component.pooled,
      common: component.common,
    }));

    // The dynamic regime axis (orthogonal to the static opposition-H¹ above): the costliest
    // of the observers' knowledge-orbit regimes fixes whether the merge is coordination-free
    // by regime and the federation discipline a merge must obey.
    const regime = jointRegime(field.members.map((member) => observerRegime(member.agent)));

    const section = Object.freeze({
      kind: "socializing.common-ground",
      glued: consensus.coordinationFree,
      obstruction: consensus.obstruction,
      coordinationFree: consensus.coordinationFree,
      cohomology: consensus.cohomology,
      components,
      regime,
      regimeCoordinationFree: coordinationFreeByRegime(regime),
      federationDiscipline: federationDiscipline(regime),
    });

    const next = Object.freeze({ ...field, section });
    return jsonResource(next, "social-field");
  },
});
