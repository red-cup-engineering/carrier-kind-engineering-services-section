import test from "node:test";
import assert from "node:assert/strict";
import { action, carrierFrom, tm } from "../../../src/index.mjs";

test("IR-backed actions enforce their declared carrier boundary", () => {
  const carrier = carrierFrom({ $id: "test/word", type: "string", minLength: 1 });
  const identity = action({ verb: "identity", domain: carrier, codomain: carrier, runTerm: tm.lam(tm.var(0)) });
  assert.equal(identity.run("word", {}), "word");
  assert.throws(() => identity.run("", {}), /too short/u);
});
