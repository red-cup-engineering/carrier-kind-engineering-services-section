/**
 * socialize/glue — the Mayer–Vietoris gluing of a replica-cover into its H⁰ global
 * section, with the connecting-map δ⁰ / H¹ obstruction read explicitly.
 *
 * The corpus's coordination theory (content/_archive: `replica-cover.md`,
 * `crdt-convergence-via-mayer-vietoris.md`, `cohomology-as-coordination-substrate.md`)
 * reads a node's consensus as a SHEAF GLUING. A node's replica-cover `{ o_i → target }`
 * is a covering family; its Čech nerve has the overlaps `U_i ∩ U_j`; the Mayer–Vietoris
 * sequence at degree 0 is
 *
 *   0 → H⁰(U) → ⊕_i H⁰(U_i) → ⊕_{i<j} H⁰(U_i ∩ U_j) →[δ⁰] H¹(U) → ⋯
 *
 * The decided value (the consensus) is the global section `H⁰(U)`; the obstruction to
 * gluing the local sections into it is `H¹(U)`, reached through the connecting map δ⁰.
 * Coordination-freeness is exactly `δ⁰ = 0` (cohomological-CALM), and — the corpus's
 * `bilattice-network-sheaf-consensus` theorem — the cellwise `∨_k`-merge over a
 * connected cover IS that unique global section.
 *
 * `glue` realizes this at a node: it presents `target`'s H⁰ global section by
 * `∨_k`-merging its replica-cover's local sections into it (the gluing), then re-reads
 * the consensus. The Mayer–Vietoris pieces — the cover, the glued H⁰ evidence, the δ⁰/H¹
 * obstruction, and the Čech-overlap agreements — are exposed by `replicaCoverConsensus`
 * for inspection. This is the STATIC, Čech complement to `settle`'s dynamic gossip: glue
 * assembles ONE node's cover in one MV step; settle iterates the merge to the global v∞.
 *
 * Reuses `coverOf`/`coverSubgraph` (the site's covering family + induced nerve),
 * `mergeStalks` (the ∨_k that IS the global section), `sheafEvidence`/`opposed` (the H¹
 * obstruction and overlap-agreement), and `convergeAction` (the re-read).
 */

import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import {
  sheafEvidence,
  opposed,
} from "./consensus.mjs";

import {
  admitField,
  coverOf,
  coverSubgraph,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { mergeStalks } from "./merge.mjs";
import { convergeAction } from "./converge.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/** A Čech overlap of the cover: the pair `U_left ∩ U_right` and whether the two local
 *  sections AGREE there (not opposed) — the data the gluing condition reads. */

/** The Mayer–Vietoris reading of an observer's replica-cover. */

    

    

   

    

/**
 * The Mayer–Vietoris reading over `target`'s replica-cover: the cover members, the glued
 * H⁰ section (the ∨_k pooled evidence of the component holding `target`), the H¹
 * obstruction and its δ⁰ = 0 coordination-freeness, and the Čech overlap agreements.
 */
export function replicaCoverConsensus(field, target) {
  const sub = coverSubgraph(field, target); // target is local index 0
  const consensus = sheafEvidence(sub.evidence, sub.edges);
  const component = consensus.componentConsensus.find((c) => c.members.includes(0));
  const glued = component ? component.pooled : sub.evidence[0];
  const overlaps = sub.edges.map(([left, right]) => Object.freeze({
    left: sub.members[left],
    right: sub.members[right],
    agree: !opposed(sub.evidence[left], sub.evidence[right]),
  }));
  return Object.freeze({
    cover: sub.members,
    glued,
    obstruction: consensus.obstruction,
    coordinationFree: consensus.coordinationFree,
    overlaps,
  });
}

/** glue — present `target`'s H⁰ global section by ∨_k-merging its replica-cover into it. */
export const glueAction = operation({
  verb: "glue",
  inputFormat: "json",
  outputFormat: "json",
  options: ["cover"],
  summary: "Mayer–Vietoris gluing: present observer `cover`'s H⁰ global section by ∨_k-merging its replica-cover's local sections into it; the cover's H¹ obstruction is read explicitly.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. Glues the replica-cover { o_i → target } of options.cover (default 0): the target observer's stalk becomes the cellwise ∨_k-merge of its own and its covering sources' local sections — the unique global section H⁰(U) (bilattice-network-sheaf-consensus). Then re-reads the consensus over the whole field. The Mayer–Vietoris obstruction (the cover's H¹, the δ⁰ = 0 coordination-freeness, and the Čech-overlap agreements) is exposed by replicaCoverConsensus. The static, Čech complement to settle's dynamic gossip.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "glue");
    const target = Number(args.cover ?? 0);
    if (!Number.isInteger(target) || target < 0 || target >= field.members.length) {
      throw new RangeError(`glue: cover target ${String(args.cover)} out of range`);
    }
    // H⁰: the global section over the cover = the ∨_k-merge of the cover's local sections
    // into the target (the covering sources' stalks folded into the target's).
    const sources = [...new Set(coverOf(field.base, target).map((t) => t.source))];
    const glued = sources.reduce(
      (stalk, source) => mergeStalks(stalk, field.members[source].memes),
      field.members[target].memes,
    );
    const members = field.members.map((member, index) =>
      index === target ? Object.freeze({ ...member, memes: glued }) : member,
    );
    const next = Object.freeze({ ...field, members });
    // re-read the consensus over the field now carrying the glued global section.
    return convergeAction.execute(next, {});
  },
});
