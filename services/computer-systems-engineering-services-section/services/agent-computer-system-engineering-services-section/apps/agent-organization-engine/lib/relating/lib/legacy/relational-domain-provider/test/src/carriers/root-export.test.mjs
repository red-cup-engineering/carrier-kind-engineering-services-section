import test from "node:test";
import assert from "node:assert/strict";
import { carrierFrom, memeCarrier, utteranceCarrier } from "../../../src/index.mjs";

test("schema carriers validate structure and established domain carriers exist", () => {
  const carrier = carrierFrom({ $id: "test/pair", type: "object", required: ["left"], additionalProperties: false, properties: { left: { type: "string" } } });
  assert.equal(carrier.validate({ left: "x" }), true);
  assert.equal(carrier.validate({ left: "x", right: "y" }), false);
  assert.equal(utteranceCarrier.id, "relating/articulating/utterance");
  assert.match(memeCarrier.id, /meme/u);
});
