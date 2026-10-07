/**
 * cognizing/bind — knowing/knowledge-state → knowing/binding: the BINDING PROBLEM via
 * sheaf cohomology, as a knowing morphism.
 *
 * The binding problem is a central HARD problem of cognitive neuroscience: how do
 * distributed feature representations — color (V4), motion (MT), shape (IT), location —
 * processed in separate cortical areas, bind into ONE unified percept? The 2024–2025
 * mathematical turn (cellular-sheaf models of binding; Hansen–Ghrist sheaf Laplacians on
 * the feature graph) frames it as a sheaf-gluing question — and that is EXACTLY the corpus's
 * settling cohomology (content/…/settling-cohomology.md: H⁰ = the section realized, H¹ = the
 * obstruction to gluing local sections into one). So the famous hard problem is easy here:
 * knowing already holds the comonad context C(Meme) = the distributed features, and `bind`
 * reads their sheaf cohomology over the predication graph (entities = nodes, predications =
 * subject—object edges):
 *   - H⁰ = connected components = the distinct BOUND PERCEPTS — segmentation, how many
 *     unified objects the features cohere into (the LIMIT / cone over the feature diagram);
 *   - H¹ = the cycle rank (edges − nodes + components) = the BINDING OBSTRUCTION — the
 *     independent cycles where the same features admit multiple inconsistent conjunctions
 *     (Treisman's illusory conjunctions / von der Malsburg's superposition catastrophe).
 *     `bound` ⟺ H¹ = 0: a unique coherent conjunction exists.
 * The cohomology is the same H⁰/H¹ relating's settling sheaf computes, here at the meme
 * grain (entities/predications). Pure, total over any held knowledge-state.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { admitState, heldMemesOf } from "./section.mjs";
import { bindingCarrier } from "./binding.mjs";
import { knowledgeStateCarrier } from "./carriers.mjs";
import { cohomologyOfCells } from "@red-cup-engineering/signgraph/cohomology";
import { jsonResource } from "@red-cup-engineering/json-services-section";

const STATE_CARRIER_ID = "knowing/knowledge-state";

/** Read the held cells through SignGraph's shared cohomology carrier. */
function bindingOf(memes) {
  const cohomology = cohomologyOfCells(memes);
  const components = cohomology.zeroCohomology.rank;
  const obstruction = cohomology.firstCohomology.rank;
  return {
    kind: "knowing.binding",
    features: memes.length,
    percepts: components,
    bound: obstruction === 0,
    obstruction,
  };
}

/** bind — read whether a held knowledge-state's distributed features bind into a unified
 *  percept (the binding problem, via sheaf cohomology). */
export const bindAction = operation({
  verb: "bind",
  inputFormat: "json",
  outputFormat: "json",
  summary: "Read connected components and cycle obstruction of a held knowledge state.",
  description: `Domain: ${STATE_CARRIER_ID}. Codomain: ${bindingCarrier.id}. Read the finite graph cohomology of held SignCells through SignGraph. H⁰ (percepts) counts connected components. H¹ (obstruction) is the cycle rank; bound reports whether it is zero. These are graph measurements, not a demonstrated solution to human perceptual binding.`,
  domain: knowledgeStateCarrier,
  codomain: bindingCarrier,
  run: (input) =>
    jsonResource(bindingOf(heldMemesOf(admitState(input, "bind"))), "binding"),
});
