import { address } from "@red-cup-engineering/signcell/cell";
import { derivationOrderAdmits } from "./settle.mjs";

/**
 * Turn a *source-replayed* SignCraft derivation into an indexed finite proof
 * motion carrier. This is an engineering projection, not a Lean proof or a
 * validation of the truth of the premises in the external world.
 *
 * A structural-only derivation is deliberately refused. Event IDs and source
 * IDs stay as provenance fields; the graph relation is made only from the
 * predecessor IDs of actual version-2 rule witnesses, never term sharing.
 */
export function proofMotionCarrierOf(order, settlement) {
  if (settlement === undefined)
    throw new TypeError("proof-motion carrier requires the original settlement for rule replay");
  const admission = derivationOrderAdmits(order, settlement);
  if (!admission.admitted || admission.level !== "settlement-replayed")
    throw new TypeError("proof-motion carrier requires a replayed derivation — " + (admission.reason ?? "not replayed"));

  const indexById = new Map(order.events.map((event, index) => [event.id, index]));
  const cells = [], cellIndexByAddress = new Map();
  const indexForCell = (cell) => {
    const cellAddress = address(cell); // SignCell owns canonical cell identity.
    if (!cellIndexByAddress.has(cellAddress)) {
      cellIndexByAddress.set(cellAddress, cells.length);
      cells.push(Object.freeze({ index: cells.length, address: cellAddress }));
    }
    return cellIndexByAddress.get(cellAddress);
  };
  const events = Object.freeze(order.events.map((event, index) => Object.freeze({
    index, id: event.id, cell: event.cell, cellIndex: indexForCell(event.cell),
    side: event.side, stage: event.stage, witnessId: event.witnessId,
    ...(event.ruleId === undefined ? {} : { ruleId: event.ruleId }),
  })));
  const edges = [];
  for (const event of order.events) {
    const child = indexById.get(event.id);
    for (const parentId of event.predecessors) {
      const parent = indexById.get(parentId);
      if (parent === undefined || parent >= child ||
          order.events[parent].stage >= event.stage)
        throw new TypeError("proof-motion carrier: predecessor index or strict stage violates replay");
      edges.push(Object.freeze({ parent, child }));
    }
  }
  return Object.freeze({
    kind: "signcraft.proofMotionCarrier.v1",
    sourceSettlementId: order.sourceSettlementId,
    admissionLevel: "settlement-replayed",
    eventCount: events.length,
    cellCount: cells.length, cells: Object.freeze(cells),
    events, edges: Object.freeze(edges),
  });
}

/**
 * Render only finite numeral literals from the fully replayed carrier.
 * No source strings (IDs, terms, labels, scripts, or cell content) are ever
 * interpolated into Lean code. A generated file is a proof *obligation* until
 * it is compiled by the pinned independent ObsmetrologiaComputing Lake target.
 *
 * For larger graphs, consumers must use a bounded chunked proof procedure
 * rather than overwhelming Lean with an unbounded decision expression.
 */
export function proofMotionLeanSourceOf(order, settlement) {
  const carrier = proofMotionCarrierOf(order, settlement);
  if (carrier.eventCount > 32 || carrier.edges.length > 256)
    throw new RangeError("proof-motion Lean obligation is bounded to 32 evidence events and 256 edges");

  const stages = carrier.events.map((event, i) => {
    if (!Number.isSafeInteger(event.stage) || event.stage < 0)
      throw new TypeError("proof-motion Lean stage must be a nonnegative safe integer");
    return `if i.val = ${i} then ${event.stage} else `;
  }).join("") + "0";
  const cells = carrier.events.map((event, i) =>
    `if i.val = ${i} then ${event.cellIndex} else `
  ).join("") + "0";
  const sides = carrier.events.map((event, i) =>
    `if i.val = ${i} then .${event.side === "for" ? "forEvidence" : "againstEvidence"} else `
  ).join("") + ".forEvidence";
  const edgeConditions = carrier.edges.map(({ parent, child }) =>
    `(p.val = ${parent} ∧ c.val = ${child})`);
  const edge = edgeConditions.length ? `decide (${edgeConditions.join(" ∨ ")})` : "false";

  const leanSource = `import ObsmetrologiaComputing.ProofMotionCarrier

/-! Finite stage-acyclicity obligation emitted from a source-replayed
SignCraft version-2 derivation. No source identities or arbitrary strings
enter Lean; execution and proof admission are separate operations. -/

private def motion : ObsmetrologiaComputing.ProofMotionCarrier.RawMotion ${carrier.eventCount} where
  stage := fun i => ${stages}
  cell := fun i => ${cells}
  side := fun i => ${sides}
  edge := fun p c => ${edge}

example : motion.check = true := by decide

private def checkedMotion :
    Obsmetrologia.CausalSets.Causal.Order.CausalSet (Fin ${carrier.eventCount}) :=
  motion.toCausalSet (by decide)
`;

  return Object.freeze({
    kind: "signcraft.proofMotionLeanObligation.v1",
    sourceSettlementId: carrier.sourceSettlementId,
    admissionLevel: carrier.admissionLevel,
    eventCount: carrier.eventCount,
    cellCount: carrier.cellCount,
    edgeCount: carrier.edges.length,
    carrier, leanSource,
    verifiedByLean: false,
  });
}
