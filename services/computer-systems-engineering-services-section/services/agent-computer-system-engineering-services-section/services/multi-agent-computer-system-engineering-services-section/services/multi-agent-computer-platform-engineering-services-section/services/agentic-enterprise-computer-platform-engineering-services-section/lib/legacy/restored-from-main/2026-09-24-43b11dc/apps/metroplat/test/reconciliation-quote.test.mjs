import test from "node:test";
import assert from "node:assert/strict";

import { quoteParityReconciliation, parityReconciliationProofBasis, parityReconciliationLawReceipt } from "@lenticule-science/metrologic/models/physics/models/quantum-contextuality/reconciliation-quote";
import { claimSessionOperations } from "../src/claims/service.mjs";

const request = (measurements, contexts, menu = {}) => Object.freeze({
  kind: "relational.quantum.parity-reconciliation-request",
  measurements,
  contexts: contexts.map(([id, left, right, target]) => Object.freeze({ id, left, right, target })),
  ...menu,
});

const figureEight = request(
  ["0", "1", "2", "3", "4"],
  [
    ["01", "0", "1", true],
    ["12", "1", "2", false],
    ["20", "2", "0", false],
    ["03", "0", "3", true],
    ["34", "3", "4", false],
    ["40", "4", "0", false],
  ],
);

test("figure-eight quote separates idempotent price, record energy, and H1 rank", () => {
  const quote = quoteParityReconciliation(figureEight);
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.deepEqual(quote.topology, { vertices: 5, edges: 6, components: 1, h1Rank: 2 });
  assert.equal(quote.coset.dimension, 4);
  assert.equal(quote.coset.cardinality, "16");
  assert.equal(quote.coset.evaluatedRepresentatives, 16);
  assert.deepEqual(quote.coset.components, [{
    measurements: ["0", "1", "2", "3", "4"],
    contexts: ["01", "03", "12", "20", "34", "40"],
    dimension: 4,
    cardinality: "16",
    evaluatedRepresentatives: 16,
  }]);
  assert.equal(quote.minima.idempotentPrice, 1);
  assert.equal(quote.minima.groundStateEnergy, 2);
  assert.equal(quote.minima.erasedMultiplicity, 1);
  assert.deepEqual(quote.minima.cheapestIdempotent.idempotentSettlement.payingMeasurements, ["0"]);
  assert.deepEqual(quote.minima.cheapestIdempotent.frustratedContexts, ["01", "03"]);
  assert.deepEqual(quote.minima.cheapestIdempotent.losslessSettlement.accountedIncidences, [
    { context: "01", measurement: "0" },
    { context: "03", measurement: "0" },
  ]);
  assert.deepEqual(quote.proofBasis, parityReconciliationProofBasis);
  assert.deepEqual(quote.menuPage, { offset: 0, limit: 12, returned: 12, total: "16", nextOffset: 12 });
});

test("the whole ranked coset menu is retrievable through bounded pages", () => {
  const first = quoteParityReconciliation({ ...figureEight, menuOffset: 0, menuLimit: 5 });
  const second = quoteParityReconciliation({ ...figureEight, menuOffset: 5, menuLimit: 5 });
  const third = quoteParityReconciliation({ ...figureEight, menuOffset: 10, menuLimit: 5 });
  const fourth = quoteParityReconciliation({ ...figureEight, menuOffset: 15, menuLimit: 5 });
  for (const quote of [first, second, third, fourth]) {
    assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  }
  assert.deepEqual(first.menuPage, { offset: 0, limit: 5, returned: 5, total: "16", nextOffset: 5 });
  assert.deepEqual(second.menuPage, { offset: 5, limit: 5, returned: 5, total: "16", nextOffset: 10 });
  assert.deepEqual(third.menuPage, { offset: 10, limit: 5, returned: 5, total: "16", nextOffset: 15 });
  assert.deepEqual(fourth.menuPage, { offset: 15, limit: 5, returned: 1, total: "16" });
  const offers = [...first.menu, ...second.menu, ...third.menu, ...fourth.menu];
  assert.deepEqual(offers.map((offer) => offer.rank), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.equal(new Set(offers.map((offer) => JSON.stringify(offer.representative))).size, 16);
});

test("a page beyond the finite menu is an explicit empty page, not an inaccessible tail", () => {
  const quote = quoteParityReconciliation({ ...figureEight, menuOffset: 16, menuLimit: 5 });
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.deepEqual(quote.menu, []);
  assert.deepEqual(quote.menuPage, { offset: 16, limit: 5, returned: 0, total: "16" });
});

test("lazy component composition preserves the complete deterministic global ranking", () => {
  const input = request(
    ["a0", "a1", "a2", "b0", "b1", "b2"],
    [
      ["a01", "a0", "a1", true],
      ["a12", "a1", "a2", false],
      ["a20", "a2", "a0", false],
      ["b01", "b0", "b1", true],
      ["b12", "b1", "b2", true],
      ["b20", "b2", "b0", false],
    ],
    { menuLimit: 64 },
  );
  const quote = quoteParityReconciliation(input);
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.equal(quote.coset.cardinality, "16");
  assert.equal(quote.menu.length, 16);
  assert.deepEqual(quote.menu.map((offer) => offer.rank), Array.from({ length: 16 }, (_, index) => index + 1));
  assert.equal(new Set(quote.menu.map((offer) => JSON.stringify(offer.gaugeMove.reference))).size, 16);
  assert.deepEqual(quote.menu, quoteParityReconciliation(input).menu);
  for (let index = 1; index < quote.menu.length; index += 1) {
    const previous = quote.menu[index - 1];
    const current = quote.menu[index];
    assert.ok(previous.idempotentSettlement.price < current.idempotentSettlement.price
      || (previous.idempotentSettlement.price === current.idempotentSettlement.price
        && previous.losslessSettlement.energy <= current.losslessSettlement.energy));
  }
});

test("disconnected components compose exactly beyond the former global search ceiling", () => {
  const measurements = [];
  const contexts = [];
  for (let component = 0; component < 30; component += 1) {
    const names = [0, 1, 2].map((vertex) => `c${String(component).padStart(2, "0")}-${vertex}`);
    measurements.push(...names);
    contexts.push(
      [`e${String(component).padStart(2, "0")}-01`, names[0], names[1], true],
      [`e${String(component).padStart(2, "0")}-12`, names[1], names[2], false],
      [`e${String(component).padStart(2, "0")}-20`, names[2], names[0], false],
    );
  }
  const quote = quoteParityReconciliation(request(measurements, contexts, { menuLimit: 3 }));
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.equal(quote.topology.components, 30);
  assert.equal(quote.coset.dimension, 60);
  assert.equal(quote.coset.cardinality, "1152921504606846976");
  assert.equal(quote.coset.evaluatedRepresentatives, 120);
  assert.equal(quote.coset.components.length, 30);
  assert.deepEqual(quote.menu.map((offer) => offer.rank), [1, 2, 3]);
  assert.deepEqual(quote.menuPage, {
    offset: 0,
    limit: 3,
    returned: 3,
    total: "1152921504606846976",
    nextOffset: 3,
  });
});

test("the math-law receipt re-derives both two-spread-ledger carriers", () => {
  assert.deepEqual(parityReconciliationLawReceipt(), {
    kind: "relational.quantum.parity-reconciliation-law-receipt:witness",
    figureEight: { idempotentPrice: 1, groundStateEnergy: 2, erasedMultiplicity: 1, h1Rank: 2 },
    theta: { idempotentPrice: 1, groundStateEnergy: 1, erasedMultiplicity: 0, h1Rank: 2 },
    proofBasis: parityReconciliationProofBasis,
  });
});

test("theta quote retains the mass/rank distinction", () => {
  const quote = quoteParityReconciliation(request(
    ["0", "1", "2", "3"],
    [
      ["01", "0", "1", true],
      ["12", "1", "2", false],
      ["20", "2", "0", false],
      ["03", "0", "3", false],
      ["31", "3", "1", false],
    ],
  ));
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.equal(quote.topology.h1Rank, 2);
  assert.equal(quote.minima.idempotentPrice, 1);
  assert.equal(quote.minima.groundStateEnergy, 1);
  assert.equal(quote.minima.erasedMultiplicity, 0);
});

test("a coboundary target receives a zero-cost concrete gauge move", () => {
  const quote = quoteParityReconciliation(request(
    ["a", "b", "c"],
    [
      ["ab", "a", "b", true],
      ["bc", "b", "c", true],
    ],
  ));
  assert.equal(quote.kind, "relational.quantum.parity-reconciliation-quote:witness");
  assert.equal(quote.topology.h1Rank, 0);
  assert.equal(quote.minima.idempotentPrice, 0);
  assert.equal(quote.minima.groundStateEnergy, 0);
  assert.equal(quote.minima.cheapestLossless.frustratedContexts.length, 0);
  assert.ok(quote.minima.cheapestLossless.gaugeMove.flippedMeasurements.length > 0);
});

test("logical domain failures remain explicit obstructions", () => {
  const judgment = quoteParityReconciliation(request(
    ["a", "b"],
    [
      ["first", "a", "b", true],
      ["second", "b", "a", false],
    ],
  ));
  assert.equal(judgment.kind, "relational.quantum.parity-reconciliation-quote:obstruction");
  assert.match(judgment.obstructions.join("\n"), /duplicate pair context/u);
  assert.deepEqual(judgment.proofBasis, parityReconciliationProofBasis);
});

test("request-consensus exposes the quote as a deterministic content-addressed operation", async () => {
  const operation = claimSessionOperations({ dataRoot: process.cwd() })
    .find((candidate) => candidate.verb === "request-consensus");
  assert.ok(operation);
  assert.equal(operation.effects.class, "pure");
  assert.equal(operation.effects.coordination, "coordination-free");
  assert.equal(operation.domain.id, "metroplat/executing/parity-reconciliation-request");
  assert.equal(operation.codomain.id, "metroplat/executing/parity-reconciliation-readout");
  const first = await operation.execute(figureEight, {});
  const second = await operation.execute(figureEight, {});
  assert.equal(first.kind, "metroplat.claim-session.reconciliation-quote");
  assert.equal(first.id, second.id);
  assert.equal(first.judgment.minima.idempotentPrice, 1);
  assert.equal(first.judgment.minima.groundStateEnergy, 2);
});
