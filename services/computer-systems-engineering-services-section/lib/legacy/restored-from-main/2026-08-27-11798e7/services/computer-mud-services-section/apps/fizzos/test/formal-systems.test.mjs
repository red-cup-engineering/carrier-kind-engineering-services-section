import assert from "node:assert/strict";
import test from "node:test";
import { assertMeme, challengeMeme, commonGround, composeMemes, discourseCohesion, meme } from "../src/communicating.mjs";
import { absorb, ask, cognize, createKnowledge, doubt, forget, uncertainty } from "../src/knowing.mjs";
import { action, behavior, chronicle, cutPlayingDesign, design, dualizePlayingDesign, orthogonal } from "../src/playing.mjs";
import { defineThingModel, realizeThing } from "../src/things.mjs";

test("communication composes evidence and computes common ground without fabricating it", () => {
  const yes = meme({ id: "rain", topic: "weather", content: "rain", charge: "true" });
  const no = meme({ id: "rain", topic: "weather", content: "rain", charge: "false" });
  assert.equal(composeMemes(yes, no).charge, "both");
  let alice = assertMeme({}, yes);
  const bob = assertMeme({}, no);
  assert.equal(commonGround([alice, bob]).rain.charge, "both");
  alice = challengeMeme(alice, "rain");
  assert.deepEqual(commonGround([alice, bob]), {});
  assert.ok(discourseCohesion([yes, no]).cohesion > 0);
});

test("knowledge retains contradiction, exposes uncertainty, doubts, forgets, and asks", () => {
  const claim = { subject: "sky", predicate: "weather", object: "rain" };
  let knowledge = absorb(createKnowledge(), [{ ...claim, charge: "true" }, { ...claim, charge: "false" }]);
  assert.equal(cognize(knowledge, claim), "both");
  assert.equal(uncertainty(knowledge).length, 1);
  knowledge = doubt(knowledge, claim);
  assert.equal(cognize(knowledge, claim), "neither");
  knowledge = ask(knowledge, "Will it rain?");
  assert.deepEqual(knowledge.questions, ["Will it rain?"]);
  knowledge = forget(knowledge, claim);
  assert.equal(cognize(knowledge, claim), "neither");
});

test("ludics uses alternating chronicles, daimon convergence, cuts, duals, and closure", () => {
  const positive = design("p", [chronicle([action({ address: "0", polarity: "positive", move: "ask" }), action({ address: "0.1", polarity: "negative", move: "wait", daimon: true })])], "true");
  const negative = design("n", [chronicle([action({ address: "0.1", polarity: "positive", move: "answer", daimon: true })])], "false");
  assert.equal(orthogonal(positive, negative), true);
  assert.deepEqual(cutPlayingDesign(positive, negative), { kind: "fizzos.cut.v1", left: "p", right: "n", converges: true, charge: "both" });
  assert.equal(dualizePlayingDesign(negative).chronicles[0].actions[0].polarity, "negative");
  assert.ok(behavior([positive], [positive, negative]).orthogonal.includes(negative));
  assert.throws(() => design("bad", [chronicle([action({ address: "x", polarity: "positive", move: "a" }), action({ address: "y", polarity: "positive", move: "b" })])]), /non-alternating/u);
});

test("thing models resolve bases and quality-provided behavior with requirements", () => {
  const models = {
    object: defineThingModel({ id: "object", behaviors: ["examine"], attributes: { material: "wood" } }),
    chest: defineThingModel({ id: "chest", base: "object", qualities: ["lockable", "secure"], behaviors: ["open"] }),
  };
  const qualities = {
    lockable: { provides: ["lock"], behaviors: ["unlock"] },
    secure: { requires: ["lock"], attributes: { security: 3 } },
  };
  const chest = realizeThing("oak-chest", "chest", { models, qualities });
  assert.deepEqual(chest.behaviors, ["examine", "open", "unlock"]);
  assert.equal(chest.attributes.security, 3);
  assert.equal(chest.attributes.material, "wood");
});
