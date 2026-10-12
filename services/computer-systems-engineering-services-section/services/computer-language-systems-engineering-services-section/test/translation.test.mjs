import assert from "node:assert/strict";
import test from "node:test";

import { admitMandarinTranslation, MANDARIN_TRANSLATION_CHARACTER_LIMIT, translateMandarinToEnglish, wrapSubtitleText } from "../src/translation.mjs";

/** A stand-in `AI` binding that answers each numbered item from a table, and records what it was asked. */
function fakeAi(table, { failModels = [] } = {}) {
  const calls = [];
  return {
    calls,
    AI: {
      async run(model, body) {
        calls.push({ model, body });
        if (failModels.includes(model)) throw new Error("capacity");
        const items = body.messages[1].content.split("\n").map((line) => /^\[(\d+)\] (.*)$/u.exec(line));
        return { response: items.map(([, number, text]) => `[${number}] ${table[text] ?? `EN(${text})`}`).join("\n") };
      },
    },
  };
}

test("text is translated paragraph by paragraph", async () => {
  const ai = fakeAi({ "第一段。": "First paragraph.", "第二段 继续。": "Second paragraph, continued." });
  const result = await translateMandarinToEnglish({ text: "第一段。\n\n第二段\n继续。" }, { AI: ai.AI });
  assert.equal(result.translation, "First paragraph.\n\nSecond paragraph, continued.");
  assert.deepEqual(result.segments.map((segment) => segment.source), ["第一段。", "第二段 继续。"]);
});

test("the next model is used when one fails, and a short reply is a failure", async () => {
  const ai = fakeAi({}, { failModels: ["@cf/zai-org/glm-4.7-flash"] });
  const result = await translateMandarinToEnglish({ text: "你好" }, { AI: ai.AI });
  assert.deepEqual(result.models, ["@cf/qwen/qwen3.8-27b"]);
  const silent = { AI: { async run() { return { response: "" }; } } };
  await assert.rejects(translateMandarinToEnglish({ text: "你好" }, silent), /every model/u);
});

test("segments with no Chinese pass through untranslated", async () => {
  const ai = fakeAi({ "你好": "Hello" });
  const result = await translateMandarinToEnglish({ subtitles: "1\n00:00:01,000 --> 00:00:02,000\n[MUSIC]\n\n2\n00:00:03,000 --> 00:00:04,000\n你好\n" }, { AI: ai.AI });
  assert.deepEqual(result.segments.map((segment) => segment.target), ["[MUSIC]", "Hello"]);
  assert.equal(ai.calls[0].body.messages[1].content, "[1] 你好");
});

test("admission refuses what cannot be priced", () => {
  assert.throws(() => admitMandarinTranslation({}), TypeError);
  assert.throws(() => admitMandarinTranslation({ text: "a", subtitles: "b" }), TypeError);
  assert.throws(() => admitMandarinTranslation({ text: "no Chinese here" }), RangeError);
  assert.throws(() => admitMandarinTranslation({ text: "你".repeat(MANDARIN_TRANSLATION_CHARACTER_LIMIT + 1) }), RangeError);
  assert.throws(() => admitMandarinTranslation({ text: "你好", module: "klingon" }), RangeError);
  assert.throws(() => admitMandarinTranslation({ subtitles: "not subtitles 你好" }), RangeError);
});

test("English subtitle lines wrap at word boundaries into balanced lines", () => {
  assert.deepEqual(wrapSubtitleText("Short line.", 42), ["Short line."]);
  assert.deepEqual(wrapSubtitleText("Young Master, Madam wants you home for dinner tonight.", 42), ["Young Master, Madam wants", "you home for dinner tonight."]);
});

test("several levels come back side by side, the first as the primary translation", async () => {
  const ai = fakeAi({ "你好": "Hello" });
  const result = await translateMandarinToEnglish({ text: "你好", levels: ["grammatical", "natural", "localized"] }, { AI: ai.AI });
  assert.equal(result.level, "grammatical");
  assert.deepEqual(result.levels, ["grammatical", "natural", "localized"]);
  assert.deepEqual(Object.keys(result.translations), ["grammatical", "natural", "localized"]);
  assert.deepEqual(Object.keys(result.segments[0].targets), ["grammatical", "natural", "localized"]);
  assert.equal(ai.calls.length, 3);
  assert.match(ai.calls[0].body.messages[0].content, /grammatical level/u);
  assert.doesNotMatch(ai.calls[1].body.messages[0].content, /grammatical level|localized level/u);
  assert.match(ai.calls[2].body.messages[0].content, /localized level/u);
});

test("levels outside the model's are refused before pricing", () => {
  assert.throws(() => admitMandarinTranslation({ text: "你好", level: "pinyin" }), /interlinear reading/u);
  assert.throws(() => admitMandarinTranslation({ text: "你好", levels: ["natural", "natural"] }), RangeError);
  assert.throws(() => admitMandarinTranslation({ text: "你好", levels: [] }), RangeError);
});

test("name lines are read in the forms models write them", async () => {
  const ai = { AI: { async run() { return { response: "[1] He is Gu Beichen.\n[2] Lin Wanqing, you're back.\n\nGu Beichen: 顾北辰 = Gu Beichen\n林晚晴 = Lin Wanqing\nNAME: 顾氏集团 = Gu Group" }; } } };
  const result = await translateMandarinToEnglish({ text: "他是顾北辰。\n\n林晚晴，你回来了。" }, ai);
  assert.deepEqual(result.memory.entries.map((entry) => [entry.source, entry.target]), [["顾北辰", "Gu Beichen"], ["林晚晴", "Lin Wanqing"], ["顾氏集团", "Gu Group"]]);
});
