/**
 * The attention allocation as an operation family: an incumbent with obstructions before it and a
 * finite budget reads which to reconcile next (metrologic's attention allocation, from
 * Obsmetrologia's Cohomology/AttentionAllocation.lean).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { allocateAttention } from "@red-cup-engineering/metrologic/obstruction/attention-allocation";

export function attentionAllocationOperations() {
  return Object.freeze([
    operation({
      verb: "attention-allocation",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Choose which obstructions to reconcile under a finite attention budget.",
      description: "Domain: { obstructions: [{ id, cost, benefit }], budget } with non-negative integer cost, benefit and budget. Codomain: the AttentionAllocation record: readNext in benefit-density order, the selection, its cost and benefit, the residual benefit left unreconciled, whether the selection is exactly optimal, and choiceBits (log2 of the tie-set).",
      run: (input) => allocateAttention(input),
    }),
  ]);
}
