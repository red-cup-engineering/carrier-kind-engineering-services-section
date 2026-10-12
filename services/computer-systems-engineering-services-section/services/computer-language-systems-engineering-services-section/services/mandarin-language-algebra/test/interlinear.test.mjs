import assert from "node:assert/strict";
import test from "node:test";

import { admitMandarinInterlinear, readMandarinInterlinear } from "../src/interlinear.mjs";

function fakeAi() {
  const calls = [];
  return { calls, AI: { async run(model, body) { calls.push(body); return { response: body.messages[1].content.split("\n").map((line) => line.replace(/^(\[\d+\]) .*$/u, "$1 English")).join("\n") }; } } };
}

test("the fiber's levels alone call no model and lay out hanzi over pinyin over gloss", async () => {
  const ai = fakeAi();
  const result = await readMandarinInterlinear({ text: "少爷，老夫人让您回家吃饭。", module: "cdrama-subtitles" }, { AI: ai.AI });
  assert.equal(ai.calls.length, 0);
  assert.deepEqual(result.levels, ["hanzi", "pinyin", "gloss"]);
  const [hanzi, pinyin, gloss] = result.text.split("\n");
  assert.equal(hanzi, "少爷 老夫人 让 您 回家 吃饭");
  assert.equal(pinyin.split(" ")[0], "shàoye");
  assert.equal(gloss.split(" | ")[0], "Young Master");
  assert.equal(result.segments[0].words[0].source, "glossary");
});

test("model levels are added beneath, one call per level", async () => {
  const ai = fakeAi();
  const result = await readMandarinInterlinear({ text: "你好", levels: ["hanzi", "natural", "grammatical"] }, { AI: ai.AI });
  assert.equal(ai.calls.length, 2);
  assert.equal(result.text, "你好\nnatural: English\ngrammatical: English");
  assert.deepEqual(Object.keys(result.translations), ["natural", "grammatical"]);
});

test("unknown levels and sources without Chinese are refused before pricing", () => {
  assert.throws(() => admitMandarinInterlinear({ text: "你好", levels: ["braille"] }), RangeError);
  assert.throws(() => admitMandarinInterlinear({ text: "hello" }), RangeError);
});
