import test from "node:test";
import assert from "node:assert/strict";

import {
  closureToStableOperator,
  evidenceFlowLedgerNoether,
  joinClosureOperator,
  operationalAccountingLawReceipt,
  operationalAccountingLedger,
  truthSideClosureOperator,
  valuation,
} from "../src/lib/math/topology/flow.mts";
import { workItemAccountingOfDiamond } from "../src/work/read-models.mts";

function workDiamond(opening, discharge) {
  const item = `task:account-${opening}-${discharge}`;
  return Object.freeze({
    kind: "metroplat.workItem.diamond",
    id: `${item}#0`,
    item,
    index: 0,
    lower: Object.freeze({ item, event: "opened", charge: opening, at: "2026-07-13T14:00:00.000Z" }),
    upper: Object.freeze({ item, event: "settled", charge: discharge, at: "2026-07-13T15:00:00.000Z" }),
    deshrouded: false,
  });
}

test("operational accounting carries exact receipts plus residue at every horizon", () => {
  const seed = valuation(["jump", "truth-loss"], { jump: "unknown", "truth-loss": "held" });
  const partial = operationalAccountingLedger(closureToStableOperator, seed, 0);
  assert.equal(partial.initialCost, 3);
  assert.equal(partial.accumulatedFlux, 0);
  assert.equal(partial.residue, 3);
  assert.equal(partial.balanced, true);
  assert.equal(partial.quiescent, false);
  assert.equal(partial.closed, false);

  const closed = operationalAccountingLedger(closureToStableOperator, seed, 1);
  assert.equal(closed.initialCost, 3);
  assert.equal(closed.accumulatedFlux, 3);
  assert.equal(closed.residue, 0);
  assert.equal(closed.balanced, true);
  assert.equal(closed.quiescent, true);
  assert.equal(closed.closed, true);
  assert.deepEqual({
    flux: closed.receipts[0].flux,
    commitments: closed.receipts[0].commitments,
    mints: closed.receipts[0].mints,
    jumps: closed.receipts[0].jumps,
    truthRegisterLosses: closed.receipts[0].truthRegisterLosses,
    inconsistencyRegisterGains: closed.receipts[0].inconsistencyRegisterGains,
  }, {
    flux: 3,
    commitments: 0,
    mints: 1,
    jumps: 1,
    truthRegisterLosses: 1,
    inconsistencyRegisterGains: 1,
  });
});

test("ledger Noether receipt preserves negation and reverses conflation registers", () => {
  const before = valuation(["cell"], { cell: "unknown" });
  const after = valuation(["cell"], { cell: "held" });
  const witness = evidenceFlowLedgerNoether(["cell"], before, after);
  assert.equal(witness.ordinary.commitments, 1);
  assert.equal(witness.negated.commitments, 1);
  assert.equal(witness.conflatedReverse.commitments, 0);
  assert.equal(witness.conflatedReverse.mints, 1);
  assert.equal(witness.negationPreservesFlux, true);
  assert.equal(witness.conflationExchangesCommitmentsAndMints, true);
});

test("the finite law receipt covers commitments, mints, jumps, closure, and gauge conservation", () => {
  const receipt = operationalAccountingLawReceipt();
  assert.equal(receipt.conservation, true);
  assert.equal(receipt.itemization, true);
  assert.equal(receipt.truthLossAccounting, true);
  assert.equal(receipt.closesAtQuiescence, true);
  assert.equal(receipt.noether, true);
  assert.deepEqual(receipt.leanTheorems, [
    "Obsmetrologia.Valuation.stage_ledger",
    "Obsmetrologia.Valuation.truth_loss_is_record_gain",
    "Obsmetrologia.Valuation.ledger_noether",
  ]);
});

test("generic join closures price every terminal FOUR discharge", () => {
  for (const [target, flux] of [["held", 1], ["denied", 1], ["contested", 2]]) {
    const ledger = operationalAccountingLedger(
      joinClosureOperator(target),
      valuation(["task"], { task: "unknown" }),
      1,
    );
    assert.equal(ledger.settled.values.task, target);
    assert.equal(ledger.accumulatedFlux, flux);
    assert.equal(ledger.residue, 0);
    assert.equal(ledger.closed, true);
  }
});

test("work-item completion derives content-addressed accounting for every terminal FOUR discharge", () => {
  for (const [target, cost] of [["held", 1], ["denied", 1], ["contested", 2]]) {
    const judgment = workItemAccountingOfDiamond(workDiamond("unknown", target));
    assert.equal(judgment.kind, "metroplat.workItem.accounting:witness");
    assert.match(judgment.id, /^metroplat:artifact:1:rfc8785-jcs:sha-256:/);
    assert.equal(judgment.ledger.initialCost, cost);
    assert.equal(judgment.ledger.accumulatedFlux, cost);
    assert.equal(judgment.ledger.residue, 0);
  }
});

test("work-item completion preserves an obstruction for a nonmonotone charge transition", () => {
  const judgment = workItemAccountingOfDiamond(workDiamond("held", "denied"));
  assert.deepEqual(judgment, {
    kind: "metroplat.workItem.accounting-obstruction",
    reason: "non-monotone-charge-transition",
    opening: "held",
    discharge: "denied",
  });
});
