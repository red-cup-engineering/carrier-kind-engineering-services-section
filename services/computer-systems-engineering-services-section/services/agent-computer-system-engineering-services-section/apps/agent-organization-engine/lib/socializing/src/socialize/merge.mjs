/**
 * socialize/merge — the CRDT knowledge-order exchange (∨_k), scale-2-native.
 *
 * merge is the OFF-DIAGONAL heart of socializing: a genuinely inter-observer morphism
 * with NO single-agent analog (a lone observer has no peer to merge with — like
 * `admit`, it is native to scale 2). It realizes the corpus's distributed-settling
 * system (content/_archive spatiotemporal-knowledge-presheaf
 * `distributed-settling-system.md`): replicas exchange state via the **merge
 * operation — the pointwise knowledge-order join `∨_k` of their valuations**.
 *
 * `merge(from, to)` is a directed replica receive: observer `to` incorporates observer
 * `from`'s knowledge, becoming `V(to) ∨_k V(from)` cellwise; `from` is unchanged (it
 * sent a copy). The two observers must be adjacent in the observer category `O` (a
 * translation in either direction is the medium of exchange). The join is taken
 * per predication cell: memes over the same cell have their evidence `knowledgeJoin`-d
 * (the bilattice knowledge join, evidence-accumulating, dedup by `mergeEvidence`);
 * memes unique to either side carry through.
 *
 * The CRDT laws this realizes (and the suite asserts):
 *   - MONOTONE: `merge(from, to) ≥_k to` — knowledge only grows (settling-monotonicity).
 *   - IDEMPOTENT: `merge(to, to)` leaves `to` fixed (∨_k is idempotent).
 *   - the FIXPOINT of iterated merge over a component is its `pooled = ∨_k` evidence —
 *     which is exactly what `converge` reports, and (by the CALM theorem) is reached
 *     COORDINATION-FREE iff `H¹ = 0`. So merge is the dynamics; converge is its readout.
 *
 * Reuses relating's `knowledgeJoin`/`meme`/`canonical` — the same knowledge-order join
 * `converge`'s `representativeEvidence` already folds, here ranged across the edge.
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { cellSet, isCell } from "@red-cup-engineering/signcell/cell";

import {
  admitField,
  translationBetween,

} from "./field.mjs";
import { socialFieldCarrier } from "../carriers.mjs";
import { jsonResource } from "@red-cup-engineering/json-services-section";

/**
 * The pointwise knowledge-order join (∨_k) of two stalks: SignCell's cell-set merge — one
 * meme per predication cell, its evidence the union of both stalks' evidence there, in the
 * cell set's canonical order. Non-meme items (there should be none) pass through.
 *
 * This is the semilattice merge — commutative, associative, idempotent — exported so the
 * settling dynamics (`settle.mjs`) can fold it across a gossip round. A CRDT state is
 * order-irrelevant, so observers that received the same writes converge to identical stalks.
 */
export function mergeStalks(into, incoming) {
  const items = [...into, ...incoming];
  return Object.freeze([...cellSet(items.filter(isCell)), ...items.filter((item) => !isCell(item))]);
}

/** Range-check an observer index against the field. */
function observerIndex(field, value, role) {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0 || index >= field.members.length) {
    throw new RangeError(`merge: ${role} index ${String(value)} out of range`);
  }
  return index;
}

/** merge — observer `to` receives observer `from`'s knowledge (to ← to ∨_k from). */
export const mergeAction = operation({
  verb: "merge",
  inputFormat: "json",
  outputFormat: "json",
  options: ["from", "to"],
  summary: "CRDT ∨_k exchange (scale-2-native): observer `to` incorporates observer `from`'s knowledge cellwise — monotone, idempotent — over an edge of the observer category.",
  description: "Domain: a social-field carrier. Codomain: a social-field carrier. The distributed-settling merge: observer options.to becomes V(to) ∨_k V(from) — memes over the same predication cell have their evidence knowledgeJoin-d (knowledge-order join), memes unique to either side carry through; from is unchanged. The two observers must be adjacent in the observer category O. Monotone (knowledge only grows) and idempotent; the fixpoint of iterated merge over a component is its pooled ∨_k evidence, reached coordination-free iff H¹ = 0 (CALM). Has no single-agent analog — native to scale 2, like admit.",
  domain: socialFieldCarrier,
  codomain: socialFieldCarrier,
  run: (input, args = {}) => {
    const field = admitField(input, "merge");
    const from = observerIndex(field, (args.from ?? 0), "from");
    const to = observerIndex(field, (args.to ?? 1), "to");
    if (from === to) {
      // a self-merge is the identity (∨_k is idempotent) — nothing to exchange.
      return jsonResource(field, "social-field");
    }
    const adjacent = translationBetween(field.base, from, to) ?? translationBetween(field.base, to, from);
    if (!adjacent) {
      throw new RangeError(`merge: observers ${from} and ${to} are not adjacent in the observer category (no translation between them)`);
    }
    const sender = field.members[from];
    const receiver = field.members[to];
    const mergedMemes = mergeStalks(receiver.memes, sender.memes);
    const members = field.members.map((member, index) =>
      index === to ? Object.freeze({ ...member, memes: mergedMemes }) : member,
    );
    const next = Object.freeze({ ...field, members });
    return jsonResource(next, "social-field");
  },
});
