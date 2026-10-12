import assert from "node:assert/strict";
import test from "node:test";
import { currentTakingOwner } from "../src/enterprise-loops.mjs";

const child = "emsenn/services/561-group/services/561-group-services-section/services/561-group-operations-services-section/services/561-group-board-of-directors/services/561-group-board-of-directors-leader-movement-team#trusted-assistant-to-the-leader";

const agency = {
  offices: new Map([
    [child, { key: child }],
  ]),
  officeReferences: new Map(),
};

test("office-service ownership follows the exact current taker, independently of territorial home", () => {
  const thread = {
    opening: { move: "request" }, home: "territorial-home", standing: "promised",
    promisers: [{ player: "enterprise:holder", subject: "taking:exact" }],
  };
  assert.equal(currentTakingOwner(thread, "taking:exact", agency), "enterprise:holder");
  assert.equal(currentTakingOwner({ ...thread, standing: "released" }, "taking:exact", agency), undefined);
  assert.equal(currentTakingOwner(thread, "taking:other", agency), undefined);
  assert.throws(() => currentTakingOwner({
    ...thread,
    promisers: [...thread.promisers, { player: "enterprise:other", subject: "taking:exact" }],
  }, "taking:exact", agency), /ambiguous current players/);
});
