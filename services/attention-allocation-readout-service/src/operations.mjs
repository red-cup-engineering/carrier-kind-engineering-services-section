/**
 * The attention allocation as an operation family: an incumbent with obstructions before it and a
 * finite budget reads which to reconcile next (metrologic's attention allocation, from
 * Obsmetrologia's Cohomology/AttentionAllocation.lean).
 */
import { operation } from "@red-cup-engineering/computer-system-engine/rpc/operation";
import { allocateAttention } from "@red-cup-engineering/metrologic/obstruction/attention-allocation";
import { decideAttentionWorkPlacement } from "@red-cup-engineering/computer-inference-engine/dispatch/work-placement";

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
    operation({
      verb: "attention-work-placement",
      inputFormat: "json",
      outputFormat: "json",
      summary: "Read which measured, independently placeable work fits one explicit attention budget.",
      description: "Admits TypedWorkDemand candidates through the existing denomination-aware Pareto placement law, retaining receiver-observation evidence and choice-required/refused decisions. Allocates a named natural-count attention budget over disjoint held obstruction identities, preserving exact/approximate and handed tie semantics. This readout performs no work, reserves no shared quota, and claims no observed removal or asset settlement.",
      effects: { class: "pure", replay: "safe", coordination: "coordination-free", deterministic: true, totality: "partial" },
      run: (input) => decideAttentionWorkPlacement(input),
    }),
  ]);
}
