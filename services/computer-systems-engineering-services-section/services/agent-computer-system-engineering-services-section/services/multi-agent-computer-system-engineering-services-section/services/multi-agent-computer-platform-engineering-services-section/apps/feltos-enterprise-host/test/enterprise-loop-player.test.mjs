import assert from "node:assert/strict";
import test from "node:test";
import { currentTakingOwner, allocationTurnReadout } from "../src/enterprise-loops.mjs";

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


test("allocation outcomes serialize the exact successful native admission without inventing a receipt", () => {
  const admission = { subject: "work:original", allocation: { scope: "work-item:original", provider: "office:engineer" } };
  const allocated = { counts: { allocated: 1 }, reasons: [], examined: 1, remaining: 0,
    items: [{ scope: "work-item:original", state: "allocated", admission, dispatch: { state: "ready" } }] };
  const result = allocationTurnReadout(allocated);
  assert.equal(result.items[0].admission, admission);
  assert.deepEqual(JSON.parse(JSON.stringify(result)).items[0].admission, admission);
  const assertNoUndefined = value => {
    if (value && typeof value === "object") for (const child of Object.values(value)) {
      assert.notEqual(child, undefined, "native response cannot contain an invented undefined field"); assertNoUndefined(child);
    }
  };
  assertNoUndefined(result);
  assert.equal(result.items[0].subject, "work:original");
});

test("allocation outcomes preserve source locators and independent carrier obstructions", () => {
  const result = allocationTurnReadout({ counts: { obstructed: 1 }, reasons: ["taking-absent"], examined: 1, remaining: 0,
    items: [{ scope: "work-item:held", state: "obstructed", reasons: ["taking-absent"],
      evidence: ["source-url:https://example.invalid/issue/1", "other"], candidates: [{ reasons: ["qualification-missing"] }] }] });
  assert.deepEqual(result.items[0].sources, ["https://example.invalid/issue/1"]);
  assert.deepEqual(result.items[0].candidates, [{ reasons: ["qualification-missing"] }]);
  assert.deepEqual(result.items[0].reasons, ["taking-absent"]);
});
